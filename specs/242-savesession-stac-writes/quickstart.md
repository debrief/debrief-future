# Quickstart: saveSession STAC Service Migration (242)

**Date**: 2026-05-05

## What This Changes

Spec 242 removes the `plotThumbnailWriter.ts` shim from the VS Code extension and routes all plot thumbnail writes through the `StacWriter` unified writer interface. The observable behaviour of "Save Session" is unchanged; only the internal write path changes.

## Files to Modify

| File | What changes |
|------|-------------|
| `shared/stac-writer/src/interface.ts` | Add `WritePlotThumbnailPairInput`, `WritePlotThumbnailPairResult`, and `writePlotThumbnailPair()` to `StacWriter` |
| `apps/vscode/src/services/stacWriterFs.ts` | Implement `writePlotThumbnailPair()` — move logic from `plotThumbnailWriter.ts` |
| `apps/web-shell/src/services/stacWriterIdb.ts` | Implement `writePlotThumbnailPair()` as `throw StacWriterError('validation-failed', 'not supported in web-shell')` |
| `apps/vscode/src/commands/saveSession.ts` | Inject `StacWriter`; replace `writePlotThumbnails()` call with `writer.writePlotThumbnailPair()` |
| `apps/vscode/src/services/plotThumbnailWriter.ts` | **Delete** |

## Implementation Steps

### Step 1 — Extend the StacWriter interface

In `shared/stac-writer/src/interface.ts`, after `WriteSceneThumbnailPairResult`:

```typescript
export interface WritePlotThumbnailPairInput {
  readonly ctx: StoreContext;
  readonly stacItemPath: string;
  readonly largePngBase64: string;
  readonly smallPngBase64: string;
}
export interface WritePlotThumbnailPairResult {
  readonly thumbnailPath: string;
  readonly overviewPath: string;
}
```

Add to `StacWriter`:
```typescript
writePlotThumbnailPair(
  input: WritePlotThumbnailPairInput,
): Promise<WritePlotThumbnailPairResult>;
```

### Step 2 — Implement in stacWriterFs.ts

**First**, move `multihashSha256()` and `isoNowUtc()` from `plotThumbnailWriter.ts` into `stacWriterFs.ts` as private module-level helpers (alongside `atomicWriteSync`, `parseJsonObject`). Do not export them.

Add `writePlotThumbnailPair()` to the `createStacWriterFs` factory:
- Validate path via `pathGuard('writePlotThumbnailPair.stacItemPath', input.stacItemPath)`
- Decode base64 PNG bytes; throw `StacWriterError('empty-png', ...)` if either buffer is zero-length
- Resolve `itemDir = path.join(storePath, path.dirname(input.stacItemPath))`
- Write `thumbnail.png` (small) and `overview.png` (large) using **`atomicWriteSync()`** (NOT `fs.writeFileSync` — the shim was non-atomic; the adaptor uses atomic writes throughout)
- Read `item.json` via `parseJsonObject()`; drop legacy `thumbnail-sm` key; update `thumbnail` and `overview` asset entries including `title`, `proj:shape`, `file:size`, `file:checksum` via `multihashSha256()`
- Update `properties.created` (if missing) and `properties.updated` via `isoNowUtc()`
- Write updated `item.json` via `atomicWriteSync()`
- Return `{ thumbnailPath, overviewPath }`

### Step 3 — Stub in stacWriterIdb.ts

```typescript
async writePlotThumbnailPair(_input: WritePlotThumbnailPairInput): Promise<WritePlotThumbnailPairResult> {
  throw new StacWriterError(
    'validation-failed',
    'writePlotThumbnailPair is not supported in the web-shell host',
    {},
  );
}
```

### Step 4 — Update saveSession.ts

1. Remove `import { writePlotThumbnails } from '../services/plotThumbnailWriter'`
2. Add `getStacWriter?: (storePath: string) => StacWriter` as an optional parameter to `createSaveSessionCommand()`
3. Rewrite `storeThumbnails()` to call `await getStacWriter(storePath).writePlotThumbnailPair({ ctx, stacItemPath: parsed.itemPath, largePngBase64, smallPngBase64 })`
4. Replace the current `catch (err) { console.warn(...) }` around thumbnail capture: catch `StacWriterError` → `vscode.window.showErrorMessage(err.message)` (Article I.3: no silent failures)
5. In `commands/index.ts`, pass `(storePath) => createStacWriterFs({ storePath, stacService })` as the `getStacWriter` argument — `stacService` is already in scope at the registration site

### Step 5 — Delete plotThumbnailWriter.ts

```sh
git rm apps/vscode/src/services/plotThumbnailWriter.ts
```

## Verification

```sh
# Type check (must pass — stacWriterIdb.ts now satisfies StacWriter)
pnpm -r typecheck

# Unit tests
pnpm --filter @debrief/stac-writer test
pnpm --filter @debrief/web-shell test
cd apps/vscode && pnpm test

# Full CI
task verify
```

## Key Invariants to Preserve

1. Asset keys: `thumbnail` and `overview` (not `thumbnail-sm`, not `scene-*`)
2. Asset `title`: `'Plot thumbnail (200x150)'` for thumbnail, `'Plot overview (800x600)'` for overview (required for byte-identical parity with shim — SC-002)
3. `proj:shape`: `[150, 200]` for thumbnail, `[600, 800]` for overview (height, width order)
4. Multihash format: `"1220" + sha256HexDigest` (codec 0x12, length 0x20)
5. Legacy `thumbnail-sm` key removed from `item.json` if present
6. `properties.updated` refreshed to current UTC ISO 8601 on every write
7. PNG writes use `atomicWriteSync()` — NOT `fs.writeFileSync` (non-atomic)
