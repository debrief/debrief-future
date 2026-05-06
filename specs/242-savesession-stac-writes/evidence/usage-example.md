# Usage Example: saveSession via StacWriter (#242)

## Wiring the writer at the call site

`apps/vscode/src/commands/index.ts` constructs the FS-backed adaptor on
demand and hands it to `createSaveSessionCommand` as a `getStacWriter`
factory. The factory is dynamic-store-path-aware (mirrors the existing
`getStorePath` factory pattern):

```typescript
import { createStacWriterFs } from '../services/stacWriterFs';
// ...
disposables.push(
  vscode.commands.registerCommand(
    'debrief.saveSession',
    createSaveSessionCommand(
      sessionManager,
      (storeId) => {
        const store = configService.getStore(storeId);
        return store?.path;
      },
      getMapPanel,
      // Spec 242 — saveSession routes thumbnail writes through the
      // host-agnostic StacWriter boundary (Article IV.1 closure).
      (storePath) => createStacWriterFs({ storePath, stacService }),
    )
  )
);
```

## Inside the command handler

`createSaveSessionCommand` calls the writer once per save (only when a
thumbnail capture succeeded), surfacing service-side errors via the
standard VS Code notification surface:

```typescript
// apps/vscode/src/commands/saveSession.ts (excerpt)
if (mapPanel && parsed && storePath && getStacWriter) {
  try {
    const { largePngBase64, smallPngBase64 } =
      await mapPanel.requestThumbnailCapture(5000);
    if (largePngBase64 && smallPngBase64) {
      const writer = getStacWriter(storePath);
      await storeThumbnails(writer, plotUri, largePngBase64, smallPngBase64);
    }
  } catch (err) {
    // Article I.3 — service-write failures must surface; capture
    // failures (non-StacWriterError) remain best-effort.
    if (err instanceof StacWriterError) {
      void vscode.window.showErrorMessage(
        `Thumbnail save failed: ${err.message}`,
      );
    } else {
      console.warn('[debrief] Thumbnail capture failed (non-blocking):', err);
    }
  }
}
```

`storeThumbnails` itself is a one-line dispatch through the writer:

```typescript
async function storeThumbnails(
  writer: StacWriter,
  plotUri: string,
  largePngBase64: string,
  smallPngBase64: string,
): Promise<void> {
  const parsed = parseStacUri(plotUri);
  if (!parsed) return;
  await writer.writePlotThumbnailPair({
    ctx: { kind: 'fs', nowMs: () => Date.now(), randomId: () => '' },
    stacItemPath: parsed.itemPath,
    largePngBase64,
    smallPngBase64,
  });
}
```

## Resulting catalog shape (unchanged from spec 241)

After a successful save, the item directory contains two PNGs and an
item.json with the spec-241 STAC 1.1 shape:

```text
core--boat1/
├── item.json        # assets.thumbnail + assets.overview, properties.updated refreshed
├── thumbnail.png    # 200x150 (small) — atomically written
├── overview.png     # 800x600 (large) — atomically written
├── features.geojson # in-session features (existing path)
└── item.debrief-session
```

```jsonc
// item.json (excerpt)
{
  "id": "core--boat1",
  "properties": {
    "created": "2026-01-15T10:00:00.000Z",  // preserved
    "updated": "2026-05-06T17:14:55.123Z"   // refreshed
  },
  "assets": {
    "thumbnail": {
      "href": "./thumbnail.png",
      "type": "image/png",
      "title": "Plot thumbnail (200x150)",
      "roles": ["thumbnail"],
      "proj:shape": [150, 200],
      "file:size": 8743,
      "file:checksum": "1220<sha256-hex>"
    },
    "overview": {
      "href": "./overview.png",
      "type": "image/png",
      "title": "Plot overview (800x600)",
      "roles": ["overview"],
      "proj:shape": [600, 800],
      "file:size": 87431,
      "file:checksum": "1220<sha256-hex>"
    }
  }
}
```

## Error surface

| Failure mode | Result |
|--------------|--------|
| Empty PNG payload | `StacWriterError('empty-png')` → `showErrorMessage` |
| `item.json` missing | `StacWriterError('stac-item-not-found')` → `showErrorMessage` |
| Corrupt `item.json` | `StacWriterError('item-json-malformed')` → `showErrorMessage` |
| FS write failure | `StacWriterError('write-failed')` (or `'read-only-fs'`) → `showErrorMessage` |
| Path escapes the store | `StacWriterError('path-rejected')` from `pathGuard` → `showErrorMessage` |
| `requestThumbnailCapture` timeout / non-writer error | `console.warn` (best-effort) |
| Invocation in web-shell host (future) | `StacWriterError('validation-failed', 'not supported in the web-shell host')` |
