# Quickstart: Web-shell STAC write path (IndexedDB-only)

**Feature**: `236-web-shell-stac-writes`

This recipe walks a contributor through verifying both writer adaptors locally — the parametrised cross-adaptor unit suite, the VS Code adaptor against existing test fixtures, and the end-to-end "capture in the static-built web-shell, reload, watch it survive" flow.

> **Note** — this supersedes the earlier draft that exercised a Vite-middleware write surface. The web-shell adaptor is IndexedDB-only; Playwright runs against the static build to prove SC-006.

---

## Prereqs

- Node 20.x via the project's existing `pnpm` workspace toolchain.
- A clean working tree on branch `236-web-shell-stac-writes`.
- New runtime dependencies: `idb` (≈ 5 KB) for the web-shell adaptor; `fake-indexeddb` (test-only, ≈ 30 KB) for vitest. Both pinned. See research.md R-007 for justification.

---

## 1. Build the writer interface package

```sh
pnpm --filter @debrief/stac-writer build
```

Should produce `shared/stac-writer/dist/index.js` and `index.d.ts`. No errors. Browser-safe — no Node imports at compile time.

---

## 2. Parametrised cross-adaptor unit suite

```sh
pnpm --filter @debrief/stac-writer test
```

Runs **the same scenarios against both adaptors** — Node fs (via the `apps/vscode/.../stacWriterFs.ts` import) and IndexedDB (via the `apps/web-shell/.../stacWriterIdb.ts` import, driven by `fake-indexeddb`). Each scenario must pass against both backends:

- `pathGuard` / `validateInput` rejects invalid inputs identically.
- `patchItem` preserves the 11-step semantics from `stacService.updateItemMetadataSync` (mtime fingerprint, provenance log, archive rotation).
- `writeSceneThumbnailPair` writes two assets + patches the item record atomically. Failure rolls cleanly (transaction abort for IDB; orphan PNG for fs).
- `writeAsset` is order-correct (asset bytes before item-record patch).
- `deleteItem` rejects `bundled-item-read-only` against bundled paths in the IDB adaptor; succeeds against standalone paths.
- `mergeOverlay` returns the right merged item for every case in data-model.md Layer 4.

Coverage target: ≥ 90% on `shared/stac-writer/src/`, ≥ 90% on each adaptor.

---

## 3. VS Code regression smoke (adaptor 1)

```sh
pnpm --filter @debrief/vscode test stacService.atomicWrite stacService.updateItemMetadata stacService.provenanceRotation sceneThumbnailService
```

These four existing test files MUST continue to pass after VS Code's services delegate to `stacWriterFs`. **Zero observable behaviour change** is the gate for commit 2 in the strangler-fig migration.

---

## 4. Web-shell IndexedDB adaptor smoke (adaptor 2)

```sh
pnpm --filter @debrief/web-shell test stacWriterIdb
```

Runs the IDB-specific tests (separate from the cross-adaptor suite) covering:
- `capability()` correctly reports `{ available: false, reason: 'unavailable' }` when `globalThis.indexedDB` is `undefined`.
- The database is created lazily on first write, with all four object stores and the `byItem` index on `assets`.
- `BroadcastChannel` notifications fire on every successful write and carry `{ kind, itemPath, mtimeMs }`.
- `URL.createObjectURL` / `revokeObjectURL` LRU evictions don't leak.

---

## 5. End-to-end: capture, reload, survive — against the **static build**

```sh
# Build the web-shell as a pure static site (no dev server)
pnpm --filter @debrief/web-shell build

# Run the new Playwright suite against the production build
cd apps/web-shell && node run-playwright.mjs stac-writes
```

Asserts:

1. Capture a scene → reload → scene present, thumbnail loads from `idb:` URL, badge absent.
2. Edit description → reload → overlay applied; bundled `description` field shows new text.
3. Draw new track + save → reload → standalone item visible alongside bundled items.
4. Stub `indexedDB` to `undefined` via `addInitScript` → capture attempt → structured error + badge stays visible.
5. Two-tab cross-sync: capture in tab A, observe tab B's panel updates within 1 s via `BroadcastChannel`.

Run-time budget: ≤ 60 s on cloud Chromium (`@sparticuz/chromium`); ≤ 30 s on local Chromium.

**Why static-build matters**: this is the load-bearing assertion of SC-006. Running against `vite preview` (which serves the static `dist/` output) proves persistence works without any Vite middleware in the loop — therefore it'll work on GitHub Pages.

---

## 6. Manual smoke (when in doubt)

```sh
# Build static site
pnpm --filter @debrief/web-shell build

# Serve the static output (no Node middleware)
pnpm --filter @debrief/web-shell preview
```

Then in a browser at `http://localhost:4173/`:

1. Pick `exercise-alpha` from the catalog browser.
2. Open the Storyboard panel; click the capture button.
3. Confirm a thumbnail appears in the rail and the "Session-only" badge goes away.
4. Open DevTools → Application → IndexedDB → `debrief-stac-writer-v1`. Confirm rows in `items`, `assets`, `meta`.
5. Hard-reload the tab (`Cmd+Shift+R`).
6. The captured scene should still be there. The badge should still be gone.

If the badge is still showing post-capture, check the browser console for the capability check result. Likely cause: private/incognito mode, or an extension blocking IndexedDB.

---

## 7. Tearing down a dirty IndexedDB

If a test or manual session leaves the database in a state you don't want:

```js
// In the browser console at the web-shell origin
indexedDB.deleteDatabase('debrief-stac-writer-v1');
```

Or, in a Playwright `beforeEach`:
```ts
await page.evaluate(() => {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('debrief-stac-writer-v1');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
});
```

The database is per-origin per-browser-profile, so you don't pollute across runs as long as each Playwright run gets its own profile (which it does by default).

---

## Common gotchas

- **`URL.createObjectURL` lifecycle** — `<img>` consumers MUST go through the `useResolvedAssetHref(href)` hook (lives in `apps/web-shell/src/services/useResolvedAssetHref.ts`). The hook owns the LRU (cap 200) and the revoke lifecycle. Direct `URL.createObjectURL` on a blob you read yourself will leak. The catalog read view emits `idb:` synthetic hrefs unresolved — eager resolution would make list re-render O(catalog) instead of O(visible).
- **Private/incognito mode** — most browsers refuse IndexedDB or make it ephemeral. Capability check catches this; tests run in normal mode.
- **Storage eviction** — Chrome auto-evicts unpartitioned storage after 30+ days of inactivity unless `navigator.storage.persist()` was granted. The writer requests it on first write, but the user can deny. Eviction is transparent to the writer (just looks like an empty database next time).
- **Transaction lifetime** — IndexedDB transactions auto-commit when the JS event loop empties between `idb` calls. Don't `await` non-IDB work inside a transaction (e.g. don't `await fetch(...)` between two `tx.objectStore(...).put(...)` calls). The cross-adaptor test suite has a regression test for this.
- **Browser DevTools quirks** — Safari's IndexedDB inspector lies about object-store contents under some conditions. Trust the writer's own dump command (`pnpm --filter @debrief/web-shell run dump-idb`, planned but not Phase 1) over the DevTools view if they disagree.
