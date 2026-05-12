# Research: Wire Drawing Mode and Palette to Session-State Store

**Feature**: 108-drawing-mode-session-state
**Phase**: 0 (Outline & Research)
**Date**: 2026-05-12

## Open Questions from Technical Context

The plan's Technical Context section produced **no NEEDS CLARIFICATION markers**. Every concrete dependency, language, and platform was resolvable from the existing codebase. The research below documents the discovery work that confirmed this, so that downstream `/speckit.tasks` and `/speckit.implement` have a single source for the "what is already there vs. what is missing" picture.

## Decision Log

### Decision 1: Treat this feature as a focused gap-fill, not a from-scratch wiring

**Decision**: Land only the missing piece — initial-state synchronisation on `webviewReady` — rather than re-deriving the message-bridge architecture.

**Rationale**: The architectural-consistency review document (`docs/architectural-consistency-review.md`) was authored before PR #559 merged. As of the current `main`, the bridge already exists:

- Web-shell `App.tsx:264` reads `drawingMode` directly from `state.drawingMode`. `App.tsx:930` reads `paletteIndex` from `store.getState().drawingPaletteIndex`. Web-shell writes via `freshStore.getState().setDrawingMode(null)` (`App.tsx:277`). The web-shell side of F-3.1/F-3.2 is **already resolved**.
- VS Code host `mapPanel.ts:841-866` subscribes to a `drawingMode` + `drawingPaletteIndex` selector on the session store and forwards every change to the webview as `setDrawingMode` / `setDrawingPaletteIndex` messages.
- VS Code host `mapPanel.ts:1066-1069` receives `drawingModeChanged` from the webview and writes back via `setDrawingMode()` on the store. The session-state slice (`services/session-state/src/store/slices/spatial.ts:47-49`) already exposes the setter.
- VS Code webview `mapView.tsx:60,62` retains `useState` mirrors for `drawingMode` and `paletteIndex`. These are **driven** by host messages (`mapView.tsx:169-174`) and **post back** to the host on toolbar clicks (`mapView.tsx:67`). The mirror is correct — webview iframes cannot import the host-side Zustand store; the session-state lives in the extension host process.

The only remaining hole is the `webviewReady` initial-state push. `mapPanel.handleWebviewMessage('webviewReady', …)` (`mapPanel.ts:977-1001`) sends `setCurrentTime` and `setDisplayMode` to seed the new webview, but does **not** send drawing values. So on webview rebuild, the host-side session-state still holds the armed mode but the webview boots with its `useState` defaults of `null` / `0`. The drawing-toolbar appears un-armed until the user re-clicks something.

This means the fix is two `this.postMessage(...)` calls inside the existing `webviewReady` branch, plus the regression tests required to keep them honest.

**Alternatives considered**:

- *Re-host the webview's drawing-mode state in a webview-internal store (e.g., Jotai or Zustand inside the iframe) that re-syncs from host messages*. Rejected — adds dependency and complexity for no observable behaviour gain; the existing `useState` mirror is already correct as long as the host seeds it on mount.
- *Replace the message bridge with a direct store import in the webview*. Rejected — violates the VS Code webview boundary (the webview is an isolated frame; the extension host owns the store). Also would force every other slice into the webview bundle.
- *Add an explicit `requestInitialState` message from the webview after `webviewReady`*. Rejected — `webviewReady` already exists for exactly this purpose; the temporal slice (`setCurrentTime`, `setDisplayMode`) follows that pattern, and we should mirror it for drawing state rather than invent a second handshake.

### Decision 2: Reuse the existing `setDrawingMode` / `setDrawingPaletteIndex` extension messages

**Decision**: Send the initial drawing values using the same two message types the subscriber callback already sends.

**Rationale**: The webview's `handleMessage('setDrawingMode', …)` and `handleMessage('setDrawingPaletteIndex', …)` branches in `mapView.tsx:169-174` are already implemented and tested by existing flows. Using the same message types means the webview's reception logic is exercised by both code paths — change-subscription and initial-state — with no new branch. The message contract in `apps/vscode/src/webview/messages.ts` already types both messages with the right shape.

**Alternatives considered**:

- *Introduce a single new `setInitialDrawingState` message bundling both fields*. Rejected — adds a third receiver in the webview and a one-off shape in `messages.ts` for negligible benefit. The two existing messages are cheap to send back-to-back.

