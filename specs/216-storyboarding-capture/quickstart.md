# Quickstart: Storyboarding — Capture

**Feature**: 216-storyboarding-capture
**Audience**: Implementers of #216, reviewers, authors of siblings
#217 (panel + playback) and #218 (edit suite), and anyone exercising
the capture flow manually in the preview app.

---

## What this feature delivers

1. **A single-keystroke capture flow**: `Ctrl/Cmd+Alt+C` scoped to
   the Map Viewer snapshots the current viewport + time-slider
   instant + visible-feature set into a schema-validated
   `Scene` Feature inside a `Storyboard` attached to the plot.
2. **A first-capture quick-pick** for naming the Storyboard, shown
   only when the plot has no existing Storyboards.
3. **A synchronous thumbnail**: each Scene gets its own PNG pair
   (800×600 + 200×150) written under
   `{stacItemPath}/scene-thumbnails/`, registered as STAC assets
   keyed `scene-thumbnail-{sceneId}`.
4. **A duplicate-timestamp resolver**: Replace / Offset (+1 s) /
   Cancel modal prompt when the analyst captures at a moment
   already occupied on the active Storyboard.
5. **A minimal Storyboard panel** in the sidebar that auto-opens on
   first capture and shows the active Storyboard's Scene list
   (thumbnail, DTG title, timestamp). No playback, no editing, no
   multi-Storyboard switching — those ship in #217 and #218.

The capture flow writes to the plot's in-memory FeatureCollection
and marks the plot dirty; durability requires the analyst's explicit
save (same as every other plot-edit path).

---

## File map after implementation

```text
apps/vscode/
├── package.json                              ← EDIT: +command, +keybinding, +view, +menu
└── src/
    ├── extension.ts                          ← EDIT: register captureScene + StoryboardPanelViewProvider
    ├── commands/
    │   ├── captureScene.ts                   ← NEW
    │   └── __tests__/captureScene.test.ts    ← NEW (18 cases)
    ├── services/
    │   ├── sceneThumbnailService.ts          ← NEW
    │   └── __tests__/
    │       └── sceneThumbnailService.test.ts ← NEW (13 cases)
    ├── views/
    │   └── storyboardPanelView.ts            ← NEW
    ├── webview/
    │   ├── mapPanel.ts                       ← EDIT: +swapPlot(plot) mutator
    │   └── web/storyboardPanel.tsx           ← NEW: React webview entry
    └── types/
        └── storyboardPanelMessages.ts        ← NEW: discriminated unions

shared/components/
└── src/
    ├── panels/StoryboardPanel/               ← NEW (Scene list only)
    │   ├── index.ts
    │   ├── StoryboardPanel.tsx
    │   ├── SceneList.tsx
    │   ├── SceneRow.tsx
    │   ├── StoryboardPanel.stories.tsx       ← 5 stories
    │   └── __tests__/StoryboardPanel.test.tsx ← 8 cases
    └── index.ts                              ← EDIT: export StoryboardPanel

shared/utils/                                  ← EDIT: +inferZoomFromPolygon
└── src/viewport.ts                           ← NEW helper + test

tests/e2e/
└── test-storyboard-capture.spec.ts           ← NEW: 6 E2E workflows through code-server

shared/components/e2e/
└── StoryboardPanel.spec.ts                   ← NEW: story-level Playwright
```

---

## End-to-end walk-through — first capture

### 1. Load a plot

```
User: click a plot in the STAC browser
State: plot loaded into MapPanel.currentPlot
       session-state populated (spatial.viewport, temporal.currentTime, temporal.timeRange)
       debrief.plotOpen context key = true
       Storyboard panel view visible in sidebar (empty state — "No Storyboards yet.")
```

### 2. Frame the map

```
User: pan / zoom / move the time slider / toggle tracks off in the Layers panel
State: sessionStore.getState() holds the live snapshot
       MapPanel.currentPlot unchanged (mutations come later)
       debrief.mapFocused = true while Map Viewer has focus
```

### 3. Press `Ctrl/Cmd+Alt+C`

The keybinding fires `debrief.captureScene` only because
`debrief.mapFocused && debrief.plotOpen`. Inside the handler:

