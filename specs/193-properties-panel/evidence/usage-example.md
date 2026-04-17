# Usage Example: Properties Panel commit flow

This example walks through Scenario 1 from [quickstart.md](../quickstart.md): an analyst opens a plot whose `debrief:tags` are wrong, corrects them via the Properties Panel, and observes the change persisted atomically to `item.json` with a provenance entry.

## Starting state — `item.json` (before)

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "exercise-atlantic-2025",
  "bbox": [-65.0, 35.0, -55.0, 45.0],
  "properties": {
    "title": "Atlantic ASW Exercise",
    "datetime": "2025-03-10T12:00:00Z",
    "debrief:tags": ["exercise", "asw"],
    "debrief:platforms": [
      { "id": "NELSON", "name": "HMS Nelson", "nationality": "GB" }
    ]
  }
}
```

## Analyst action

1. Opens the plot. The 4th ActivityPanel section ("Properties") expands to show the current fields.
2. The chip list widget for `debrief:tags` renders `exercise` and `asw` as chips.
3. The analyst types `atlantic-coast` into the inline input and presses **Enter**. The chip list widget fires a single `onCommit` with `['exercise', 'asw', 'atlantic-coast']`.

## Message flow

```
Webview → Extension (activityPanelView.ts)
{
  "type": "properties:commit",
  "storePath": "/Users/analyst/catalog",
  "itemPath": "items/exercise-atlantic-2025/item.json",
  "patch": {
    "debrief:tags": ["exercise", "asw", "atlantic-coast"]
  }
}
```

Extension invokes `stacService.updateItemMetadata(...)`:
- reads `item.json`, records mtime fingerprint,
- merges patch into `item.properties`,
- merges empty `overrideFields` into `debrief:overrides` (`debrief:tags` is not auto-derived — no override needed),
- appends provenance entry,
- re-stats `item.json` (mtime unchanged → safe to write),
- atomic temp+rename onto `item.json`.

## Ending state — `item.json` (after)

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "exercise-atlantic-2025",
  "bbox": [-65.0, 35.0, -55.0, 45.0],
  "properties": {
    "title": "Atlantic ASW Exercise",
    "datetime": "2025-03-10T12:00:00Z",
    "debrief:tags": ["exercise", "asw", "atlantic-coast"],
    "debrief:platforms": [
      { "id": "NELSON", "name": "HMS Nelson", "nationality": "GB" }
    ],
    "debrief:provenance_log": [
      {
        "activity_id": "9a7e1f4c-4ec9-4f10-ba9d-1f2a8c2b6b3e",
        "timestamp": "2026-04-17T14:26:30Z",
        "tool": "debrief.propertiesPanel",
        "method": "properties-panel@0.1.0",
        "fields": ["debrief:tags"],
        "source": "user"
      }
    ]
  }
}
```

Key invariants demonstrated:
- Exactly one provenance entry per commit (FR-006, SC-004).
- `debrief:overrides` is not populated because `debrief:tags` is not in `AUTO_DERIVED_FIELDS`.
- `method` matches the pattern `^properties-panel@.+$`.
- `fields` contains exactly one entry — the key the analyst committed.

## Scenario 3 variation — auto-derived override

If the committed key had been `start_datetime`, then `debrief:overrides` would receive `["start_datetime"]` and the Properties form would render the field with the "override" chip on the next hydrate. Any subsequent `updateTemporalMetadata` pass would skip that field.
