#!/usr/bin/env bash
# Backfill the 2 Claude exp5 runs that hit the account session limit (reps 9-10).
# Safe to re-run: removes prior invalid exp5 claude rows, re-runs reps 9-10,
# then re-derives the `valid` flag across the whole results file.
set -euo pipefail
HARNESS_DIR="$HOME/copilot-ledger-data/behavioral-harness"
CAP="$HOME/copilot-ledger-data/captures/behavioral"
JSONL="$CAP/results.jsonl"

echo "[backfill] removing invalid claude exp5 rows from results.jsonl"
python3 - "$JSONL" <<'PY'
import json,sys
p=sys.argv[1]
rows=[json.loads(l) for l in open(p)]
keep=[r for r in rows if not (r['harness']=='claude' and r['experiment']=='exp5_plan' and not r.get('valid',True))]
open(p,'w').write('\n'.join(json.dumps(r) for r in keep)+'\n')
print(f"[backfill] kept {len(keep)}/{len(rows)} rows")
PY

echo "[backfill] re-running claude exp5 reps 9-10"
cd "$HARNESS_DIR"
node run.mjs --harness claude --exp exp5_plan --start 9 --reps 10 --timeout 900 --keep-going

echo "[backfill] enriching new rows with token/cost/cache columns"
node enrich.mjs

echo "[backfill] re-deriving valid flag"
python3 - "$JSONL" "$CAP" <<'PY'
import json,os,sys
p,cap=sys.argv[1],sys.argv[2]
SNAP='claude-sonnet-4-5-20250929'
rows=[json.loads(l) for l in open(p)]
for r in rows:
    err=False
    sp=os.path.join(r['raw_capture_path'],'stream.jsonl')
    if os.path.exists(sp):
        for l in open(sp):
            l=l.strip()
            if not l: continue
            try: ev=json.loads(l)
            except: continue
            if ev.get('type')=='result' and ev.get('is_error'): err=True
    r['result_is_error']=err
    r['valid']=(r['model_snapshot']==SNAP) and (not err) and (r['exit_code'] in (0,None))
open(p,'w').write('\n'.join(json.dumps(r) for r in rows)+'\n')
import collections
c=collections.Counter((r['harness'],r['experiment']) for r in rows if r['valid'])
print('[backfill] valid per (harness,exp):')
for k in sorted(c): print('   ',k,c[k])
PY
echo "[backfill] done"
