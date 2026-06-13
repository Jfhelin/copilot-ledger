#!/usr/bin/env bash
# Phase 5 driver — replays evaluation/schedule.json in its exact pre-registered
# order, calling run.sh single-run mode for each cell. One sequential job against
# the single shared checkout (matches the pre-registration; no parallelism).
#
# Usage:
#   phase5.sh            # run all 100 rows in schedule order
#   phase5.sh <N>        # resume: skip the first N rows (already done)
set -u

RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXP_DIR="$(cd "$RUNNER_DIR/.." && pwd)"
SCHED="$EXP_DIR/evaluation/schedule.json"
OUT="$HOME/copilot-ledger-data/captures/agents-md/evaluation"
MASTER="$OUT/captures.jsonl"

[ -f "$SCHED" ] || { echo "!! no schedule.json at $SCHED" >&2; exit 1; }

SKIP="${1:-0}"

# Reset master log for a clean dataset only on a fresh (non-resume) start.
if [ "$SKIP" -eq 0 ]; then
  mkdir -p "$OUT"
  if [ -s "$MASTER" ]; then
    cp "$MASTER" "$OUT/captures.presmoke.$(date +%Y%m%d_%H%M%S).jsonl"
  fi
  : > "$MASTER"
  echo "=== Phase 5 fresh start: captures.jsonl reset (prior rows archived) ==="
fi

# Read schedule order as: seq<TAB>task<TAB>condition<TAB>rep
mapfile -t ROWS < <(node -e '
  const s=require(process.argv[1]);
  for (const o of s.order) console.log([o.seq,o.task,o.condition,o.rep].join("\t"));
' "$SCHED")

TOTAL=${#ROWS[@]}
echo "=== Phase 5 start $(date) — $TOTAL rows, skipping $SKIP, seed=$(node -e 'console.log(require(process.argv[1]).seed)' "$SCHED") ==="

i=0
for row in "${ROWS[@]}"; do
  i=$((i+1))
  [ "$i" -le "$SKIP" ] && continue
  IFS=$'\t' read -r seq task cond rep <<< "$row"
  echo "----- [$i/$TOTAL] seq=$seq $task $cond rep=$rep -----"
  PHASE=evaluation bash "$RUNNER_DIR/run.sh" "$task" "$cond" "$rep"
done

echo "=== Phase 5 complete $(date) — master rows: $(wc -l < "$MASTER") ==="
