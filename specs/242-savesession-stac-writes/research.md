# Research: saveSession STAC Service Migration (242)

**Date**: 2026-05-05  
**Branch**: `242-savesession-stac-writes`

---

## 1. Current Write Path

### Decision: Understand the shim that must be removed

**Current state**:

```
saveSession.ts:storeThumbnails()
  → plotThumbnailWriter.ts:writePlotThumbnails()   ← the bypass shim to delete
      writes thumbnail.png + overview.png (Node fs.writeFileSync)
      reads/writes item.json synchronously
      computes multihash SHA-256 checksums in TS
```

**File locations**:
- `apps/vscode/src/commands/saveSession.ts:80–97` — calls `writePlotThumbnails`; comment at lines 74–78 flags this as the Spec 241 "typed surface" that Spec 242 must supersede
- `apps/vscode/src/services/plotThumbnailWriter.ts:78–123` — the shim

**Rationale**: The shim was a deliberate half-step in Spec 241, acknowledged inline. The migration path is clear.

---

## 2. No MCP Client in the Extension (Critical Finding)

### Decision: The service boundary for this feature is the StacWriter interface, not the Python MCP server

**Finding**: `apps/vscode/src/services/stacService.ts:1152` contains an explicit TODO:

> "TODO(#137): Delegate to Python MCP tool `update_temporal_metadata` when STAC MCP client is available"

