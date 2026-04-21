# Contract: Scene Thumbnail Service

**Feature**: 216-storyboarding-capture
**Status**: Language-neutral contract. Drives `apps/vscode/src/services/sceneThumbnailService.ts` + its unit tests.

This contract is the **per-Scene counterpart** to #174's plot-level
`store_thumbnail()` Python API. It runs inside the VS Code extension
host (TypeScript / Node 20+), not as a Python service, because it
sits on the same synchronous critical path as `createScene`. Two
files and one `item.json` update per capture.

## 1. API

```ts
// apps/vscode/src/services/sceneThumbnailService.ts

export interface WriteSceneThumbnailResult {
  /** The STAC asset key written into SceneProperties.thumbnail_asset_ref. */
  readonly assetKey: string;
  /** Absolute path to the 800×600 PNG. */
  readonly largePath: string;
  /** Absolute path to the 200×150 PNG. */
  readonly smallPath: string;
}

export async function writeSceneThumbnail(
  stacItemPath: string,
  sceneId: string,
  largePngBase64: string,
  smallPngBase64: string,
): Promise<WriteSceneThumbnailResult>;

export async function deleteSceneThumbnail(
  stacItemPath: string,
  sceneId: string,
): Promise<void>;
```

### Parameters

- **`stacItemPath`** — absolute filesystem path to the plot's STAC
  Item directory (the directory containing `item.json` and
  `features.geojson`). Validated at entry:
  - Must exist and be a directory.
  - Must contain a readable `item.json`.
  Otherwise throws `SceneThumbnailError` with code
  `stac-item-not-found`.
- **`sceneId`** — a ULID (validated against
  `^[0-9A-HJKMNP-TV-Z]{26}$`). Used as the filename suffix + asset
  key.
- **`largePngBase64` / `smallPngBase64`** — base64-encoded PNG bytes
  returned by #174's `MapPanel.requestThumbnailCapture`. Must be
  non-empty strings; otherwise throws `SceneThumbnailError` with
  code `empty-png`.

### Return

- `assetKey` — the literal `"scene-thumbnail-{sceneId}"`.
- `largePath` — `{stacItemPath}/scene-thumbnails/scene-{sceneId}.png`.
- `smallPath` — `{stacItemPath}/scene-thumbnails/scene-{sceneId}-sm.png`.

## 2. File layout

```text
{stacItemPath}/
├── item.json                       # EDIT: adds 2 asset entries per Scene
├── features.geojson                # (unchanged)
├── thumbnail.png                   # (plot-level, #174 — unchanged)
├── thumbnail-sm.png                # (plot-level, #174 — unchanged)
└── scene-thumbnails/               # NEW: directory created on first write
    ├── scene-{ulid}.png            # 800 × 600
    └── scene-{ulid}-sm.png         # 200 × 150
```

The `scene-thumbnails/` directory is created lazily via
`fs.promises.mkdir(..., { recursive: true })` — idempotent; no error
if it already exists.

## 3. Atomicity

Write order is fixed to guarantee SC-002:

1. Create `scene-thumbnails/` if missing (idempotent).
2. Decode `largePngBase64` to bytes, write to
   `scene-{ulid}.png.tmp`, `fsync`, rename to `scene-{ulid}.png`.
3. Decode `smallPngBase64` to bytes, write to
   `scene-{ulid}-sm.png.tmp`, `fsync`, rename to
   `scene-{ulid}-sm.png`.
4. Read `item.json`, merge in the two new asset entries, write to
   `item.json.tmp`, `fsync`, rename to `item.json`.

If step 2 or step 3 fails, the partial `.tmp` file is unlinked (best
effort), and any already-renamed files are **not** rolled back —
this is acceptable because (a) the Scene is never created when this
service throws, and (b) orphan PNGs are harmless (no `item.json`
asset entry references them; they'll be cleaned up by a future
compaction pass). The guarantee the caller cares about is: **on
failure, no `item.json` change lands and no Scene is created**.

If step 4 fails after steps 2–3 succeeded, the already-written PNGs
are orphaned by the same reasoning. The caller (command handler)
treats this as `thumbnail-failed` per the error-to-UI mapping.

## 4. `item.json` asset merge

Input `item.json.assets`:

```json
{
  "features": { "href": "./features.geojson", "type": "application/geo+json", "roles": ["data"] },
  "thumbnail": { "href": "./thumbnail.png", ... },
  "thumbnail-sm": { "href": "./thumbnail-sm.png", ... }
}
```

After `writeSceneThumbnail(path, "01HW0XGE7Z4YQZ2QZ6KMN9VPJK", ...)`:

