# Data Model: Drift-Prevention Rules for `@debrief/*` Re-duplication

**Feature**: 214-utils-drift-guard
**Phase**: 1
**Date**: 2026-04-20
**Updated**: 2026-04-20 during `/speckit.review` — entities generalised to cover all five `@debrief/*` packages and the wiring-forgotten meta-check.

## Scope note

This feature is a static lint-time check. It has no runtime persistence, no database schema, and no network protocol. The "data model" below describes the rule-internal structures that flow through the factory and its five caller modules at lint time, derived from the entities listed in `spec.md`. Entities added during `/speckit.review` are flagged.

## Entities

### 1. `ForbiddenName`

The canonical unit of "a name some `@debrief/*` package owns that `apps/*` must not redeclare".

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `name` | `string` | Parsed from the package's index barrel AST (transitively including `export *` forwards within the package's own `src/`) | The exported identifier (e.g. `calculateBounds`, `SafeFeature`, `formatDuration`, `loadRegistry`, `MapView`, `getSessionStore`). Case-sensitive. |
| `kind` | `'value' \| 'type'` | AST: presence of `type` modifier on the `ExportSpecifier` or on the `ExportNamedDeclaration`'s `exportKind` | Drives which of the seven selectors (research.md Decision 3) apply. Type-only names match selectors 4/5; value names match 1/2/3/7. Names exported in both forms (rare) are tracked as two entries. |
| `packageName` | `string` | Supplied by the caller module via the factory's `input.packageName` | The `@debrief/*` package identifier this name belongs to. Embedded in the violation message (§2 of `contracts/rule-contract.md`). A name may appear in multiple packages' `ForbiddenName` sets if two packages genuinely expose it; each produces a separate entry. |

**Validation**:
- `name` is a valid ECMAScript identifier (matches `/^[A-Za-z_$][A-Za-z0-9_$]*$/`). The parser guarantees this structurally.
- `packageName` starts with `@debrief/` (factory-level invariant).
- Within a single caller module's `ForbiddenName` set, there are no duplicates on `(name, kind)` — if the same name appears in multiple `export { … }` blocks (either at the top level or via the transitive `export *` walk), it is deduplicated.

**State transitions**: None. Each caller module's set is built once at module load time and is immutable thereafter within a single ESLint run.

### 2. `ForbiddenSet` *(per caller module — one instance per `@debrief/*` package)*

A lookup-efficient collection of `ForbiddenName`s, consumed by the selector generator.

| Field | Type | Notes |
|-------|------|-------|
| `packageName` | `string` | The `@debrief/*` identifier this set belongs to. Every entry's `ForbiddenName.packageName` matches. |
| `values` | `Set<string>` | Names whose `kind === 'value'`. Drives selectors 1, 2, 3, 7. |
| `types` | `Set<string>` | Names whose `kind === 'type'`. Drives selectors 4, 5. Also folded into selector 6 (`TSEnumDeclaration`) since TS enums span both value and type realms. |

**Validation**: `values ∩ types` may be non-empty (a name exported as both a value and a type). Both sets are populated in that case.

**State transitions**: None.

**Transitive `export *` walk invariant** *(added during `/speckit.review`)*: If the package's index barrel contains any `ExportAllDeclaration` with a relative specifier, the walker MUST contribute every name from the forwarded module (and, recursively, every name from its further relative `export *` forwards bounded to the package's `src/` tree) into `values` / `types` as if those names appeared as explicit specifiers in the top-level barrel. The resulting set MUST be identical whether the same names are reached via `export {…}` at the top level or via `export * from './…'` through one or more hops. Cycle detection uses a visited-set keyed by absolute resolved path; revisits are no-ops.

### 3. `RestrictedSyntaxEntry`

The shape consumed by ESLint's built-in `no-restricted-syntax` rule.

| Field | Type | Notes |
|-------|------|-------|
| `selector` | `string` | ESLint / ES-query selector string. One of the seven shapes from research.md Decision 3. |
| `message` | `string` | Human-readable violation message. Constructed from a template — see `FailureMessage` below. Includes the caller module's `packageName`. |

