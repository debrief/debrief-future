# Before / After: Per-Scene Asset Key Contract

## Schema source-of-truth

| Before (spec 241 review decision 5A) | After (spec 243) |
|--------------------------------------|------------------|
| **No LinkML class for the per-Scene asset shape.** The contract was an inline `^scene-thumbnail(-.+)?$` regex inside `specs/241-…/contracts/item-shape.schema.json` plus a placeholder in `services/stac/src/debrief_stac/collection.py::ITEM_ASSETS_TEMPLATE`. The shape's documentation lived in `apps/vscode/src/services/sceneThumbnailService.ts` (the writer's TypeScript file header). | **First-class LinkML class** `SceneThumbnailAssetEntry` in `shared/schemas/src/linkml/storyboard.yaml` with the full FR-014 docstring (4 diagnostic answers + 3 named rule IDs). Flows unchanged through `gen-pydantic` / `gen-json-schema` / `gen-typescript`. |

## Item-shape contract

| Before | After |
|--------|-------|
| `specs/241-…/contracts/item-shape.schema.json` (lines ~109-117): | `specs/241-…/contracts/item-shape.schema.json` (replacement): |
| ```json\n"^scene-thumbnail(-.+)?$": {\n  "comment": "Storyboard-derived per-scene thumbnails ...",\n  "type": "object",\n  "required": ["href", "type", "roles"],\n  "properties": {\n    "type": { "const": "image/png" },\n    "roles": { "const": ["thumbnail"] }\n  }\n}\n``` | ```json\n"allOf": [\n  {\n    "comment": "...governed by the dedicated overlay shipped by spec 243...",\n    "$ref": "https://debrief.info/schemas/contracts/scene-thumbnail-asset.schema.json"\n  }\n]\n``` |

The new overlay (`shared/schemas/contracts/scene-thumbnail-asset.schema.json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://debrief.info/schemas/contracts/scene-thumbnail-asset.schema.json",
  "type": "object",
  "propertyNames": {
    "if":   { "pattern": "^scene-thumbnail-" },
    "then": { "pattern": "^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$" }
  },
  "patternProperties": {
    "^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$": {
      "allOf": [
        { "$ref": "https://debrief.info/schemas/debrief-jsonschema#/$defs/SceneThumbnailAssetEntry" },
        { "type": "object", "properties": {
            "roles": { "type": "array", "minItems": 1, "maxItems": 1,
                       "items": { "const": "thumbnail" } } } }
      ]
    }
  }
}
```

## Collection-shape contract

| Before | After |
|--------|-------|
| `item_assets.required` included `scene-thumbnail`; the placeholder block declared `roles: ["thumbnail"]` to "self-document" per-Scene shape. | Per-Scene assets removed from `item_assets`. The Collection now lists only the four logical asset types stable across every Item (`features`, `thumbnail`, `overview`, `source`). Per-Scene shape lives in its own first-class LinkML class. |

## Service-side documentation

| Before (`apps/vscode/src/services/sceneThumbnailService.ts:1-20`) | After |
|-------------------------------------------------------------------|-------|
| `/**\n * Per-Scene thumbnail writer for Feature 216 (Storyboarding — Capture).\n *\n * Sits on the synchronous critical path between #174's\n * MapPanel.requestThumbnailCapture()...\n */` (the TS file header was the only documentation explaining what the asset keys mean) | `/**\n * Per-Scene thumbnail writer for Feature 216 (Storyboarding — Capture).\n *\n * **Asset-key contract** documented at:\n *   - shared/schemas/src/linkml/storyboard.yaml :: SceneThumbnailAssetEntry\n *   - shared/schemas/contracts/scene-thumbnail-asset.schema.json\n *\n * Pairing and orphan invariants (scene-thumbnail-pair-rule-001,\n * scene-thumbnail-orphan-rule-001) are enforced by\n * services/stac/src/debrief_stac/scene_thumbnail_audit.py....\n */` |

## Audit module

| Before | After |
|--------|-------|
| **No automated pairing or orphan detection.** A regression that wrote a `-sm` variant without its pair, or a stale Scene whose assets weren't garbage-collected, would silently pass validation. | New module `services/stac/src/debrief_stac/scene_thumbnail_audit.py` (~135 LOC) exporting `audit_scene_thumbnail_pairing(item)` and `audit_scene_thumbnail_orphans(item, scene_feature_ids)`. Failure messages embed stable rule IDs (`scene-thumbnail-pair-rule-001`, `scene-thumbnail-orphan-rule-001`) — searchable from any CI failure back to the LinkML class docstring. |

## Diagnostic question coverage

The four diagnostic questions FR-014 mandates the schema must answer:

| Question | Before — answerable from the schema alone? | After — answerable from the schema alone? |
|----------|---------------------------------------------|--------------------------------------------|
| What is `scene-thumbnail-01HXYZ…`? | **No.** The regex tells you it matches; the schema doesn't say what it represents. The TypeScript service file is the only source. | **Yes.** Class docstring opens with "*A single STAC Item asset entry produced by Storyboarding (#216) for one variant of one Scene's thumbnail.*" |
| Why is the key suffixed with a ULID? | **No.** Implicit — must read `sceneThumbnailService.ts`. | **Yes.** Class docstring: "*the owning Scene's id; lets every per-Scene asset be traced back to its Scene without an explicit foreign-key field*." |
| Why are there `-sm` and non-`-sm` keys? | **No.** Two separate matches against the same regex; semantics undocumented. | **Yes.** Class docstring: "*the Storyboarding capture pipeline produces both sizes atomically (800x600 large for inspection; 200x150 small for timeline strips). A single-variant entry is a defect — see schema rule scene-thumbnail-pair-rule-001.*" |
| What deletes them? | **No.** Lifecycle invariants live in TypeScript only. | **Yes.** Class docstring: "*Created when a Scene is captured. Deleted when the Scene is deleted (garbage-collection invariant — see schema rule scene-thumbnail-orphan-rule-001).*" |

→ **All four answerable from the schema bundle alone post-merge.** SC-001 met.

## SC-004 grep result

```
$ git grep -nE 'scene-thumbnail\(-\.\+\)|"scene-thumbnail":' \
    shared/schemas services/stac \
    specs/241-stac-best-practices-upgrade/contracts \
    preview/workspace/samples/local-store

shared/schemas/src/linkml/storyboard.yaml:237:
    and the `^scene-thumbnail(-.+)?$` patternProperties rule.
```

Single remaining match — the deliberate FR-014 back-reference in the new
`SceneThumbnailAssetEntry` docstring (the "supersedes …" sentence). No
production rule definition or `item_assets` map entry survives.