```json
{
  "features": { ... },
  "thumbnail": { ... },
  "thumbnail-sm": { ... },
  "scene-thumbnail-01HW0XGE7Z4YQZ2QZ6KMN9VPJK": {
    "href": "./scene-thumbnails/scene-01HW0XGE7Z4YQZ2QZ6KMN9VPJK.png",
    "type": "image/png",
    "title": "Scene thumbnail",
    "roles": ["thumbnail"]
  },
  "scene-thumbnail-01HW0XGE7Z4YQZ2QZ6KMN9VPJK-sm": {
    "href": "./scene-thumbnails/scene-01HW0XGE7Z4YQZ2QZ6KMN9VPJK-sm.png",
    "type": "image/png",
    "title": "Scene thumbnail (small)",
    "roles": ["thumbnail"]
  }
}
```

Asset keys are:

- `scene-thumbnail-{sceneId}` — large (800×600)
- `scene-thumbnail-{sceneId}-sm` — small (200×150)

No other field in `item.json` is touched (including the plot-level
`thumbnail` / `thumbnail-sm` assets managed by #174).

## 5. Idempotency

Calling `writeSceneThumbnail` with an existing `sceneId`:

- Overwrites both PNG files (via rename-on-tmp).
- Updates the asset entries in `item.json` (same keys, same hrefs —
  net-zero change to JSON content).

This is the "Replace" path from the duplicate-timestamp flow: the
command handler first calls `deleteScene` (which removes the scene
but not its thumbnail files), then `writeSceneThumbnail` with a
**new** `sceneId` (the new Scene's ULID). The old Scene's thumbnail
files remain on disk until a future compaction pass — acceptable
per the same "orphan PNGs are harmless" reasoning.

`deleteSceneThumbnail` is provided as an affordance for #218's
delete-with-undo flow; **not called by this spec's command
handler**. It removes the two PNG files + the two `item.json.assets`
entries. Throws `SceneThumbnailError` with code `unknown-scene` if
the asset entries don't exist.

## 6. Error taxonomy

```ts
export class SceneThumbnailError extends Error {
  readonly code:
    | "stac-item-not-found"
    | "item-json-unreadable"
    | "item-json-malformed"
    | "empty-png"
    | "invalid-scene-id"
    | "write-failed"
    | "rename-failed"
    | "unknown-scene";              // only thrown by deleteSceneThumbnail

  constructor(code: SceneThumbnailError["code"], message: string, cause?: unknown);
}
```

Each code carries the underlying `cause` (the fs error or JSON parse
error) for diagnostics. The command handler translates every code
into the `thumbnail-failed` reject branch; it does not expose the
specific code to the user — details go to the Debrief output
channel.

## 7. Test matrix

Unit tests in `apps/vscode/src/services/__tests__/sceneThumbnailService.test.ts`,
backed by an in-memory fs via `memfs` (already used by other unit
tests in the extension).

| Test | Covers |
|---|---|
| `writes both PNGs and updates item.json atomically` | Happy path |
| `creates scene-thumbnails/ directory when absent` | Lazy dir creation |
| `preserves existing plot-level thumbnail assets` | No clobber |
| `preserves existing scene-thumbnail assets for other scenes` | Multi-scene |
| `returns assetKey = "scene-thumbnail-{sceneId}"` | Return shape |
| `throws empty-png when largePngBase64 is empty` | Input validation |
| `throws invalid-scene-id on malformed ULID` | Input validation |
| `throws stac-item-not-found on missing directory` | Precondition |
| `throws item-json-malformed on corrupt item.json` | Pre-read validation |
| `rename atomicity: partial PNG write leaves item.json unchanged` | SC-002 structural guarantee (via a fs stub that throws on the second rename) |
| `idempotent: writing same sceneId twice is a no-op JSON-wise` | Replace flow |
| `deleteSceneThumbnail removes PNGs and asset entries` | #218 forward-compat (tested because the API ships in #216) |
| `deleteSceneThumbnail throws unknown-scene when assets absent` | Error vocabulary |

## 8. Performance notes

- Single-PNG decode + write at ~40 KB is sub-millisecond; two writes
  + one JSON rewrite at typical `item.json` sizes complete in < 10
  ms on the CI runner. Well within the SC-001 1.5 s budget
  (shortcut-to-visible), which is dominated by the #174 thumbnail
  capture round-trip (~300–600 ms on Leaflet DOM).
- `item.json` files grow linearly with Scene count. At the scale
  bound (5 Storyboards × 50 Scenes = 250 Scene entries × 2 =
  500 asset entries) the file is still well under 100 KB — no
  performance concern.

## 9. Relationship to #174

- **No overlap** with `store_thumbnail()` — that writes plot-level
  `thumbnail.png` / `thumbnail-sm.png` and is invoked by the save
  flow. This service writes per-Scene files and is invoked by
  capture.
- **File-layout convention shared** — same root dir, same asset-key
  format (`{role}` for plot, `{role}-{id}` for per-scene), same
  `roles: ["thumbnail"]`, same rename-on-tmp atomicity discipline.
- **PNG source shared** — both consume the output of
  `MapPanel.requestThumbnailCapture()`.

No duplication of capture logic; no coupling that would make #174's
tests flaky under #216's changes.