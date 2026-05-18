# Usage Example: Tied-Timestamp Scenes

**Feature**: 259-relax-scene-time
**Date**: 2026-05-18

This walk-through shows the post-#259 storyboard CRUD module in action: capturing three Scenes at one instant, listing them in capture order, reordering within the tied group, and observing that deletion leaves a `creation_order` gap (rather than re-sequencing).

## Scenario

An analyst is narrating a single moment in an engagement and wants to capture three viewports:

1. A wide overview
2. A zoom on the contact of interest
3. A zoom on ownship

All three at the same timestamp `2026-04-20T10:00:00Z`.

## Code

```ts
import {
  createStoryboard,
  createScene,
  deleteScene,
  listScenesOrdered,
  reorderSceneInTiedGroup,
} from '@debrief/components';

const empty = { type: 'FeatureCollection', features: [] };

// 1. Create the Storyboard (schema_version: 2 now)
const { plot: p0, storyboard } = await createStoryboard(empty, {
  name: 'Op Harrier — turn-and-engage',
  actor: 'alice',
  now: '2026-04-20T10:00:00Z',
});

// 2. Three captures at the same instant (no DuplicateTimestampError)
const { plot: p1, scene: a } = await createScene(p0, {
  storyboardId: storyboard.properties.id,
  viewport: { center: [-5.0, 50.0], zoom: 8, bearing: 0 },
  timestamp: '2026-04-20T10:00:00Z',
  visibleFeatureIds: ['track-alpha', 'track-bravo'],
  thumbnailAssetRef: 'thumbnails/wide.png',
  actor: 'alice',
});
const { plot: p2, scene: b } = await createScene(p1, {
  storyboardId: storyboard.properties.id,
  viewport: { center: [-5.0, 50.0], zoom: 12, bearing: 0 },
  timestamp: '2026-04-20T10:00:00Z',
  visibleFeatureIds: ['track-alpha'],
  thumbnailAssetRef: 'thumbnails/zoom-alpha.png',
  actor: 'alice',
});
const { plot: p3, scene: c } = await createScene(p2, {
  storyboardId: storyboard.properties.id,
  viewport: { center: [-4.9, 50.1], zoom: 12, bearing: 0 },
  timestamp: '2026-04-20T10:00:00Z',
  visibleFeatureIds: ['track-bravo'],
  thumbnailAssetRef: 'thumbnails/zoom-bravo.png',
  actor: 'alice',
});

console.log(a.properties.creation_order, b.properties.creation_order, c.properties.creation_order);
// → 0, 1, 2

console.log(listScenesOrdered(p3, storyboard.properties.id).map(s => s.properties.id));
// → [a.id, b.id, c.id]
```

## State after capture

| Scene | `timestamp`            | `creation_order` |
|-------|------------------------|------------------|
| A     | 2026-04-20T10:00:00Z   | 0                |
| B     | 2026-04-20T10:00:00Z   | 1                |
| C     | 2026-04-20T10:00:00Z   | 2                |

## Reorder within the tied group (FR-007)

Move `B` to the end of the tied group:

```ts
const { plot: p4 } = reorderSceneInTiedGroup(p3, {
  sceneId: b.properties.id,
  newPositionInGroup: 2,
});

console.log(listScenesOrdered(p4, storyboard.properties.id).map(s => s.properties.id));
// → [a.id, c.id, b.id]
```

Group state after reorder:

| Scene | `timestamp`            | `creation_order` |
|-------|------------------------|------------------|
| A     | 2026-04-20T10:00:00Z   | 0                |
| C     | 2026-04-20T10:00:00Z   | 1                |
| B     | 2026-04-20T10:00:00Z   | 2                |

`creation_order` was re-sequenced within the group; A's value did not change.

## Delete (FR-008)

```ts
const { plot: p5 } = await deleteScene(p4, {
  sceneId: c.properties.id,
  actor: 'alice',
});

console.log(listScenesOrdered(p5, storyboard.properties.id).map(s => s.properties.id));
// → [a.id, b.id]
```

Group state after delete — note the gap:

| Scene | `timestamp`            | `creation_order` |
|-------|------------------------|------------------|
| A     | 2026-04-20T10:00:00Z   | 0                |
| B     | 2026-04-20T10:00:00Z   | 2                |

`creation_order` is **not** renumbered after a deletion. Surviving Scenes keep their identifiers; the gap (`1` is now unused) is permitted.

## Pre-#259 plot: hard fail (FR-010)

A plot produced before this change carries `schema_version: 1` and Scenes that lack `creation_order`. The reader rejects it on open:

```ts
import { validatePlot } from '@debrief/components';

const legacy = JSON.parse(await readFile('./pre-259.json', 'utf-8'));
validatePlot(legacy);
// → UnsupportedSchemaVersionError: Storyboard ... has schema_version=1 but the
//   reader requires >= 2 (pre-#259 plot — no migration provided)
```

If a hand-edit forces `schema_version: 2` but the Scenes still lack `creation_order`, the next gate fires:

```ts
// → MissingCreationOrderError: Scene 01J... in Storyboard 01J... is missing the
//   required creation_order field (pre-#259 plot — no migration provided)
```

Article XIV (pre-release freedom) authorises this hard break: no shipped user data exists that the change could regress.
