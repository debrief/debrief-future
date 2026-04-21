# Phase 0 — Research: [E11] Audit non-LinkML type declarations

**Feature**: 206-audit-non-linkml-types
**Date**: 2026-04-21

## Purpose

Resolve the technical-context questions raised by the spec before design. There
are **no `[NEEDS CLARIFICATION]` markers** in the spec; the research here locks
in methodology choices that keep the audit reproducible and the Markdown
report diff-friendly.

---

## R1 — How should type declarations be discovered?

**Decision**: Walk in-scope source with the **TypeScript compiler API**
(`typescript` module) via a small `tsx`-run script at
`scripts/audits/type-audit/scan.ts`. For each `.ts` / `.tsx` file, traverse the
AST and emit one record per `InterfaceDeclaration`, `TypeAliasDeclaration`, or
`EnumDeclaration` node. Emit records to an intermediate JSON file, then a
reviewer uses that JSON to author the committed Markdown report.

**Rationale**:

- AST-level traversal catches `type X = ...`, `interface X {}`, and `enum X {}`
  uniformly and correctly handles generics, template-literal types, and nested
  declarations — `grep`-only approaches drift at edge cases.
- `tsx` is already a root devDependency (`package.json:scripts` already uses
  it). `typescript` is a workspace-level devDep in several packages
  (`apps/vscode`, `apps/loader`, `apps/web-shell`, `apps/spec-navigator`,
  `shared/components`) — the script runs under the workspace resolver (e.g.
  `pnpm --filter @debrief/components exec tsx ../../scripts/audits/type-audit/scan.ts`)
  or we hoist `typescript` into the repo-root `devDependencies`.
- Output is a plain JSON file; the Markdown report is hand-edited on top. This
  keeps human judgement (classification) in one place without coupling to the
  scanner's emission format.

**Alternatives considered**:

- **Regex via `ripgrep`** (as used by `scripts/check-no-hand-typed-temporal-enums.sh`)
  — simpler, works without `typescript`, but prone to false negatives on
  multi-line declarations and false positives inside comments / strings. Good
  enough for a narrow guard; too loose for a comprehensive inventory.
