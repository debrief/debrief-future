# LogEntry round-trip proof — `debrief.storyboardEdit` sentinel

**Feature**: 218-storyboarding-edit
**Captured at**: 2026-04-24T12:42:33Z (commit `415df9e3`)

## Scope

Every value of `StoryboardEditOp` produces a `LogEntry` shape that:

1. Is structurally valid (matches the session-state `LogEntry` interface)
2. Round-trips through `appendProvenance` → `getTimeline` intact
3. Tags `was_generated_by.tool === 'debrief.storyboardEdit'` (the sentinel)
4. Carries the op + actor + storyboardId + sceneId +
   thumbnailAssetRef + underlyingActivityId + pairActivityId as
   `was_generated_by.parameters` entries (ParameterValue-wrapped)

## Verification path

- **Unit**: `services/session-state/tests/unit/log/logService.test.ts` — the `recordStoryboardEdit` describe block has a parametrised test that iterates every one of the 12 `StoryboardEditOp` values, invokes `recordStoryboardEdit`, and reads back the `was_generated_by.parameters.op.value` to confirm it matches the input.
- **Integration**: the `recordStoryboardEdit` method appends the entry to the affected feature's `provenance[]` via the existing `appendProvenance` path — the same persistence path that `recordToolResult` and `recordFileSaved` use. `getTimeline` walks the feature provenance arrays and assembles them; every storyboard-edit entry appears in the timeline interleaved with tool-run + file-save entries, in `timestamp` order.
- **Pair emission**: the `copy-out` / `copy-in` pair test asserts that both entries carry the same freshly-minted `pairActivityId` when `copySceneToOtherStoryboard` fires them.

## Op enumeration

| op | emitter | FR / SC reference |
|----|---------|-------------------|
| `create` | #215 (not emitted directly by #218 — CRUD emits) | FR-EDIT-011 |
| `rename` | service.renameScene + service.renameStoryboard | FR-EDIT-001 / FR-EDIT-012 |
| `describe` | service.describeScene + service.describeStoryboard | FR-EDIT-002 / FR-EDIT-013 |
| `delete` | service.deleteScene | FR-EDIT-003 |
| `restore` | service.undoDeleteScene | FR-EDIT-004 / SC-003 |
| `update-to-current` | service.updateSceneToCurrent | FR-EDIT-005 / SC-002 |
| `duplicate` | service.duplicateScene | FR-EDIT-007 |
| `copy-in` | service.copySceneToOtherStoryboard (destination side) | FR-EDIT-008 / review 3A |
| `copy-out` | service.copySceneToOtherStoryboard (source side) | FR-EDIT-008 / review 3A |
| `insert-middle` | #215 (fired by CRUD when a new scene is timestamp-middle) | FR-EDIT-011 |
| `refresh-thumbnail` | service.refreshSceneThumbnail | FR-EDIT-018 |
| `refresh-all-stale` | service.refreshAllStaleThumbnails (rollup) | FR-EDIT-025 / SC-012 |

## LinkML schema validation (deferred — T025)

The plan's review 10E calls for validating every `buildStoryboardEditLogEntry` output against the JSON Schema generated from the LinkML `LogEntry` definition. At capture time, `shared/schemas/src/generated/json-schema/` does not contain a generated `LogEntry.schema.json` — the LinkML → JSON Schema pipeline produces feature-shape schemas (`TrackFeature`, `PointProperties`, …) but not `LogEntry`.

**Workaround**: the session-state `LogEntry` TypeScript interface is the structural checkpoint (tsc-enforced across every `buildStoryboardEditLogEntry` call site). A dedicated JSON-Schema round-trip test lands alongside the LogEntry schema generation task (tracked separately).

## Wire format sample

For `op: 'rename'` with actor `alice`:

```jsonc
{
  "activity_id": "<new UUID>",
  "timestamp": "2026-04-24T12:42:33Z",
  "was_generated_by": {
    "tool": "debrief.storyboardEdit",
    "tool_version": "1",
    "parameters": {
      "op":                   { "value": "rename",         "default": false, "tunable": false },
      "actor":                { "value": "alice",          "default": false, "tunable": false },
      "storyboardId":         { "value": "01JSB…",         "default": false, "tunable": false },
      "sceneId":              { "value": "01JSC…",         "default": false, "tunable": false },
      "thumbnailAssetRef":    { "value": "scene-thumb…",   "default": false, "tunable": false },
      "underlyingActivityId": { "value": "<#215 act-id>",  "default": false, "tunable": false },
      "pairActivityId":       { "value": null,             "default": false, "tunable": false }
    }
  },
  "used":      ["01JSB…", "01JSC…"],
  "generated": ["01JSC…"],
  "execution_duration": "PT0S",
  "generated_result_id": null,
  "tune": null,
  "rationale": "rename \"Old\" → \"New\""
}
```
