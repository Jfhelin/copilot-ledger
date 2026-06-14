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
The verbose human file (ORIG) **regressed the review task** (hallucinated a defect). The
auto-generated file (INIT) is the **only arm that never beats BARE on any task** and the only
one to **fail mechanical gates** (E4 7/10) — accurate, detailed context did not help quality
and *hurt* the code-writing tasks. **More guidance — even correct guidance — is not more quality.**

## Per-task quality (higher = better)

| Task | Scale | BARE | AGENTS | ORIG | INIT | Read |
|---|---|---|---|---|---|---|
| **E1-nav** | 0–27 | 20.9 | 21.3 | 21.7 | 20.8 | ≈ tie; INIT nominally *lowest* |
| **E2-local** | 0–6 | 5.4 | **6.0** | **6.0** | **4.8** | BARE left scratch files; AGENTS/ORIG perfect; **INIT lowest** (one run scored 2) |
| **E3-debug** | 0–5 | 5.0 | 5.0 | 5.0 | 4.9 | ≈ tie at ceiling |
| **E4-multifile** | 0–6 | 5.0 | 5.1 | 5.0 | **4.5** | **INIT 7/10 gate-pass** (others 10/10) — 3 runs broke the build |
| **E5-review** | net TP−FP | 4.9 | 5.0 | **3.0** | 4.6 | **ORIG worst** (3/3 hallucinated SQL injection); INIT recovers to 4.6 |

**H2 verdict for the concise file: holds decisively.** AGENTS never scored below BARE on any
task and improved two (E1 accuracy, E2 cleanliness). **H2 for ORIG: fails on E5.** **H2 for
INIT: fails as a quality *lift* on every task and regresses on the two code-writing tasks** —
it is non-inferior nowhere and inferior on E2/E4.

## Raw quality spread per cell (mean [min–max])

| Task | BARE | AGENTS | ORIG | INIT |
|---|---|---|---|---|
| E1-nav (0–27) | 20.9 [20–22] | 21.3 [20–23] | 21.7 [21–23] | 20.8 [19–23] |
| E2-local (0–6) | 5.4 [4–6] | 6.0 [6–6] | 6.0 [6–6] | 4.8 [2–6] |
| E3-debug (0–5) | 5.0 [5–5] | 5.0 [5–5] | 5.0 [5–5] | 4.9 [4–5] |
| E4-multifile (0–6) | 5.0 [5–5] | 5.1 [5–6] | 5.0 [5–5] | 4.5 [3–5] |
| E5-review (net) | 4.9 [4–6] | 5.0 [4–6] | 3.0 [2–4] | 4.6 [3–6] |

Note AGENTS tightened E2 to a perfect 6/6 on all 10 runs (BARE 4–6) — a *consistency* gain.
**INIT did the opposite on E2**: it has the *widest* spread (2–6), the only arm to drop as low
as 2, because its richer guidance produced more variable (sometimes over-built) implementations.

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

## INIT — the auto-generated file that helped least

INIT is the `copilot init` auto-generated file (~641 tok, repo-accurate, relocated verbatim to
the `AGENTS.md` path). It is the cleanest test of "does *correct, detailed* context help?" —
and the answer is **no**:

- **Never beats BARE on any task.** It is nominally *lowest* on E1 (20.8) and E3 (4.9), and
  clearly worst on the two **code-writing** tasks: E2 (4.8 vs BARE 5.4) and E4 (4.5 vs 5.0).
- **Only arm to fail mechanical gates.** 3/10 E4 runs broke the build (7/10 gate-pass vs
  10/10 for every other arm). The extra architectural detail correlated with more ambitious,
  more breakable multi-file edits — including the lone run that wired the frontend through the
  API client (the "right" pattern) but shipped a type error that failed `tsc`.
- **Widest E2 spread (2–6).** Richer guidance produced *more variable* implementations, the
  opposite of the consistency AGENTS bought.
- **Recovers on E5 where ORIG cratered.** INIT net 4.6 vs ORIG 3.0. Because INIT is
  structurally accurate ("two independent packages"), 7/10 INIT review runs correctly localized
  the real injection risk to `productsRepo` (out of scope) instead of hallucinating one in the
  in-scope `suppliersRepo` — only 3/10 produced the SQL-injection false positive vs ORIG's 3/3.

**The load-bearing point.** INIT is *factually correct* where ORIG hallucinates a "monorepo",
and it is *cheap* (size ≠ cost, see [`cost-findings.md`](./cost-findings.md)) — yet it still
improved quality on nothing and regressed the code-writing tasks. So the story is not "ORIG
failed because it was wrong." Accurate, detailed, auto-generated context did not help. **What
the file says — a few observed, high-signal rules — beats how much it knows.** The
hand-curated concise AGENTS.md is the only arm that is both cheap (typical) and quality-positive.

## The E4 non-finding (don't over-read it)

Across all arms, wiring the new frontend through the existing API client was **rare** — most
runs used raw `fetch`/axios in the component regardless of file. INIT was the only arm where a
run *did* use the API client, but that same run failed the build, so it scored as a gate
failure, not a quality win. Treat FE-client wiring as "a thing no file reliably moved," not as
evidence about any file.

## Method note (why these scores are trustworthy)

- E1–E3: deterministic scorers (E1 = the *identical* `score.mjs` from Articles 1–3).
- E4, E5: **blind** human-judged packets — run-ids and `AGENTS.md` presence stripped, codes
  assigned via a stable-salt map the scorer was forbidden to read. So the scorer could not
  tell BARE from AGENTS from ORIG from INIT.
- Distributions compared, not single points; per-cell n in every table above.

## Caveats
- **ORIG n=3 ⇒ directional.** But the E5 regression is **3/3 unanimous** on the single most
  penalized false positive — directionally weak in n, unusually clean in signal.
- **INIT n=10** (a full add-on arm). Its E4 gate failures (3/10) mean E4 INIT quality is scored
  including build-broken runs; the gap to BARE is real either way.
- Quality "ties at ceiling" (E3, and near-ceiling E2/E4) mean these tasks have limited
  headroom to *show* improvement; the cost differences there carry more information than the
  quality ones. Pair this dossier with [`cost-findings.md`](./cost-findings.md).