- **`ts-morph`** — ergonomic wrapper around the TS compiler. Would require
  adding a new dependency for a one-shot audit tool; Article IX ("every
  dependency is a liability") argues against.
- **ESLint rule with a JSON reporter** — overkill; adds CI coupling we do not
  need for a one-shot analysis.

---

## R2 — How do we distinguish Schema-rooted vs. Single-domain convenience?

**Decision**: For each discovered declaration, the scanner also records the
file's `import` statements. If the containing file imports from
`@debrief/schemas` (or any workspace re-export of it) **and** the declaration
is a trivial alias / re-export of a schema type, mark candidate as
`Schema-rooted` automatically. All other declarations enter the report as
`Unclassified` and the human reviewer assigns one of the four remaining
buckets.

**Rationale**: The distinction between Single-domain convenience, Boundary, and
Cross-domain hand-typed requires judgement about whether the type crosses the
Python ↔ TS boundary or stays local — a machine cannot infer that reliably.
Auto-classifying only the unambiguous Schema-rooted case keeps the reviewer's
workload tractable without introducing misclassification risk.

**Alternatives considered**:

- **Full auto-classification** — rejected. Misclassification would be
  undetectable at scale.
- **Zero auto-classification** — every row classified manually. Workable but
  adds ~hundreds of trivial re-export rows to the reviewer's workload when the
  scanner could trivially dispatch them.

---

## R3 — Where does the report live, and how do we link it?

**Decision**: The committed report lives at
`docs/type-audit-2026.md`. The file includes:

- Metadata front matter (`git_sha`, `captured_at`, `scanner_version`) to
  satisfy the project's evidence-freshness convention.
- A methodology section (paths, exclusions, classification rules, re-run
  instructions) — satisfies FR-009 and SC-004.
- A findings table sorted by classification → package → file path.
- A summary section with counts per bucket and a list of newly opened
  backlog items.
- A Python cross-domain appendix (if any candidates found) — satisfies
  FR-012.

The report is linked from `docs/ideas/E11-schema-first-boundary-typing.md`
(satisfies FR-010 / SC-003). The report contains a back-link to the epic
document in its first paragraph.

**Rationale**: `docs/` is the established home for cross-cutting
documentation. The `-2026` suffix matches the project's existing naming of
time-stamped analysis artefacts (c.f. existing `docs/` content) and leaves
room for a future `-2027` audit without a rename dance.

**Alternatives considered**:

- Place the report inside `specs/206-audit-non-linkml-types/` — rejected. The
  report is a durable output that outlives the feature branch; it belongs in
  the long-lived docs tree so it can be referenced from the epic and from
  future E11 phase items.
- Split the report across multiple files (one per bucket) — rejected. A
  single file keeps the summary counts honest and makes re-run diffs easy to
  review.

---

## R4 — How do we detect Drift candidates?

**Decision**: After scanning, group records by declaration name (case-sensitive).
Any name declared in more than one in-scope file is flagged as a **Drift
candidate shortlist** and presented to the reviewer alongside an AST-hash
column. The reviewer confirms drift (same name, different shape) vs. benign
re-declaration (identical shape across packages) and assigns the final
classification.

**Rationale**: Same-name-different-shape is the most dangerous drift pattern
and is cheap to detect automatically. Identical-shape duplication is still
worth noting but is not always a bug (e.g. deliberate re-declarations in
isolated contexts).

**Alternatives considered**:

- **Structural comparison across all types** (not just same-name) — rejected.
  High false-positive rate; unrelated types with similar shapes would flood
  the shortlist.
- **Name-only clustering with no shape check** — rejected. Would miss the
  case where a deliberate re-export shadow has the same shape (not drift).

---

## R5 — Is the scanner committed to the repo?

**Decision**: **Yes.** The scanner is committed at
`scripts/audits/type-audit/` (folder — includes `scan.ts`, a small README, and
any tsconfig needed to run it). It is not wired into `task lint` or CI; it is
a one-shot / ad-hoc tool invoked by the reviewer when re-running the audit.

**Rationale**: Reproducibility is an explicit FR (FR-009) and success
criterion (SC-004). A committed script is the cheapest way to make the
methodology executable rather than descriptive.

**Alternatives considered**:

- Keep the scanner as a throwaway gist — rejected. Violates the
  reproducibility FR.
- Wire the scanner into CI as a lint gate — rejected as over-scope for this
  feature; the scanner is for reviewers, not for blocking merges. A
  narrower regression-guard script (like
  `check-no-hand-typed-temporal-enums.sh`) is the appropriate pattern for
  follow-up E11 phases.

---

## R6 — How should `Record<string, unknown>` / `unknown` aliases be flagged?

**Decision**: The scanner looks at each `TypeAliasDeclaration`'s right-hand
side (`node.type`). If the RHS resolves (syntactically) to
`Record<string, unknown>`, `Record<string, any>`, `unknown`, `any`, or an
intersection/union that contains any of those, the record is auto-tagged as
`boundary-candidate`. Reviewer confirms to `Boundary / parse-time loose type`.

**Rationale**: These aliases are the textbook boundary pattern E11 is
chartered to eliminate. Surfacing them automatically focuses reviewer
attention on the cases most likely to need schema-promotion.

**Alternatives considered**:

- Rely entirely on the reviewer to spot these — rejected. Loose aliases are
  exactly what the audit is looking for; machine help is trivially cheap.

---

## R7 — How do we open the follow-up backlog items?

**Decision**: In the same pull request that lands the report, append the
newly required items to `BACKLOG.md` following the project's existing item
format (next available ID, category `Infrastructure`, status `approved` if
ready or `needs-interview` if scope still hazy). The report's "Newly opened
backlog items" summary table lists each new ID with a one-line description
and a link into `BACKLOG.md`.

**Rationale**: Co-locating the report and the backlog edits in one PR keeps
the audit's actionable findings traceable and prevents the "report published
but nobody filed the follow-ups" failure mode.

**Alternatives considered**:

- Land the report first, open backlog items afterwards — rejected. Creates a
  window where the report references IDs that do not yet exist.
- Open GitHub Issues rather than BACKLOG.md entries — rejected. The project's
  canonical backlog lives in `BACKLOG.md`; issues are for execution work after
  backlog triage.

---

## Technical-context resolution

All items below are derived from the decisions above.

| Field | Value |
|-------|-------|
| Language/Version | TypeScript 5.x (scanner + scanned source); Python 3.11 only referenced in appendix |
| Primary dependencies | `typescript` compiler API (already in multiple workspaces), `tsx` (root devDep) |
| Storage | N/A — writes to `docs/type-audit-2026.md`, `docs/ideas/E11-schema-first-boundary-typing.md`, `BACKLOG.md`, and commits the scanner at `scripts/audits/type-audit/` |
| Testing | Light unit tests for the scanner using small fixture files (enumerate expected count, verify auto-tagging heuristics); no schema/CI tests required |
| Target Platform | Node.js (scanner), Markdown (report) |
| Project Type | tooling / analysis — single deliverable |
| Performance Goals | Scanner completes in under 30 seconds on full repo; not a hot path |
| Constraints | Read-only analysis (FR-011); scanner must be deterministic (stable ordering for diff-friendly re-runs) |
| Scale/Scope | Estimated ~200–500 named declarations across in-scope paths (subject to confirmation on first run) |

No `[NEEDS CLARIFICATION]` markers remain.
