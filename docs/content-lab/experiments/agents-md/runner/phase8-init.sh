#!/usr/bin/env bash
# Phase 8 add-on — INIT comparison arm.
# Runs the file produced by `copilot init` on the locked repo (relocated to AGENTS.md)
# as a fourth condition, 10 reps x 5 eval tasks = 50 runs, APPENDED to the existing
# evaluation/captures.jsonl (the 100 BARE/AGENTS + 15 ORIG rows are preserved).
#
# This makes INIT a full primary arm at the same n=10 as BARE/AGENTS (not directional
# like ORIG n=3), so 4-way cost claims rest on equal-n cells.
#
# The intervention file is the verbatim `copilot init` output
# (intervention/AGENTS.init-generated.md) copied to the repo-root AGENTS.md path —
# the SAME delivery channel as the AGENTS and ORIG arms, so this arm isolates the
# *content* of the tool-generated file, not where it lives. See FREEZE.init.md.
#
# Same locked environment as Phase 5/7 (run.sh): repo @ e1516cf, claude-sonnet-4.5,
# E3-debug fixture applied in every condition. Task-major order; rep 1 = cold.
#
# Usage: phase8-init.sh [REPS]   (default REPS=10)
set -u
RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HOME/copilot-ledger-data/captures/agents-md/evaluation"
MASTER="$OUT/captures.jsonl"
REPS="${1:-10}"
TASKS=(E1-nav E2-local E3-debug E4-multifile E5-review)

before=$(wc -l < "$MASTER" 2>/dev/null | tr -d ' ')
echo "=== Phase 8 INIT arm start $(date) — tasks=${TASKS[*]} reps=$REPS — master has $before rows ==="
for task in "${TASKS[@]}"; do
  for rep in $(seq 1 "$REPS"); do
    echo "----- $task INIT rep=$rep -----"
    PHASE=evaluation bash "$RUNNER_DIR/run.sh" "$task" INIT "$rep"
  done
done
after=$(wc -l < "$MASTER" 2>/dev/null | tr -d ' ')
echo "=== Phase 8 INIT arm complete $(date) — master rows: $before -> $after (+$((after-before))) ==="