- **Read snapshot** — `viewport`, `currentTime`, `hiddenIds` from
  session-state; `plot` from MapPanel.
- **Validate** — any null or out-of-range → reject with error
  toast, no further work.
- **Resolve active Storyboard** — `getActiveStoryboardDefault(plot)`
  returns `null` because no Storyboards exist yet → trigger the
  first-capture quick-pick.

### 4. Name the Storyboard

```
UI: showInputBox with title "Name your Storyboard" + placeholder
User: types "MARSTRIKE 26 — Day 1", presses Enter
validateInput: returns null (empty check + collision check pass)
```

If the user dismisses with `Esc`, the handler returns `cancelled`.
No Storyboard, no Scene, no dirty flag.

### 5. Thumbnail capture

```ts
const { largePngBase64, smallPngBase64 } =
  await mapPanel.requestThumbnailCapture(5000);
```

If the promise resolves with `null` values (timeout or DOM capture
failure), the handler surfaces the thumbnail-failed toast and
returns `rejected`. No Storyboard is persisted.

### 6. Per-Scene PNG write + CRUD call

```ts
const sceneId = ulid();                                    // pre-generate
const { assetKey } = await sceneThumbnailService.writeSceneThumbnail(
  stacItemPath, sceneId, largePngBase64, smallPngBase64,
);
// PNGs + item.json.assets now durable on disk

const { plot: plot1, storyboard } = await createStoryboard(plot, {
  name: "MARSTRIKE 26 — Day 1",
  actor: sessionManager.actor,
});
mapPanel.swapPlot(plot1);

const { plot: plot2, scene } = await createScene(plot1, {
  storyboardId: storyboard.properties.id,
  viewport: {
    center: calculateViewportCenter(viewport),
    zoom:   inferZoomFromPolygon(viewport),
    bearing: 0,
  },
  timestamp: new Date(currentTime).toISOString(),
  visibleFeatureIds: plot1.features
    .filter((f) => f.properties?.id && !hiddenIds.has(f.properties.id))
    .map((f) => f.properties.id),
  thumbnailAssetRef: assetKey,
  actor: sessionManager.actor,
  idOverride: sceneId,        // ensures Scene.id matches the PNG filename
});
mapPanel.swapPlot(plot2);
sessionManager.markDirty(plot.id);
await commands.executeCommand("debrief.storyboardPanel.focus");
```

### 7. Panel auto-opens + success toast

The Storyboard sidebar view focuses. The provider recomputes its
scene list, posts `{type:'scenes', scenes:[SceneRowViewModel]}` to
the webview, and the user sees:

- Header: "MARSTRIKE 26 — Day 1 · 1 Scene"
- Row: `<thumbnail>` + "201500Z APR 26" + secondary timestamp line.
- Success toast: "Scene captured — 201500Z APR 26"

Plot dirty indicator appears on the tab title.

---

## End-to-end walk-through — subsequent captures + collisions

### Same plot, new moment

The analyst pans + moves the time slider, presses
`Ctrl/Cmd+Alt+C` again. Because
`getActiveStoryboardDefault(plot)` now returns the first-capture
Storyboard, the handler **skips the quick-pick** and appends a
second Scene directly. Panel re-renders with two rows ordered by
`timestamp` ascending.

### Duplicate timestamp (Replace branch)

```
User: scrubs time slider back to exactly the first Scene's timestamp
User: presses Ctrl/Cmd+Alt+C
#215 createScene: throws DuplicateTimestampError(conflictingSceneId = SCENE1)

UI: modal prompt "A scene already exists at 201500Z APR 26."
    buttons [Replace] [Offset (+1 s)]  (Cancel implicit)
User: clicks Replace

Handler:
  1. deleteScene(plot, { sceneId: SCENE1 })
  2. createScene(plot, inputs)           ← same timestamp, succeeds now
```

### Duplicate timestamp (Offset branch)

```
User: clicks "Offset (+1 s)"
Handler: retries with timestamp + 1 s
If THAT also collides: prompt appears again with the new timestamp
Cap: 5 consecutive offsets → "Too many consecutive offset retries"
     error toast; no Scene created
```

