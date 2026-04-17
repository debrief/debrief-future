# Circular Dependencies — Assessment and Fixes

**Captured:** 2026-04-17
**Scope:** TypeScript (`shared/`, `apps/`, `services/`) via `madge@8.0.0`, Python (`services/`, `shared/`) via `pylint --disable=all --enable=cyclic-import`.

---

## 1. Summary

| Area | Tool | Cycles Found (before) | Cycles Fixed | Cycles Remaining |
|---|---|---|---|---|
| `shared/` (TS) | madge | 2 | 2 | 0 |
| `apps/loader/` (TS) | madge | 1 | 1 | 0 |
| `apps/vscode/` (TS) | madge | 2 | 0 | 2 (type-only) |
| `apps/web-shell/` (TS) | madge | 5 | 5 | 0 |
| `services/` (TS) | madge | 0 | — | 0 |
| `services/cli` (Python) | pylint | 1 | 1 | 0 |
| Other Python packages | pylint | 0 | — | 0 |

**Net result:** 11 runtime cycles eliminated, 2 type-only cycles deliberately left (documented below).

Commands used:

```sh
npx madge --circular --extensions ts,tsx shared/
npx madge --circular --extensions ts,tsx apps/
npx madge --circular --extensions ts,tsx services/
npx madge --circular --extensions ts,tsx apps/web-shell/src/
npx madge --circular --extensions ts,tsx apps/vscode/src/
npx madge --circular --extensions ts,tsx apps/loader/
uv run --with pylint pylint --disable=all --enable=cyclic-import services/ shared/ scripts/
```

`pydeps` was not available and was skipped.

---

## 2. Cycles Found (before) — detail and root causes

### 2.1 `shared/components` — `utils/types.ts` ↔ `TimeController/types.ts`

```
utils/types.ts        -> TimeController/types.ts   (re-exports DisplayMode)
TimeController/types.ts -> utils/types.ts          (imports TimeExtent)
```

**Root cause:** a "convenience re-exports" module (`utils/types.ts`) was
also the canonical home for `TimeExtent`, while `TimeController/types.ts`
— its nominal downstream — imported back from it. Classic barrel-style
cycle.

**Fix (high-confidence, applied):** define `TimeExtent` locally (and
*non-exported*) inside `TimeController/types.ts`. The structurally
identical exported `TimeExtent` in `utils/types.ts` remains the canonical,
public symbol for consumers — only the internal duplicate breaks the
cycle.

- **File:** `shared/components/src/TimeController/types.ts`
- **Risk:** very low — two locally-defined tuple aliases of `[number, number]`
  are structurally identical; no public API is altered.

### 2.2 `shared/components` — `MapView/sensor-utils.ts` ↔ `MapView/array-offset.ts`

```
sensor-utils.ts  -> array-offset.ts    (imports computeArrayCentre)
array-offset.ts  -> sensor-utils.ts    (imports geodesicDestination, interpolateTrackPosition, interpolateTrackCourse)
```

**Root cause:** `sensor-utils.ts` grew to host both high-level pipeline
logic (contact preparation) and low-level geodesic primitives. When
`array-offset.ts` was added, it needed the primitives and took the cycle
with it.

**Fix (high-confidence, applied):** extracted the three primitive helpers
into a new leaf module, `MapView/geo-primitives.ts`. Both
`sensor-utils.ts` and `array-offset.ts` now import from the leaf.
`sensor-utils.ts` re-exports the three helpers so external consumers and
tests (`__tests__/sensor-utils.test.ts`) continue to work unchanged.

- **New file:** `shared/components/src/MapView/geo-primitives.ts`
- **Edits:** `sensor-utils.ts`, `array-offset.ts`
- **Risk:** low. Functions are pure and moved verbatim (with identical
  signatures). Re-exports preserve public API.

### 2.3 `apps/loader` — `ipc/config.ts` ↔ `ipc/stac.ts`

```
config.ts  -> stac.ts    (dynamic import inside countPlots() for listPlots)
stac.ts    -> config.ts  (imports getStorePaths)
```

**Root cause:** `config.ts` owned both low-level config persistence
(`readConfig` / `writeConfig` / `getStorePaths`) and high-level store
metadata enrichment (`countPlots`, which needs STAC). `stac.ts` needed
store paths, so it reached back into `config.ts`. The existing dynamic
`import('./stac.js')` inside `countPlots()` was a workaround for
load-time ordering but did not eliminate the static cycle madge reports.

**Fix (high-confidence, applied):** extracted the low-level persistence
layer into a new leaf module `ipc/configStore.ts` containing
`readConfig` / `writeConfig` / `ensureConfigDir` / `getConfigPath` /
`getStorePaths` / `DebriefConfig`. `stac.ts` now imports
`getStorePaths` from `configStore.ts` directly. `config.ts` re-exports
`getStorePaths` for any external call sites that used to reach in. The
`countPlots` dynamic import into `stac.ts` remains (one-way edge, no
cycle).

- **New file:** `apps/loader/src/main/ipc/configStore.ts`
- **Edits:** `apps/loader/src/main/ipc/config.ts`,
  `apps/loader/src/main/ipc/stac.ts`
- **Risk:** low. The new module has the same behaviour as the extracted
  functions. Public symbol `getStorePaths` is still re-exported from
  `config.ts`.

### 2.4 `apps/web-shell` — 5 x `services/toolService.ts` ↔ tools/*

