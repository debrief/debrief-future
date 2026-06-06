# Viewport Mutation Audit

Captured during PR #623/#625 debugging of post-capture viewport jumps. Lists every
code path that can change the map's centre / zoom / bounds (Leaflet `setView`,
`fitBounds`, `flyTo`, `panTo`) and notes the current gate and the gate the
future "lock viewport during capture series" feature will need.

The map view is mutated in two host-side processes and one webview-side
process. The webview is the source of truth for the live Leaflet instance;
the host pushes intent (messages) and reads back via `viewportChanged`.

## A. Webview-side mutation sites (Leaflet directly)

All in `shared/components/src/MapView/MapView.tsx` unless noted.

| # | File / line | Mutation | Triggered by | Gate today | Lock gate (future) |
|---|---|---|---|---|---|
| A1 | `MapView.tsx:241` (auto-fit effect, body of `if (autoFitBounds && bounds)`) | `map.fitBounds(bounds)` | `bounds` value differs from `prevBoundsRef.current` (so any feature-set change) **and** `autoFitBounds` is `true` | `autoFitBounds` prop. VS Code passes `false`; web-shell defaults to `true`. | Same `autoFitBounds` flag — set `false` while locked. |
| A2 | `MapView.tsx:256` (`fitBoundsTrigger` effect) | `map.fitBounds(bounds)` | The `fitBoundsTrigger` *number* changes from its previously-fired value (after PR #625 fix). Before the fix, also fired on any `bounds` change once trigger was > 0 — root cause of "STILL does fit-to-window at end of each capture". | New `lastFiredFitTrigger` ref (PR #625). | Refuse to advance `lastFiredFitTrigger` while locked, **or** treat lock as overriding any incoming `fitBounds` message. |
| A3 | `MapView.tsx:248` (programmatic viewport effect) | `map.setView(viewport.center, viewport.zoom, { animate: false })` | `viewport` state changes — comes from the `setViewport` host→webview message (`mapView.tsx:141`) or session-restore on mount (`mapView.tsx:91`). | None. | Refuse if `lock.matches(viewport)` is false — i.e. drop or queue mismatching `setView`s. |
| A4 | `MapView.tsx:269` (flyTo, durationMs === 0) | `map.setView(flyToTarget.center, flyToTarget.zoom, { animate: false })` | `flyToTarget` state changes — comes from `flyTo` host→webview message (`mapView.tsx:181-186`). | None. | Same as A3 — drop or queue while locked. |
| A5 | `MapView.tsx:273` (flyTo, durationMs > 0) | `map.flyTo(flyToTarget.center, flyToTarget.zoom, { duration })` | Same as A4. | None. | Same as A4. |
| A6 | `MapView/LeafletToolbar/LeafletToolbar.tsx:506` | `map.fitBounds(visibleBounds)` | User clicks the "fit to visible" toolbar button. | None — user-initiated. | Disable / hide the button while locked. |

## B. Host-side mutation sites (post messages that drive A1–A6)

All in `apps/vscode/src/webview/mapPanel.ts` unless noted.

| # | File / line | Message posted | Triggered by | Reaches A# | Lock gate (future) |
|---|---|---|---|---|---|
| B1 | `mapPanel.ts:213` (`loadPlot`) | `loadPlot` *without* `refitBounds: false` | `mapPanel.loadPlot(plot, features)` — called by `commands/openPlot.ts` on first load + plot switch. | Webview increments `fitBoundsTrigger` → A2 fires (intentional initial fit). | Loading a plot inherently exits the lock — no special gate needed. |
| B2 | `mapPanel.ts:244` (`removeFeatures` → `loadPlot`) | `loadPlot` *without* `refitBounds: false` | Layer-tree delete. | A2 fires (refit after deletion). | Suppress the `fitBoundsTrigger` bump while locked. |
| B3 | `mapPanel.ts:407` (`fitBounds`) | `fitBounds` | `panel.fitBounds(b)` — wraps `fitToAllTracks` / `fitToSelection`. | A2 fires. | Drop the message (or no-op the host method) while locked. |
| B4 | `mapPanel.ts:443` (`fitToAllTracks`) | Calls B3 with the plot bbox. | `debrief.fitToAll` command (`commands/index.ts:153`). | A2. | Same as B3. |
| B5 | `mapPanel.ts:473` (`fitToSelection`) | Calls B3 with selection bbox. | `debrief.fitToSelection` command (`commands/index.ts:162`). | A2. | Same as B3. |
| B6 | `mapPanel.ts:603` (`setFeatures` → `loadPlot`) | `loadPlot` *with* `refitBounds: false` | `captureScene` (PRs #623/#625) and `storyboardPlayback` CRUD paths. | **Should NOT fire A2** — and after the PR #625 `fitBoundsTrigger` fix it doesn't. | Already safe. |
| B7 | `mapPanel.ts:1401` (file-import update → `loadPlot`) | `loadPlot` *without* `refitBounds: false` | File import (`mapPanel.loadFile`). | A2 fires. | Reject the import while locked (out-of-band concern). |
| B8 | `mapPanel.ts:640` (`flyToViewport`) | `flyTo` (token + center + zoom + durationMs) | `storyboardPlayback.stepTo` (scene navigation), `captureScene` post-capture restore (PR #623). | A4/A5. | While locked, `flyToViewport` should no-op if the target equals the locked viewport, and reject otherwise. |
| B9 | Spatial subscription posts `setViewport` (`mapPanel.ts:787`) | `setViewport` (center + zoom) | Any change to `state.viewport` whose key differs from `lastSentViewportKey`. Echo from webview→host→state→subscription→webview suppressed by PR #625's `lastSentViewportKey` priming in `handleViewportChanged`. | A3. | While locked, `state.viewport` is frozen — subscription naturally won't fire. |
| B10 | Session-load restore (`session-state/.../persistence/load.ts:198`) | Indirect: writes `state.viewport`, which triggers B9 → A3. | `sessionManager` loading a `.debrief.json`. | A3 via B9. | Loading a session exits the lock. |
| B11 | MCP `setViewport` tool (`services/session-state/src/server/tools/setViewport.ts:39`) | Indirect: writes `state.viewport` → B9 → A3. | An MCP client (LLM tool call). | A3 via B9. | Reject the tool call while locked, or queue. |

## C. Re-entrant chains observed during capture

After Capture click on `main` (pre-#623):

1. `captureScene` reads `state.viewport` ← **stale** if user panned within last 100 ms (PR #625 `flushPendingViewportUpdate` fixed).
2. `setFeatures` → `loadPlot` with `refitBounds: false` → ✅ no `fitBoundsTrigger` bump (B6).
3. But `bounds` (computed from `featureArray`) changed because the new `STORYBOARD_SCENE` polygon is now in the feature list.
4. `fitBoundsTrigger` effect (A2) re-fires because `bounds` is in its deps — **fit-to-all-features-plus-scene-polygon snap** ← PR #625 `lastFiredFitTrigger` ref fixed.
5. Moveend from the snap → webview posts `viewportChanged` → host writes `state.viewport(fit-all-bounds)` → subscription posts `setViewport` back to webview → Leaflet does `setView(avg-corners, zoom)`. The lat-avg ≠ Leaflet's pixel-centre in Mercator → **shift to one side** ← PR #623's `lastSentViewportKey` echo-suppression fixed.
6. `captureScene` finally calls `mapPanel.flyToViewport(captured, 0)` → A4 → map snaps back to captured (PR #623 added).

## D. Diagram

```
  USER ACTION                            VIEWPORT MUTATION
  ───────────                            ──────────────────
  User pans            ──► moveend ──►   (A4 disabled, no fitBounds, no flyTo)
                                         host: handleViewportChanged
                                         host: setTimeout(100ms)
                                         host: state.setViewport
                                         host: spatial subscription
                                         host: lastSentViewportKey-suppress

  User clicks Capture  ──► captureScene  flushPendingViewportUpdate  ◄── PR #625
                                         read state.viewport
                                         create scene
                                         setFeatures (refitBounds:false)  ◄── B6
                                                                              \
                          ┌── fitBoundsTrigger effect ──── PR #625 lastFiredFitTrigger
                          │
                          └── echo subscription ──── PR #623 lastSentViewportKey

                                         flyToViewport(captured, 0)  ◄── A4

  Click scene          ──► storyboardPlayback.stepTo  ◄── A4/A5 (animated flyTo)
                                                         set displayMode

  Click fit-to-all     ──► fitToAllTracks ──► A2

  MCP setViewport tool ──► state.setViewport ──► spatial sub ──► A3
```

## E. Future "lock viewport" feature

> **Realised in spec 260** — see `specs/260-viewport-lock/`. The realisation
> narrowed the original sketch: the **UI cannot trigger viewport mutation
> while locked** (drag, scroll, double-click, box-zoom, keyboard, fit, zoom-in,
> zoom-out are all gated at the gesture-handler / disabled-button layer), so
> the explicit reject branch is only added at the externally-callable MCP
> surface (B11). The remaining host-internal mutation sites (B1–B10) are
> intentionally not gated in #260 — backlog #262 captures the cross-host
> guard layer for when a future feature exposes a B-site path to the user
> UI while the lock is plausibly active.

Sketch only — full requirements live in the spec when written.

- A boolean `state.viewportLocked` slice on `session-state`, with a corresponding lock icon UI.
- While locked, the following sites must respect the lock:
  - **A1** (auto-fit): force `autoFitBounds = false`.
  - **A2** (`fitBoundsTrigger`): ignore trigger advances, OR drop B3/B4/B5/B7 at the host before posting.
  - **A3** (`setView` from `viewport` state): drop `setViewport` messages whose key differs from the locked key.
  - **A4/A5** (flyTo): host-side `flyToViewport` becomes a no-op (or rejects) for non-matching targets.
  - **A6** (toolbar fit-to-visible): disable/hide button.
  - **B11** (MCP tool): reject with `error: locked`.
- The lock does NOT affect `currentTime`, `displayMode`, `selection`, or `hiddenFeatureIds`. Capturing several scenes while locked produces a series of scenes sharing the same viewport but differing in time / display / visibility.
- Recommended host-side enforcement point: a thin `viewportGuard.ts` module that wraps every B-site. Each B-site asks the guard before posting, and the guard reads the lock from session-state.
- Recommended webview-side defense-in-depth: in MapView, when `viewportLocked` is true, the A3 effect short-circuits if the incoming viewport differs.

## F. Glossary

- **Echo round-trip:** webview moveend → host viewportChanged → host state.setViewport → host spatial subscription → host setViewport back to webview → webview setView. The "back to webview" leg is the part PR #623's `lastSentViewportKey` suppresses.
- **Mercator centre mismatch:** `avg(corners.lat) ≠ map.getCenter().lat` in spherical Mercator. Sending lat-avg as centre to Leaflet's `setView` shifts the pixel-centre.
- **Refit-on-bounds bug (fixed PR #625):** `fitBoundsTrigger` effect was firing on every `bounds` change once the trigger had been incremented once, not only when the trigger value advanced.
- **First-scene race (fixed PR #625):** `state.viewport` was stale if the user clicked Capture inside the 100 ms `handleViewportChanged` debounce; `flushPendingViewportUpdate` now drains the pending write synchronously.
