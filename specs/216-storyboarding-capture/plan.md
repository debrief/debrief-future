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
   truth for `viewport: ViewportPolygon` (already carries its own
   `zoom` slot, populated by MapPanel on every pan/zoom),
   `currentTime: epoch-ms`, and `hiddenFeatureIds`. Capture reads a
   consistent snapshot from `session.getState()`; no round-trip to
   the webview is needed.

New artefacts this slice adds: **one command handler**
(`captureScene.ts`), **one keybinding contribution**
(`ctrl/cmd+alt+c` with `when: "debrief.mapFocused"`), **one
WebviewViewProvider** for the minimal Storyboard panel (Scene list +
thumbnails + DTG titles — playback / editing belong to #217 and
#218), **one per-Scene thumbnail service**, and a small **MapPanel
feature-setter** (`setFeatures(features: DebriefFeature[])`) to push
the CRUD-returned features back into the webview. Duplicate-
timestamp collisions resolve through a modal
`showInformationMessage` with Replace / Offset (+1 s) / Cancel
buttons; first-capture Storyboard naming uses `showInputBox` with
`validateInput` for inline collision feedback.

**Plot-type convention**: the VS Code extension's `Plot` type is a
STAC-Item metadata record (`apps/vscode/src/types/plot.ts`), not a
GeoJSON FeatureCollection. #215's CRUD module operates on a
FeatureCollection — so capture wraps `MapPanel.currentFeatures`
(the sibling private field holding `DebriefFeature[]`) into a
throwaway `FeatureCollection` at the CRUD boundary, receives a new
FeatureCollection back, and pushes the resulting features into
`MapPanel.setFeatures(...)`. STAC-Item metadata (`currentPlot`) is
only read to derive the thumbnail write path (`itemPath`).

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
- `@debrief/utils` — `calculateViewportCenter(viewport:
  ViewportPolygon): Coordinate` (shipped by #203) for the 4-corner
  → `[lon, lat]` conversion into `SceneProperties.viewport.center`.
  `ViewportPolygon.zoom` is already an authoritative slot populated
  by MapPanel (at `apps/vscode/src/webview/mapPanel.ts:770`); capture
  reads it directly. **No new zoom-inference helper needed.**
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

| Article | Decision | Status |
|---------|----------|--------|
| **I. Defence-grade reliability — offline by default** | Every branch of the capture path (state snapshot, thumbnail, CRUD, per-Scene PNG write, panel render) uses Node/browser built-ins and already-bundled packages. No network call is introduced. | ✅ Pass |
| **I.3 No silent failures** | Every failure surface (thumbnail pipeline error, out-of-range timestamp, dismissed quick-pick, duplicate-name collision, duplicate-timestamp collision, unknown-storyboard) produces either a toast, a prompt, or a log entry. Tested exhaustively in the command-handler unit tests. | ✅ Pass |
| **I.4 Reproducibility** | Scene IDs are ULIDs (injectable in tests via the #215 `idOverride`); timestamps default to `new Date().toISOString()` but are injectable. DTG formatter is deterministic. Thumbnail bytes depend on map tiles + DOM layout (acceptable — equivalent to #174's plot-level thumbnails). | ✅ Pass |
| **II. Schema integrity** | No schema edits. All Scene / Storyboard mutations go through #215's generated types + CRUD module, which enforces LinkML-derived invariants (reserved slots, `feature_set_hash`, provenance append). | ✅ Pass |
| **III.1 Provenance always** | Every CRUD call appends a `LogEntry` to the inherited `provenance[]` slot (handled inside #215's module). The capture command supplies `actor` (from VS Code user identity if available, otherwise the literal `"vscode-user"` — see research R6). | ✅ Pass |
| **III.2 Source preservation** | No source files touched. Per-Scene PNGs are new sidecar assets; they never overwrite plot data. | ✅ Pass |
| **III.3 Audit trail immutable** | Provenance entries flow through #215's append-only write path; the extension never reaches into existing LogEntry records. | ✅ Pass |
| **IV. Architectural boundaries** | The extension is orchestration only — it reads session state, calls #215's CRUD module (which returns a new plot), and writes per-Scene thumbnail PNGs. No calculation happens in the extension. | ✅ Pass |
| **V. Extensibility** | No plugin boundary crossed; capture runs in the first-party extension only. The minimal panel follows the existing `WebviewViewProvider` pattern, so contrib extensions could later add competing Storyboard panels without touching this code. | ✅ Pass |
| **VI. Testing** | Positive + negative test for every edge case in spec (thumbnail failure, out-of-range, duplicate name, duplicate timestamp × 3 resolutions, dismissed quick-pick). E2E test covers the round-trip requirement (save / reopen restores Scene) — SC-005. | ✅ Pass |
| **VII. Test-driven AI collaboration** | Acceptance Scenarios from spec.md map 1:1 to unit test names; the checklist at `checklists/requirements.md` already captures "what good looks like". | ✅ Pass |
| **VIII. Documentation** | spec.md (written), research.md (Phase 0 below), data-model.md (Phase 1 below), contracts/ (Phase 1 below), quickstart.md (Phase 1 below). All precede implementation. | ✅ Pass |
| **IX. Dependencies** | Zero new runtime dependencies. One zero-impact edit to `apps/vscode/package.json` adding the keybinding + command + view ID contributions. | ✅ Pass |
| **X. Security** | No secrets. No network. Thumbnails contain only already-rendered basemap tiles + user-loaded plot features; no classified-data exfiltration vector. | ✅ Pass |
| **XI. Internationalisation** | All user-visible strings (quick-pick placeholder, duplicate-timestamp modal buttons, toasts) route through the extension's `messages.ts` pattern, keeping them externalisable. DTG formatter is locale-invariant by defence convention. | ✅ Pass |
| **XII. Community engagement** | Planning post (Phase 2 below) announces the slice; preview-app screenshot + GIF will ship with the shipped post after implementation. | ✅ Pass |
| **XIII. Contribution standards** | Atomic commits per section (already in progress). PR review required. CI gates: lint + typecheck + unit + Playwright all green. | ✅ Pass |
| **XIV. Pre-release freedom** | No backwards-compatibility shims. Schema (handled in #215) is v1 only. No deprecation periods. | ✅ Pass |
| **XV. Strict type safety** | `any` / `unknown` prohibited on every new API (command handler return type, MapPanel mutator, thumbnail service, view provider message types). The webview `postMessage` contract uses a generated discriminated union. | ✅ Pass |

**Result**: All 15 articles pass. **No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/216-storyboarding-capture/
├── plan.md              # This file
├── spec.md              # Feature spec (already complete, checklists pass)
├── research.md          # Phase 0 — six research questions resolved
├── data-model.md        # Phase 1 — no new entities; maps Scene fields to host sources
├── quickstart.md        # Phase 1 — end-to-end walk-through for sibling spec authors
├── contracts/
│   ├── capture-command.md         # VS Code command + keybinding contract
│   ├── storyboard-panel-view.md   # WebviewViewProvider + postMessage contract
│   └── scene-thumbnail-service.md # Per-Scene PNG write contract
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already complete)
├── media/
│   ├── planning-post.md    # Phase 2 output
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/vscode/
├── package.json                             ← EDIT: +command contribution, +keybinding, +view contribution
└── src/
    ├── extension.ts                         ← EDIT: register captureScene command, register StoryboardPanelViewProvider
    ├── commands/
    │   ├── captureScene.ts                  ← NEW: command handler — state snapshot, first-capture prompt, #174 call, #215 CRUD, duplicate-timestamp resolution, dirty flag, panel focus
    │   └── __tests__/
    │       └── captureScene.test.ts         ← NEW: unit tests for every edge case
    ├── services/
    │   ├── sceneThumbnailService.ts         ← NEW: writes per-Scene PNGs + updates item.json.assets; returns the STAC asset key
    │   └── __tests__/
    │       └── sceneThumbnailService.test.ts ← NEW
    ├── views/
    │   └── storyboardPanelView.ts           ← NEW: WebviewViewProvider; mirrors logPanelView.ts
    ├── webview/
    │   ├── mapPanel.ts                      ← EDIT: add `setFeatures(features: DebriefFeature[])` to push CRUD-returned FeatureCollection back into the webview; read `currentFeatures` externally (or expose a getter) for capture's FC construction
    │   └── web/
    │       └── storyboardPanel.tsx          ← NEW: React webview entrypoint — renders <StoryboardPanel/> from @debrief/components
    └── types/
        └── storyboardPanelMessages.ts       ← NEW: discriminated union for webview postMessage payloads (Article XV)

shared/components/
└── src/
    ├── panels/
    │   └── StoryboardPanel/                 ← NEW (minimal — Scene list only; playback lives in #217)
    │       ├── index.ts
    │       ├── StoryboardPanel.tsx          ← renders <SceneList/>; empty-state if no active Storyboard
    │       ├── SceneList.tsx                ← renders a list of <SceneRow/>
    │       ├── SceneRow.tsx                 ← thumbnail <img>, DTG title, timestamp secondary line
    │       ├── StoryboardPanel.stories.tsx  ← Storybook stories (empty / one-scene / three-scenes / capturing…)
    │       └── __tests__/
    │           └── StoryboardPanel.test.tsx ← vitest + @testing-library/react
    └── index.ts                             ← EDIT: export StoryboardPanel

tests/e2e/
└── test-storyboard-capture.spec.ts          ← NEW: Playwright E2E through code-server (frame → shortcut → name → confirm → reopen)

.specify/ / CLAUDE.md
└── <no agent-context delta — shared/components + vscode stack already listed>
```

**Structure Decision**: Single-project monorepo extension. Exactly
mirrors the `LogPanel` (#176) / `TimeRangeView` shape — a shared React
component under `shared/components/src/panels/` paired with an
extension-side `WebviewViewProvider` in `apps/vscode/src/views/`. New
code splits cleanly into:

- **Extension-only** (Node runtime, VS Code API): `commands/captureScene.ts`,
  `services/sceneThumbnailService.ts`, `views/storyboardPanelView.ts`,
  `webview/web/storyboardPanel.tsx`, `types/storyboardPanelMessages.ts`,
  and the single `mapPanel.ts` addition.
- **Shared / reusable** (browser runtime, zero VS Code imports):
  `shared/components/src/panels/StoryboardPanel/` — the same pattern
  `#176` established. Consumers in web-shell or Storybook can render
  the panel standalone without any VS Code context.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `StoryboardPanel` — empty state | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` | `storyboard-panel-empty.js` | Shows the panel before any Scene is captured (helps readers visualise the "one keystroke away from a Scene" value prop). |
| `StoryboardPanel` — three Scenes | same file, `WithThreeScenes` story | `storyboard-panel-three-scenes.js` | Demonstrates the minimal panel populated with thumbnails + DTG titles after three captures (core deliverable of the slice). |

**Inclusion Criteria Applied**:
- [x] New visual component — `StoryboardPanel` is new.
- [ ] Significant visual change — not applicable (net-new component).
- [x] Interactive demo adds narrative value — lets a blog reader see
      the Scene list + thumbnail layout without spinning up code-server.

**Bundleability Verified**:
- [x] Stories will exist in Storybook — written alongside the component.
- [x] Components render standalone — the panel is presentational; it
      receives `scenes: SceneRowViewModel[]` as a prop; no VS Code
      postMessage or session-state context is required in Storybook.
- [x] Reasonable bundle size expected — the panel depends only on
      vscrui icons + inline styles; estimated bundle < 60 KB.

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--with-three-scenes` (published after PR merge).

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx — Empty` | Rendering, accessibility, no-Scene copy visible | light, dark, vscode | None (static render) |
| `StoryboardPanel.stories.tsx — WithOneScene` | Rendering, thumbnail loads, DTG title present, scene row has `data-testid="scene-row"` | light, dark, vscode | hover on scene row (tooltip visible) |
| `StoryboardPanel.stories.tsx — WithThreeScenes` | Rendering in ascending timestamp order | light, dark, vscode | None |
| `StoryboardPanel.stories.tsx — Capturing` | Rendering shows pending row with placeholder thumbnail + "capturing…" label | light, dark, vscode | None |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (hover tooltip)
- [x] Accessibility attributes present (`data-testid` + `aria-label` on
      each scene row)
- [x] Screenshots captured for evidence (lives under
      `specs/216-storyboarding-capture/evidence/storybook/`)

**Test File Location**: `shared/components/e2e/StoryboardPanel.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=panels-storyboardpanel--empty&globals=theme:light
/iframe.html?id=panels-storyboardpanel--empty&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--empty&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--with-three-scenes&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-three-scenes&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-three-scenes&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| **First capture on a plot with no Storyboards** | Map Panel, Storyboard Panel (new) | `.leaflet-container`, `[data-testid="storyboard-panel"]`, `[data-testid="scene-row"]`, `.quick-input-widget` (quick-pick), toast | open plot, press `Ctrl+Alt+C`, type name in quick-pick, verify scene row appears with thumbnail + DTG title, verify plot marked dirty |
| **Subsequent capture appends to the active Storyboard** | Map Panel, Storyboard Panel | Same as above | move time slider, press `Ctrl+Alt+C` again, verify second scene row appears below the first |
| **Duplicate-timestamp → Offset resolution** | Map Panel, Storyboard Panel, modal prompt | `.notification-toast-container` or `showInformationMessage` modal buttons | press `Ctrl+Alt+C` at an existing scene's timestamp, click "Offset (+1 s)" in modal, verify scene persisted at `t+1s` |
| **Save / close / reopen round-trip (SC-005)** | Map Panel, Storyboard Panel, file save | File-save flow from #174's existing test harness | press `Ctrl+S`, close plot, reopen plot, verify scene list identical (thumbnail, title, DTG) |
| **Out-of-range timestamp rejected (SC-004)** | Map Panel, error toast | Error toast text | move time slider outside plot range, press `Ctrl+Alt+C`, verify error toast, verify no scene row appears, verify #174 was not invoked (check network / spy) |
| **Scoped shortcut (SC-006)** | Map Panel, Log Panel | `.log-panel`, `.leaflet-container` | focus Log Panel webview, press `Ctrl+Alt+C`, verify command did not fire (no toast, no scene row) |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining (Map
      Panel iframe → Leaflet container; Storyboard Panel iframe →
      scene rows)
- [x] Page objects updated for new selectors (`scene-row`,
      `storyboard-panel`)
- [x] Screenshots captured for evidence (lives under
      `specs/216-storyboarding-capture/evidence/e2e/`)

**Test File Location**: `tests/e2e/test-storyboard-capture.spec.ts`

**Infrastructure**:
- Patches applied by existing `tests/e2e/scripts/patch-webview.sh`
- Content injection via existing `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium via the project's `@sparticuz/chromium` runner
  (`tests/e2e/run-playwright.mjs` equivalent — or reuse the extension's
  existing runner).

## Complexity Tracking

**Nothing to justify.** Constitution Check passes all 15 articles with
zero narrow departures. No new runtime dependencies. No new schema
modules. No Python additions. The slice is orchestration only,
reusing the #215 CRUD module, the #174 thumbnail pipeline, the
session-state store, and the existing `WebviewViewProvider` pattern.
