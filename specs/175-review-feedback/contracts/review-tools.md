# MCP Tool Contracts: Review Feedback

**Feature**: 175-review-feedback
**Date**: 2026-03-30

## Tool: add_review_item

Add a new review feedback item to a plot.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | string | Yes | Path to STAC catalog directory |
| plot_id | string | Yes | STAC Item ID |
| note | string | Yes | Review note text (non-empty) |
| expected_updated | string | Yes | ISO 8601 timestamp of item's current `updated` value (optimistic lock) |

**Returns** (success):
```json
{
  "review_item": {
    "id": "01HQXYZ...",
    "note": "Track solution diverges after 14:30Z",
    "status": "pending",
    "author": "j.smith",
    "created_at": "2026-03-28T09:14:00Z",
    "updated_at": "2026-03-28T09:14:00Z",
    "note_updated_at": null
  },
  "plot_id": "exercise-alpha",
  "review_count": 3
}
```

**Returns** (error — conflict):
```json
{
  "error": "Conflict: item has been modified since 2026-03-28T09:14:00Z. Re-fetch and retry."
}
```

**Returns** (error — validation):
```json
{
  "error": "Note text must not be empty."
}
```

---

## Tool: edit_review_item

Edit the note text of an existing review item.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | string | Yes | Path to STAC catalog directory |
| plot_id | string | Yes | STAC Item ID |
| review_item_id | string | Yes | ID of the review item to edit |
| note | string | Yes | Updated note text (non-empty) |
| expected_updated | string | Yes | ISO 8601 timestamp for optimistic lock |

**Returns** (success):
```json
{
  "review_item": {
    "id": "01HQXYZ...",
    "note": "Updated: Track solution diverges significantly after 14:30Z.",
    "status": "pending",
    "author": "j.smith",
    "created_at": "2026-03-28T09:14:00Z",
    "updated_at": "2026-03-28T11:30:00Z",
    "note_updated_at": "2026-03-28T11:30:00Z"
  },
  "plot_id": "exercise-alpha"
}
```

**Returns** (error — not found):
```json
{
  "error": "Review item 01HQXYZ... not found on plot exercise-alpha."
}
```

---

## Tool: delete_review_item

Delete a review item from a plot.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | string | Yes | Path to STAC catalog directory |
| plot_id | string | Yes | STAC Item ID |
| review_item_id | string | Yes | ID of the review item to delete |
| expected_updated | string | Yes | ISO 8601 timestamp for optimistic lock |

**Returns** (success):
```json
{
  "deleted_item_id": "01HQXYZ...",
  "plot_id": "exercise-alpha",
  "review_count": 2,
  "review_property_removed": false
}
```

When the last item is deleted:
```json
{
  "deleted_item_id": "01HQXYZ...",
  "plot_id": "exercise-alpha",
  "review_count": 0,
  "review_property_removed": true
}
```

---

## Tool: resolve_review_item

Mark a review item as resolved.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | string | Yes | Path to STAC catalog directory |
| plot_id | string | Yes | STAC Item ID |
| review_item_id | string | Yes | ID of the review item to resolve |
| expected_updated | string | Yes | ISO 8601 timestamp for optimistic lock |

**Returns** (success):
```json
{
  "review_item": {
    "id": "01HQXYZ...",
    "status": "resolved",
    "resolved_by": "a.jones",
    "resolved_at": "2026-03-28T11:02:00Z"
  },
  "plot_id": "exercise-alpha",
  "derived_state": "all-reviewed"
}
```

**Returns** (error — already resolved):
```json
{
  "error": "Review item 01HQXYZ... is already resolved."
}
```

---

## Tool: reopen_review_item

Reopen a previously resolved review item.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | string | Yes | Path to STAC catalog directory |
| plot_id | string | Yes | STAC Item ID |
| review_item_id | string | Yes | ID of the review item to reopen |
| expected_updated | string | Yes | ISO 8601 timestamp for optimistic lock |

**Returns** (success):
```json
{
  "review_item": {
    "id": "01HQXYZ...",
    "status": "pending",
    "resolution_history": [
      {
        "resolved_by": "a.jones",
        "resolved_at": "2026-03-28T11:02:00Z",
        "reopened_by": "j.smith",
        "reopened_at": "2026-03-28T11:15:00Z"
      }
    ]
  },
  "plot_id": "exercise-alpha",
  "derived_state": "pending-review"
}
```

**Returns** (error — already pending):
```json
{
  "error": "Review item 01HQXYZ... is already pending."
}
```

---

## Tool: get_review_items

Read all review items for a plot.

**Parameters**:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | string | Yes | Path to STAC catalog directory |
| plot_id | string | Yes | STAC Item ID |

**Returns** (success):
```json
{
  "review_items": [ ... ],
  "review_count": 2,
  "derived_state": "pending-review",
  "plot_id": "exercise-alpha",
  "updated": "2026-03-28T11:02:00Z"
}
```

**Returns** (no feedback):
```json
{
  "review_items": [],
  "review_count": 0,
  "derived_state": "no-feedback",
  "plot_id": "exercise-alpha",
  "updated": "2026-03-28T08:00:00Z"
}
```

---

## Common Error Responses

All tools return these error shapes:

| Condition | Response |
|-----------|----------|
| Catalog not found | `{"error": "Catalog not found at /path/to/catalog"}` |
| Plot not found | `{"error": "Plot plot-id not found in catalog"}` |
| Review item not found | `{"error": "Review item ULID not found on plot plot-id"}` |
| Optimistic lock conflict | `{"error": "Conflict: item has been modified since <timestamp>. Re-fetch and retry."}` |
| Validation failure | `{"error": "<specific validation message>"}` |

## Optimistic Locking Protocol

1. Client reads plot via `read_plot_tool` — response includes `updated` timestamp
2. Client includes `expected_updated` in any write operation
3. Server compares `expected_updated` against current item `updated`
4. If match: operation proceeds, `updated` is refreshed
5. If mismatch: server returns 409-style error, client must re-fetch and retry
