<!--
Report template for docs/type-audit-2026.md.
All placeholders in double-braces {{like_this}} are replaced at publication time
from data conforming to contracts/audit-entry.schema.json (AuditReport entity).
Tables are human-curated from inventory-classified.json.
-->

# Non-LinkML Type Audit ({{publishedAt}})

**Audit feature**: [`specs/219-audit-non-linkml-types/spec.md`]({{featureSpec}})
**Git SHA**: `{{gitSha}}`
**Enumerator version**: `v{{enumeratorVersion}}`
**Total declarations audited**: `{{totalDeclarations}}`

---

## 1. Summary

Per-category breakdown of every top-level TypeScript `interface` / `type` / `enum` declaration under `apps/`, `shared/` (excluding `shared/schemas/src/generated/`), and `services/`.

| Category | Count | Action required |
|----------|------:|-----------------|
| Schema-rooted (`@debrief/schemas`) | {{counts.schema-rooted}} | None |
| Boundary / parse-time loose | {{counts.boundary-loose}} | Review — see §4 |
| Single-domain convenience | {{counts.single-domain-convenience}} | None (recorded exception) |
| **Cross-domain runtime (must promote to LinkML)** | **{{counts.must-promote}}** | **Follow-up items opened — see §5** |
| **Drift candidate** | **{{counts.drift-candidate}}** | **Follow-up items opened — see §6** |

## 2. Phase impact on Epic E11

| Phase | Status | Entries | Notes |
|-------|--------|--------:|-------|
{{#each phaseImpact}}
| {{phase}} | {{status}} | {{relatedEntryIds.length}} | {{notes}} |
{{/each}}

## 3. Methodology

Enumeration was performed by `scripts/type-audit/enumerate.ts` (a Node/TypeScript script using the bundled `typescript` compiler API) walking `.ts` and `.tsx` files under the audit scope. See `scripts/type-audit/README.md` for the exact command and re-audit instructions.

**Exclusions applied**:

- LinkML-generated output: `shared/schemas/src/generated/**`
- Header-comment fallback: files whose first 5 lines contain `Auto-generated` (case-insensitive)
- Test-local patterns: `**/__tests__/**`, `**/__fixtures__/**`, `**/*.test.(ts|tsx)`, `**/*.spec.(ts|tsx)`, `**/*.stories.(ts|tsx)`, `**/test-utils/**`, `**/e2e/**`
- Inline anonymous types (not named declarations) are not counted.

**Classification signals** (automated hints, not final classifications — see `specs/219-audit-non-linkml-types/research.md` §R-2):

- `imports-from-schemas` — file imports from `@debrief/schemas`
- `eslint-disable-no-restricted-syntax` — disable-comment within 3 lines of declaration
- `name-collides-with-schema-type` — name matches an exported `@debrief/schemas` symbol
- `name-collides-with-other-declarations` — same name in 2+ files
- `in-services-directory` — declaration under `services/*/src/types/` or similar
- `single-file-use` — exported from one file, imported nowhere

**Reproducibility**: Running the enumerator at git SHA `{{gitSha}}` produces byte-identical `inventory-raw.json`.

## 4. Inventory — by category

### 4.1 Cross-domain runtime (must promote to LinkML)

<!-- One row per ClassifiedInventoryEntry where classification == "must-promote" -->

| Name | Location | Kind | Justification | Follow-up |
|------|----------|------|---------------|-----------|
| `TypeName` | `file/path.ts:123` | `interface` | One-line reason | [#NNN](…) |

### 4.2 Drift candidates

<!-- One row per ClassifiedInventoryEntry where classification == "drift-candidate" -->
<!-- Cohort members appear together via driftCohort field; see §6 for cohort narrative. -->

| Name | Location | Kind | Cohort | Follow-up |
|------|----------|------|--------|-----------|
| `TypeName` | `file/path.ts:45` | `type` | `cohort-slug` | [#NNN](…) |

### 4.3 Boundary / parse-time loose

<details>
<summary>Boundary entries ({{counts.boundary-loose}})</summary>

| Name | Location | Kind | Justification |
|------|----------|------|---------------|
| `TypeName` | `file/path.ts:77` | `type` | Parse-time JSON envelope; guarded via … |

</details>

### 4.4 Single-domain convenience

<details>
<summary>Single-domain entries ({{counts.single-domain-convenience}})</summary>

| Name | Location | Kind | Justification |
|------|----------|------|---------------|
| `TypeName` | `file/path.ts:12` | `interface` | TS-only UI preference shape; no Python counterpart. |

</details>

### 4.5 Schema-rooted

<details>
<summary>Schema-rooted entries ({{counts.schema-rooted}})</summary>

| Name | Location | Kind |
|------|----------|------|
| `TypeName` | `file/path.ts:3` | `type` |

</details>

## 5. Must-promote follow-up items

One item per type:

- [#NNN](https://github.com/debrief/debrief-future/issues/NNN) — `[E11] Promote TypeName to LinkML` (entry `{{entryId}}`)
- …

## 6. Drift cohorts

<!-- One section per DriftCohort entity -->

### 6.1 `cohortId` — display name

**Members**:
- `TypeName` in `file/a.ts:12`
- `TypeName` in `file/b.ts:45`

**Shape disagreement**: Short prose summary (≤ 400 chars).

**Follow-up**: [#NNN](…)

## 7. Change log

| Date | SHA | Summary |
|------|-----|---------|
| {{publishedAt}} | {{gitSha}} | Initial audit. |
