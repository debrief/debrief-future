# Data Model: Drift-Prevention Rule for `@debrief/utils` Re-duplication

**Feature**: 214-utils-drift-guard
**Phase**: 1
**Date**: 2026-04-20

## Scope note

This feature is a static lint-time check. It has no runtime persistence, no database schema, and no network protocol. The "data model" below describes the rule-internal structures that flow through the module at lint time, derived from the entities listed in `spec.md`.

## Entities

### 1. `ForbiddenName`

The canonical unit of "a name `@debrief/utils` owns that `apps/*` must not redeclare".

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `name` | `string` | Parsed from `shared/utils/src/index.ts` AST | The exported identifier (e.g. `calculateBounds`, `SafeFeature`, `formatDuration`). Case-sensitive. |
| `kind` | `'value' \| 'type'` | AST: presence of `type` modifier on the `ExportSpecifier` or on the `ExportNamedDeclaration`'s `exportKind` | Drives which of the seven selectors (research.md Decision 3) apply. Type-only names match selectors 4/5; value names match 1/2/3/7. Names exported in both forms (rare) are tracked as two entries. |

**Validation**:
- `name` is a valid ECMAScript identifier (matches `/^[A-Za-z_$][A-Za-z0-9_$]*$/`). The parser guarantees this structurally.
- The set of `ForbiddenName`s has no duplicates on `(name, kind)` — if the same name appears in multiple `export { … }` blocks in `index.ts`, it is deduplicated.

**State transitions**: None. The set is built once at rule-module load time and is immutable thereafter within a single ESLint run.

### 2. `ForbiddenSet`

A lookup-efficient collection of `ForbiddenName`s, consumed by the selector generator.

| Field | Type | Notes |
|-------|------|-------|
| `values` | `Set<string>` | Names whose `kind === 'value'`. Drives selectors 1, 2, 3, 7. |
| `types` | `Set<string>` | Names whose `kind === 'type'`. Drives selectors 4, 5. Also folded into selector 6 (`TSEnumDeclaration`) since TS enums span both value and type realms. |

**Validation**: `values ∩ types` may be non-empty (a name exported as both a value and a type). Both sets are populated in that case.

**State transitions**: None.

### 3. `RestrictedSyntaxEntry`

The shape consumed by ESLint's built-in `no-restricted-syntax` rule.

| Field | Type | Notes |
|-------|------|-------|
| `selector` | `string` | ESLint / ES-query selector string. One of the seven shapes from research.md Decision 3. |
| `message` | `string` | Human-readable violation message. Constructed from a template — see `FailureMessage` below. |

**Cardinality**: `7 × |ForbiddenSet|` entries in the worst case (every name gets all seven selectors). In practice closer to `|values| × 4 + |types| × 2 + |values with enum shape| × 1` because a given name is only one AST shape. The module emits all seven per name — ESLint is indifferent to never-matching selectors; this is simpler than per-name shape inference and aligns with the spec's "don't optimise what doesn't need optimising" posture.

**Validation**: `selector` is a valid ES-query string (verified by ESLint at rule-load time; a malformed selector is a rule-author bug, not a user-facing error).

**State transitions**: None; entries are generated once and passed to ESLint by reference.

### 4. `FailureMessage`

The text emitted when a violation is detected. Ties directly to `spec.md` FR-003, FR-008 and SC-005.

**Template**:

```text
'<NAME>' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { <NAME> } from '@debrief/utils';
```

**Field substitution**:

| Placeholder | Source | Example |
|-------------|--------|---------|
| `<NAME>` | The `ForbiddenName.name` matched by the selector | `calculateBounds`, `SafeFeature`, `formatDuration` |

**Rendered example (for `calculateBounds`)**:

> `'calculateBounds' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { calculateBounds } from '@debrief/utils';`

**Rendering constraints**:
- No ANSI escape codes (FR-008).
- No leading/trailing whitespace.
- Single-line. ESLint prepends the file path and line/column when reporting — the rule does not repeat them.

### 5. `Violation` (ephemeral, emitted by ESLint)

Not constructed by the rule module — produced by ESLint when a `RestrictedSyntaxEntry` matches. Listed here because `spec.md` names it as a key entity.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `filePath` | `string` | ESLint's `context.getFilename()` | Repo-root-relative path (FR-003). |
| `ruleId` | `string` | `'no-restricted-syntax'` | Always literal. |
| `message` | `string` | `FailureMessage` above | Embeds symbol + remediation hint. |
| `line` | `number` | ESLint report | Line of the offending declaration. |
| `column` | `number` | ESLint report | Column of the offending declaration. |
| `severity` | `'error'` | Fixed | Set by the per-app `.eslintrc.cjs` wiring at `'error'`, not `'warn'`, so `pnpm lint` fails (FR-004). |

**State transitions**: Emitted, logged, not persisted.

## Data flow

```text
shared/utils/src/index.ts  (source of truth)
        │
        │  parsed at rule-module require-time
        ▼
 ForbiddenName[]  ─────────►  ForbiddenSet
                                  │
                                  │  expanded to 7 selectors per name
                                  ▼
                         RestrictedSyntaxEntry[]
                                  │
                                  │  spread into no-restricted-syntax array
                                  ▼
              apps/*/.eslintrc.cjs no-restricted-syntax config
                                  │
                                  │  ESLint runs across apps/*/src/**
                                  ▼
                 (match?) ──► Violation  ──► CI log + non-zero exit
                     │
                     └── (no match) ──► clean lint ──► zero exit
```

## Entities *not* modelled (out of scope)

- **App file metadata**: ESLint already tracks which files are being linted via the config-resolution tree. The rule does not maintain its own file inventory.
- **Cross-file analysis state**: The rule is purely per-file AST analysis. There is no global state across `apps/*` files.
- **Persistence / caching**: None. The forbidden set is rebuilt on every ESLint cold start (or reused during a single run via Node's require-cache). ESLint's own file-level cache handles re-run performance.

## Implications for tests

The `ForbiddenSet` derivation (entity 1 → 2) is the highest-risk piece of logic and warrants the most unit-test coverage: permuted `export` shapes in `shared/utils/src/index.ts`, `type`-modifier placements, comments, trailing commas. The `RestrictedSyntaxEntry` generation (2 → 3) and `FailureMessage` rendering (4) are straightforward string templating and need only smoke-test coverage. The `Violation` emission (5) is ESLint-internal and is exercised end-to-end by the fixture tests.
