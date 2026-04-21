# Phase 1 Data Model: Audit non-LinkML Type Declarations

**Feature**: 219-audit-non-linkml-types
**Date**: 2026-04-21

This document defines the data structures used by the audit tooling. Every entity is internal to the audit (not production runtime); there is no LinkML schema change for this feature. Formal JSON Schema definitions live in [`contracts/audit-entry.schema.json`](./contracts/audit-entry.schema.json).

---

## Entities

### 1. `RawInventoryEntry`

Emitted by `scripts/type-audit/enumerate.ts` into `evidence/inventory-raw.json`. One entry per named top-level `interface` / `type` / `enum` declaration in the audit scope.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Stable identifier: `sha1("<filePath>:<line>:<name>")`. Survives renames only if path+line+name stable. |
| `name` | `string` | ✓ | Declaration name (e.g., `Coordinate`, `ToolResult`). |
| `filePath` | `string` | ✓ | Repo-relative path (forward slashes). |
| `line` | `integer` | ✓ | 1-based line number of the declaration keyword. |
| `kind` | `"interface" \| "type" \| "enum"` | ✓ | Syntactic kind. |
| `isExported` | `boolean` | ✓ | Whether the declaration is exported from its module. |
| `signals` | `Signal[]` | ✓ | Automated classification hints. Empty array if none fired. |

**Validation rules**:

- `name` MUST be a valid TS identifier.
- `filePath` MUST NOT match any pattern in the configured test-local or generated-directory exclusions.
- `line` MUST be `>= 1`.
- `kind` MUST be one of the three literals.
- `signals` is deduplicated (no duplicate signal kinds on the same entry).

**Determinism guarantee**: For a given git SHA and enumerator version, the sorted list of `RawInventoryEntry` objects is byte-identical across re-runs. Sorting key: `(filePath, line, name)`.

---

### 2. `Signal`

An automated classification hint attached to a `RawInventoryEntry`. See research §R-2 for the detection logic.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | `SignalKind` (enum) | ✓ | Which signal fired. |
| `detail` | `string` | ✓ | Short human-readable context (e.g., for `name-collides-with-other-declarations`, the other file:line locations). |

**`SignalKind` enum**:

- `imports-from-schemas`
- `eslint-disable-no-restricted-syntax`
- `name-collides-with-schema-type`
- `name-collides-with-other-declarations`
- `in-services-directory`
- `single-file-use`

---

### 3. `ClassifiedInventoryEntry`

A `RawInventoryEntry` extended with human-authored curation fields. Stored in `evidence/inventory-classified.json`.

