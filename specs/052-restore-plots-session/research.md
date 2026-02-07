# Research: Restore Previously-Open Plots on VS Code Startup

**Feature**: 052-restore-plots-session
**Date**: 2026-02-06

## Research Questions

### RQ-1: Where to persist the open plots list?

**Decision**: Use VS Code `workspaceState` via `ExtensionContext.workspaceState`

**Rationale**:
- Workspace-scoped by design — different folders maintain independent state (FR-010)
- Already used by `RecentPlotsService` for the same pattern (proven approach)
- Persisted automatically by VS Code across restarts, including crashes
- Synchronous reads, async writes — fast on startup
- No additional dependencies needed

**Alternatives considered**:
- `globalState` — rejected because it's extension-scoped (not workspace-scoped), violating FR-010
- Filesystem JSON file (e.g., `.debrief-open-plots.json`) — rejected as unnecessarily complex; `workspaceState` already handles serialisation, crash safety, and cleanup
- `Memento` with custom storage — rejected; `workspaceState` *is* a Memento, no need to wrap it

### RQ-2: Separate service or extend RecentPlotsService?

**Decision**: Create a new `OpenPlotsService` separate from `RecentPlotsService`

**Rationale**:
- Different concerns: "recently opened" is a history list (capped at 10, ordered by last access), while "currently open" is a live set (unbounded, ordered by open sequence)
- Different lifecycles: recent plots persist indefinitely; open plots are cleared when explicitly closed
- Different consumers: recent plots feed the welcome view quick pick; open plots feed the restoration flow
- Combining them would conflate two distinct responsibilities and make each harder to reason about

**Alternatives considered**:
- Extend `RecentPlotsService` with `isOpen` flag — rejected because the data shapes and update semantics differ enough to warrant separation
- Add state to `SessionManager` — rejected because `SessionManager` manages in-memory Zustand stores, not persisted state across restarts

### RQ-3: How to restore plots on startup?

**Decision**: Execute the existing `openPlot` command programmatically via `vscode.commands.executeCommand('debrief.openPlot', uri)` for each persisted reference, sequentially

**Rationale**:
- Reuses all existing infrastructure: `stacService.loadPlot()`, `sessionManager.createSession()`, `MapPanel.createOrShow()`
- No duplication of the plot-loading pipeline
- Sequential execution avoids race conditions in `SessionManager` and `MapPanel` (which manage a single active panel)
- If a STAC item is missing, the existing error handling in `openPlot` catches it — we wrap with try/catch and silently skip

**Alternatives considered**:
- Direct calls to `stacService` + `MapPanel` — rejected because it duplicates the command handler logic and risks diverging over time
- Parallel restoration — rejected because `MapPanel` uses a singleton panel pattern; parallel opens would cause race conditions
- Lazy restoration (restore on demand when user switches tabs) — rejected because VS Code custom editors don't have a tab-switching hook for non-editor panels

### RQ-4: When to persist changes?

**Decision**: Persist immediately on every plot open and close event (real-time persistence)

**Rationale**:
- Crash safety (FR-005): if VS Code crashes, the last-known state is already persisted
- `workspaceState.update()` is async but fast (<5ms for small payloads) — negligible impact on user experience
- Consistent with how `RecentPlotsService` works (persists on every `addRecentPlot` call)

**Alternatives considered**:
- Persist only at shutdown (via `deactivate()`) — rejected because `deactivate` is not guaranteed to run on crash, violating FR-005
- Debounced persistence (e.g., persist at most once per second) — rejected as unnecessary complexity; the event rate (plot open/close) is extremely low (minutes between events at minimum)

### RQ-5: How to identify plots uniquely?

**Decision**: Use the `stac://` URI as the unique identifier (e.g., `stac://local-store/exercise-alpha/track-data`)

**Rationale**:
- Already the canonical plot reference throughout the codebase (used by `SessionManager`, `openPlot`, `StacTreeProvider`)
- Built and parsed via `buildStacUri()` / `parseStacUri()` in `types/stac.ts`
- Contains both store ID and item path — sufficient to reload the plot
- Stable across sessions (deterministic from catalog structure)

**Alternatives considered**:
- Filesystem path to STAC item JSON — rejected because the codebase uses URI abstraction, not raw paths
- Plot title — rejected because titles are not guaranteed unique
- Numeric index — rejected because it provides no information for reloading

### RQ-6: How to detect plot closure?

**Decision**: Hook into `MapPanel.dispose()` and/or `MapPanel` panel close events

**Rationale**:
- `MapPanel` manages the webview panel lifecycle
- When the user closes a panel, VS Code calls `dispose()` on the panel
- The `MapPanel` class already tracks which plot is displayed via its session reference
- On dispose, notify `OpenPlotsService.removePlot(uri)`

**Alternatives considered**:
- Periodic polling of open editors — rejected because webview panels don't appear in `vscode.window.visibleTextEditors`
- `onDidChangeVisibleTextEditors` — rejected for same reason (webview panels are not text editors)
- `vscode.window.onDidCloseTerminal` — not applicable (these are panels, not terminals)

### RQ-7: What happens with multiple VS Code windows?

**Decision**: Each window independently manages its own open plots list via workspace-scoped state

**Rationale**:
- `workspaceState` is already window/workspace-scoped by VS Code's architecture
- If two windows open the same workspace folder, they share the same `workspaceState` — this is a VS Code platform behaviour we accept
- In practice, users rarely open the same folder in multiple windows simultaneously
- No special handling needed — the default behaviour is correct

## Technology Choices

| Concern | Choice | Justification |
|---------|--------|---------------|
| Persistence mechanism | `workspaceState` | Workspace-scoped, crash-safe, no dependencies |
| Service pattern | Standalone `OpenPlotsService` class | Follows `RecentPlotsService` pattern |
| Plot identification | `stac://` URI | Already canonical in codebase |
| Restoration trigger | `activate()` in `extension.ts` | Earliest reliable entry point |
| Restoration method | Sequential `vscode.commands.executeCommand` | Reuses existing pipeline |
| Closure detection | `MapPanel.dispose()` callback | Standard VS Code panel lifecycle |
| Error handling | Try/catch with silent skip | Per spec: no error messages for missing plots |

## Open Questions

None — all research questions resolved with clear decisions.
