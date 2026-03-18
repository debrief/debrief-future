# Technical Debt — Prioritised Task List

Derived from [Technical Debt Assessment Guide](technical-debt-assessment-guide.md) (March 2026 audit).
Scored using the guide's prioritisation framework: **Blast Radius (40%) + Developer Friction (35%) + Fix Cost (25%, inverse)**.

Existing backlog items (E06 #102–#112) already cover cross-layer architectural violations
and are not duplicated here.

---

## Priority 1 — Critical / High Impact, Low–Medium Effort

### T01: Create shared base `tsconfig.json` and align compiler options

**Category:** config-drift | **Severity:** high | **Effort:** S

Every TypeScript package independently declares `target`, `module`, `moduleResolution`,
and strictness flags. No shared base exists.

**What to do:**
1. Create `tsconfig.base.json` at the repo root with canonical settings (ES2022, bundler, strict: true, noUncheckedIndexedAccess: true)
2. Update each package's `tsconfig.json` to `"extends": "../../tsconfig.base.json"` with only local overrides
3. Fix any new type errors surfaced by stricter settings

**Files:** All `tsconfig.json` files (see guide §2)
**Blast radius:** 5/5 — every TS package | **Friction:** 4/5 | **Fix cost:** cheap
**Score: 4.55**

---

### T02: Consolidate GeoJSON type definitions into a single canonical source

**Category:** type-duplication | **Severity:** critical | **Effort:** M

`GeoJSONFeature`, `GeoJSONFeatureCollection`, `SafeFeature`, `SafeGeometry` are defined
in 22+ files with structurally different shapes (different `coordinates` types, different
`id` types). Already causing type incompatibility across packages.

**What to do:**
1. Define canonical GeoJSON interfaces in `@debrief/schemas` (generated from LinkML) or `@debrief/utils`
2. Delete all local definitions
3. Update imports across all consumers
4. Add a lint rule or import restriction to prevent re-declaration

**Files:** See guide §4 — GeoJSON types table
**Blast radius:** 5/5 — 22+ files | **Friction:** 5/5 — already diverged | **Fix cost:** medium
**Score: 4.50**

---

### T03: Add runtime validation at MCP boundaries (Python ↔ TypeScript)

**Category:** weak-typing / cross-boundary | **Severity:** critical | **Effort:** M

41 unvalidated `JSON.parse()` calls in TypeScript. Python MCP handlers receive
`dict[str, Any]` with no Pydantic validation. Schema changes on either side are
invisible until runtime failure.

**What to do:**
1. **Python side:** Replace `arguments.get()` with Pydantic model validation at every MCP handler entry point
2. **TypeScript side:** Add Zod schemas (or use generated JSON Schema validators) at every `JSON.parse()` boundary
3. Start with the 5 `JSON.parse()` calls in `calcService.ts` and 5 in `stacService.ts`

**Files:** `services/calc/debrief_calc/mcp/server.py`, `apps/vscode/src/services/calcService.ts`, `apps/vscode/src/services/stacService.ts`
**Blast radius:** 5/5 — every service call | **Friction:** 5/5 — silent data corruption | **Fix cost:** medium
**Score: 4.50**

---

### T04: Resolve conflicting `TimeRange` definitions

**Category:** type-duplication | **Severity:** critical | **Effort:** S

Two structurally incompatible `TimeRange` types exist: one uses ISO 8601 strings
(`apps/vscode/src/types/plot.ts:189`), the other uses epoch milliseconds
(`services/session-state/src/types/temporal.ts:58`). Code using one will silently
produce wrong results with data from the other.

**What to do:**
1. Decide canonical representation (ISO strings or epoch ms) — add to LinkML schema
2. Delete the non-canonical definition
3. Add conversion utilities if both representations are needed at different layers
4. Update all consumers

**Files:** `apps/vscode/src/types/plot.ts:189`, `services/session-state/src/types/temporal.ts:58`
**Blast radius:** 4/5 | **Friction:** 5/5 — silent wrong results | **Fix cost:** cheap
**Score: 4.35**

---

### T05: Unify `@sparticuz/chromium` versions (^131.0.1 vs ^143.0.4)

**Category:** dependency-skew | **Severity:** critical | **Effort:** S

12 major versions apart. The root and web-shell declare different versions, which can
cause Playwright/Chromium extraction failures in CI.

**What to do:**
1. Align to ^143.0.4 (the newer version in web-shell)
2. Update root `package.json`
3. Run `pnpm install` and verify E2E tests pass

**Files:** Root `package.json`, `apps/web-shell/package.json`
**Blast radius:** 3/5 | **Friction:** 4/5 — CI flakes | **Fix cost:** cheap
**Score: 3.55**

---

### T06: Align `@playwright/test` versions (^1.40.0 vs ^1.57.0)

**Category:** dependency-skew | **Severity:** high | **Effort:** S

`shared/components` and `apps/loader` declare ^1.40.0; root and `web-shell` declare ^1.57.0.
API changes between these versions cause confusion and potential test failures.

**What to do:**
1. Update all packages to ^1.57.0
2. Fix any API breakages (check Playwright changelog for ^1.40 → ^1.57 changes)
3. Run full E2E suite

**Files:** All `package.json` files declaring `@playwright/test`
**Blast radius:** 3/5 | **Friction:** 3/5 | **Fix cost:** cheap
**Score: 3.05**

---

## Priority 2 — High Impact, Medium Effort

### T07: Type STAC items with Pydantic models instead of `dict[str, Any]`

**Category:** weak-typing | **Severity:** high | **Effort:** M

`STACItem: TypeAlias = dict[str, Any]` and `STACCatalog: TypeAlias = dict[str, Any]`
in `services/stac/src/debrief_stac/types.py` bypass all schema safety.

**What to do:**
1. Replace type aliases with proper Pydantic models (possibly from `debrief_schemas`)
2. Add validation at STAC read/write boundaries
3. Update service methods to use typed models

**Files:** `services/stac/src/debrief_stac/types.py`, related service files
**Blast radius:** 4/5 | **Friction:** 3/5 | **Fix cost:** medium
**Score: 3.45**

---

### T08: Consolidate `Bounds` type into single shared definition

**Category:** type-duplication | **Severity:** high | **Effort:** S

`type Bounds = [number, number, number, number]` appears in 4 places with identical definitions.

**What to do:**
1. Keep definition in `@debrief/utils` (or `@debrief/schemas` if cross-language)
2. Delete the other 3 copies
3. Update imports

**Files:** `shared/components/src/utils/types.ts:103`, `shared/utils/src/types.ts:29`, `apps/vscode/src/utils/bounds.ts:12`, `specs/130-map-spatial-filtering/contracts/catalog-overview-props.ts:22`
**Blast radius:** 3/5 | **Friction:** 2/5 | **Fix cost:** cheap
**Score: 2.65**

---

### T09: Consolidate `MCPToolDefinition` into single definition

**Category:** type-duplication | **Severity:** high | **Effort:** S

Defined independently in 3 places. Related to E06 #105 (unify tool type definitions)
but scoped specifically to the MCP adapter type.

**What to do:**
1. Define once in `@debrief/schemas` or `@debrief/utils`
2. Delete copies from `shared/components/src/ToolMatch/mcpAdapter.ts:14`, `apps/vscode/src/types/tool.ts:478`, and `apps/web-shell`
3. Update imports

**Files:** See above
**Blast radius:** 3/5 | **Friction:** 3/5 | **Fix cost:** cheap
**Score: 2.85** (may be absorbed by E06 #105)

---

### T10: Unify ESLint configuration across packages

**Category:** config-drift | **Severity:** high | **Effort:** M

Config varies between `.eslintrc.cjs` and `.eslintrc.json`. Some packages have no ESLint
config at all (`apps/web-shell`, `shared/utils`, `shared/config-ts`). Type-aware rules
only in `apps/vscode`.

**What to do:**
1. Create shared ESLint config as a workspace package or flat config
2. Extend from shared config in each package
3. Add configs for uncovered packages (`web-shell`, `shared/utils`, `shared/config-ts`)
4. Migrate to consistent format (flat config preferred)

**Files:** All `.eslintrc.*` files
**Blast radius:** 4/5 | **Friction:** 3/5 | **Fix cost:** medium
**Score: 3.20**

---

### T11: Complete `ruff.toml` `known-first-party` list

**Category:** config-drift | **Severity:** medium | **Effort:** S

Missing `debrief_config`, `debrief_calc`, `debrief_tools`, `debrief_session` from the
known-first-party list. Half of internal packages treated as third-party for import sorting.

**What to do:**
1. Add missing packages to `ruff.toml` `known-first-party`
2. Run `ruff check --fix .` to reorder affected imports

**Files:** `ruff.toml`
**Blast radius:** 3/5 | **Friction:** 2/5 | **Fix cost:** cheap
**Score: 2.65**

---

### T12: Replace `ParameterValue(value: Any)` with typed union

**Category:** weak-typing | **Severity:** high | **Effort:** M

Tool parameters have no type validation. A tool expecting a number accepts a string
without error from Pydantic.

**What to do:**
1. Replace `Any` with a discriminated union of valid parameter types
2. Add to LinkML schema so TypeScript gets matching types
3. Update all tool implementations to use typed parameters

**Files:** `services/calc/debrief_calc/models.py`
**Blast radius:** 4/5 | **Friction:** 3/5 | **Fix cost:** medium
**Score: 3.20**

---

## Priority 3 — Medium Impact, Low–Medium Effort

### T13: Harmonise coverage thresholds

**Category:** config-drift | **Severity:** medium | **Effort:** S

`fail_under` varies: 90 (stac, io), 80 (config, session-state-py), none (schemas).

**What to do:**
1. Set `fail_under = 80` as baseline for all packages
2. Raise to 90 where already met
3. Add coverage config for `shared/schemas`

**Files:** All `pyproject.toml` files with `[tool.pytest.ini_options]`
**Blast radius:** 2/5 | **Friction:** 2/5 | **Fix cost:** cheap
**Score: 2.05**

---

### T14: Migrate `App.tsx` state from 16× `useState` to Zustand store

**Category:** state-fragmentation | **Severity:** medium | **Effort:** M

`apps/web-shell/src/App.tsx` has 16+ `useState` calls alongside `useSessionStore`.
Props drilled 3+ levels. `subscribeToSlice()` utilities exist but aren't used.

**What to do:**
1. Audit which `useState` values should be in Zustand
2. Move appropriate state to `session-state` store slices
3. Replace prop drilling with `useSessionStore` selectors in child components
4. This overlaps with E06 #108 (drawing mode state)

**Files:** `apps/web-shell/src/App.tsx` and child components
**Blast radius:** 2/5 | **Friction:** 3/5 | **Fix cost:** medium
**Score: 2.30** (partially covered by E06 #108)

---

### T15: Add `DO NOT EDIT` headers to generated schema files

**Category:** type-duplication (prevention) | **Severity:** low | **Effort:** S

Generated `types.ts` and `__init__.py` lack auto-generated markers. Developers may
hand-edit generated files without realising changes will be overwritten.

**What to do:**
1. Add `// AUTO-GENERATED — DO NOT EDIT` header to TypeScript generation template
2. Add `# AUTO-GENERATED — DO NOT EDIT` header to Python generation template
3. Optionally add a CI check that generated files match generator output

**Files:** Schema generator configs/templates
**Blast radius:** 2/5 | **Friction:** 2/5 | **Fix cost:** cheap
**Score: 2.05**

---

### T16: Import schema types instead of redefining locally

**Category:** type-duplication | **Severity:** medium | **Effort:** S

`TrackStyle`, `PointMetadataEntry`, `LogEntry`, `WasGeneratedBy`, `TuneAnnotation`,
`ToolParameter`, `ParameterValue`, `SystemRecordProperties`, `StylePropertyDescriptor`
exist in `@debrief/schemas` but are re-declared in app code.

**What to do:**
1. For each type, find local definitions and replace with imports from `@debrief/schemas`
2. Verify no structural differences before replacing

**Files:** Various files in `apps/` and `shared/` — run detection commands from guide §4
**Blast radius:** 3/5 | **Friction:** 2/5 | **Fix cost:** cheap
**Score: 2.55**

---

### T17: Add tests for `services/cli/`

**Category:** test-gap | **Severity:** medium | **Effort:** M

`services/cli/` has no test directory at all.

**What to do:**
1. Create `services/cli/tests/`
2. Add unit tests for CLI commands
3. Add `fail_under` threshold to `pyproject.toml`

**Files:** `services/cli/`
**Blast radius:** 2/5 | **Friction:** 2/5 | **Fix cost:** medium
**Score: 1.80**

---

### T18: Unify service error handling pattern (CalcService vs StacService)

**Category:** api-inconsistency | **Severity:** medium | **Effort:** M

CalcService returns `{ success: false, error }` objects; StacService throws exceptions.
Consumers must use different patterns for each.

**What to do:**
1. Define a common `ServiceResult<T>` union type
2. Choose one pattern (result objects recommended for type safety)
3. Migrate the non-conforming service
4. Update all consumers

**Files:** `apps/vscode/src/services/calcService.ts`, `apps/vscode/src/services/stacService.ts`
**Blast radius:** 3/5 | **Friction:** 3/5 | **Fix cost:** medium
**Score: 2.70**

---

### T19: Align TypeScript versions (^5.0.0 vs ^5.3.x)

**Category:** dependency-skew | **Severity:** high | **Effort:** S

`shared/components/diff` declares ^5.0.0 while everywhere else uses ^5.3.x.
Type definition incompatibility risk.

**What to do:**
1. Update all packages to the same `^5.3.x` floor
2. Run typecheck across all packages

**Files:** All `package.json` files declaring `typescript`
**Blast radius:** 3/5 | **Friction:** 2/5 | **Fix cost:** cheap
**Score: 2.55**

---

## Priority 4 — Low Impact or Already Healthy

### T20: Ensure all `type: ignore` directives have justification comments

**Category:** suppressions | **Severity:** low | **Effort:** S

49 `type: ignore` directives, 24 in one test file. All in test code (acceptable)
but justify the pattern or use typed fixtures instead.

**Files:** Primarily `test_stac_extension.py`

---

### T21: Track TODO comments in backlog

**Category:** todo-markers | **Severity:** low | **Effort:** S

Only 4 TODOs exist (excellent). Ensure each references a backlog item.
`TODO(#137)` already does; the 3 loader TODOs may need backlog entries.

---

### T22: Run dead code analysis

**Category:** dead-code | **Severity:** low | **Effort:** S

Run `knip` (TypeScript) and `vulture` (Python) to identify unused exports.
Create follow-up cleanup tasks from findings.

---

## Summary — Execution Order

| Phase | Tasks | Theme | Effort |
|-------|-------|-------|--------|
| **Phase 1** | T01, T04, T05, T06, T11, T15, T19 | Quick wins — config alignment, version skew, headers | ~1 week |
| **Phase 2** | T02, T03, T08, T09, T16 | Type consolidation and boundary validation | ~2 weeks |
| **Phase 3** | T07, T10, T12, T18 | Deep typing and API consistency | ~2 weeks |
| **Phase 4** | T13, T14, T17, T20–T22 | Coverage, state, cleanup | ~1 week |

**Overlap with existing backlog:**
- E06 #105 may absorb T09 (MCPToolDefinition consolidation)
- E06 #108 partially covers T14 (state management in web-shell)
- #115 (complete) already addressed some `dict[str, Any]` usage in calc tools
- T03 extends #115's approach to the MCP boundary layer