**Cardinality per caller module**: `7 × |ForbiddenSet|` entries in the worst case (every name gets all seven selectors). In practice closer to `|values| × 4 + |types| × 2 + |values with enum shape| × 1` because a given name is only one AST shape. Each caller module emits all seven per name — ESLint is indifferent to never-matching selectors; this is simpler than per-name shape inference and aligns with the spec's "don't optimise what doesn't need optimising" posture.

**Aggregate cardinality across all five caller modules**: bounded by `7 × Σ|ForbiddenSet_pkg|`. For today's packages: ~7 × (20 + 100 + 50 + 30 + 5) ≈ 1400 entries total across all five spreads, per `apps/*/.eslintrc.cjs`. ESLint's selector matcher handles this comfortably (sub-linear per file; entries with non-matching selector shapes short-circuit immediately).

**Validation**: `selector` is a valid ES-query string (verified by ESLint at rule-load time; a malformed selector is a rule-author bug, not a user-facing error).

**State transitions**: None; entries are generated once per caller module and passed to ESLint by reference.

### 4. `FailureMessage`

The text emitted when a violation is detected. Ties directly to `spec.md` FR-003, FR-008, FR-014, SC-005 and SC-009.

**Template**:

```text
'<NAME>' is exported by '<PACKAGE>'. Do not redeclare it under apps/*. Replace this declaration with: import { <NAME> } from '<PACKAGE>';
```

**Field substitution**:

| Placeholder | Source | Example |
|-------------|--------|---------|
| `<NAME>` | The `ForbiddenName.name` matched by the selector | `calculateBounds`, `SafeFeature`, `loadRegistry`, `MapView`, `getSessionStore` |
| `<PACKAGE>` | The caller module's `packageName` | `@debrief/utils`, `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data` |

**Rendered example (for `calculateBounds` from `@debrief/utils`)**:

> `'calculateBounds' is exported by '@debrief/utils'. Do not redeclare it under apps/*. Replace this declaration with: import { calculateBounds } from '@debrief/utils';`

**Rendered example (for `PlatformRecord` from `@debrief/schemas`)**:

> `'PlatformRecord' is exported by '@debrief/schemas'. Do not redeclare it under apps/*. Replace this declaration with: import { PlatformRecord } from '@debrief/schemas';`

**Rendering constraints**:
- No ANSI escape codes (FR-008).
- No leading/trailing whitespace.
- Single-line. ESLint prepends the file path and line/column when reporting — the rule does not repeat them.
- Package name is the caller module's input, not hard-coded — so a mis-wired caller that passed the wrong `packageName` would produce misleading messages. The caller-module contract (§1.1 of `contracts/rule-contract.md`) pins the inputs to prevent this.

### 5. `Violation` (ephemeral, emitted by ESLint)

Not constructed by the rule module — produced by ESLint when a `RestrictedSyntaxEntry` matches. Listed here because `spec.md` names it as a key entity.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `filePath` | `string` | ESLint's `context.getFilename()` | Repo-root-relative path (FR-003). |
| `ruleId` | `string` | `'no-restricted-syntax'` | Always literal. |
| `message` | `string` | `FailureMessage` above | Embeds symbol + package name + remediation hint. |
| `line` | `number` | ESLint report | Line of the offending declaration. |
| `column` | `number` | ESLint report | Column of the offending declaration. |
| `severity` | `'error'` | Fixed | Set by the per-app `.eslintrc.cjs` wiring at `'error'`, not `'warn'`, so `pnpm lint` fails (FR-004). |

**State transitions**: Emitted, logged, not persisted.

### 6. `WiringDefect` *(added during `/speckit.review`)*

The unit of failure reported by the wiring-forgotten meta-check script (see `contracts/rule-contract.md` §7). Not constructed by any ESLint rule — produced by `scripts/check-eslint-drift-wiring.cjs`.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `eslintrcPath` | `string` | Script enumeration of `apps/*/.eslintrc.cjs` | Repo-root-relative path of the offending config file. |
| `missingSpreads` | `Array<{ identifier: string, callerModulePath: string }>` | Script's per-pair check | One entry per caller module whose `rules` array is not spread into this `.eslintrc.cjs`'s `no-restricted-syntax` config. `identifier` is the conventional `...<pkg>DriftRules` variable name; `callerModulePath` is the source module that exports it. |

