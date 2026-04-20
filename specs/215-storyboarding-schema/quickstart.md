# Quickstart: Storyboarding — Schema + CRUD Core

**Feature**: 215-storyboarding-schema
**Audience**: Developers of sibling specs #216 (capture), #217 (panel +
playback), #218 (edit suite), and anyone opening a plot that contains
Storyboards.

**Updated 2026-04-20** following post-plan review. Key deltas:
- Mutations are **async** (`await createScene(…)`). Queries stay sync.
- Provenance flows through the inherited
  `BaseFeatureProperties.provenance: LogEntry[]` slot — not a
  `HistoryEntry` array.
- Discriminator is `properties.kind === "STORYBOARD" | "STORYBOARD_SCENE"`
  (inherited from `BaseFeatureProperties`, no `debrief:type`).

---

## What this feature delivers

1. **LinkML master schema edits** —
   - New file `shared/schemas/src/linkml/storyboard.yaml` with
     `StoryboardProperties`, `SceneProperties`, `Viewport`.
   - `FeatureKindEnum` in `common.yaml` extended with `STORYBOARD` and
     `STORYBOARD_SCENE`.
   - `log-entry.yaml` gains one optional `agent: string` slot.
2. **Generated bindings** — Pydantic models, JSON Schema, and
   TypeScript types published via the existing generation pipeline.
3. **Nine golden fixtures** — five valid (two single-Feature for the
   cross-language round-trip harness, two FeatureCollection-shaped for
   integration, plus one minimal FeatureCollection) + four invalid —
   exercised by the existing Article II adherence test harness plus a
   new `test_crosslang_roundtrip.py` (Py→JSON→TS→JSON→Py).
4. **Headless TypeScript CRUD module** at
   `shared/components/src/storyboard/`, re-exported from
   `@debrief/components`. Mutations are async and use `immer.produce`
   for structural-sharing immutability.

No UI. No VS Code command. No panel. Those arrive in #216–#218.

---

## File map after implementation

```
shared/schemas/
├── src/linkml/
│   ├── storyboard.yaml              ← NEW (3 classes)
│   ├── common.yaml                  ← EDIT: +STORYBOARD, +STORYBOARD_SCENE in FeatureKindEnum
│   ├── log-entry.yaml               ← EDIT: +optional `agent: string` slot
│   └── debrief.yaml                 ← imports: + storyboard
├── src/fixtures/
│   ├── valid/
│   │   ├── storyboard-single-minimal.json         (single Feature; round-trip)
│   │   ├── storyboard-scene-single-minimal.json   (single Feature; round-trip)
│   │   ├── storyboard-full-featured.json          (FeatureCollection)
│   │   └── storyboard-scene-minimal.json          (FeatureCollection)
│   └── invalid/
│       ├── storyboard-scene-duplicate-timestamp.json
│       ├── storyboard-scene-non-null-time-range.json
│       ├── storyboard-scene-bearing-nonzero.json
│       └── storyboard-scene-orphan.json
└── tests/
    ├── test_roundtrip.py            ← new entity entries (scene before story)
    ├── test_schema_compare.py       ← new module comparison
    ├── test_validation.py           ← new invalid-fixture cases
    └── test_crosslang_roundtrip.py  ← NEW: Py→JSON→TS→JSON→Py via Node

shared/components/
├── package.json                     ← +immer ^10.1.3, +ulid ^3.0.2
└── src/
    ├── utils/
    │   └── hash.ts                  ← NEW: lifted from nl-cql2
    └── storyboard/                  ← NEW headless TS package path
        ├── index.ts                 ← public re-exports
        ├── types.ts                 ← branded types + error classes
        ├── crud.ts, ordering.ts, migration.ts, dtg.ts
        ├── missing-data.ts, provenance.ts, validate.ts
        └── __tests__/
            ├── …
            └── perf.bench.ts        ← p95 < 10 ms @ 100k positions
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

const { plot: plot1, storyboard } = await createStoryboard(currentPlot, {
  name: "MARSTRIKE 26 — Day 1",
  actor: "alice",
});

const { plot: plot2, scene } = await createScene(plot1, {
  storyboardId: storyboard.properties.id,
  viewport: { center: [-5.0, 50.0], zoom: 7, bearing: 0 },
  timestamp: "2026-04-20T15:00:00Z",
  visibleFeatureIds: featureIdsFromLayerPanel,
  thumbnailAssetRef: thumbnailRefFromCapture,
  actor: "alice",
});
// Title defaults to "201500Z APR 26" via the DTG formatter.
// feature_set_hash computed (async, Web Crypto) after canonicalising
// visibleFeatureIds (trim, reject empty, dedupe, sort).
// provenance[] initialised with one LogEntry:
//   { was_generated_by.tool: "storyboard-crud",
//     was_generated_by.parameters.op: "create",
//     agent: "alice", ... }
```

### 2. Listing Scenes in order (#217 panel — sync query)

```ts
import { listScenesOrdered } from "@debrief/components/storyboard";

const scenes = listScenesOrdered(plot, activeStoryboardId);
// Sorted ascending by properties.timestamp. No `order` field exists
// or is consulted — timestamp IS the order. Synchronous: no crypto,
// no I/O.
```

