# Review Feedback — Specification

## Overview

Analysts and reviewers can attach review feedback to any STAC plot (item). Feedback is stored as an array in `item.json` under `debrief:review`, allowing multiple discrete review items per plot. The STAC Catalog Browser surfaces feedback state through visual indicators and filter controls; individual items can be resolved, edited, or deleted.

Formal review initiation (requesting a review of a plot) is handled outside Future Debrief.

---

## Data Model

Feedback is stored under a `debrief:review` property in the STAC item's `properties` object as an array of review items.

```json
"properties": {
  "debrief:review": [
    {
      "id": "rv_01hs4xk2pq",
      "note": "Track solution diverges significantly from the manual plot after 14:30Z. Recommend re-running TMA from that waypoint.",
      "status": "pending",
      "author": "j.smith",
      "created_at": "2026-03-28T09:14:00Z",
      "updated_at": "2026-03-28T09:14:00Z",
      "note_updated_at": null
    },
    {
      "id": "rv_01hs5mn7rw",
      "note": "Bearing spread looks tight in leg 2 — worth checking sensor model assumptions.",
      "status": "resolved",
      "author": "a.jones",
      "created_at": "2026-03-28T10:45:00Z",
      "updated_at": "2026-03-28T11:02:00Z",
      "note_updated_at": "2026-03-28T10:58:00Z",
      "resolved_by": "j.smith",
      "resolved_at": "2026-03-28T11:02:00Z",
      "resolution_history": [
        {
          "resolved_by": "j.smith",
          "resolved_at": "2026-03-28T10:50:00Z",
          "reopened_by": "a.jones",
          "reopened_at": "2026-03-28T10:55:00Z"
        }
      ]
    }
  ]
}
```

A plot with no feedback has no `debrief:review` property (absence = no review).

### Fields (per item)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier for this review item (used for edit/delete targeting) |
| `note` | `string` | Yes | Free-text review comment |
| `status` | `enum` | Yes | `pending` or `resolved` |
| `author` | `string` | Yes | Username of the person who wrote the note |
| `created_at` | `ISO 8601` | Yes | When the item was first saved |
| `updated_at` | `ISO 8601` | Yes | When the item was last changed (any field) |
| `note_updated_at` | `ISO 8601 \| null` | Yes | When the note text was last edited; `null` if never edited after creation |
| `resolved_by` | `string` | No | Username of whoever most recently resolved it; absent when `status: pending` |
| `resolved_at` | `ISO 8601` | No | When most recently resolved; absent when `status: pending` |
| `resolution_history` | `array` | No | Ordered record of prior resolve/reopen cycles; absent if no cycles have occurred |

### Resolution history entry

| Field | Type | Description |
|---|---|---|
| `resolved_by` | `string` | Who resolved in this cycle |
| `resolved_at` | `ISO 8601` | When resolved in this cycle |
| `reopened_by` | `string` | Who reopened |
| `reopened_at` | `ISO 8601` | When reopened |

Each completed resolve→reopen cycle appends one entry. The current resolution state is always held in the top-level `resolved_by` / `resolved_at` fields.

---

## Behaviour

### ID generation
Item IDs are generated server-side by `debrief-stac` at creation time as ULIDs (Universally Unique Lexicographically Sortable Identifiers). Clients do not generate IDs.

### Creating a review item
- Any user (analyst or reviewer) may add a review item to any plot.
- `author`, `created_at`, and `updated_at` are populated automatically; `note_updated_at` is set to `null`.
- `id` is assigned by `debrief-stac` (ULID).
- Initial status is always `pending`.

### Editing a review item
- The note text of any individual item may be edited after saving.
- Editing updates `updated_at` and `note_updated_at` to the current timestamp; `created_at` and `author` are preserved.
- Edits are recorded as a PROV event in the Analysis Log, capturing the item `id`, editing user, and timestamp. The previous note text is not retained.
- Any user may edit any item (no author-lock).

### Deleting a review item
- Individual items may be deleted by any user, targeted by `id`.
- Deletion removes that item from the array. If the array becomes empty, the `debrief:review` property is removed entirely.
- Deletion is recorded as a PROV event in the Analysis Log, capturing the item `id`, deleting user, and timestamp. The note text is not retained.

### Resolving / reopening
- Any user may toggle an individual item's status between `pending` and `resolved`.
- On resolution: `resolved_by` and `resolved_at` are populated; `updated_at` is updated.
- On reopening: the current `resolved_by` / `resolved_at` values are moved into a new `resolution_history` entry (with `reopened_by` and `reopened_at` set); the top-level fields are cleared; `updated_at` is updated.
- Status changes do not alter the note text or author.

### Concurrency
`debrief-stac` uses optimistic locking for PATCH operations on `item.json`. Clients must include the current `updated` timestamp of the STAC item in their request. If the item has been modified since that timestamp, the server returns `409 Conflict` and the client must re-fetch before retrying.

---

## STAC Catalog Browser UI

### Plot-level feedback state
A plot's feedback state is derived from its review item array:

| Condition | Derived state |
|---|---|
| No `debrief:review` property | No feedback |
| Array present, all items `resolved` | All reviewed |
| Array present, one or more items `pending` | Pending review |

### Visual indicators
Each plot entry in the catalog list displays a badge reflecting its derived state:

| Derived state | Indicator |
|---|---|
| Pending review | Amber badge (`⚑ Review`) |
| All reviewed | Muted badge (`✓ Reviewed`) |
| No feedback | No badge |

### Filter controls
Review state filtering is integrated into the existing STAC Catalog Browser filter bar. When the review feedback component is present, the filter bar gains a **Review status** dropdown with the following options:

- **All** (default)
- **Pending review** — one or more items with `status: pending`
- **All reviewed** — array present, all items resolved
- **No feedback** — no `debrief:review` property; supports the workflow where an analyst wishes to identify plots that have not yet attracted any review comment

No notification is sent when review feedback is added to a plot. Analysts are expected to use the **Pending review** filter — optionally combined with existing plot ownership filters — to identify their plots with outstanding feedback.

### Review panel (plot detail view)
Selecting a plot opens its detail view. If feedback exists, a **Review** section lists all items in chronological order by `created_at`, each showing:
- Note text (with an edited indicator if `note_updated_at` is non-null)
- Author and timestamps (`Added by j.smith on 28 Mar 2026`)
- Resolution state, and if resolved: `Resolved by a.jones on 28 Mar 2026`
- Resolution history, if present, shown as a collapsible audit trail
- Per-item actions: `Mark as resolved` / `Reopen`, `Edit`, `Delete`

An **Add review note** button is always visible to allow additional items to be appended.

---

## Storage

- Feedback is persisted by `debrief-stac` as a PATCH to `item.json`, subject to optimistic locking.
- The STAC item's `updated` timestamp is refreshed on any feedback change.
- `features.geojson` is not touched.
