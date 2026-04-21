# Implementation Plan: Storyboarding — Capture

**Branch**: `216-storyboarding-capture` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/216-storyboarding-capture/spec.md`

## Summary

Ship the **Map Viewer capture flow** for the Storyboarding epic (#024) as a
thin VS Code extension slice that leans on three pieces of already-shipped
infrastructure:

1. **#215's headless CRUD module** (`@debrief/components/storyboard`) —
   `createStoryboard`, `createScene`, `getActiveStoryboardDefault`,
   `DuplicateTimestampError`, `formatDtg`. No domain logic re-implemented in
   the extension; the extension is orchestration only.
2. **#174's thumbnail capture pipeline** — `MapPanel.requestThumbnailCapture()`
   already produces large + small base64 PNGs from the live Leaflet DOM.
   Reused verbatim; this spec adds a **per-Scene** write path
   (`scene-{ulid}.png` under the STAC Item dir + a `scene-thumbnail-{id}`
   asset entry) instead of #174's plot-level `thumbnail.png`.
3. **Session-state store** (`@debrief/session-state`) — single source of
   truth for `viewport: ViewportPolygon`, `currentTime: epoch-ms`, and
   `hiddenFeatureIds`. Capture reads a consistent snapshot from
   `session.getState()`; no round-trip to the webview is needed.

New artefacts this slice adds: **one command handler** (`captureScene.ts`),
**one keybinding contribution** (`ctrl/cmd+alt+c` with
`when: "debrief.mapFocused"`), **one WebviewViewProvider** for the minimal
Storyboard panel (Scene list + thumbnails + DTG titles — playback /
editing belong to #217 and #218), **one per-Scene thumbnail service**, and
a small **MapPanel mutator** to swap the plot FeatureCollection when CRUD
returns a new one. Duplicate-timestamp collisions resolve through a modal
`showInformationMessage` with Replace / Offset (+1 s) / Cancel buttons;
first-capture Storyboard naming uses `showQuickPick` with inline
collision validation.

The extension path is entirely JavaScript runtime; no new Python code.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) for the VS Code
extension path and the new webview-view React component. No Python
additions in this slice — all Pydantic/LinkML work landed in #215.

**Primary Dependencies** (all already in the monorepo — **no new
runtime dependencies**):

- `@debrief/components/storyboard` — CRUD + `formatDtg` +
  `DuplicateTimestampError` (shipped by #215).
- `@debrief/components` — `captureMapAsDataUrl`, `downscaleDataUrl`
  (shipped by #174), plus the WebviewViewProvider + React webview
  patterns already used by `logPanelView` and `timeRangeView`.
- `@debrief/session-state` — `SessionStoreApi.getState()`,
  `selectors.hiddenFeatureIds`, `markDirty()`. Source of truth for
  `viewport`, `currentTime`, and hidden-feature set.
- `@debrief/utils` — `calculateViewportCenter(viewport: ViewportPolygon):
  Coordinate` for the 4-corner → `[lon, lat]` conversion into
  `SceneProperties.viewport.center`.
- `@debrief/schemas` — generated `SceneFeature`, `StoryboardFeature`,
  `Viewport`, `ViewportPolygon`, `Coordinate` types.
- VS Code Extension API ^1.85.0 — `window.showQuickPick`,
  `window.showInformationMessage(…, { modal: true })`,
  `window.showErrorMessage`, `commands.executeCommand('setContext', …)`,
  `WebviewViewProvider`.

**Storage**: Storyboard and Scene Features round-trip as plain GeoJSON
Features inside the existing plot FeatureCollection (handled by #215 —
no schema additions). Per-Scene thumbnail PNGs live under the plot's
STAC Item directory at `./scene-thumbnails/scene-{ulid}.png`, registered
as a STAC asset keyed by `scene-thumbnail-{sceneId}` in
`item.json.assets`. The `thumbnail_asset_ref` slot on
`SceneProperties` stores the relative path (e.g.
`./scene-thumbnails/scene-01HW…Z.png`). No database, no new catalog
collection.

**Testing**:

- `shared/components/src/panels/StoryboardPanel/__tests__/*.test.tsx` —
  component rendering + empty-state + Scene-list cases (vitest +
  @testing-library/react).
- `shared/components/src/panels/StoryboardPanel/*.stories.tsx` —
  Storybook stories exercised by Playwright (theme variants: light,
  dark, vscode).
- `apps/vscode/src/commands/__tests__/captureScene.test.ts` — unit
  tests for the command handler with a stubbed MapPanel / session /
  thumbnail service (vitest). Covers all edge cases enumerated in the
  spec (out-of-range timestamp, dismissed quick-pick, duplicate name,
  #174 failure, duplicate-timestamp → Replace / Offset / Cancel,
  no-active-Storyboard fallback).
- `apps/vscode/src/services/__tests__/sceneThumbnailService.test.ts` —
  unit tests for per-Scene PNG writes + `item.json` asset-entry
  updates (fs-mocked).
- `tests/e2e/test-storyboard-capture.spec.ts` — Playwright E2E driving
  the code-server preview app through the full first-capture loop
  (frame map → keyboard shortcut → quick-pick → persisted Scene
  visible in minimal panel → close / reopen plot → Scene still
  present). Follows the existing webview-E2E patterns documented in
  `docs/e2e-testing-guide.md`.

**Target Platform**: VS Code extension host (Node 20+) for the
command + thumbnail service; evergreen Chromium (the VS Code webview
runtime) for the Storyboard panel React component. Code-server as a
first-class host for E2E verification. **Offline** — Article I applies;
no network calls in the capture path.

**Project Type**: Single-project monorepo extension. Code lands in
existing workspaces — `apps/vscode/` (command + view provider +
per-Scene thumbnail service) and `shared/components/src/panels/` (new
`StoryboardPanel` React component, sibling of `LogPanel`).

**Performance Goals**:

- **SC-001**: median shortcut-press → Scene visible in minimal panel
  **< 1.5 s** on the reference test plot (includes synchronous #174
  thumbnail and synchronous CRUD write).
- **SC-007**: trained-analyst first-capture flow (frame → shortcut →
  name → confirm) **< 10 s** median.

**Constraints**:

- **Offline** — every path (thumbnail, CRUD, panel render) is pure
  browser + Node APIs; no network (Article I).
- **Atomicity** — Scene is only persisted after the thumbnail returns
  a non-null PNG pair (FR-CAP-007 / FR-CAP-008). On any failure the
  plot FeatureCollection and dirty flag are byte-identical to
  pre-capture state (SC-002).
- **Scoped shortcut** — `Ctrl/Cmd+Alt+C` only fires when
  `debrief.mapFocused === true` (SC-006); no global keybinding.
- **Single-flight** — concurrent shortcut presses are ignored (or
  queued) while a capture is in flight; surfaces an unobtrusive
  "capturing…" state in the panel.
- **Strict types** — `any` / `unknown` prohibited on any new public
  API surface (Article XV). The React webview types `vscode.postMessage`
  payloads through a generated `StoryboardPanelMessage` discriminated
  union.
- **No domain logic in the extension** — every rule that the spec
  restates (canonicalisation, duplicate-timestamp detection,
  provenance append, DTG formatter fallback) is delegated to the
  `@debrief/components/storyboard` module. The extension is
  orchestration only (Article IV).

**Scale/Scope**:

- Expected working plot: ≤ 5 Storyboards × ≤ 50 Scenes (per #215's
  performance bound).
- Thumbnail size: 800 × 600 (large, `scene-{ulid}.png`) + 200 × 150
  (small, `scene-{ulid}-sm.png`); ~40 KB + ~5 KB each respectively.
- Panel rendering: the minimal panel only shows Scenes for the
  currently active Storyboard; no virtualisation needed at this scale
  (list rendering is unconditional).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> _To fill: per-Article decision table with status._

## Project Structure

### Documentation (this feature)

> _To fill: tree of `specs/216-storyboarding-capture/` artefacts._

### Source Code (repository root)

> _To fill: concrete tree of files touched / added — `apps/vscode/src/`,
> `shared/components/src/`, test locations._

**Structure Decision**: _TBD_

## Media Components

> _To fill in Phase 1.5: Storybook stories (if any) for blog demo, or
> "None — backend/infrastructure feature"._

## Storybook E2E Testing

> _To fill: story-level Playwright tests, or "None — no interactive
> Storybook components."_

## VS Code Webview E2E Testing

> _To fill: extension-level Playwright workflow through code-server._

## Complexity Tracking

> _Fill only if Constitution Check has violations that must be justified._
