#!/usr/bin/env bash
# AGENTS.md experiment runner (Copilot CLI headless).
# Adapted from the 40-run variance harness.
#
# Differences from the 40-run runner:
#   - Per-task prompts (read from <task-dir>/prompt.txt) instead of one fixed prompt.
#   - Optional planted-bug fixture (<task-dir>/fixture.patch) applied AFTER reset in
#     EVERY condition (it is part of the task, not the intervention).
#   - Conditions: BARE (no instruction file) and AGENTS (write the frozen AGENTS.md).
#   - Copilot only. Output goes to the external agents-md capture tree.
#
# Usage:
#   run.sh                      # full discovery schedule: 5 tasks x BARE x 3 reps = 15
#   run.sh <TASK> <COND> <REP>  # single run (used for smoke tests)
#
# Env overrides:
#   TASKS_ROOT  dir holding <task>/prompt.txt (+ optional fixture.patch)
#               default: <exp>/discovery/tasks
#   PHASE       label written into run ids / paths (default: discovery)
#   REPS        reps per task in full-schedule mode (default: 3)
#   CONDS       space-separated conditions in full-schedule mode (default: "BARE")
set -u

# --- fixed environment (Phase 0 lock) ---
REPO=/tmp/octocat_supply_a4
SHA=e1516cf9095b83f25adabf5fe66036f133bddfa6
MODEL=claude-sonnet-4.5

# --- paths ---
EXP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"          # docs/.../agents-md
SCRIPTS=/Users/jfhelin/Code/GitHub/jfhelin/copilot-worktrees/copilot-ledger/jfhelin-miniature-disco
DIGEST="$SCRIPTS/packages/skill-copilot-cli/scripts/copilot-cli-digest.mjs"
EXTRACT="$EXP_DIR/runner/extract.mjs"
AGENTS_FILE="$EXP_DIR/intervention/AGENTS.md"                       # used only in AGENTS condition

PHASE="${PHASE:-discovery}"
TASKS_ROOT="${TASKS_ROOT:-$EXP_DIR/$PHASE/tasks}"
OUT="$HOME/copilot-ledger-data/captures/agents-md/$PHASE"
MASTER="$OUT/captures.jsonl"

mkdir -p "$OUT/runs"

now_ms() { perl -MTime::HiRes=time -e 'printf("%d\n", time()*1000)'; }

neutralize() {
  cd "$REPO" || exit 1
  git reset --hard "$SHA" --quiet
  git clean -fdx --quiet
  rm -f .github/copilot-instructions.md CLAUDE.md AGENTS.md
  rm -rf .github/instructions
}

