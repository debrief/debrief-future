# Quickstart: Storyboarding — Schema + CRUD Core

**Feature**: 215-storyboarding-schema
**Audience**: Developers of sibling specs #216 (capture), #217 (panel +
playback), #218 (edit suite), and anyone opening a plot that contains
Storyboards.

---

## What this feature delivers

1. **LinkML master schema** — `Storyboard`, `Scene`, `Viewport`,
   `HistoryEntry` under `shared/schemas/src/linkml/storyboard.yaml`.
2. **Generated bindings** — Pydantic models, JSON Schema, and
   TypeScript types published via the existing generation pipeline.
3. **Seven golden fixtures** — three valid + four invalid — exercised
   by the existing Article II adherence test harness.
4. **Headless TypeScript CRUD module** at
   `shared/components/src/storyboard/`, re-exported from
   `@debrief/components`.

No UI. No VS Code command. No panel. Those arrive in #216–#218.

---

## File map after implementation

```
shared/schemas/
├── src/linkml/
│   ├── storyboard.yaml              ← NEW (4 classes)
│   └── debrief.yaml                 ← imports: + storyboard
├── src/fixtures/
│   ├── valid/
│   │   ├── storyboard-minimal.json
│   │   ├── storyboard-full-featured.json
│   │   └── storyboard-scene-minimal.json
│   └── invalid/
│       ├── storyboard-scene-duplicate-timestamp.json
│       ├── storyboard-scene-non-null-time-range.json
│       ├── storyboard-scene-bearing-nonzero.json
│       └── storyboard-scene-orphan.json
└── tests/
    ├── test_roundtrip.py            ← new entity entries
    ├── test_schema_compare.py       ← new module comparison
    └── test_validation.py           ← new invalid-fixture cases

shared/components/
└── src/storyboard/                  ← NEW headless TS package path
    ├── index.ts                     ← public re-exports
    ├── types.ts                     ← branded types + error classes
    ├── crud.ts, ordering.ts, hash.ts, history.ts
    ├── missing-data.ts, migration.ts, dtg.ts
    └── __tests__/…
```

---

## Using the module — downstream recipes

### 1. Creating a Storyboard (#216 capture — first-capture path)

```ts
import {
  createStoryboard,
  createScene,
  computeFeatureSetHash,
} from "@debrief/components/storyboard";

const { plot: plot1, storyboard } = createStoryboard(currentPlot, {
  name: "MARSTRIKE 26 — Day 1",
  actor: "alice",
});

const { plot: plot2, scene } = createScene(plot1, {
  storyboardId: storyboard.properties.id,
  viewport: { center: [-5.0, 50.0], zoom: 7, bearing: 0 },
  timestamp: "2026-04-20T15:00:00Z",
  visibleFeatureIds: featureIdsFromLayerPanel,
  thumbnailAssetRef: thumbnailRefFromCapture,
  actor: "alice",
});
// Title defaults to "201500Z APR 26" via the DTG formatter.
// feature_set_hash computed for you from visibleFeatureIds.
// history[] initialised with one "create" HistoryEntry.
```

### 2. Listing Scenes in order (#217 panel)

```ts
import { listScenesOrdered } from "@debrief/components/storyboard";

const scenes = listScenesOrdered(plot, activeStoryboardId);
// Sorted ascending by properties.timestamp. No `order` field exists
// or is consulted — timestamp IS the order.
```

### 3. Hard-block on missing data (#217 playback, #218 edit)

```ts
import { detectMissingDataForScene } from "@debrief/components/storyboard";

const classification = detectMissingDataForScene(
  scene,
  currentPlotFeatures,
  { start: plotStart, end: plotEnd },
);

switch (classification.kind) {
  case "ok":              return playScene(scene);
  case "missing-features": return showHardBlock(classification.missingIds);
  case "out-of-range":     return showOutOfRangePrompt();
}
// The detector is pure — it does not mutate `scene` or
// `currentPlotFeatures`. Verified in tests (SC-006).
```

### 4. Duplicate-timestamp conflict (#216 capture, #218 edit)