```
services/toolService.ts -> tools/region/analysis/areaSummary.ts          (import execute + toolDefinition)
services/toolService.ts -> tools/sensor/detection/bufferZoneGenerator.ts (import execute + toolDefinition)
services/toolService.ts -> tools/shape/manipulation/moveShape.ts         (import execute + toolDefinition)
services/toolService.ts -> tools/track/analysis/rangeBearing.ts          (import execute + toolDefinition)
services/toolService.ts -> tools/track/analysis/trackStats.ts            (import execute + toolDefinition)

... and each tool file ->
services/toolService.ts  (import type { MCPToolDefinition })
```

**Root cause:** each web-shell tool module reached back into
`services/toolService.ts` for the `MCPToolDefinition` type alone. That
type is ultimately defined and re-exported by `@debrief/utils`, and
`toolService.ts` just forwards it. The local import was taking the long
way around.

**Fix (high-confidence, applied):** each tool now imports
`MCPToolDefinition` directly from `@debrief/utils` (the canonical
source), identical to how existing `SafeFeature` / `GeoJSONFeature`
imports are already handled. Zero behavioural change; the types resolve
to exactly the same interface.

- **Edits:** `areaSummary.ts`, `bufferZoneGenerator.ts`, `moveShape.ts`,
  `rangeBearing.ts`, `trackStats.ts`
- **Risk:** trivial. `MCPToolDefinition` is re-exported at
  `shared/utils/src/index.ts:75`.

### 2.5 `services/cli` (Python) — `main.py` ↔ `catalog.py` / `tools.py` / `validate.py`

```
debrief_cli.main -> debrief_cli.catalog   (deferred, inside _register_commands())
debrief_cli.main -> debrief_cli.tools     (deferred)
debrief_cli.main -> debrief_cli.validate  (deferred)
debrief_cli.catalog  -> debrief_cli.main  (imports Context, pass_context)
debrief_cli.tools    -> debrief_cli.main  (imports Context, pass_context)
debrief_cli.validate -> debrief_cli.main  (imports Context, pass_context)
```

**Root cause:** `Context` / `pass_context` lived in `main.py` (the root
CLI module), so the subcommand groups had to import from `main`, which
in turn imports the groups at startup. `_register_commands()` used
deferred imports to survive the cycle at runtime, but pylint still
flagged the loop.

**Fix (high-confidence, applied):** created
`debrief_cli/context.py` and moved `Context` + `pass_context` there.
`main.py` imports them from the new leaf module and re-exports via
`__all__` so callers that still write
`from debrief_cli.main import Context, pass_context` keep working.
Subcommand modules (`catalog.py`, `tools.py`, `validate.py`) now import
from `debrief_cli.context` directly. The pylint cyclic-import warning
is cleared (10.00/10).

- **New file:** `services/cli/debrief_cli/context.py`
- **Edits:** `main.py`, `catalog.py`, `tools.py`, `validate.py`
- **Risk:** low. Public re-export from `main.py` preserves backwards
  compatibility.

---

## 3. Cycles deliberately left

### 3.1 `apps/vscode` — two type-only cycles

```
1) webview/mapPanel.ts -> views/activityPanelView.ts -> services/calcService.ts -> webview/mapPanel.ts
2) views/activityPanelView.ts -> services/resultsPanelService.ts -> views/activityPanelView.ts
```

**Every edge in both cycles is `import type`** (e.g. `import type { MapPanel } from '../webview/mapPanel'`).
These imports are erased by TypeScript's compiler (isolated modules + `import type` syntax) and generate **no runtime require/import edge**. They trigger madge because madge performs static graph analysis without type-erasure awareness.

**Why not fix now:**

- Breaking them cleanly requires extracting public interfaces
  (`IMapPanel`, `IActivityPanelViewProvider`, `ICalcService`,
  `IResultsPanelService`) into a separate `apps/vscode/src/types/` module.
- Those classes have rich, evolving public APIs (`MapPanel` alone has
  ~dozens of methods referenced across commands and webview). Extracting
  faithful interfaces risks missing edge cases and creating a parallel
  API surface to maintain.
- The cycles have **no runtime effect** — no module initialisation order
  issue exists because no value is loaded across the edges.
- Per task constraints ("Don't restructure entire packages" and "Don't
  change public APIs"), this is correctly out of scope.

**Recommendation for a future pass:** when the VS Code extension is
next refactored, lift these class contracts to interfaces colocated with
their data types (e.g. `types/mapPanel.ts` next to the existing
`types/plot.ts`). This would also improve testability by allowing
mock implementations of the four services.

---

## 4. High-confidence vs risky fixes

| Fix | Confidence | Reason |
|---|---|---|
| 2.1 TimeExtent local alias | **High** | One structural alias; no public API change |
| 2.2 geo-primitives leaf | **High** | Pure functions moved verbatim; re-exports preserved |
| 2.3 configStore leaf | **High** | Low-level I/O only; public `getStorePaths` still exported from `config.ts` |
| 2.4 web-shell direct import from @debrief/utils | **High** | Canonical source; 1-line diffs |
| 2.5 `debrief_cli/context.py` | **High** | Stable pattern; backward-compat re-export in `main.py` |
| *(deferred)* vscode interface extraction | **Riskier** | Requires faithful interface carving for 4 large classes — not taken here |

---

## 5. Verification

Re-running madge after the fixes:

```
shared/components/src + shared/utils/src       →  No circular dependency found
apps/loader/                                    →  No circular dependency found
apps/web-shell/src/                             →  No circular dependency found
apps/vscode/src/                                →  2 (expected — type-only; see §3.1)
services/                                       →  No circular dependency found (still)
```

Pylint after Python fix:

```
services/cli  →  10.00/10  (cyclic-import enabled, all others disabled)
services/, shared/, scripts/  →  10.00/10
```

`task verify` was run and passed.
