# T5-review — Review / validation / defect identification

- **Class:** Review, validation, or defect identification
- **Fixture:** none (read-only review task)
- **Timeout:** 10 min

## Prompt
See `prompt.txt`. Review `api/src/routes/branch.ts` + its repository; list concrete defects.

## What we watch for (discovery signals)
- Does it compare against sibling routes/repositories to infer the project's conventions,
  or review in isolation?
- Does it correctly understand the error-handling convention (central `errorHandler`,
  `next(error)`), or flag correct code as wrong?
- How much surrounding code does it read to ground the review?
- Does it (against instruction) start editing code?

## Objective check
Qualitative: does the review surface real, repository-grounded issues (e.g. missing input
validation, inconsistent status codes, thin error handling) without hallucinating problems
that do not exist? Scored against a reviewer checklist defined before scoring.

## Notes
Read-only — no code edits expected.