**Validation**: `missingSpreads` is non-empty whenever a `WiringDefect` is emitted — a defect with zero missing spreads is a script bug.

**State transitions**: Emitted to stderr on script failure, not persisted.

### 7. `GeojsonViolation` *(added during `/speckit.review`, produced by the grandfathered shell script — listed for completeness)*

Not constructed by any TypeScript / JavaScript module. Produced by `scripts/check-no-geojson-feature.sh`'s `grep` invocation. Listed here to make the data flow of the aggregate `task lint` step complete.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `rawLine` | `string` | `grep -rn` output | Shape: `<file>:<line>:<matched-text>`. |

**State transitions**: Printed to stdout by the script on failure, not persisted, not consumed by any downstream tool.

## Data flow

```text
Each @debrief/* package's index barrel  (five sources of truth)
        │
        │  parsed by drift-rule-factory at caller-module require-time
        │  (with transitive export * walk bounded to the package's src/)
        ▼
 ForbiddenName[]  ─────────►  ForbiddenSet (one per package)
                                  │
                                  │  expanded to 7 selectors per name
                                  │  messages embed packageName
                                  ▼
                         RestrictedSyntaxEntry[] (five arrays, one per caller module)
                                  │
                                  │  all five spread into no-restricted-syntax array
                                  ▼
              apps/*/.eslintrc.cjs no-restricted-syntax config
                                  │ │
                                  │ └── Parallel: scripts/check-eslint-drift-wiring.cjs
                                  │      enumerates apps/*, asserts every spread present
                                  │      │
                                  │      └─ (missing?) ──► WiringDefect[] ──► CI log + non-zero exit
                                  │
                                  │  ESLint runs across apps/*/src/**
                                  ▼
                 (match?) ──► Violation  ──► CI log + non-zero exit
                     │
                     └── (no match) ──► clean lint ──► (proceed to geojson script)
                                                               │
                                                               ▼
                                                 scripts/check-no-geojson-feature.sh
                                                 (greps apps/, shared/, services/ for interface GeoJSONFeature)
                                                               │
                                                               ├── (match?) ──► GeojsonViolation[] ──► CI log + non-zero exit
                                                               └── (no match) ──► zero exit
```

## Entities *not* modelled (out of scope)

- **App file metadata**: ESLint already tracks which files are being linted via the config-resolution tree. The rule does not maintain its own file inventory.
- **Cross-file analysis state**: The rule is purely per-file AST analysis. There is no global state across `apps/*` files.
- **Persistence / caching**: None. The forbidden set is rebuilt on every ESLint cold start (or reused during a single run via Node's require-cache). ESLint's own file-level cache handles re-run performance.

## Implications for tests

The `ForbiddenSet` derivation (entity 1 → 2) is the highest-risk piece of logic and warrants the most unit-test coverage: permuted `export` shapes in each index barrel, `type`-modifier placements, comments, trailing commas, **and the transitive `export *` walk (specifically exercised via the `@debrief/session-state` smoke test, which cannot pass without the walker visiting at least one relative forward)**. The `RestrictedSyntaxEntry` generation (2 → 3) and `FailureMessage` rendering (4) are straightforward string templating and need only smoke-test coverage — but that smoke coverage must include at least one positive case per `packageName` to verify the caller-module wiring. The `Violation` emission (5) is ESLint-internal and is exercised end-to-end by the fixture tests. The `WiringDefect` emission (6) is exercised by `check-eslint-drift-wiring.test.ts` (a Vitest test that constructs an in-memory eslintrc missing one or more spreads, invokes the script in a child process, and asserts the stderr report shape). The `GeojsonViolation` emission (7) is exercised by `quickstart.md` Walk 9 (manual verification; the script itself has no Vitest test since this feature does not own its code).
