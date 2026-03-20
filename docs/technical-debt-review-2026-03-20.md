# Technical Debt Review — 2026-03-20

Assessment against [technical-debt-assessment-guide.md](./technical-debt-assessment-guide.md).
This review identifies **changes since the initial March 2026 audit** and **areas the guide
does not cover**.

---

## Status of Known Issues from the Guide

### 1. Dependency Version Skew

**Resolved since initial audit:**
- `@sparticuz/chromium` — now consistently `^143.0.4` across all 3 files
- `@playwright/test` — now consistently `^1.58.0` across all 5 files

**Still present:**
| Dependency | Versions | Severity |
|---|---|---|
| `@storybook/*` | `^8.0.0` (loader) vs `^8.4.0` (components) | Medium |
| `@typescript-eslint/parser` | `^6.13.0` (loader, vscode) vs `^6.21.0` (components) | Medium |
| `eslint` | `^8.55.0` (loader, vscode) vs `^8.57.1` (components) | Medium |
| `eslint-plugin-react` | `^7.33.0` (loader) vs `^7.37.5` (components) | Low |
| `pydantic` | `>=2.12.5` (root) vs `>=2.0.0` (6 services) | Medium |
| `ruff` | `>=0.8.0` (root) vs `>=0.1.0` (stac, schemas) | Low |
| `@types/leaflet` | `^1.9.0` (web-shell, components) vs `^1.9.8` (vscode) | Low |

**New finding not in guide:** `typescript` is now consistent at `^5.3.0` across all packages
except vscode (`^5.3.2`), which is a trivial difference. The guide's claim of `^5.0.0` in
`shared/components/diff` no longer holds — it's now `^5.3.0`.

### 2. Configuration Drift

**Improved since initial audit:**
- A shared `tsconfig.base.json` now exists and all packages extend it. The guide states
  "no shared base tsconfig exists" — **this is no longer true**.

**Still present:**
- `noUncheckedIndexedAccess` overridden to `false` in `apps/web-shell` and `apps/loader`
  (intentional relaxation but creates type safety gaps)
- `module` setting varies: `ES2022` (vscode), `ESNext` (components, web-shell, loader),
  `NodeNext` (config-ts, utils, session-state)
- ESLint config still missing from: `shared/config-ts`, `shared/utils`, `apps/web-shell`,
  `services/session-state`
- ESLint format inconsistency: `.eslintrc.cjs` vs `.eslintrc.json`

**New finding:** `apps/vscode` uses `module: ES2022` while all other browser/bundle
targets use `ESNext` — no obvious reason for divergence.

### 3. Cross-Layer Architectural Violations

**Still present, unchanged:**
- `apps/vscode/src/services/calcService.ts` imports `DebriefFeature` from `@debrief/components`
- `apps/vscode/src/services/sessionManager.ts` imports `TrackFeature`, `ReferenceLocation`
  from `@debrief/components`
- `apps/vscode/src/services/mcpToolAdapter.ts` imports from `@debrief/components/ToolMatch`
- `apps/web-shell/src/tools/` contains 5+ full domain logic implementations (buffer zone
  generator, track stats, range/bearing, area summary, move shape)

### 4. Type Duplication

**Worse than guide documented:**
- `GeoJSONFeature` now has **25 independent definitions** (guide said 22+). New definitions
  added in `apps/vscode/src/tools/` (8 tool files each define their own copy)
- `TimeRange` now has **4 incompatible definitions** (guide documented 2). Additional specs
  define conflicting shapes (ISO strings vs epoch ms vs Date union vs min/max fields)

**Improved:**
- `SafeFeature`/`SafeGeometry` consolidated to 1 canonical definition in `shared/utils/src/types.ts`
  (guide documented 4 copies in vscode — these appear to have been deduplicated)

**Unchanged:**
- `MCPToolDefinition` still in 2 places
- `Bounds` still in 2 places

### 5. Weak Typing

**Counts shifted from initial audit:**
| Pattern | Guide count | Current count | Trend |
|---|---|---|---|
| Unvalidated `JSON.parse()` | 41 | ~39 files | Stable |
| `unknown` annotations | 226 | ~463 `Record<string, unknown>` | Slightly up |
| `as any` (non-test) | 5 (all justified) | 3 non-test + 11 test/E2E | Improved in prod |
| Python `type: ignore` | 49 | 42 | Slightly better |
| Python `dict[str, Any]` | not counted | 151 in services | **New metric** |
| Python `Any` usage | not counted | 189 in services | **New metric** |

**MCP boundary still type-unsafe in both directions** — no change.

### 6–10. Service APIs, State, Tests, Suppressions, TODOs

**Service API inconsistency** — unchanged (CalcService result objects vs StacService exceptions).

**State management** — `App.tsx` now has **17 `useState` calls** alongside 3 `useSessionStore`
calls (guide documented 16+). Slightly worse.

**Test gaps:**
- `services/cli/` still has no tests (guide noted this)
- **New finding:** ~40 shared components lack tests, concentrated in LogPanel (18 untested),
  LayersToolbar (4), PanelWorkspace (2), panels wrappers (6)
- Coverage thresholds still inconsistent (90/80/none)
- **New finding:** `debrief-config` and `debrief-calc` have NO coverage threshold configured

**Suppressions:** Total 88 across codebase (14 `as any`, 4 `@ts-expect-error`, 12
`eslint-disable`, 42 `type: ignore`, 20 `# noqa`). Guide documented 83. Slight increase
but all appear justified.