### 3. Hard-block on missing data (#217 playback, #218 edit — sync query)

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
import {
  createScene,
  DuplicateTimestampError,
  StoryboardError,
} from "@debrief/components/storyboard";

try {
  await createScene(plot, { /* …timestamp collides… */ });
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
// `plot` is byte-identical to its pre-call state (immer draft discarded).
// The new Scene's provenance[] starts with a `copy-in` LogEntry;
// the source Scene is untouched.
```

### 6. Plot-open migration hook (#217 host integration — sync)

```ts
import { runPlotOpenMigrations, V1_MIGRATIONS } from "@debrief/components/storyboard";

// Run on every plot open, before any CRUD call.
const migrated = runPlotOpenMigrations(parsedPlot, V1_MIGRATIONS);
// v1 is a no-op. Future v2 migrations register here.
```

### 7. Save-time validation (host-side hook — sync)

```ts
import { validatePlot, StoryboardError } from "@debrief/components/storyboard";

try {
  validatePlot(plotBeingSaved);  // synchronous scan
} catch (err) {
  if (err instanceof StoryboardError) {
    // Surface e.g. "cannot save: orphan Scene" to the user.
    throw err;
  }
}
```

### 8. Reading creation / modification timestamps (derived — sync)

```ts
import {
  getCreatedAt,
  getLastModifiedAt,
  getCreatedBy,
  getLastModifiedBy,
} from "@debrief/components/storyboard";

const createdAt = getCreatedAt(storyboard);       // = provenance[0].timestamp
const modifiedAt = getLastModifiedAt(storyboard); // = provenance[last].timestamp
const createdBy = getCreatedBy(storyboard);       // = provenance[0].agent ?? null
// No separate created_by / last_modified_* slots are stored;
// they're derived on read from the inherited provenance[] LogEntry array.
```

### 9. Structural sharing — unmodified Features stay reference-equal

```ts
import { createScene } from "@debrief/components/storyboard";

const { plot: plot2 } = await createScene(plot, { /* … */ });

// Every Feature in `plot.features` that wasn't touched by the op is
// reference-equal (===) to its counterpart in `plot2.features`.
// This is tested as FR-MODULE-022 and is the basis for Zustand
// selector memoisation in #217.
```

---

## Validating a fixture (Python)

```python
from debrief_schemas import StoryboardFeature, SceneFeature
import json

plot = json.load(open("specs/215-storyboarding-schema/.../fixture.json"))

for feat in plot["features"]:
    kind = feat["properties"].get("kind")
    if kind == "STORYBOARD":
        StoryboardFeature.model_validate(feat)
    elif kind == "STORYBOARD_SCENE":
        SceneFeature.model_validate(feat)
```

---

## Running the adherence tests

```bash
task verify

# or individually:
cd shared/schemas && uv run pytest \
    tests/test_roundtrip.py \
    tests/test_validation.py \
    tests/test_schema_compare.py \
    tests/test_crosslang_roundtrip.py
pnpm --filter @debrief/components test -- storyboard
pnpm --filter @debrief/components test:bench -- storyboard
```

All nine Success Criteria (SC-001 … SC-009) plus the perf target
(FR-TEST-024: p95 < 10 ms @ 100 k positions) are exercised by these
commands.

---

## Downstream integration map

| Spec | Uses |
|------|------|
| **#216 storyboarding-capture** | `createStoryboard`, `createScene`, `DuplicateTimestampError`, `formatDtg` |
| **#217 storyboarding-playback** | `listScenesOrdered`, `detectMissingDataForScene`, `readSceneWithStaleness`, `computeFeatureSetHash` (for on-demand staleness), `runPlotOpenMigrations`, `getActiveStoryboardDefault` |
| **#218 storyboarding-edit** | All of the above, plus `renameStoryboard`, `updateScene`, `deleteScene`, `duplicateScene`, `copySceneToOtherStoryboard`, `validatePlot` |

This spec does **not** wire any of these into VS Code or web-shell —
it only ships the module. Wiring lands in each sibling spec.

---

## Constitution compliance summary

- **Article I (offline)** — pure in-memory operations; SHA-256 via
  platform Web Crypto; ULID via the `ulid` package; no network.
- **Article II (schema)** — LinkML source of truth; nine fixtures
  through the existing three-way adherence harness plus the new
  cross-language Py→JSON→TS→JSON→Py harness.
- **Article III (provenance)** — every mutation appends one `LogEntry`
  to the inherited `provenance[]` slot; `provenance[]` is append-only;
  `detectMissingDataForScene` is pure. Single provenance surface across
  the whole codebase (no parallel `history[]`).
- **Article IV (boundaries)** — narrow, justified departure recorded
  in plan.md Complexity Tracking (headless TS module, precedent set by
  filter-engine and nl-cql2).
- **Article VI (tests)** — positive + negative tests per invariant;
  atomicity via immer's produce + injected mid-op failure; cross-
  language round-trip; perf bench.
- **Article IX (dependency hygiene)** — two new deps (`immer ^10.1.3`,
  `ulid ^3.0.2`), both justified in Complexity Tracking.
- **Article XV (strict types)** — zero `any` on the public API; typed
  error classes with stable string codes.
