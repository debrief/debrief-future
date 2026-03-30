# Data Model: Review Feedback

**Feature**: 175-review-feedback
**Date**: 2026-03-30

## Entities

### ReviewItem

A single piece of review feedback attached to a STAC plot.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string (ULID) | Yes | Unique identifier, server-generated |
| note | string (non-empty) | Yes | Free-text review comment |
| status | ReviewStatus enum | Yes | `pending` or `resolved` |
| author | string | Yes | Username of the note author |
| created_at | ISO 8601 datetime | Yes | When first saved |
| updated_at | ISO 8601 datetime | Yes | When last modified (any field) |
| note_updated_at | ISO 8601 datetime or null | Yes | When note text was last edited; null if never edited |
| resolved_by | string | No | Username of most recent resolver; absent when pending |
| resolved_at | ISO 8601 datetime | No | When most recently resolved; absent when pending |
| resolution_history | ResolutionHistoryEntry[] | No | Prior resolve/reopen cycles; absent if none |

**Validation rules**:
- `note` must be non-empty (min length 1 after trimming whitespace)
- `id` is immutable after creation
- `author` is immutable after creation
- `created_at` is immutable after creation
- `status` transitions: pending → resolved, resolved → pending
- `resolved_by` and `resolved_at` must both be present or both absent
- When `status` is `pending`, `resolved_by` and `resolved_at` must be absent

### ReviewStatus (enum)

| Value | Description |
|-------|-------------|
| `pending` | Feedback has not been addressed |
| `resolved` | Feedback has been addressed |

### ResolutionHistoryEntry

A record of one completed resolve-then-reopen cycle.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| resolved_by | string | Yes | Who resolved in this cycle |
| resolved_at | ISO 8601 datetime | Yes | When resolved |
| reopened_by | string | Yes | Who reopened |
| reopened_at | ISO 8601 datetime | Yes | When reopened |

### ReviewLogEntry

A provenance record for a review edit or delete action.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | ReviewAction enum | Yes | `edit` or `delete` |
| review_item_id | string (ULID) | Yes | The review item affected |
| user | string | Yes | Who performed the action |
| timestamp | ISO 8601 datetime | Yes | When the action occurred |

### ReviewAction (enum)

| Value | Description |
|-------|-------------|
| `edit` | Note text was modified |
| `delete` | Review item was removed |

### DerivedReviewState (enum — computed, not stored)

| Value | Condition |
|-------|-----------|
| `no-feedback` | No `debrief:review` property on the item |
| `pending-review` | Array present, at least one item with `status: pending` |
| `all-reviewed` | Array present, all items have `status: resolved` |

## Relationships

```
STAC Item (Plot)
  └── properties
       ├── debrief:review  →  ReviewItem[]  (0..*)
       │     └── resolution_history  →  ResolutionHistoryEntry[]  (0..*)
       └── debrief:review_log  →  ReviewLogEntry[]  (0..*)

DerivedReviewState  ← computed from  debrief:review
```

## State Transitions

### ReviewItem Status

```
                resolve()              reopen()
  ┌─────────┐ ──────────→ ┌──────────┐ ──────────→ ┌─────────┐
  │ pending │              │ resolved │              │ pending │
  └─────────┘ ←────────── └──────────┘              └─────────┘
                reopen()
```

On resolve:
- Set `status` to `resolved`
- Set `resolved_by` to current user
- Set `resolved_at` to current timestamp
- Update `updated_at`

On reopen:
- Move current `resolved_by` + `resolved_at` into a new `ResolutionHistoryEntry` (with `reopened_by` and `reopened_at`)
- Append entry to `resolution_history`
- Clear top-level `resolved_by` and `resolved_at`
- Set `status` to `pending`
- Update `updated_at`

### Plot Derived State

```
No debrief:review  →  "no-feedback"
                   ↓ (add first item)
Has items, any pending  →  "pending-review"
                        ↓ (resolve all)
Has items, all resolved  →  "all-reviewed"
                         ↓ (reopen one)
Has items, any pending  →  "pending-review"
                        ↓ (delete all items)
No debrief:review  →  "no-feedback"
```

## Storage

- Review items stored in `item.json` under `properties["debrief:review"]`
- Review log stored in `item.json` under `properties["debrief:review_log"]`
- `features.geojson` is not modified by review operations
- When `debrief:review` array becomes empty, the property is removed from the item
- STAC item `updated` timestamp refreshed on any review change