**Fields** (adds to `RawInventoryEntry`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `classification` | `Classification` (enum) | ✓ | Final category. |
| `justification` | `string` | ✓ | One-line reason (≤ 200 chars). |
| `followUpLink` | `string \| null` | conditional | Backlog item reference (e.g., `#204`) or URL. **Required** when `classification ∈ {must-promote, drift-candidate}`; `null` otherwise. |
| `driftCohort` | `string \| null` | conditional | Cohort identifier (e.g., `coordinate-shapes`) when `classification == drift-candidate`; `null` otherwise. Entries in the same cohort share this value. |
| `reviewer` | `string` | ✓ | GitHub handle of the human who classified this entry. |
| `overrodeSignal` | `boolean` | ✓ | `true` if the classification contradicts what the signals suggested; forces an extra-detail justification. |

**`Classification` enum** (matches FR-004 of the spec):

- `schema-rooted` — re-exports / direct uses from `@debrief/schemas`.
- `boundary-loose` — parse-time loose type at a data boundary.
- `single-domain-convenience` — TS-only, allowed exception.
- `must-promote` — cross-domain runtime type; must be promoted to LinkML.
- `drift-candidate` — same-name-different-shape across declarations.

**Validation rules**:

- `justification` is required for every entry (no empty strings).
- `followUpLink` is required when and only when `classification ∈ {must-promote, drift-candidate}`.
- `driftCohort` is required when `classification == drift-candidate`. Cohorts with < 2 entries are a validation error.
- When `overrodeSignal == true`, `justification` MUST contain at least one sentence explaining the override (checked by a lint step, not just length).

**State transitions**: None. An entry's classification may be revised in a follow-up commit, but this is a new write, not a state machine — the file is the journal.

---

### 4. `AuditReport`

The top-level metadata block for `docs/type-audit-2026.md`. Rendered directly into the report's header.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureSpec` | `string` | ✓ | Path to this feature's spec (`specs/219-audit-non-linkml-types/spec.md`). |
| `gitSha` | `string` | ✓ | Full 40-char SHA of `HEAD` at audit time. |
| `publishedAt` | `string` (ISO 8601 date) | ✓ | Date the report was published (`YYYY-MM-DD`). |
| `enumeratorVersion` | `string` | ✓ | Semver of `scripts/type-audit/`. Bumped on any enumeration-logic change. |
| `totalDeclarations` | `integer` | ✓ | Sum of entries in all five categories. |
| `counts` | `Record<Classification, integer>` | ✓ | Per-category counts. Sum MUST equal `totalDeclarations`. |
| `phaseImpact` | `PhaseImpactEntry[]` | ✓ | One entry per E11 phase (existing + new). |

**Validation rules**:

- `gitSha` MUST be 40 hex chars.
- `publishedAt` MUST parse as a valid ISO 8601 date.
- `counts` MUST have a key for every `Classification` value (zero allowed).
- `Σ counts.values == totalDeclarations`.

---

### 5. `PhaseImpactEntry`

Describes how the audit's findings map onto E11's existing phase list.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phase` | `string` | ✓ | E11 phase identifier (`Phase 1`…`Phase 5`, or a newly-added `Phase 6+`). |
| `status` | `"existing" \| "expanded" \| "new"` | ✓ | Whether the audit left this phase unchanged, expanded its scope, or introduced it. |
| `relatedEntryIds` | `string[]` | ✓ | List of `ClassifiedInventoryEntry.id`s that fall under this phase. Empty allowed for `existing` phases the audit didn't touch. |
| `notes` | `string \| null` | optional | Free-form commentary (e.g., "expanded to include `DatasetEnvelope`"). |

---

### 6. `DriftCohort`

A logical grouping of `ClassifiedInventoryEntry` objects that share a name but disagree on shape. Rendered as its own subsection in the report.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cohortId` | `string` | ✓ | Slug matching `driftCohort` on member entries (e.g., `coordinate-shapes`). |
| `displayName` | `string` | ✓ | Human-friendly cohort name. |
| `memberEntryIds` | `string[]` | ✓ | `RawInventoryEntry.id`s of all members. Length MUST be `>= 2`. |
| `shapeSummary` | `string` | ✓ | Short description of how the shapes disagree (≤ 400 chars). Not a full diff. |
| `followUpLink` | `string` | ✓ | Backlog item tracking the drift resolution. |

**Validation rules**:

- Every `ClassifiedInventoryEntry` with `classification == drift-candidate` MUST belong to exactly one `DriftCohort`.
- Every member of a `DriftCohort` MUST have matching `driftCohort` field values.

---

## Relationships

```text
AuditReport
  ├── counts (per Classification)
  └── phaseImpact[]
        └── relatedEntryIds[] ──► ClassifiedInventoryEntry

ClassifiedInventoryEntry (extends RawInventoryEntry)
  ├── signals[] (from enumeration)
  ├── classification
  ├── followUpLink (required for must-promote / drift-candidate)
  └── driftCohort ──► DriftCohort.cohortId  (for drift-candidate only)

DriftCohort
  └── memberEntryIds[] ──► ClassifiedInventoryEntry.id
```

## Non-goals

- **No runtime type inference.** Entries are enumerated syntactically — we don't resolve `type Foo = Bar` chains.
- **No automatic shape diff.** `DriftCohort.shapeSummary` is authored by the reviewer; we don't attempt to structurally diff interfaces.
- **No cross-language (Python) entities.** Pydantic / dataclass / TypedDict declarations are out of scope (see spec's Assumptions).