run_one() {
  local task="$1" cond="$2" rep="$3"
  local task_dir="$TASKS_ROOT/$task"
  local prompt_file="$task_dir/prompt.txt"
  if [ ! -f "$prompt_file" ]; then
    echo "!! no prompt.txt for task '$task' at $prompt_file" >&2; return 1
  fi
  local prompt; prompt="$(cat "$prompt_file")"

  local cw="warm"; [ "$rep" -eq 1 ] && cw="cold"
  local run_id="${PHASE}-${task}-${cond}-$(printf '%02d' "$rep")"
  local rundir="$OUT/runs/$run_id"
  rm -rf "$rundir"; mkdir -p "$rundir/logs"

  neutralize

  # planted fixture (same in every condition) ----------------------------------
  if [ -f "$task_dir/fixture.patch" ]; then
    if git -C "$REPO" apply "$task_dir/fixture.patch"; then
      echo "    applied fixture.patch"
    else
      echo "    !! fixture.patch FAILED to apply for $run_id" >&2; return 1
    fi
  fi

  # intervention ----------------------------------------------------------------
  if [ "$cond" = "AGENTS" ]; then
    if [ ! -f "$AGENTS_FILE" ]; then
      echo "    !! AGENTS condition but no frozen file at $AGENTS_FILE" >&2; return 1
    fi
    cp "$AGENTS_FILE" "$REPO/AGENTS.md"
  fi

  # baseline commit = exact state the agent starts from (post reset/clean/rm,
  # post fixture, post intervention). The agent's worktree diff is then taken
  # against THIS, so neutralize's own instruction-file deletions don't show up.
  git -C "$REPO" -c user.email=exp@local -c user.name=exp add -A >/dev/null 2>&1
  git -C "$REPO" -c user.email=exp@local -c user.name=exp commit -q --no-verify \
    -m "baseline $run_id" >/dev/null 2>&1 || true

  echo "[$(date +%H:%M:%S)] >>> $run_id ($cw)"
  local start end exit_code
  start=$(now_ms)
  copilot -p "$prompt" --allow-all-tools --disable-builtin-mcps \
    --disable-mcp-server workiq --disable-mcp-server fabric-rti \
    --disable-mcp-server revenue --disable-mcp-server markitdown \
    --model "$MODEL" --log-dir "$rundir/logs" --log-level all \
    > "$rundir/answer.txt" 2> "$rundir/stderr.txt"
  exit_code=$?
  end=$(now_ms)
  local wall=$((end - start))

  # capture the resulting working-tree diff (what the agent changed) vs baseline
  git -C "$REPO" -c user.email=exp@local -c user.name=exp add -A >/dev/null 2>&1
  git -C "$REPO" diff --cached HEAD > "$rundir/worktree.diff" 2>/dev/null
  git -C "$REPO" reset -q HEAD >/dev/null 2>&1

  local log; log=$(ls -t "$rundir/logs"/process-*.log 2>/dev/null | head -1)
  local digestf="$rundir/digest.json"
  if [ -n "$log" ]; then
    node "$DIGEST" "$log" --stdout --force > "$digestf" 2>"$rundir/digest.err"
  else
    echo "    !! no process log found" >&2
  fi

  if [ -s "$digestf" ]; then
    cat "$digestf" | node "$EXTRACT" copilot "$run_id" "$task" "$cond" "$rep" "$cw" "$wall" "$exit_code" "$start" \
      | tee "$rundir/metrics.json" >> "$MASTER"
    echo "    done exit=$exit_code wall=${wall}ms -> $(tail -1 "$rundir/metrics.json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("req="+j.requests,"tools="+j.tool_calls,"out="+j.completion_tokens,"cost=$"+j.cost_token_norm_usd,"cr="+(j.native_credits??"-"),"hit="+j.cache_hit_rate)})')"
  else
    echo "    !! DIGEST FAILED exit=$exit_code wall=${wall}ms (see $rundir/digest.err)"
    echo "{\"run_id\":\"$run_id\",\"task\":\"$task\",\"condition\":\"$cond\",\"harness\":\"copilot\",\"rep\":$rep,\"exit_code\":$exit_code,\"wall_ms_measured\":$wall,\"error\":\"digest_failed\"}" >> "$MASTER"
  fi
}

# --- single-run mode (smoke test) -------------------------------------------
if [ "$#" -eq 3 ]; then
  run_one "$1" "$2" "$3"
  echo "=== single run complete; master rows: $(wc -l < "$MASTER" 2>/dev/null || echo 0) ==="
  exit 0
fi

# --- full discovery schedule -------------------------------------------------
REPS="${REPS:-3}"
CONDS="${CONDS:-BARE}"
TASKS=(T1-nav T2-local T3-debug T4-multifile T5-review)
echo "=== $PHASE schedule start $(date) — tasks=${TASKS[*]} conds=$CONDS reps=$REPS ==="
for task in "${TASKS[@]}"; do
  for cond in $CONDS; do
    for rep in $(seq 1 "$REPS"); do
      run_one "$task" "$cond" "$rep"
    done
  done
done
echo "=== $PHASE schedule complete $(date) — rows: $(wc -l < "$MASTER") ==="
