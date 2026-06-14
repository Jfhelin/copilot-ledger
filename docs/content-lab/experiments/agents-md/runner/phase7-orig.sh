#!/usr/bin/env bash
# Phase 7 add-on — ORIG comparison arm.
# Runs the repo's ORIGINAL .github/copilot-instructions.md (relocated to AGENTS.md)
# as a third condition, 3 reps x 5 eval tasks = 15 runs, APPENDED to the existing
# evaluation/captures.jsonl (the 100 BARE/AGENTS rows are preserved).
#
# Same locked environment as Phase 5 (run.sh): repo @ e1516cf, claude-sonnet-4.5,
# E3-debug fixture applied in every condition. Task-major order; rep 1 = cold.
#
# Usage: phase7-orig.sh [REPS]   (default REPS=3)
set -u
RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HOME/copilot-ledger-data/captures/agents-md/evaluation"
MASTER="$OUT/captures.jsonl"
REPS="${1:-3}"
TASKS=(E1-nav E2-local E3-debug E4-multifile E5-review)

before=$(wc -l < "$MASTER" 2>/dev/null | tr -d ' ')
echo "=== Phase 7 ORIG arm start $(date) — tasks=${TASKS[*]} reps=$REPS — master has $before rows ==="
for task in "${TASKS[@]}"; do
  for rep in $(seq 1 "$REPS"); do
    echo "----- $task ORIG rep=$rep -----"
    PHASE=evaluation bash "$RUNNER_DIR/run.sh" "$task" ORIG "$rep"
  done
done
after=$(wc -l < "$MASTER" 2>/dev/null | tr -d ' ')
echo "=== Phase 7 ORIG arm complete $(date) — master rows: $before -> $after (+$((after-before))) ==="