### Duplicate timestamp (Cancel / dismiss)

Modal dismissed → handler returns `cancelled`; no write.

---

## Round-trip guarantee (SC-005)

```
User: saves plot (Ctrl/Cmd+S)
Effect: FeatureCollection written to features.geojson via #215 (no schema changes)
        item.json already updated on each capture (assets entries durable)
        PNGs already on disk
User: closes plot
User: reopens plot
Effect: MapPanel reloads FeatureCollection
        storyboardPanelView recomputes scene list
        panel renders identical rows (same ULIDs, same thumbnails, same DTGs)
```

No migration step required — the spec ships v1 schema only.

---

## Running the tests

```bash
# TypeScript unit tests (command + service + panel component)
pnpm --filter @debrief/components test -- StoryboardPanel
pnpm --filter debrief-vscode test -- captureScene sceneThumbnailService

# Storybook E2E (light / dark / vscode theme variants)
pnpm --filter @debrief/components build-storybook
cd shared/components && node run-playwright.mjs StoryboardPanel

# VS Code webview E2E (through code-server)
cd tests/e2e && node run-playwright.mjs test-storyboard-capture

# Full gate (what CI runs)
task verify
```

Every Success Criterion (SC-001…SC-008) is exercised by one of
these commands. The mapping is in
[data-model.md §8](data-model.md#8-adherence-test-mapping).

---

## Downstream integration map

| Consumer | What this spec provides |
|---|---|
| **#217 storyboarding-playback** | Stable `debrief.storyboardPanel` view id to extend; `SceneRowViewModel` shape already carries everything #217's transport needs; `scene-row-clicked` message is wired up (no-op in #216) for #217 to handle. |
| **#218 storyboarding-edit** | `deleteSceneThumbnail` API ready for delete-with-undo; per-Scene asset keys are stable ULID-suffixed so rename/duplicate ops can compute them deterministically; handler's `Replace` branch demonstrates the #218 overwrite pattern. |
| **Analysis Log (#176)** | #215's provenance append records every capture via `LogEntry.was_generated_by.parameters.op = "create"`; the Log Panel reads these without any #216-side wiring. |
| **STAC browser (#077)** | Per-Scene PNGs are registered assets — future gallery views can discover them via the same mechanism #174's plot-level thumbnails use. |

---

## Constitution compliance summary

- **Article I (offline)** — zero network calls; all writes local.
- **Article II (schema)** — no schema edits; all invariants through
  #215's generated types + CRUD module.
- **Article III (provenance)** — #215 records a `create` LogEntry
  per capture; every mutation audit-trailed.
- **Article IV (boundaries)** — extension is orchestration only.
- **Article VI (tests)** — positive + negative per edge case;
  18-test unit matrix for the command, 13 for the service, 8 for
  the panel component, 4 Storybook + 6 webview E2E tests.
- **Article IX (dependencies)** — zero new runtime deps.
- **Article XV (strict types)** — `CaptureResult` discriminated
  union covers every control-flow branch; `StoryboardPanelMessage`
  + `ExtensionMessage` likewise.

---

## Things to verify at implementation time

- **`SessionManager.markDirty(plotId)` actually exists** with that
  signature. If the method name / signature differs, update
  `captureScene.ts` step 9 and re-run the "markDirty fires exactly
  once on happy path" unit test.
- **`MapPanel.swapPlot(plot)` / `MapPanel.appendFeatures(features)`
  is the right API** for pushing the CRUD-returned plot into the
  webview. Today `MapPanel.currentPlot` is mutated in some places
  and re-posted in others; the implementation should pick one
  pattern and reuse it consistently (contract calls it
  `swapPlot`).
- **`os.userInfo().username` is stable in code-server deployments
  the team uses**. If it throws in the containerised preview, the
  fallback to `"vscode-user"` kicks in and unit tests should cover
  both branches.
- **Keybinding default does not clash** with a user's custom
  binding. `Ctrl/Cmd+Alt+C` is not claimed by default VS Code; a
  CI lint step checks `apps/vscode/package.json` doesn't collide
  with stock bindings.