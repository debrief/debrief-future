# Research: Result View Auto-Refresh on Logical ID Change

**Feature**: 089 (001-result-auto-refresh) | **Date**: 2026-02-17

## Research Questions

### RQ-1: How should the auto-refresh controller subscribe to Result ID Registry change events?

**Decision**: Subscribe via `ResultIdRegistry.subscribe(resultId, callback)` for per-view watchers, and `ResultIdRegistry.subscribeAll(callback)` for a global coordinator.

**Rationale**: The Result ID Registry (#087) already implements a complete pub/sub system with per-ID and global subscriptions (see `services/session-state/src/registry/resultIdRegistry.ts`). The registry emits `ResultIdChangeEvent` objects containing `resultId`, `previousPath`, `newPath`, and version info. This is the exact event shape needed to trigger auto-refresh — no additional file watchers or polling required.

**Alternatives considered**:
- **File system watchers (fs.watch / vscode.workspace.createFileSystemWatcher)**: Rejected — duplicates the registry's responsibility, and file paths can change while the logical ID stays stable. The registry already abstracts this.
- **Polling on an interval**: Rejected — inefficient and introduces latency. The registry's event-driven model is immediate.

### RQ-2: How should viewport state be captured and restored across Vega-Lite re-renders?

**Decision**: Use Vega view's `signal()` API to capture viewport signals before re-render, then restore them after the new spec is embedded.

**Rationale**: Vega-Lite charts expose their interactive state through Vega signals. For charts with zoom/pan (`selection` parameters), the view object accessible via `vega-embed`'s `Result.view` exposes signals like `x_domain`, `y_domain`, and custom selection signals. These can be read with `view.signal(name)` and written back with `view.signal(name, value)` followed by `view.runAsync()`.

The current `ChartRenderer` component (`shared/components/src/ChartRenderer/ChartRenderer.tsx`) stores the `Result` object in a local ref and calls `finalize()` on cleanup. We need to extend this to: (1) expose a `getViewportState()` / `restoreViewportState()` API, and (2) delay finalization until after viewport state is captured.

**Alternatives considered**:
- **Re-creating the spec with pre-applied domain constraints**: Rejected — this would modify the Vega-Lite spec before embedding, losing the ability to detect which signals are user-applied vs data-driven.
- **Wrapping in a container that preserves CSS transforms**: Rejected — Vega-Lite renders on canvas, CSS transforms would only scale the image, not preserve interactive zoom/pan state.

### RQ-3: What debounce strategy should be used for rapid successive updates?

**Decision**: Use a 300ms debounce with trailing edge execution, per logical result ID.

**Rationale**: The existing codebase uses 100ms debounce for map viewport updates (`mapPanel.ts`). For result refresh, a slightly longer window (300ms) is appropriate because: (1) chart re-rendering involves dataset transformation + Vega-Lite compilation, which is more expensive than a viewport message; (2) tool batch re-runs can produce multiple updates within milliseconds; (3) 300ms is below the human perception threshold for "immediate" response.

Per-ID debouncing ensures that rapid updates to one result don't delay a separate result's refresh.

**Alternatives considered**:
- **Throttle (leading edge)**: Rejected — would show intermediate states during batch updates, causing visual flicker.
- **No debounce**: Rejected — burst updates from tool re-runs would cause excessive re-renders and potential UI freezes.
- **Configurable interval**: Rejected per spec assumption — 300ms is a reasonable default that doesn't need user configuration.

### RQ-4: How should visibility-deferred refresh work for background tabs?

**Decision**: Track a `stale` flag per view. When a change event arrives for a non-visible view, set `stale = true` without re-rendering. When the view becomes visible (tab activated or panel revealed), check the stale flag and trigger a refresh.

**Rationale**: The existing `ChartPanelWrapper` component uses a tab bar with `activeChartTabId` to control which tab's content is rendered. Only the active tab renders its `TabContent` component. This architecture naturally supports deferred refresh — we just need to track staleness and trigger a refresh on tab activation.

For VS Code panels, the `onDidChangeViewState` event fires when a panel becomes visible, providing the activation hook.

**Alternatives considered**:
- **IntersectionObserver**: Rejected — overkill for tab-based visibility; the tab activation callback is simpler and more reliable.
- **Always re-render in background**: Rejected — wastes resources and violates FR-006.

### RQ-5: How should pause/resume be implemented?

**Decision**: Add a `paused` boolean and `pendingEvent` reference per view to the auto-refresh controller. When paused, incoming change events are captured but not acted upon. On resume, the latest pending event triggers a single refresh.

**Rationale**: This follows the simple "flag + latest event" pattern. Only the most recent event matters because it represents the current state of the result file. Storing all intermediate events would be wasteful since only the latest data is displayed.

The pause/resume toggle is exposed as a button in the tab header area, consistent with VS Code's editor toolbar pattern.

**Alternatives considered**:
- **Unsubscribe on pause, resubscribe on resume**: Rejected — would miss events during the paused period, requiring a full data reload on resume rather than an incremental refresh.
- **Queue all events**: Rejected — only the latest state matters for display; queuing adds complexity without value.

### RQ-6: Where does the auto-refresh controller live architecturally?

**Decision**: The auto-refresh logic lives as a coordination layer in `services/session-state/src/refresh/` (the controller/orchestrator), with UI integration hooks in `shared/components/` (React hook for consuming refresh state).

**Rationale**: Following the project's "thick services, thin frontends" principle (Constitution Article IV), the refresh coordination logic (subscribing to registry events, debouncing, managing pause/stale state) belongs in the session-state service layer. The React component layer consumes this via a hook (`useAutoRefresh`) that connects the service-layer controller to the component lifecycle.

This mirrors the existing pattern where `services/session-state/` provides store + subscriptions, and `shared/components/` consumes them via hooks and context.

**Alternatives considered**:
- **All logic in React components**: Rejected — violates thick services principle; would couple refresh logic to React lifecycle.
- **VS Code extension host only**: Rejected — the web-shell also needs auto-refresh; the logic must be frontend-agnostic.

### RQ-7: How should provenance be recorded for refresh events (FR-012)?

**Decision**: Log each refresh event via the existing LogService with a new operation type `result:refresh`, recording the logical result ID, previous/new paths, and timestamp.

**Rationale**: The project's LogService (`services/session-state/src/log/`) already handles provenance recording for tool operations. Adding a `result:refresh` operation type follows the existing pattern without introducing a new logging mechanism. This satisfies Constitution Article III (provenance always).

**Alternatives considered**:
- **Separate refresh log file**: Rejected — fragments provenance across multiple stores.
- **No logging**: Rejected — violates FR-012 and Constitution Article III.

## Dependencies Assessment

| Dependency | Status | Ready for #089? |
|------------|--------|-----------------|
| #085 Chart Renderer | Implemented | Needs viewport state API extension |
| #086 Results Bottom Panel | Implemented (as #095) | Ready — tab structure in place |
| #087 Result ID Registry | Implemented | Ready — subscribe/subscribeAll API in place |
| #088 Custom Editor Provider | Not yet implemented | Partial blocker — auto-refresh for editor tabs deferred to P2 |

### Dependency Risk: #088 Not Implemented

The Custom Editor Provider (#088) is not yet implemented. However, the auto-refresh feature can proceed with full support for the results bottom panel (#086/095), deferring editor tab auto-refresh until #088 is delivered. The architecture is designed to work identically for both view types — the auto-refresh controller binds to logical result IDs, not to specific view hosts.

## Technology Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Change detection | Registry events | Already implemented in #087 |
| Viewport capture | Vega signal API | Native to Vega runtime, no external deps |
| Debounce | 300ms trailing edge | Balances responsiveness with render cost |
| State management | session-state service | Follows thick services pattern |
| UI integration | React hook | Follows existing shared/components pattern |
| Provenance | LogService operation | Follows existing provenance pattern |
