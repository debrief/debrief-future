# Feature Specification: Consolidate bounds utilities into `@debrief/utils`

**Feature Branch**: `200-bounds-consolidation`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "200 in BACKLOG.md — Consolidate `apps/vscode/src/utils/bounds.ts` (~161 LOC) with the 95%-identical `shared/utils/src/bounds.ts` (~156 LOC). Lift the null-guard into the shared version, reconcile `SafeFeature`/`GeoJSONFeature` at the call site, delete the vscode copy and its duplicate test, and switch `apps/vscode/src/webview/mapPanel.ts` to import from `@debrief/utils`."

## Background

Two near-identical implementations of `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, `isValidBounds`, and the private `extractCoordinates` helper exist today:

- `shared/utils/src/bounds.ts` — the canonical copy, used throughout the monorepo; parameter type is the internal `GeoJSONFeature` (geometry is **non-nullable**).
- `apps/vscode/src/utils/bounds.ts` — a duplicated copy that has drifted in three small ways:
  1. A defensive `if (!feature.geometry) continue;` null-guard that does not exist in the shared copy.
  2. A different input type — `GeoJSONFeature` re-exported from `'@debrief/utils'` as an alias of `SafeFeature`, whose `geometry` field is `SafeGeometry | null`.
  3. A single `// eslint-disable-next-line no-restricted-syntax` annotation inside `extractCoordinates` (MultiPolygon branch).

The vscode copy has exactly one in-tree consumer (`apps/vscode/src/webview/mapPanel.ts`). The test file `apps/vscode/tests/unit/bounds.test.ts` is byte-identical to `shared/utils/tests/bounds.test.ts` except for the import path.

The null-guard drift is a real bug risk: the shared function assumes `feature.geometry` is always present, but when it is called with `SafeFeature[]` (where `geometry` may be `null`), it would throw at `extractCoordinates(feature.geometry)`. The vscode copy silently tolerates this; the shared copy does not.

## User Scenarios & Testing *(mandatory)*

The "users" of this feature are **developers of the Debrief monorepo** and, transitively, **analysts using the VS Code extension** (who benefit from the null-safety and the absence of drift-induced regressions).

### User Story 1 — One source of truth for bounds calculation (Priority: P1)

As a developer working on geometry-handling code anywhere in the monorepo, I want a single canonical implementation of `calculateBounds` / `mergeBounds` / `boundsToLeaflet` / `isValidBounds` so that any bug fix, optimisation, or behavioural tweak takes effect everywhere automatically and cannot silently diverge.

**Why this priority**: This is the primary outcome of the refactor — without it, the rest of the cleanup has no value. It prevents the bug-class that motivated this item (the null-guard drift).

**Independent Test**: After the refactor, a repo-wide search for the function names `calculateBounds` or `mergeBounds` returns exactly one *definition* site (`shared/utils/src/bounds.ts`) plus its consumers. No duplicate definition remains in `apps/vscode/`.

**Acceptance Scenarios**:

1. **Given** the monorepo after the refactor, **When** a developer greps for `export function calculateBounds` or `export function mergeBounds`, **Then** only `shared/utils/src/bounds.ts` matches.
2. **Given** the monorepo after the refactor, **When** a developer opens `apps/vscode/src/webview/mapPanel.ts`, **Then** its `calculateBounds` / `mergeBounds` imports resolve to `@debrief/utils` and not to a local path under `apps/vscode/`.
3. **Given** the monorepo after the refactor, **When** `apps/vscode/src/utils/bounds.ts` and `apps/vscode/tests/unit/bounds.test.ts` are searched for, **Then** neither file exists.

---

### User Story 2 — Map viewport auto-zoom continues to work correctly (Priority: P1)

As an analyst using the VS Code extension, I want "zoom to bounds" behaviour when opening a plot to continue to work exactly as it does today — including the case where one or more features in the plot have no geometry — so that this internal cleanup is invisible to me.

**Why this priority**: Behavioural regression is the only way this refactor can ship broken. The null-guard must be preserved, not lost in the merge.

**Independent Test**: Open a plot whose `FeatureCollection` contains a mix of features with and without geometry in the VS Code extension (smoke test scenario from the BACKLOG entry). Confirm the map fits to the bounds of the features that *do* have geometry, and that no exception is thrown.

**Acceptance Scenarios**:

1. **Given** a `FeatureCollection` containing one `LineString` track and one feature with `geometry: null`, **When** `calculateBounds` is called on its features, **Then** it returns the bounds of the `LineString` and does not throw.
2. **Given** a `FeatureCollection` where every feature has `geometry: null`, **When** `calculateBounds` is called on its features, **Then** it returns `null` (the "no valid coordinates" sentinel) and does not throw.
3. **Given** the same plot that previously zoomed-to-bounds correctly before the refactor, **When** it is reopened after the refactor, **Then** the map viewport matches the pre-refactor viewport (within floating-point tolerance).