**TODOs:** Still exactly 4, all same as guide documented. Good discipline.

---

## Areas the Guide Does NOT Cover

The following categories of technical debt were **not included** in the assessment guide
but exist in the codebase:

### 11. Unstructured Logging (console.* Proliferation)

**167+ `console.log/warn/error/debug/info` calls** scattered across production code with
no structured logging framework.

| Location | Count | Concern |
|---|---|---|
| `shared/components/src/` | 85 | Production components log to console |
| `apps/` | 82 | Mix of debug logging and error reporting |
| `shared/components/src/PanelWorkspace/layoutPersistence.ts` | 10 | Heavy debug logging in persistence layer |
| `apps/loader/src/main/index.ts` | 13 | Electron main process |
| `apps/vscode/src/services/stacService.ts` | 9 | Service layer logging |

**Why this matters:**
- No log levels — can't filter debug from error in production
- No structured format — hard to search/aggregate
- No log suppression in library code — shared components shouldn't log to console
- Stories files contain `console.log` callbacks (14 in ParameterEditor alone) — these
  leak into Storybook output

**Recommended guide addition:** Section 11 — "Logging Hygiene"

### 12. Python Workspace Member Drift

The guide covers ruff `known-first-party` but misses the broader problem:

| Service | In repo? | In uv workspace? | In ruff known-first-party? |
|---|---|---|---|
| `debrief-tools` | Yes | **No** | Yes |
| `debrief-session` | Yes | **No** | Yes |
| `debrief-cli` | Yes | Yes | **No** |

Two services exist in the repo and in ruff config but are **not managed by uv workspaces**.
This means `uv sync` won't install them, `uv run pytest` won't find them, and dependency
resolution may miss them.

**Recommended guide addition:** Add uv workspace membership check to Section 2.

### 13. Empty Catch Blocks Without Observability

**48 catch blocks** silently swallow errors without logging or reporting.

The guide (Section 8) counts these as "52 — justified but under-documented." The current
count is 48, but the assessment should go further:

- 7 in `StacBrowser.tsx` with comments like `/* map not ready */` but no telemetry
- 10+ in `apps/vscode/src/` services that catch and return defaults
- `savedFiltersStorage.ts` returns `EMPTY_COLLECTION` on any error — data loss is silent

**Why the guide should expand this:** Silent error swallowing is a debugging nightmare in
production. Each catch should at minimum log at debug level, even if the error is expected.

### 14. No Error Boundary Strategy

Related to #13 — the codebase has `PanelErrorBoundary.tsx` but:
- No consistent error boundary wrapping pattern across panels
- No error reporting service integration
- No user-facing error state design system

### 15. Deprecated Code Without Migration Path

8 files reference `@deprecated` or `deprecated`:
- `services/calc/debrief_calc/models.py` (2)
- `apps/vscode/src/commands/executeTool.ts` (1)
- `services/session-state/src/log/entryBuilder.ts` (1)

These exist without tracking in the backlog or a migration timeline.

### 16. Missing Peer Dependency Declarations

Only `shared/components/package.json` declares `peerDependencies`. Other shared packages
(`shared/utils`, `shared/config-ts`, `shared/schemas`) that are consumed by multiple apps
don't declare peer dependencies, relying on hoisting which can break with different
package managers.

---

## Priority Recommendations

### Immediate (cheap, high impact)

1. **Align Python workspace members** — add `debrief-tools` and `debrief-session` to uv
   workspace, add `debrief_cli` to ruff known-first-party. Effort: S.

2. **Add coverage thresholds** to `debrief-config` and `debrief-calc` (at 80%). Effort: S.

3. **Update guide Section 1** — mark `@sparticuz/chromium` and `@playwright/test` as
   resolved; add current `@storybook` and `eslint` skew. Effort: S.

4. **Update guide Section 2** — note that `tsconfig.base.json` now exists; document the
   intentional `noUncheckedIndexedAccess` relaxation in loader/web-shell. Effort: S.

### Short-term (medium effort, reduces confusion)

5. **Consolidate GeoJSON types** — 25 definitions to 1. Import `SafeFeature` from
   `@debrief/utils` everywhere. Effort: M.

6. **Add ESLint to missing packages** — at minimum `shared/config-ts`, `shared/utils`,
   `apps/web-shell`. Effort: M.

7. **Unify TimeRange** — pick epoch milliseconds (per #132 decision), create converter
   utilities. Effort: M.

### Medium-term (larger effort, architectural)

8. **Extract service types from `@debrief/components`** — break the service→UI import
   chain by moving `DebriefFeature`, `TrackFeature` etc. to `@debrief/schemas` or
   `@debrief/utils`. Effort: L.

9. **Add logging framework** — replace 167 console.* calls with a leveled logger.
   Effort: L.

10. **Add JSON boundary validation** — create `safeParse<T>()` utility using Zod or
    schema-generated validators. Effort: L.

### Additions to the guide

11. Add **Section 11: Logging Hygiene** — detect `console.*` in library code
12. Add **Section 12: Workspace Membership Drift** — uv workspace vs ruff vs repo
13. Expand **Section 8** to score empty catch blocks on observability
14. Add **Section 13: Error Boundary Coverage** — React error boundary wrapping pattern
15. Add **Section 14: Deprecated Code Tracking** — `@deprecated` without migration backlog