This confirms there is **no MCP client** in the VS Code extension today. `StacService` is entirely local-filesystem-based. The Python MCP server (`services/stac/src/debrief_stac/mcp_server.py`) is called from the extension only in future once the MCP client (#137) is implemented.

**Implication**: Spec 242 cannot route writes through the Python process. The "fully service-mediated path" and "one boundary regardless of host" refer to the **`StacWriter` unified writer abstraction** (per Constitution Article IV.4), not to a Python process.

**Constitution alignment**:
- Article IV.4: "Frontends may persist data only via the unified writer abstraction. Each host implements the abstraction once, against its native backend; the rest of the system depends only on the interface."
- VS Code host's native backend = filesystem → `stacWriterFs.ts`
- The violation being fixed: `plotThumbnailWriter.ts` is a **second write code path** that bypasses the `StacWriter` interface, creating a divergent write path. Article IV.4 forbids this explicitly ("frontends never own a divergent write code path").

**Alternatives considered**:
1. Add a Python MCP tool `write_thumbnail_pair_tool` and call it from the extension: rejected — no MCP client exists in the extension; out of scope for Spec 242. MCP client work is tracked under TODO #137.
2. Embed Python subprocess call: rejected — violates Article IX (no new dependencies) and Article I.1 (offline-first).

---

## 3. Target Write Path

### Decision: Route through StacWriter interface — add writePlotThumbnailPair() method

**Target state**:

```
saveSession.ts:storeThumbnails()           ← calls writer interface, not the shim
  → stacWriterFs.ts:writePlotThumbnailPair()   ← new method on StacWriter interface
      writes thumbnail.png + overview.png (Node fs.writeFileSync — same as shim)
      reads/writes item.json
      computes multihash checksums
```

**Why a new method, not reusing `writeSceneThumbnailPair`**:

`writeSceneThumbnailPair` takes `sceneId` and is for **Storyboard scenes** (asset key = `scene-{id}-thumbnail`). Plot-level thumbnails from `mapPanel.requestThumbnailCapture()` have a different asset shape:
- `thumbnail`: `{"href": "./thumbnail.png", "roles": ["thumbnail"], "proj:shape": [150, 200], …}`
- `overview`: `{"href": "./overview.png", "roles": ["overview"], "proj:shape": [600, 800], …}`

These are distinct operations. A new `writePlotThumbnailPair()` method on the `StacWriter` interface is the correct contract.

**Rationale**:
- `shared/stac-writer/src/interface.ts` is the authorised persistence boundary (Article IV.4)
- Adding the method there enforces the boundary for all current and future hosts
- The VS Code host implementation in `stacWriterFs.ts` can move the shim's logic directly (no behavioral change, just re-homing the code behind the interface)
- Future Python MCP path (when #137 lands) can replace the `stacWriterFs.ts` implementation without touching callers

---

## 4. New StacWriter Interface Method

### Decision: WritePlotThumbnailPairInput / WritePlotThumbnailPairResult

**Proposed addition to `shared/stac-writer/src/interface.ts`**:

```typescript
export interface WritePlotThumbnailPairInput {
  readonly ctx: StoreContext;
  readonly stacItemPath: string;   // relative path within store, e.g. "catalog/item.json"
  readonly largePngBase64: string;
  readonly smallPngBase64: string;
}

export interface WritePlotThumbnailPairResult {
  readonly thumbnailPath: string;  // absolute path written
  readonly overviewPath: string;   // absolute path written
}

// Added to StacWriter interface:
writePlotThumbnailPair(input: WritePlotThumbnailPairInput): Promise<WritePlotThumbnailPairResult>;
```

**Rationale**: Mirrors the existing `WriteSceneThumbnailPairInput` pattern; `ctx` carries `storeContext` (storePath), so the method is self-contained. `stacItemPath` replaces the current shim's combination of `storePath` + `itemPath`.

---

## 5. StacWriterIdb (Web-Shell) Implementation

### Decision: Throw 'validation-failed' — plot thumbnails not supported in web-shell

**Rationale**:
- The web-shell does not implement the VS Code `saveSession` command
- Plot-level thumbnail captures require a Leaflet `MapPanel` present only in the VS Code/Electron host
- A clear "not-implemented" error prevents silent no-ops and provides actionable feedback if the call ever occurs unexpectedly
- Pattern precedent: other methods in `stacWriterIdb.ts` already throw `StacWriterError` for operations not applicable to the browser host

**Alternative**: Return a success no-op. Rejected — silent no-ops hide bugs.

---

## 6. saveSession.ts Injection Pattern

### Decision: Receive StacWriter via parameter injection from createSaveSessionCommand()

**Current signature** (inferred): `createSaveSessionCommand()` receives `storePath`, `mapPanel`, `sessionManager`, etc.

**Change**: Add `stacWriter: StacWriter` to the params. The extension activation code (which already constructs `stacWriterFs`) passes it in.

**Rationale**: Follows the constructor-injection pattern already used throughout the extension (e.g., `StacService` is injected everywhere). No service locator anti-pattern.

The `storeThumbnails()` private function in `saveSession.ts` becomes:
```typescript
function storeThumbnails(
  writer: StacWriter,
  stacItemPath: string,
  largePngBase64: string,
  smallPngBase64: string,
): Promise<void>
```

---

## 7. Error Propagation

### Decision: Map errors to existing StacWriterError taxonomy — no new error kinds

**Existing kinds covering this path**:
- `'write-failed'` — fs write errors
- `'empty-png'` — zero-length PNG payload
- `'stac-item-not-found'` — item.json missing
- `'item-json-malformed'` — corrupt item.json

`stacWriterFs.ts:writePlotThumbnailPair()` wraps all fs errors in `StacWriterError`. `saveSession.ts` catches `StacWriterError` and shows a user-visible error toast (following the pattern already used by other writer calls).

---

## 8. Shim Deletion and Catalog Parity

### Decision: Delete plotThumbnailWriter.ts; verify parity via existing golden fixtures

**Catalog parity strategy**:
- The `stacWriterFs.ts` implementation moves the shim's logic verbatim (same asset shape, same checksum algorithm, same file names)
- Existing `services/stac/tests/test_thumbnails.py` golden fixtures remain unchanged
- Existing STAC golden-fixture comparison tests pass without modification
- No new fixtures needed — parity is guaranteed by moving the same code, not rewriting it

**Deletion timing**: After `saveSession.ts` is migrated, `plotThumbnailWriter.ts` has zero callers. Delete in the same PR.

---

## 9. No Python Changes Required

### Decision: Python MCP server unchanged in this spec

**Rationale**:
- `services/stac/src/debrief_stac/thumbnails.py:store_thumbnail()` already exists and is fully tested
- No MCP client in the extension means no Python MCP tool change is needed
- Future spec (MCP client #137) will wire the Python path once the client is available
- Spec 242's obligation is architectural: eliminate the divergent write code path by enforcing the `StacWriter` interface as the single persistence boundary

---

## 10. Test Strategy

### Decision: Unit tests for new method + migration smoke test

| Test | Location | What it verifies |
|------|----------|-----------------|
| `stacWriterFs.writePlotThumbnailPair.test.ts` (new) | `apps/vscode/tests/unit/` | Writes `thumbnail.png` + `overview.png`, updates `item.json` assets with correct shape (roles, proj:shape, file:checksum), returns correct paths |
| `stacWriterIdb.writePlotThumbnailPair.test.ts` (new) | `apps/web-shell/src/services/__tests__/` | Throws `StacWriterError('validation-failed')` |
| Update `saveSession.storeFeatureCollection.test.ts` | `apps/vscode/tests/unit/` | Verify `plotThumbnailWriter` import is absent; `writer.writePlotThumbnailPair` is called with correct args |
| Existing `test_thumbnails.py` | `services/stac/tests/` | Unchanged — Python layer untouched |
| Existing golden-fixture suite | (wherever it lives) | Unchanged — catalog shape guaranteed by same logic |

---

## 11. Files Changed Summary

| File | Change |
|------|--------|
| `shared/stac-writer/src/interface.ts` | Add `WritePlotThumbnailPairInput`, `WritePlotThumbnailPairResult`, `writePlotThumbnailPair()` to `StacWriter` |
| `apps/vscode/src/services/stacWriterFs.ts` | Implement `writePlotThumbnailPair()` (logic from shim) |
| `apps/web-shell/src/services/stacWriterIdb.ts` | Implement `writePlotThumbnailPair()` as not-supported throw |
| `apps/vscode/src/commands/saveSession.ts` | Inject `StacWriter`, call `writer.writePlotThumbnailPair()`, remove shim import |
| `apps/vscode/src/services/plotThumbnailWriter.ts` | **Delete** |
| `apps/vscode/tests/unit/stacWriterFs.writePlotThumbnailPair.test.ts` | **New** unit tests |
| `apps/web-shell/src/services/__tests__/stacWriterIdb.writePlotThumbnailPair.test.ts` | **New** unit test |
| `apps/vscode/tests/unit/saveSession.storeFeatureCollection.test.ts` | Update: verify writer interface used |
