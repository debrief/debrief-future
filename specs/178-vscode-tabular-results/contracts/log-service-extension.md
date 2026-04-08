# Contract: LogService.recordFileSaved (NEW)

**Feature**: 178-vscode-tabular-results
**Location**: `services/session-state/src/log/types.ts` (interface), `services/session-state/src/log/logService.ts` (implementation)

This is the new method added to the existing `LogService` interface to support FR-009 (link saved files to their originating tool run) and FR-021 (cleanup of orphan tool runs on plot close).

---

## Interface addition

```ts
export interface LogService {
  // ... existing methods unchanged ...

  /**
   * Append a FileSavedEvent to the analysis log.
   *
   * @param storePath          STAC store root.
   * @param itemPath           STAC item path within the store.
   * @param parentActivityId   activity_id of the originating ToolRunEvent.
   * @param filename           Saved file path relative to the item, e.g. `assets/track-stats--2026-04-07T10-00-00.csv`.
   * @param timestamp          ISO-8601 timestamp of the save action.
   *
   * @returns The new entry's activity_id.
   *
   * @throws If parentActivityId is not found in the timeline.
   * @throws If the store/item is not writable.
   */
  recordFileSaved(
    storePath: string,
    itemPath: string,
    parentActivityId: string,
    filename: string,
    timestamp: string,
  ): Promise<{ activity_id: string }>;
}
```

## Implementation contract

### Wire format

The new entry is a standard `LogEntry` (no schema change) with the following sentinel values:

```jsonc
{
  "activity_id": "<new ULID>",
  "timestamp": "<input timestamp>",
  "was_generated_by": {
    "tool": "debrief.fileSave",
    "tool_version": "1",
    "parameters": {
      "parent_activity_id": { "value": "<parentActivityId>", "default": false, "tunable": false },
      "filename":           { "value": "<filename>",         "default": false, "tunable": false }
    }
  },
  "used":      ["<parentActivityId>"],
  "generated": ["<filename>"],
  "execution_duration": "0",
  "generated_result_id": null,
  "tune": null
}
```

### Validation rules (raised before append)

1. `parentActivityId` MUST exist in the timeline (resolved via the existing timeline read path).
2. `filename` MUST start with `assets/` (matches STAC asset path convention).
3. `timestamp` MUST parse as ISO-8601.

### Side effects

- Appends the new entry through the same persistence path as `recordToolResult` (no new write code).
- Updates the timeline cache (existing behaviour).

### Test contract

| Test | Purpose |
|------|---------|
| Records a FileSavedEvent linked to an existing ToolRunEvent | Happy path |
| Throws when parentActivityId missing | Validation |
| Throws when filename does not start with `assets/` | Validation |
| Sentinel `was_generated_by.tool` is exactly `'debrief.fileSave'` | Cleanup discriminator |
| `used[0]` equals parentActivityId | PROV link integrity |

---

## Cleanup discriminator usage

The cleanup-on-close routine in `ResultsPanelService` (FR-021) walks the timeline and identifies FileSavedEvents by `was_generated_by.tool === 'debrief.fileSave'`. This sentinel string is the **only** place the discriminator is hard-coded; both producers (the new `recordFileSaved`) and consumers (the cleanup walker) reference the same constant exported from `services/session-state/src/log/types.ts`:

```ts
export const FILE_SAVE_TOOL_SENTINEL = 'debrief.fileSave';
```

This avoids string literals scattered across the codebase.