---

### User Story 3 — Type safety at the call site (Priority: P2)

As a developer calling `calculateBounds` from VS Code extension code (where feature arrays are typed as `SafeFeature[]` — the canonical type for JSON-parse / MCP boundaries), I want the call to type-check without casts, `any`, or helper wrappers so that the refactor does not trade a duplication problem for a friction problem.

**Why this priority**: If using `@debrief/utils` from vscode requires ugly casts, developers will reintroduce a local copy later. We must resolve this cleanly.

**Independent Test**: `apps/vscode/src/webview/mapPanel.ts` compiles under the monorepo's strict TypeScript settings with no new `as` casts, no new `// @ts-expect-error`, and no new `eslint-disable` annotations introduced by this change.

**Acceptance Scenarios**:

1. **Given** the refactor is complete, **When** `pnpm -r typecheck` runs, **Then** it passes without new errors, new casts, or new eslint suppressions in `mapPanel.ts` or in `@debrief/utils`.
2. **Given** a `SafeFeature[]` value in `mapPanel.ts`, **When** it is passed directly to `calculateBounds` imported from `@debrief/utils`, **Then** the call type-checks without wrapping, mapping, or casting the array.

---

### Edge Cases

- **Empty feature array**: `calculateBounds([])` must return `null` (existing behaviour of both copies — preserved).
- **Features with `geometry: null`**: must be skipped silently by `calculateBounds`; currently the vscode copy does this and the shared copy does not. After the refactor, the shared copy must also do this.
- **Features with `geometry: undefined`** (structurally distinct from `null` but treated the same by the existing vscode null-guard): must also be skipped silently — the null-guard uses the falsy check `if (!feature.geometry)`, which catches both.
- **Geometry with empty `coordinates` array** (e.g. `{ type: 'LineString', coordinates: [] }`): must contribute no points; existing behaviour — preserved.
- **Unknown `geometry.type`**: the `switch` in `extractCoordinates` has no `default`, so unknown types silently contribute no points; existing behaviour — preserved.
- **Mixed valid and null-geometry features** (the realistic production scenario): bounds are computed from only the valid ones.
- **Downstream consumers of deleted symbols**: `apps/vscode/src/utils/bounds.ts` currently also re-exports the `Bounds` type. Any consumer that imports `Bounds` from `'../utils/bounds'` must either be migrated to `'@debrief/utils'` or the re-export must survive elsewhere — the refactor must not silently break a `Bounds` import.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The monorepo MUST contain exactly one definition of `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, and `isValidBounds`, located in `shared/utils/src/bounds.ts` and exported from the `@debrief/utils` package.
- **FR-002**: `calculateBounds` MUST accept an array of features whose `geometry` field may be `null` or `undefined`, and MUST skip such features without throwing. This is the null-guard behaviour currently exclusive to the vscode copy, which MUST be preserved in the consolidated version.
- **FR-003**: `calculateBounds` MUST accept `SafeFeature[]` (the canonical type defined in `@debrief/utils`) as a valid input at its public type signature, either by widening the parameter type to a structural minimum that `SafeFeature` satisfies, or by reconciling the `SafeFeature` / `GeoJSONFeature` types so they share a common base that the function accepts.
- **FR-004**: `apps/vscode/src/utils/bounds.ts` MUST be deleted.
- **FR-005**: `apps/vscode/tests/unit/bounds.test.ts` MUST be deleted. The equivalent coverage MUST continue to exist in `shared/utils/tests/bounds.test.ts` and MUST include at least one case covering the null-geometry skip behaviour introduced by FR-002.
- **FR-006**: `apps/vscode/src/webview/mapPanel.ts` MUST import `calculateBounds` and `mergeBounds` from `@debrief/utils` (not from a local path under `apps/vscode/src/utils/`), and MUST continue to type-check and run without new runtime casts or eslint suppressions introduced at this call site by this change.
- **FR-007**: Any other in-tree consumer of a symbol re-exported from `apps/vscode/src/utils/bounds.ts` (notably the `Bounds` type) MUST be migrated to import the equivalent symbol from `@debrief/utils` in the same commit, so no broken imports ship.
- **FR-008**: The observable behaviour of `calculateBounds` for inputs that the shared copy *currently* accepts MUST NOT change. Specifically: for any `GeoJSONFeature[]` whose features all have non-null geometry, the returned bounds MUST be identical (bit-for-bit equal as tuples of finite floats) before and after the refactor.
- **FR-009**: All pre-existing tests in `shared/utils/tests/bounds.test.ts` MUST continue to pass unchanged. New tests added to cover FR-002 MUST be additive, not replacing, so that behavioural parity with the prior shared implementation is preserved where it already existed.
- **FR-010**: The full CI gate (`task verify` — lint, typecheck, Python + TypeScript unit tests, Playwright E2E) MUST pass on the refactor branch before the change is merged.

### Key Entities *(data involved)*

- **`Bounds`**: 4-tuple `[minLon, minLat, maxLon, maxLat]` describing a geographic bounding box. Canonical type lives in `@debrief/utils`. Unchanged by this feature.
- **`SafeFeature`**: The maximally-permissive GeoJSON `Feature` shape used at JSON-parse and MCP boundaries inside the VS Code extension. Its `geometry` is `SafeGeometry | null`, which is why the null-guard matters. Canonical definition in `@debrief/utils`. Unchanged by this feature except possibly for a structural relationship with `GeoJSONFeature` (see FR-003).
- **`GeoJSONFeature` (shared/utils variant)**: Internal GeoJSON feature shape used by the shared `calculateBounds`. Its `geometry` is required and non-null. May be widened or reconciled with `SafeFeature` as part of FR-003.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The count of files named `bounds.ts` under `apps/vscode/src/` is exactly 0 after the refactor (was 1 before).
- **SC-002**: The count of test files named `bounds.test.ts` under `apps/vscode/tests/` is exactly 0 after the refactor (was 1 before).
- **SC-003**: A repo-wide search for `export function calculateBounds` and a separate search for `export function mergeBounds` each return exactly one match, located in `shared/utils/src/bounds.ts`.
- **SC-004**: Total lines of production source code (excluding tests) in the monorepo's bounds-related implementation is reduced by at least 140 lines (the vscode `bounds.ts` is 161 lines; minor additions to the shared copy for the null-guard are expected to be < 5 lines).
- **SC-005**: `task verify` passes end-to-end on the refactor branch, including the ESLint, ruff, pyright, tsc, vitest, pytest, and Playwright stages listed in `CLAUDE.md § Before Pushing`.
- **SC-006**: When opening a plot in the VS Code extension that contains features with null geometry (the regression scenario), the map successfully fits to the bounds of the remaining valid-geometry features, with no uncaught exception in the extension host log or webview console.
- **SC-007**: No new `as` casts, no new `// @ts-expect-error`, and no new `eslint-disable` comments are introduced in `apps/vscode/src/webview/mapPanel.ts` or in `shared/utils/src/bounds.ts` as a direct consequence of this refactor. (Existing ones unrelated to bounds are out of scope; a small number may remain in the shared `extractCoordinates` helper due to `coordinates: unknown` narrowing, but the net count must not increase.)
- **SC-008**: A developer encountering the consolidated module can, in a single file read, understand the entire bounds-calculation surface — no further navigation is required to discover whether a second implementation exists.

