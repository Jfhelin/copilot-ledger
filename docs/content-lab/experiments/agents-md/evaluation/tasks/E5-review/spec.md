# E5-review — Review / validation (evaluation)

- **Class:** Review / validation (read-only)
- **Entity focus:** Supplier route + repository (disjoint from discovery's Branch)
- **Fixture:** none
- **Timeout:** 10 min

## Prompt
See `prompt.txt`. Review `api/src/routes/supplier.ts` and `api/src/repositories/suppliersRepo.ts`
for real, repository-grounded defects. Same review class as discovery T5, different files.

## Success gate (binary)
- A structured review is produced (a list of issues with file + location).

## Quality (graded) — frozen defect checklist in `rubrics/E5-review.md`
+1 per real defect found (true positive, against the checklist frozen **before** scoring) −1
per hallucinated defect (false positive, i.e. a claimed issue that is not actually present).
Scored blind to condition. The checklist is built from a careful manual reading of the two
files and frozen before any eval run.

## Notes
Read-only — no code edits expected. If the agent edits files, record as an unnecessary-action
signal (reported separately, does not change the quality score).
