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

Add `writePlotThumbnailPair()` to the `createStacWriterFs` factory. Move the logic from `plotThumbnailWriter.ts:writePlotThumbnails()`:
- Decode base64 PNG bytes
- Validate non-empty (`throw StacWriterError('empty-png', ...)` if zero-length)
- Validate path via `pathGuard('writePlotThumbnailPair.stacItemPath', input.stacItemPath)`
- Resolve `itemDir = path.join(storePath, path.dirname(input.stacItemPath))`
- Write `thumbnail.png` (small) and `overview.png` (large) atomically
- Read `item.json`, drop legacy `thumbnail-sm` key, update `thumbnail` and `overview` asset entries with correct shape (`proj:shape`, `file:size`, `file:checksum` via `multihashSha256`)
- Update `properties.created` (if missing) and `properties.updated`
- Write updated `item.json`
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
2. Add `StacWriter` to `createSaveSessionCommand()` parameters (or to the object it destructures)
3. Rewrite `storeThumbnails()` to call `await writer.writePlotThumbnailPair({ ctx, stacItemPath: parsed.itemPath, largePngBase64, smallPngBase64 })`
4. Propagate `StacWriterError` as a user-visible error toast

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
2. `proj:shape`: `[150, 200]` for thumbnail, `[600, 800]` for overview (height, width order)
3. Multihash format: `"1220" + sha256HexDigest` (codec 0x12, length 0x20)
4. Legacy `thumbnail-sm` key removed from `item.json` if present
5. `properties.updated` refreshed to current UTC ISO 8601 on every write