## Assumptions

- The canonical home of the consolidated implementation is `shared/utils/src/bounds.ts`, re-exported through `@debrief/utils`. (This is where the existing majority of the monorepo already imports from, and where the test file already lives.)
- The null-guard behaviour (treating `geometry == null` as "skip this feature") is the desired canonical behaviour — *not* a bug that should be removed. The BACKLOG entry and the real-world production usage in `mapPanel.ts` support this interpretation.
- Adjacent tech-debt items #201 (`ResolvedPositionStyle` consolidation) and #199 / #202 / #206 are being tracked independently and are explicitly out of scope for this spec. The BACKLOG entry notes they are fully parallel.
- No downstream package outside the debrief-future monorepo imports `apps/vscode/src/utils/bounds.ts` directly (it is not part of any published package's export surface).
- The exact sub-option for resolving the `SafeFeature` / `GeoJSONFeature` type mismatch (widen the parameter vs. reconcile the types) is an implementation decision to be made during `/speckit.plan`. Both approaches satisfy FR-003.

## Out of Scope

- Changes to the underlying coordinate-extraction algorithm or to the semantics of `boundsToLeaflet` / `isValidBounds`. This is a mechanical consolidation, not an algorithmic rewrite.
- Consolidation of other duplicate utilities (tracked in BACKLOG items #201, #199, #202, #206).
- Migration of other `apps/vscode/src/utils/*.ts` helpers to `@debrief/utils`.
- Changes to the `SafeFeature` definition itself beyond what FR-003 strictly requires (widening a parameter type in the consumer does not modify `SafeFeature`).
- Publishing `@debrief/utils` to a registry (it remains an internal workspace package).

## Dependencies

None. Independent of all other open backlog items (confirmed in `docs/ideas/200-bounds-consolidation.md`).
