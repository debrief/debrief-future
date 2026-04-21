# Data Model — [E11] Audit non-LinkML type declarations

**Feature**: 206-audit-non-linkml-types
**Date**: 2026-04-21

This audit does not introduce runtime data models consumed by services or
frontends. The "data model" here describes the shape of **the audit's
intermediate JSON and of the report's row-level content** so reviewers can
extend the scanner or consume its output reliably.

---

## Entities

### 1. TypeDeclarationRecord

Emitted by the scanner — one record per named `interface` / `type` / `enum`
declaration in in-scope source.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable identifier — `${packageName}:${relativeFilePath}:${declarationName}` |
| `packageName` | `string` | `pnpm` workspace name the declaration belongs to (e.g. `@debrief/components`). Empty string if the file is outside a workspace. |
| `filePath` | `string` | Repo-relative path, forward-slash normalised |
| `lineNumber` | `integer` | 1-based line number of the declaration's first token |
| `declarationName` | `string` | The exported identifier (e.g. `Coordinate`) |
| `kind` | `enum { interface, type, enum }` | TypeScript declaration kind |
| `isExported` | `boolean` | `true` if the declaration has an `export` modifier |
| `shapeHash` | `string` | SHA-1 hash of the declaration's AST printed form (used for Drift-candidate clustering) |
| `rhsSummary` | `string \| null` | For `type` aliases, a short textual summary of the RHS (truncated to 160 chars); `null` for `interface` / `enum` |
| `imports` | `string[]` | Module specifiers imported in the containing file — drives Schema-rooted auto-tagging |
| `autoTag` | `enum { schema-rooted-candidate, boundary-candidate, drift-shortlist, none }` | Cheap machine-applied hint. The reviewer may override. |

**Uniqueness**: `id` is unique per record. Two declarations with identical
`declarationName` but different `filePath` are distinct records and both
retain their own `id`.

**State transitions**: Records are immutable once emitted by the scanner.
Classifications happen downstream inside the reviewer's Markdown report,
not by mutating these records.

---

### 2. Classification

Applied by the reviewer — one classification per `TypeDeclarationRecord`.

**Enumeration (closed set, per spec FR-004)**:

1. `schema-rooted` — imported from `@debrief/schemas` (or a workspace
   re-export of it), or a trivial alias/re-export of a schema type.
2. `boundary-loose` — a parse-time / boundary-facing alias that collapses
   to `unknown`, `Record<string, unknown>`, or an intersection/union
   containing either.
3. `single-domain` — a convenience type with no Python counterpart that
   lives entirely in one runtime (TS-only). An allowed exception; the
   reviewer records the justification.
4. `cross-domain-hand-typed` — describes data that crosses the Python ↔ TS
   boundary or is serialised to disk, but is not schema-rooted. **Violates
   the principle; must be promoted to LinkML.**
5. `drift-candidate` — same declaration name as another record with a
   different `shapeHash`, or otherwise exhibits drift against a schema type.

**Invariant**: exactly one classification per record; no multi-tagging.

---

### 3. Finding

A row in the report's findings table.

| Field | Type | Description |
|-------|------|-------------|
| `record` | `TypeDeclarationRecord` | The declaration being classified |
| `classification` | `Classification` | One of the five buckets |
| `summary` | `string` | Reviewer-authored one-line description of what the type represents |
| `recommendedAction` | `string` | Short imperative — "Fold into #204", "Open new item", "Keep — convenience type", "No action", etc. |
| `backlogItemRef` | `BacklogItemRef \| null` | Required for `cross-domain-hand-typed` and `drift-candidate`; optional otherwise |
| `justification` | `string \| null` | Required for `single-domain` (why the exception is deliberate) |

**Validation rules** (enforced by spec FR-006 + SC-002):

- If `classification ∈ { cross-domain-hand-typed, drift-candidate }` then
  `backlogItemRef` MUST be non-null.
- If `classification === single-domain` then `justification` MUST be non-null.
- `recommendedAction` MUST be non-empty for every finding.

---

### 4. BacklogItemRef

A reference to an existing or newly opened `BACKLOG.md` entry.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `integer` | Numeric backlog item ID (e.g. 203, 204, 205, or a newly minted ID) |
| `title` | `string` | Short title from `BACKLOG.md` |
| `isNew` | `boolean` | `true` if opened as part of this audit PR |
| `anchor` | `string` | Markdown link target — e.g. `BACKLOG.md#206` or `docs/ideas/207-promote-tool-result-envelope.md` |

---

### 5. PythonCrossDomainCandidate

Entries in the report's Python appendix (spec FR-012). Not classified
against the five buckets; surfaced as signals.

| Field | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | Repo-relative path to the Python file |
| `declarationName` | `string` | Class / TypedDict / dataclass name |
| `kind` | `enum { BaseModel, TypedDict, dataclass, NamedTuple, Enum }` | Python declaration kind |
| `crossDomainEvidence` | `string` | Why the reviewer believes this type crosses into TS (e.g. "serialised via MCP tool result", "written to STAC Item properties") |
| `suggestedFollowUp` | `string` | Imperative — "Audit separately under a Python-side E11 phase", etc. |

---

### 6. AuditReport (the committed Markdown document)

Top-level container. The `data-model` is the document's section order and
required front matter.

**Required front matter** (YAML):

```yaml
---
feature: 206-audit-non-linkml-types
epic: E11
captured_at: 2026-04-21   # ISO date of audit run
git_sha: <commit SHA at which the scan was run>
scanner_version: v1       # bumped if scan.ts semantics change
---
```

**Required sections** (in order):

1. Title + back-link to `docs/ideas/E11-schema-first-boundary-typing.md`
2. Summary (per-bucket counts, list of newly opened backlog items)
3. Methodology (in-scope paths, exclusions, classification rules, re-run
   command)
4. Findings table (sorted by classification → package → file path)
5. Python cross-domain appendix (may be empty — include section with an
   explicit "No candidates found" line if so)
6. Changelog / re-run history (appended on subsequent runs)

---

## Relationships

```text
AuditReport 1 ─── * Finding
Finding      1 ─── 1 TypeDeclarationRecord
Finding      1 ─── 0..1 BacklogItemRef
AuditReport  1 ─── * PythonCrossDomainCandidate
```

No circular references. No persistence layer — all data lives in Git-tracked
files (`docs/type-audit-2026.md`, `BACKLOG.md`, the intermediate JSON emitted
by the scanner into an uncommitted local path).

---

## Derived metrics (for the Summary section)

| Metric | Source |
|--------|--------|
| Total in-scope declarations | count of `TypeDeclarationRecord` |
| Count per classification | group-by of `Finding.classification` |
| Count of newly opened backlog items | count of `BacklogItemRef` where `isNew === true` |
| Drift clusters | count of declaration names with >1 record and >1 distinct `shapeHash` |
