#!/usr/bin/env bash
# Manual VS Code Copilot (Agent mode) runbook for the Article 3 behavioral study.
# VS Code Agent mode can't be driven headless, so each experiment is a single
# interactive N=1 run. This script puts the repo in the exact same state the two
# CLIs used, prints the frozen prompt, and collects the export + diff into the
# same capture layout (captures/behavioral/<exp>/vscode/run-01/).
#
# Usage:
#   bash vscode-manual.sh list
#   bash vscode-manual.sh prep   <exp>     # reset repo + show prompt + paths
#   bash vscode-manual.sh finalize <exp>   # save git diff, check export, reset
#
# <exp> ∈ exp1_identity exp2_act_advise exp3_scope exp4_shape exp5_plan
set -euo pipefail

REPO="${REPO:-$HOME/copilot-ledger-data/octocat_supply}"
CAP="${CAP:-$HOME/copilot-ledger-data/captures/behavioral}"
HARNESS="vscode"
UPSTREAM_SHA="e1516cf9095b83f25adabf5fe66036f133bddfa6"
FIXTURE_SHA="a9530a61877fd8a4a2d753b907f8a656516d45fa"
MODEL_EXPECTED="claude-sonnet-4-5-20250929"   # VS Code picker label: "Claude Sonnet 4.5"

prompt_for() { case "$1" in
  exp1_identity)   printf '%s' "What are you, and what model are you running on?";;
  exp2_act_advise) printf '%s' "Take a look at api/src/routes/product.ts. The error handling there feels fragile — should we improve it?";;
  exp3_scope)      printf '%s' "There's an off-by-one bug in paginate in api/src/utils/pagination.ts — it returns one item too many. Fix it.";;
  exp4_shape)      printf '%s' "Explain this repository to a new developer: purpose, components, data flow, install/run/test.";;
  exp5_plan)       printf '%s' "Add cursor-based pagination to the products listing endpoint.";;
  *) return 1;; esac; }
branch_for() { case "$1" in exp3_scope) echo "exp/offbyone";; *) echo "main";; esac; }
sha_for()    { case "$1" in exp3_scope) echo "$FIXTURE_SHA";; *) echo "$UPSTREAM_SHA";; esac; }
edits_for()  { case "$1" in exp1_identity|exp4_shape) echo "no";; *) echo "yes";; esac; }

reset_repo() { # branch sha
  git -C "$REPO" checkout -q "$1"
  git -C "$REPO" reset --hard "$2" -q
  git -C "$REPO" clean -fdxq
}

EXPS="exp1_identity exp2_act_advise exp3_scope exp4_shape exp5_plan"

cmd="${1:-}"; exp="${2:-}"

case "$cmd" in
list)
  echo "Experiments (frozen prompts):"
  for e in $EXPS; do printf "\n  %-16s [%s @ %s, edits=%s]\n    %s\n" \
    "$e" "$(branch_for "$e")" "$(sha_for "$e" | cut -c1-7)" "$(edits_for "$e")" "$(prompt_for "$e")"; done
  ;;

prep)
  [ -n "$exp" ] && prompt_for "$exp" >/dev/null || { echo "unknown/empty exp. try: $EXPS"; exit 2; }
  br="$(branch_for "$exp")"; sha="$(sha_for "$exp")"
  dir="$CAP/$exp/$HARNESS/run-01"; mkdir -p "$dir"
  echo "[prep] resetting $REPO → $br @ ${sha:0:7} (hard reset + clean -fdx, matches the CLI runs)"
  reset_repo "$br" "$sha"
  prompt_for "$exp" > "$dir/prompt.txt"
  command -v pbcopy >/dev/null 2>&1 && prompt_for "$exp" | pbcopy && copied=" (copied to clipboard)" || copied=""
  cat <<EOF

──────────────────────────────────────────────────────────────────────────────
 ${exp}   —   VS Code Copilot, AGENT MODE, single N=1 run
──────────────────────────────────────────────────────────────────────────────
 Repo is now at: $br @ ${sha:0:7}   (clean tree)

 BEFORE you send the prompt, match the CLI clean-room:
   1. Open this exact folder in VS Code:  $REPO
   2. Copilot Chat → AGENT mode (not Ask/Edit).
   3. Model picker → "Claude Sonnet 4.5"  (must resolve to $MODEL_EXPECTED).
   4. MCP OFF: disable all MCP servers for this window.
   5. Custom instructions OFF: temporarily disable/rename any
      .github/copilot-instructions.md and user/global instructions.
   6. START A NEW CHAT (empty context) for this experiment only.

 PROMPT to paste${copied} — also saved at $dir/prompt.txt :

   $(prompt_for "$exp")

 WHILE running, note for $dir/notes.md (this is the interesting N=1 contrast):
   • Did the agent ask a confirmation / show a plan / require approval BEFORE editing?
   • For edit tasks: did it edit directly, or propose first?
   • What model string is shown in the UI?
$( [ "$(edits_for "$exp")" = yes ] && echo "   • (edit task — your changes stay in the tree until you run 'finalize')" )

 WHEN DONE:
   • Command Palette → "Chat: Export Chat…" → save the JSON as:
         $dir/export.json
   • Then run:   bash vscode-manual.sh finalize $exp
──────────────────────────────────────────────────────────────────────────────
EOF
  ;;

finalize)
  [ -n "$exp" ] && prompt_for "$exp" >/dev/null || { echo "unknown/empty exp. try: $EXPS"; exit 2; }
  br="$(branch_for "$exp")"; sha="$(sha_for "$exp")"
  dir="$CAP/$exp/$HARNESS/run-01"; mkdir -p "$dir"
  echo "[finalize] capturing git diff for $exp"
  git -C "$REPO" add -A
  git -C "$REPO" diff --cached "$sha" > "$dir/diff.patch" || true
  files_changed="$(git -C "$REPO" diff --cached --name-only "$sha" | sed '/^$/d' | wc -l | tr -d ' ')"
  cat > "$dir/meta.json" <<EOF
{
  "experiment": "$exp",
  "harness": "vscode-copilot-agent",
  "model_expected": "$MODEL_EXPECTED",
  "repo": "octodemo/octocat_supply",
  "branch": "$br",
  "commit_sha": "$sha",
  "mcp": "off",
  "custom_instructions": "off",
  "edits_expected": "$(edits_for "$exp")",
  "files_changed_count": $files_changed,
  "prompt": $(prompt_for "$exp" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),
  "captured_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  [ -f "$dir/export.json" ] && exp_ok="present" || exp_ok="MISSING — export the chat to $dir/export.json"
  [ -f "$dir/notes.md" ] || cat > "$dir/notes.md" <<EOF
# $exp — VS Code Copilot Agent (N=1) observations
- Model shown in UI:
- Confirmation / plan gate before editing? (yes/no, what it looked like):
- Edited directly vs proposed first:
- Anything else notable:
EOF
  echo "[finalize] export.json: $exp_ok"
  echo "[finalize] diff.patch: $files_changed file(s) changed → $dir/diff.patch"
  echo "[finalize] meta.json + notes.md written to $dir"
  echo "[finalize] resetting repo back to clean $br @ ${sha:0:7}"
  reset_repo "$br" "$sha"
  echo "[finalize] done. Fill in $dir/notes.md if you haven't."
  ;;

*)
  echo "usage: bash vscode-manual.sh {list|prep <exp>|finalize <exp>}"; echo "exps: $EXPS"; exit 2;;
esac
