# Usage Example: Web-shell STAC write path

This walkthrough demonstrates the host-agnostic `StacWriter` interface as
exercised in the web-shell — capture a Storyboard scene through the IDB
writer, then read it back via `catalogReadView` with the synthetic `idb:`
href resolved through `useResolvedAssetHref`.

## Capture a scene through the writer

```ts
import { createStacWriterIdb } from '@debrief/web-shell/src/services/stacWriterIdb';
import { probeIndexedDbCapability } from '@debrief/web-shell/src/services/stacWriterCapability';

// At App boot — instantiate the writer and check capability.
const capability = await probeIndexedDbCapability();
if (!capability.available) {
  // Show the FR-WEB-029a "Session-only" badge with a reason-specific message.
  // capability.reason is one of 'unavailable' | 'denied' | 'quota' | 'idb-version-mismatch'.
  return;
}
const writer = await createStacWriterIdb();

// Mid-session — capture a scene from the live map. base64 PNGs come
// from `captureMapAsDataUrl` (modern-screenshot in the browser).
const result = await writer.writeSceneThumbnailPair({
  ctx: { kind: 'idb', nowMs: () => Date.now(), randomId: () => sceneId },
  stacItemPath: 'exercise-alpha',
  sceneId: '01HFA8B7C2D3E4F5G6H7J8K9M0',
  largePngBase64,
  smallPngBase64,
});

console.log(result);
// {
//   assetKey: 'scene-thumbnail-01HFA8B7C2D3E4F5G6H7J8K9M0',
//   largePath: 'idb:exercise-alpha/item.json::scene-thumbnail-01HFA8B7C2D3E4F5G6H7J8K9M0',
//   smallPath: 'idb:exercise-alpha/item.json::scene-thumbnail-01HFA8B7C2D3E4F5G6H7J8K9M0-sm',
// }
```

After this completes, three things are durable in IndexedDB:

1. The large 800×600 PNG blob in `assets[exercise-alpha/item.json, scene-thumbnail-01HFA8...]`.
2. The small 200×150 PNG blob in `assets[exercise-alpha/item.json, scene-thumbnail-01HFA8...-sm]`.
3. The `items[exercise-alpha/item.json]` overlay record carrying the two new asset entries
   (with `idb:` synthetic hrefs) layered on top of the bundled item's properties.

All three commit in a single IndexedDB transaction — readers never see one
without the others (FR-016).

## Read it back via the catalog read view

```ts
import { createCatalogReadView } from '@debrief/web-shell/src/services/catalogReadView';

const catalog = createCatalogReadView({ writer });

const merged = await catalog.getItem('exercise-alpha/item.json');
// merged is the bundled item.json with the IDB overlay layered on top:
// {
//   id: 'exercise-alpha',
//   properties: { title: 'Bundled', 'debrief:platforms': ['HMS Boat'], ... },
//   assets: {
//     thumbnail:                                   { href: './thumb.png', ... },           // bundled, untouched
//     'scene-thumbnail-01HFA8B7C2D3E4F5G6H7J8K9M0':    { href: 'idb:exercise-alpha/item.json::scene-thumbnail-01HFA8...', ... },
//     'scene-thumbnail-01HFA8B7C2D3E4F5G6H7J8K9M0-sm': { href: 'idb:exercise-alpha/item.json::scene-thumbnail-01HFA8...-sm', ... },
//   },
//   ...
// }
```

`mergeOverlay` does the merge:
- Bundled `thumbnail` survives (overlay didn't touch it).
- Two new `scene-thumbnail-...` entries layer in from the overlay.
- All other bundled properties survive untouched.

## Render an `idb:` href in React

```tsx
import { useResolvedAssetHref } from '@debrief/web-shell/src/services/useResolvedAssetHref';

function SceneThumbnail({ scene }: { scene: { thumbnailHref: string } }) {
  // Returns the input verbatim for non-`idb:` hrefs (the bundled case).
  // For `idb:` hrefs: first render returns null (no flash of broken image
  // because <img src={null}> renders nothing), then re-renders with the
  // resolved blob URL. Reference-counted via the LRU (cap 200).
  const resolved = useResolvedAssetHref(scene.thumbnailHref);
  return <img src={resolved ?? ''} alt="Scene thumbnail" />;
}
```

## Cross-tab synchronisation (best-effort, FR-023)

Open the same plot in two browser tabs. Capture a scene in tab A.

```ts
// In stacWriterIdb after every successful op:
broadcast({ kind: 'item-changed', itemPath: 'exercise-alpha/item.json', mtimeMs: 1234567890 });
```

Tab B's `catalogReadView` is subscribed to `BroadcastChannel('debrief-stac-writer-v1')`.
On receipt, it coalesces over a 50ms window and re-reads the affected
itemPath from IDB; UI subscribers re-render with the new state. If tab B
is hidden, the browser may throttle delivery — the next visibility-change
triggers a fresh read.

## Reload survival (FR-001)

Hard-reload the browser. App.tsx's `handlePlotSelect` runs:

```ts
clearSceneThumbnailStore();
void hydrateSceneThumbnailStoreFromIdb(plotData.features);
```

`hydrateSceneThumbnailStoreFromIdb` walks the FC's `STORYBOARD_SCENE`
features, reads each one's `[itemPath, scene-thumbnail-<id>]` blob from
IDB, calls `URL.createObjectURL(blob)` and populates the in-memory store.
The rail re-renders with the surviving thumbnail.

## Article IV.4 enforcement at lint time

The new `no-direct-persistence-in-frontend` rule rejects three classes of
violation in `apps/web-shell/**` (production source — test files exempt):

```ts
// 1. Node fs imports — banned in browser code
import * as fs from 'fs';                          // ❌

// 2. IndexedDB outside the host adaptor
const db = indexedDB.open('mydb');                 // ❌ in any file other than
                                                   //    stacWriterIdb.ts /
                                                   //    stacWriterCapability.ts

// 3. localStorage / sessionStorage / caches anywhere
localStorage.setItem('foo', 'bar');                // ❌
```

The rule is wired into the existing `task lint` step. PRs that violate
Article IV.4 fail CI. Captured deliberate-violation output:
[`eslint-enforcement-output.txt`](./eslint-enforcement-output.txt).