### Decision 3: Trust `setDrawingMode(null)` as the canonical "un-armed" payload, do not skip the post

**Decision**: Always post both `setDrawingMode` and `setDrawingPaletteIndex` on `webviewReady`, even when the values match the webview defaults (`null` and `0`).

**Rationale**: Two reasons.

1. The webview cannot distinguish "host has no opinion yet" from "host says null". Posting the value unconditionally removes that ambiguity and matches how `setDisplayMode` is posted unconditionally in the existing code.
2. The flush-on-ready path is the regression test target; conditional posts would create a state-dependent path that's easy to break silently. Sending always keeps the implementation and the test in lock-step.

The cost is two ~50-byte messages on every webview boot, which is negligible.

### Decision 4: Treat the existing webview `useState` mirror as deliberate, not a bug to remove

**Decision**: Keep `useState<DrawingMode>(null)` and `useState<number>(0)` in `mapView.tsx`. Update only the surrounding comment so future readers know the local state is a host-driven mirror, not the source of truth.

**Rationale**: The VS Code webview is an iframe. It does not — and per the architectural boundary, should not — import `@debrief/session-state` directly. The store lives in the extension host. The webview's React render therefore needs *some* local state for the toolbar to read on each render; that's what `useState` provides. The alternative would be to pass `drawingMode` in via every render through `postMessage`, which is exactly what we already do — `useState` is just the React-idiomatic way to hold the most-recent value.

FR-011 ("no remaining call site uses component-local React state as the **authoritative** source") is honoured by this approach: the host is the authority, the webview's `useState` is a mirror, and the wiring proves the host can re-seed it on mount.

This is also consistent with finding F-3.4 in the same architectural review, which explicitly accepts that "selection state architecture differs by platform: web-shell reads `session-state.features.selection` directly; VS Code webview receives selection via `postMessage`". Drawing-mode in VS Code follows the same legitimate pattern.

**Alternatives considered**:

- *Replace the `useState` mirror with `useSyncExternalStore` against a webview-internal source*. Rejected — same as Decision 1 alternative; adds machinery for no behaviour change.

### Decision 5: Use Vitest unit test, not Playwright, for the VS Code regression

**Decision**: Cover the VS Code initial-state flush with a focused Vitest test on `MapPanel.handleWebviewMessage('webviewReady', …)`, mocking the `Webview.postMessage` channel and the active session.

**Rationale**: The behaviour under test is at the message boundary, not in the UI. A Playwright test that drives real VS Code chrome (via `xvfb-run` / `openvscode-server`) is unreliable in cloud sessions (#142 is exactly the spec that records that pain). A unit test against `MapPanel` is fast, deterministic, and exercises the exact code path we're changing.

The Playwright check we *do* add lives in the web-shell, where Playwright is the supported path.

**Alternatives considered**:

- *Drive VS Code with `xvfb-run`*. Rejected — known-unreliable per #142.
- *Skip the test and rely on manual verification*. Rejected — Constitution VI.2 requires tests for service-level changes, and even though this is frontend, the same discipline applies to message-boundary contracts.

## Best-Practices Confirmations

### Zustand store access from inside vs. outside React

The plan relies on the web-shell reading `store.getState().drawingPaletteIndex` outside a React-hook context (`App.tsx:930` — inside a `useCallback`). This is the documented Zustand pattern for one-shot reads where you don't want a subscription. It does not introduce stale-closure risk because the read happens at the moment of the user's drawing action, not at render time. No change required.

### VS Code Extension webview boundary

VS Code webviews run in an isolated iframe with their own JS context. The extension host (`mapPanel.ts`) and the webview (`mapView.tsx`) communicate exclusively via `postMessage`. This is documented in the official VS Code Extension API docs and is the architecture the codebase already follows. Our change is one new message of each existing type in an existing handler — no boundary crossings are added.

### React `useState` as a remote-state mirror

Mirroring server (or extension-host) state in `useState` and synchronising it via a `useEffect`-attached message listener is a standard pattern in VS Code webview implementations. The current `mapView.tsx` follows this pattern for selection, hidden IDs, current time, and display mode in addition to drawing state. Our change brings drawing state to parity with the other mirrors at boot time.

## Outcome

All technical-context unknowns are resolved. The implementation is mechanically simple (two message posts), the architectural correctness is confirmed (the message bridge is the right boundary, and we're filling a gap in it rather than redesigning anything), and the test plan is bounded to one Vitest unit test plus one Playwright regression.
