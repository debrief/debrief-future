# Quickstart: Review Feedback

**Feature**: 175-review-feedback
**Date**: 2026-03-30

## What This Feature Does

Adds the ability to attach review feedback notes to any STAC plot (item). Reviewers and analysts can create, edit, resolve, reopen, and delete feedback items. The STAC Catalog Browser shows visual badges (amber for pending, muted for reviewed) and a "Review status" filter to help users find plots needing attention.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  VS Code Extension / Web Shell                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ ExerciseListView │  │  FilterBar       │  │ ReviewPanel   │  │
│  │ (badges)         │  │ (review-status)  │  │ (detail view) │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬────────┘  │
│           │                     │                    │           │
│           └──────────┬──────────┘────────────────────┘           │
│                      │ MCP tool calls                            │
└──────────────────────┼──────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────┐
│  debrief-stac        │                                           │
│  ┌───────────────────▼──────────────────┐                       │
│  │  MCP Tools (review_*)                 │                       │
│  │  add / edit / delete / resolve / get  │                       │
│  └───────────────────┬──────────────────┘                       │
│  ┌───────────────────▼──────────────────┐                       │
│  │  review.py (domain logic)             │                       │
│  │  - CRUD operations                    │                       │
│  │  - Optimistic locking                 │                       │
│  │  - Provenance logging                 │                       │
│  │  - State derivation                   │                       │
│  └───────────────────┬──────────────────┘                       │
│                      │                                           │
│  ┌───────────────────▼──────────────────┐                       │
│  │  item.json (STAC Item)                │                       │
│  │  properties:                          │                       │
│  │    debrief:review: [...]              │                       │
│  │    debrief:review_log: [...]          │                       │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Layers

### Layer 1: Schema (LinkML)

New `review.yaml` module defining `ReviewItem`, `ReviewStatus`, `ResolutionHistoryEntry`, `ReviewLogEntry`, and `ReviewAction`. Imported by `stac-extension.yaml` to add `debrief:review` property. Generates Pydantic models (Python) and TypeScript types via existing codegen.

### Layer 2: Service (Python — debrief-stac)

New `review.py` module in `services/stac/src/debrief_stac/`:
- CRUD functions: `add_review_item()`, `edit_review_item()`, `delete_review_item()`
- Status functions: `resolve_review_item()`, `reopen_review_item()`
- Query functions: `get_review_items()`, `derive_review_state()`
- Optimistic locking: compare `expected_updated` vs current item timestamp
- Provenance: append to `debrief:review_log` on edit/delete
- User identity: from `DEBRIEF_USER` env var or OS username

### Layer 3: MCP Tools (Python — debrief-stac)

Six new tools added to `mcp_server.py`:
- `add_review_item_tool`
- `edit_review_item_tool`
- `delete_review_item_tool`
- `resolve_review_item_tool`
- `reopen_review_item_tool`
- `get_review_items_tool`

### Layer 4: Frontend (TypeScript — shared/components)

- **Filter engine**: Add `review-status` to `FilterType`, implement matcher
- **CatalogOverviewItem**: Add optional `reviewStatus` field
- **ExerciseListView**: Add review state badges to plot rows
- **ReviewPanel**: New component in plot detail view for listing/managing feedback items

### Layer 5: VS Code Extension Integration

- Wire ReviewPanel into plot detail webview
- Pass user identity to MCP server via environment variable
- Handle optimistic lock conflicts with user-facing retry prompt

## Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `shared/schemas/src/linkml/review.yaml` | Create | LinkML schema for review entities |
| `shared/schemas/src/linkml/stac-extension.yaml` | Modify | Import review property |
| `services/stac/src/debrief_stac/review.py` | Create | Review domain logic |
| `services/stac/src/debrief_stac/mcp_server.py` | Modify | Add review MCP tools |
| `services/stac/src/debrief_stac/models.py` | Modify | Add review Pydantic models (if not fully generated) |
| `shared/components/src/filter-engine/types.ts` | Modify | Add review-status FilterType |
| `shared/components/src/filter-engine/matchers.ts` | Modify | Add review-status matcher |
| `shared/components/src/ExerciseListView/` | Modify | Add review badges |
| `shared/components/src/ReviewPanel/` | Create | Review detail panel component |

## Testing Strategy

- **Unit tests**: Review domain logic (add/edit/delete/resolve/reopen), optimistic locking, state derivation
- **Schema tests**: Golden fixtures for valid/invalid review items, round-trip tests
- **Filter tests**: Review-status filter predicate matching
- **Component tests**: Badge rendering, ReviewPanel display states
- **Integration tests**: Full MCP tool round-trip (create → read → resolve → delete)
