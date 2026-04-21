# Phase 0 Research: Audit non-LinkML Type Declarations

**Feature**: 219-audit-non-linkml-types
**Date**: 2026-04-21

This document resolves each technical unknown identified in `plan.md` under Technical Context. The audit feature is unusually small in unknowns — it is analysis tooling, not a runtime change — so the research is focused on choosing the right mechanism for the enumeration step, the curation workflow, and the report layout.

---

## R-1 — Enumeration tooling

**Decision**: Write a small Node/TypeScript script at `scripts/type-audit/enumerate.ts` that uses the bundled `typescript` package's compiler API (`ts.createSourceFile` + AST visitor) to enumerate named `InterfaceDeclaration`, `TypeAliasDeclaration`, and `EnumDeclaration` nodes at the top level of every `.ts` / `.tsx` file under the audit scope.

**Rationale**:
- **Zero new dependencies.** The `typescript` package is already present in the repo (it's the compiler for the whole monorepo). Article IX of the Constitution ("Every dependency is a liability") argues for reusing it rather than adding `ts-morph`.
- **Reliability.** AST traversal catches declarations that span multiple lines, are nested inside `declare module` blocks, or use complex generic signatures — cases where regex/ripgrep would produce false positives and negatives.
- **Scope filtering is precise.** We can distinguish a top-level `interface Foo {}` from an `interface Foo {}` declared inside a function body (which we exclude; the spec's Edge Cases section lists "inline anonymous types" as out of scope, but the same logic applies to function-scoped named declarations — they are not part of the module's public surface).
- **Line numbers are exact.** `sourceFile.getLineAndCharacterOfPosition(node.pos)` gives the exact line, directly satisfying FR-005 of the spec.

**Alternatives considered**:
- **`ts-morph`.** More ergonomic than the raw compiler API but adds a dev dependency for a single-use tool. Rejected under Article IX.
- **Ripgrep patterns.** Fast and dependency-free, but pattern matching cannot distinguish top-level declarations from nested ones, misses multi-line type aliases, and produces false positives on strings or comments that happen to contain `interface Foo`. Rejected on correctness grounds — FR-005 requires exact line numbers and a complete, correct enumeration.
- **A TypeScript language-server query** (e.g., via `@typescript/ast-grep` or similar). Overkill for a one-off audit.

---

## R-2 — Classification automation level

**Decision**: Automate **signals** (heuristic hints) but keep **classification** a human step. The enumerator emits each entry with a list of detected signals; a human reviewer uses them as starting hints and records the final classification in a second-pass curated JSON file, alongside a one-line justification.

**Signals detected automatically**:
1. **`imports-from-schemas`** — the declaration's file imports anything from `@debrief/schemas`. Strong hint for `Schema-rooted` if the declaration is a re-export; weaker hint otherwise.
2. **`eslint-disable-no-restricted-syntax`** — an `// eslint-disable-next-line no-restricted-syntax` appears within 3 lines of the declaration. Strong hint for `Boundary / parse-time loose type` (matches E11's 35-warning inventory).
3. **`name-collides-with-schema-type`** — the declaration's name matches an exported symbol in `@debrief/schemas`'s public surface. Strong hint for `Drift candidate`.
4. **`name-collides-with-other-declarations`** — the same declaration name appears in 2+ files within the audit scope. Hint for `Drift candidate` (if shapes differ) or consolidation-opportunity.
5. **`in-services-directory`** — the declaration lives under `services/*/src/types/` or similar. Weak hint for `Cross-domain runtime type (must promote to LinkML)` if there's a matching Python-side concept; otherwise neutral.
6. **`single-file-use`** — the declaration is exported from exactly one file and imported nowhere else. Hint for `Single-domain convenience type` (if it's genuinely a local helper) or dead code (flag separately).

**Rationale**:
- **Classification is judgement.** The taxonomy in FR-004 has crisp edges on paper but individual entries can sit near them (e.g., a type used in one runtime today but likely to cross boundaries tomorrow). Fully automating the classification would mean writing rules that encode that judgement, which is where drift happens — the rules themselves would need audit. Keeping a human-readable justification per entry is the more honest posture.
- **Signals cut the curation cost dramatically.** The reviewer's workflow becomes "read the signal list, accept/override, write one-line justification" rather than "cold-read every declaration." Spot-checks suggest this turns a days-long curation into hours.
- **Auditability.** The curated JSON records both the automated signals and the human override (if any), so a later reviewer can see where judgement was applied.

**Alternatives considered**:
- **Fully automated classification.** Rejected — see above.
- **No automation; purely manual.** Rejected — 800–1,500 entries is too many to read cold, and the signals are genuinely useful hints.
- **ML-assisted classification.** Out of scope and unnecessary for a one-off task.

---

## R-3 — Intermediate artefact format

**Decision**: Two JSON files under `specs/219-audit-non-linkml-types/evidence/`:

1. **`inventory-raw.json`** — machine-generated output of `enumerate.ts`. One entry per declaration with `name`, `filePath`, `line`, `kind`, `signals[]`, and `isExported` (boolean). Deterministic: given the same git SHA, byte-identical on re-run.
2. **`inventory-classified.json`** — after human curation, each entry gains `classification`, `justification`, `followUpLink` (nullable), and `driftCohort` (nullable — for drift candidates, identifies other entries in the same cohort). Authored in a PR review.

The final `docs/type-audit-2026.md` is generated from `inventory-classified.json` via a small rendering script (or simply authored by hand from the JSON; the rendering script is a convenience, not a requirement).

**Rationale**:
- **Two-file split separates machine work from human judgement.** `inventory-raw.json` is the reproducibility anchor — any reviewer can re-run `enumerate.ts` at the recorded SHA and confirm the file matches. `inventory-classified.json` is the judgement log.
- **JSON is the right intermediate** — queryable, diffable, and the basis for any future re-audit's "what changed?" diff.
- **Evidence-folder placement.** Our existing evidence conventions (`specs/<feature>/evidence/`) store artefacts with stable YAML front matter; these JSON files are the equivalent for this feature.

**Alternatives considered**:
- **Single markdown file, no JSON.** Rejected — harder to diff across re-audits; curation edits would be mixed with enumeration changes.
- **CSV.** Rejected — doesn't represent the signal list cleanly.
- **SQLite.** Overkill for ~1,500 rows; blocks casual review.

---

## R-4 — Report format (`docs/type-audit-2026.md`)

**Decision**: The report has the following structure:

1. **Header** — title, git SHA, publication date, audit-script version, link back to the feature spec.
2. **Summary** — per-category counts; phase-impact summary mapping findings onto E11's phase list (which existing phases expand, which new phases are added).
3. **Methodology** — one paragraph describing the enumeration approach (so the counts are reproducible per FR-012) and a link to `scripts/type-audit/README.md` for the actual commands.
4. **Inventory tables** — one table per category (5 tables). Each row: declaration name, file:line (with GitHub-link), kind, justification, follow-up link (for must-promote / drift). Large tables (more than ~100 rows) are collapsed under `<details>` to keep the rendered page scrollable.
5. **Drift cohorts** — a dedicated subsection for each cohort (group of same-name-different-shape declarations), listing every variant's file:line and the diff of their shapes at a high level.
6. **Follow-up items** — a list of all backlog items (existing and newly-opened) that the audit produced or linked to.
7. **Change log** — an empty "Re-audits" section so future re-runs can be appended.

**Rationale**:
- **Summary first** satisfies the P1 user story (architecture lead wants the headline numbers immediately).
- **Methodology near the top** lets a sceptical reviewer quickly verify reproducibility.
- **Category-grouped tables** make it easy to scan within a category (the two categories that matter most — must-promote and drift — are at the top; schema-rooted is last and collapsed by default).
- **Drift cohorts as a dedicated section** visually separates "these shapes disagree and one of them is wrong" from the row-per-declaration table, which is the whole reason the audit exists.

**Alternatives considered**:
- **Flat table, category as a column.** Rejected — categories have different information needs (drift cohorts need multi-row grouping; schema-rooted entries need almost no commentary).
- **HTML report.** Rejected — markdown renders in GitHub, is diffable, and is the monorepo norm.

---

## R-5 — Follow-up backlog item style

**Decision**: Each must-promote or drift finding that isn't already covered by an existing item (#203, #204, #205, or a pre-existing E11-scoped item) is opened as a **new individual backlog item**, scoped to a single type (for must-promote) or a single drift cohort (for drift). Each new item:

- Has a title of the form `[E11] Promote <TypeName> to LinkML` or `[E11] Resolve <TypeName> drift cohort`.
- Links back to the specific row in `docs/type-audit-2026.md`.
- Lives under Epic E11 in `BACKLOG.md` (status: `proposed`, pending `/idea` triage).
- Gets scored by the backlog-prioritizer before pickup.

**Rationale**:
- **Individual scope preserves parallelism.** E11's existing structure is phase-per-boundary; adding one item per type fits that grain and keeps the resulting PRs reviewable.
- **Traceability.** The audit row links forward to the item; the item links back to the audit row. A reviewer picking up a new item can always see the originating context.
- **Triage gate.** New items enter at `proposed`, not `approved`, so the ideas-guy reviews strategic fit before scheduling.

**Alternatives considered**:
- **One umbrella item covering all findings.** Rejected — too coarse-grained; loses parallelism and makes individual reviews impossible.
- **Grouping by LinkML class target** (e.g., "all spatial types" → one item). Already partially done by #203; for remaining groups we'd need arbitrary judgement. Default to per-type; group only if the audit surfaces a natural cluster.

---

## R-6 — Generated-directory detection

**Decision**: Exclude by **directory path** using an explicit allow-list in the enumerator config. The known LinkML-generated directory is:

- `shared/schemas/src/generated/` — confirmed present; contains `typescript/index.ts`, `typescript/types.ts`, `typescript/unions.ts` and the Python generator output.

As a secondary filter, exclude any `.ts`/`.tsx` file whose first 5 lines contain the string `Auto-generated` or `// This file is generated` (case-insensitive) — this catches any generator output we haven't yet catalogued. Both filters are logged in the enumerator's output header so the report's Methodology section can cite the exact exclusions used.

**Rationale**:
- **Directory-based is deterministic and readable.** The exclusion list is short (one directory today) and reviewable at a glance.
- **Header-comment fallback is cheap.** Any generator we add later that writes a standard header gets caught without the enumerator needing an update.
- **Both filters are logged** so reviewers can audit the exclusion step itself.

**Alternatives considered**:
- **Header-comment only.** Rejected — relies on every generator writing a matching header, which is not guaranteed.
- **File-list manifest.** Too fragile; any new generated file would need the manifest updated.

---

## R-7 — Test-local exclusion patterns

**Decision**: Exclude files whose path matches any of:

- `**/__tests__/**`
- `**/__fixtures__/**`
- `**/*.test.ts` / `**/*.test.tsx`
- `**/*.spec.ts` / `**/*.spec.tsx`
- `**/*.stories.ts` / `**/*.stories.tsx`
- `**/test-utils/**` (repo-conventional)
- `**/e2e/**` (Playwright test files)

These patterns are listed verbatim in the enumerator's config and reproduced in the report's Methodology section (satisfying FR-003 of the spec).

**Rationale**:
- **Matches the repo's actual conventions** — spot-checks confirm these are the directories and suffixes used for test scaffolding today.
- **Explicit is better than implicit.** The patterns are part of the report; they can be challenged or expanded if a reviewer disagrees.

**Alternatives considered**:
- **Exclude anything that imports `vitest` / `@testing-library/*`.** Plausible but brittle — a production file could legitimately re-export a testing utility (unlikely but possible).
- **No test-local exclusion; classify tests as their own category.** Rejected — the spec explicitly excludes test-local types; the audit is about production boundaries.

---

## Unknowns resolved

All `NEEDS CLARIFICATION` markers from the plan's Technical Context section have been resolved by the decisions above. No residual unknowns.

## Summary of research outputs

| # | Decision | Impact |
|---|----------|--------|
| R-1 | TypeScript compiler API for enumeration | Zero new deps; AST-accurate |
| R-2 | Automated signals + human classification | Cuts curation time; preserves judgement trail |
| R-3 | Two JSON artefacts (raw + classified) | Reproducibility + auditability |
| R-4 | Markdown report with summary-first layout | Satisfies P1 user story |
| R-5 | Per-type follow-up backlog items under E11 | Preserves parallelism; clear traceability |
| R-6 | Directory-based generated exclusion + header fallback | Deterministic, future-proof |
| R-7 | Explicit test-local pattern list | Auditable scope decisions |
