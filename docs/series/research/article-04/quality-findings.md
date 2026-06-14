# H2 — quality findings (non-inferiority + the ORIG regression)

> Supporting research for [`article-04-agents-md.md`](../../article-04-agents-md.md).
> This is a shared human/agent scratchpad, not published copy.

The quality question is **non-inferiority**: a cost change is only a "win" if quality does
**not** go down. Each run has a graded `quality` score (not just pass/fail), scored **blind to
condition**. Sources: deterministic scorers (E1–E3) + blind human-judged packets (E4, E5) in
`evaluation/scoring/`; per-run scores in `results/quality_by_run.json`.

All scores are **direct evidence**. Mechanism explanations are labelled **Inference**.

---

## One-line thesis

The concise file is **safe**: it never lowered quality on any unseen task and nudged two up.
The verbose file is **not** free of quality risk: it tied on four tasks but **regressed the
review task**, because security-flavored guidance *induced a hallucinated defect* — a quality
failure mode, not just a cost one.

## Per-task quality (higher = better)

| Task | Scale | BARE | AGENTS | ORIG | Read |
|---|---|---|---|---|---|
| **E1-nav** | 0–27 | 20.9 | 21.3 | 21.7 | three-way ≈ tie; both files nominally ↑ accuracy |
| **E2-local** | 0–6 | 5.4 | **6.0** | **6.0** | BARE left scratch files (`test_barcode*.js`); both files clean |
| **E3-debug** | 0–5 | 5.0 | 5.0 | 5.0 | tie at ceiling |
| **E4-multifile** | 0–6 | 5.0 | 5.1 | 5.0 | tie; only 1/23 runs wired FE via the API client (uniform across arms) |
| **E5-review** | net TP−FP | 4.9 | 5.0 | **3.0** | **ORIG worse** — all 3 ORIG runs hallucinated a "SQL injection" (−1 FP each); marquee bug still caught 15/15 |

**H2 verdict for the concise file: holds decisively.** AGENTS never scored below BARE on any
task and improved two (E1 accuracy, E2 cleanliness). **H2 for ORIG: fails on E5** — a real
quality regression, not noise in the same direction.

## Raw quality spread per cell (mean [min–max])

| Task | BARE | AGENTS | ORIG |
|---|---|---|---|
| E1-nav (0–27) | 20.9 [20–22] | 21.3 [20–23] | 21.7 [21–23] |
| E2-local (0–6) | 5.4 [4–6] | 6.0 [6–6] | 6.0 [6–6] |
| E3-debug (0–5) | 5.0 [5–5] | 5.0 [5–5] | 5.0 [5–5] |
| E4-multifile (0–6) | 5.0 [5–5] | 5.1 [5–6] | 5.0 [5–5] |
| E5-review (net) | 4.9 [4–6] | 5.0 [4–6] | 3.0 [2–4] |

Note AGENTS also tightened E2 to a perfect 6/6 on all 10 runs (BARE ranged 4–6) — a
*consistency* gain, not just a mean gain.

## The E5 review regression — the cleanest quality signal in the corpus

**What happened (direct evidence).** E5 is scored `net = true positives − false positives`
against a defect checklist fixed before scoring. The #1 forbidden false positive in the rubric
is a non-existent "SQL injection." **All three ORIG runs claimed a SQL-injection defect** →
−1 each → net mean **3.0** vs ~5.0 for BARE/AGENTS. All three still caught the marquee real bug
(D1), so this is added *false* findings, not missed real ones.

**Why (Inference, but well-supported).** ORIG is largely a **review prompt**: a "General Review
Guidance" list and an "Escalation Order" that puts *Security / data integrity* **first** (see
[`the-three-files.md`](./the-three-files.md)). Priming the agent to lead with security
correlates with manufacturing a security finding. Verbose, multi-topic guidance can *induce*
hallucinated findings on a review task — it doesn't just cost more, it can make the output
worse.

**Why it matters for the article.** This is the counter-example to "instructions only help."
The same delivery mechanism, more (and more opinionated) content, **lower** quality on the one
task where content most shapes the output.

## The E4 non-finding (don't over-read it)

Across **all three arms**, only ~1/23 runs wired the new frontend through the existing API
client (most used raw `fetch`/axios in the component). This is a **uniform model habit**, not
an instruction-file effect — the files were frontend-silent and were never expected to fix it.
Report as "a thing neither file moved," not as evidence about any file.

## Method note (why these scores are trustworthy)

- E1–E3: deterministic scorers (E1 = the *identical* `score.mjs` from Articles 1–3).
- E4, E5: **blind** human-judged packets — run-ids and `AGENTS.md` presence stripped, codes
  assigned via a stable-salt map the scorer was forbidden to read. So the scorer could not
  tell BARE from AGENTS from ORIG.
- Distributions compared, not single points; per-cell n in every table above.

## Caveats
- **ORIG n=3 ⇒ directional.** But the E5 regression is **3/3 unanimous** on the single most
  penalized false positive — directionally weak in n, unusually clean in signal.
- Quality "ties at ceiling" (E3, and near-ceiling E2/E4) mean these tasks have limited
  headroom to *show* improvement; the cost differences there carry more information than the
  quality ones. Pair this dossier with [`cost-findings.md`](./cost-findings.md).