```ts
import { createScene, DuplicateTimestampError } from "@debrief/components/storyboard";

try {
  createScene(plot, { /* …timestamp collides… */ });
} catch (err) {
  if (err instanceof StoryboardError && err.code === "DuplicateTimestamp") {
    // err.conflictingSceneId is the existing Scene's id.
    // Surface Replace / Offset / Cancel prompt.
  }
}
```

### 5. Copy across Storyboards (#218 edit suite)

```ts
import { copySceneToOtherStoryboard } from "@debrief/components/storyboard";

const { plot: newPlot, scene: copied } = await copySceneToOtherStoryboard(
  plot,
  {
    sceneId: sourceSceneId,
    destinationStoryboardId: destId,
    deepCopyThumbnail: async (srcRef, destStoryboardId) => {
      // Implemented by the VS Code STAC service (#174 helper).
      return await stacService.deepCopyAsset(srcRef, destStoryboardId);
    },
    actor: "alice",
  },
);
// If deepCopyThumbnail rejects, the whole op rolls back atomically —
// `plot` is byte-identical to its pre-call state.
```

### 6. Plot-open migration hook (#217 host integration)

```ts
import { runPlotOpenMigrations, V1_MIGRATIONS } from "@debrief/components/storyboard";

// Run on every plot open, before any CRUD call.
const migrated = runPlotOpenMigrations(parsedPlot, V1_MIGRATIONS);
// v1 is a no-op. Future v2 migrations register here.
```

### 7. Save-time validation (host-side hook)

```ts
import { validatePlot, StoryboardError } from "@debrief/components/storyboard";

try {
  validatePlot(plotBeingSaved);
} catch (err) {
  if (err instanceof StoryboardError) {
    // Surface e.g. "cannot save: orphan Scene" to the user.
    throw err;
  }
}
```

---

## Validating a fixture (Python)

```python
from debrief_schemas import Storyboard, StoryboardScene
import json

plot = json.load(open("specs/215-storyboarding-schema/.../fixture.json"))

for feat in plot["features"]:
    kind = feat["properties"].get("debrief:type")
    if kind == "storyboard":
        Storyboard.model_validate(feat)
    elif kind == "storyboard_scene":
        StoryboardScene.model_validate(feat)
```

---

## Running the adherence tests

```bash
task verify

# or individually:
cd shared/schemas && uv run pytest tests/test_roundtrip.py tests/test_validation.py tests/test_schema_compare.py
pnpm --filter @debrief/components test -- storyboard
```

All nine Success Criteria (SC-001 … SC-009) are exercised by these
commands.

---

## Downstream integration map

| Spec | Uses |
|------|------|
| **#216 storyboarding-capture** | `createStoryboard`, `createScene`, `DuplicateTimestampError`, `formatDtg` |
| **#217 storyboarding-playback** | `listScenesOrdered`, `detectMissingDataForScene`, `readSceneWithStaleness`, `runPlotOpenMigrations`, `getActiveStoryboardDefault` |
| **#218 storyboarding-edit** | All of the above, plus `renameStoryboard`, `updateScene`, `deleteScene`, `duplicateScene`, `copySceneToOtherStoryboard`, `validatePlot` |

This spec does **not** wire any of these into VS Code or web-shell —
it only ships the module. Wiring lands in each sibling spec.

---

## Constitution compliance summary

- **Article I (offline)** — pure in-memory operations; SHA-256 via
  platform crypto; no network.
- **Article II (schema)** — LinkML source of truth; seven fixtures
  through the existing three-way adherence harness.
- **Article III (provenance)** — every mutation appends one
  `HistoryEntry`; history is append-only; `detectMissingDataForScene`
  is pure.
- **Article IV (boundaries)** — narrow, justified departure recorded
  in plan.md Complexity Tracking.
- **Article VI (tests)** — positive + negative tests per invariant;
  atomicity via injected mid-op failure.
- **Article XV (strict types)** — zero `any` on the public API; typed
  error classes with stable string codes.
