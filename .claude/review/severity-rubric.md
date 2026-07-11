# Severity × Effort Rubric (spec 282, FR-006)

Reviewer and synthesis agents assign every finding a **severity** and an **effort** using
the definitions below. Consistency between runs depends on these being applied literally, not
by feel — when unsure, quote the deciding clause in the finding's verification note.

## Severity — by user impact and data-loss risk

Severity answers: *if this defect fires in front of a DSTL analyst, how bad is it?* Data loss
and silent-wrong-answer dominate the scale, per Constitution Article I ("No silent failures",
"Users MUST always know the state of their data").

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Silent data loss or silent-wrong-answer on a core path, OR a crash on a common workflow with no recovery. The analyst loses work or trusts a wrong result without knowing. | A save path that drops features when the source type grows (the ADR-033 class); a reconciliation that overwrites user annotations; a numeric tool returning wrong bearings with no error. |
| **High** | Data loss or wrong result that is recoverable or bounded, OR a constitution violation on a load-bearing invariant (schema-first, provenance, services-never-touch-UI, persistence-via-writer), OR a crash on an uncommon-but-real workflow. | A parser that mangles one legacy dialect; a frontend writing persistence outside the writer abstraction (Article IV.4); missing provenance on a transformation (Article III.1). |
| **Medium** | Correctness or robustness defect with a visible symptom the user can work around, OR a maintainability hazard that will predictably cause a High/Critical later (type duplication that has already diverged, dependency skew across packages). | Two `TimeRange` definitions that disagree at the edges; an error swallowed and logged but not surfaced; a test that passes against a mock and would miss a real regression. |
| **Low** | Local defect with negligible user impact, style-adjacent robustness, or dead code. Worth fixing, not worth blocking on. | An unreachable branch; a redundant re-validation; a lint-strict hit with a plausible-but-minor failure mode. |

**Tie-breakers**:
- If it can lose data *silently*, it is at least High; if on a core path, Critical.
- A constitution violation is never below High if the article is load-bearing (Articles I–IV,
  VI, XV); conformance drift on advisory clauses may be Medium.
- "Could cause a Critical later" caps at Medium unless the failure is already occurring.

## Effort — implementation cost to fix well (including tests)

Effort estimates the fix, not the investigation (the review already did the investigation).

| Effort | Definition | Rough shape |
|--------|------------|-------------|
| **S** | Localised, low-risk, obvious fix. One or a few files, no design decision, test is small. | Add an `await`; align a version range; delete dead code; add the missing field to a `Pick<>`. |
| **M** | Contained but needs judgement or touches several call sites. A single session's work with a real test. | Consolidate duplicate types behind one canonical definition; add a guard + regression test across a subsystem. |
| **L** | Requires design, cross-cutting change, or migration. Multiple sessions or a spec of its own. | Restructure a write path for atomicity; introduce a new schema and migrate; replace an architectural boundary breach. |

## Quick-wins definition (drives the report's lead table)

A **quick win** is `severity ∈ {Critical, High}` **AND** `effort = S`. These are the findings
that most repay a same-week `/repo-review.fix` batch: high stakes, cheap to close.
