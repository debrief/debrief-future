# Data Model: Restore Previously-Open Plots on VS Code Startup

**Feature**: 052-restore-plots-session
**Date**: 2026-02-06

## Entities

### OpenPlotReference

A lightweight record identifying a STAC plot that is currently open in the VS Code extension.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uri` | string | Yes | The `stac://` URI identifying the plot (e.g., `stac://local-store/exercise-alpha/track-data`). Primary identifier. |
| `title` | string | Yes | Human-readable plot title, stored for logging/debugging only (not used for restoration). |
| `storeId` | string | Yes | STAC store identifier, extracted from URI. Stored separately for efficient validation. |
| `itemPath` | string | Yes | STAC item path within the store. Stored separately for efficient validation. |
| `openedAt` | string (ISO 8601) | Yes | Timestamp when the plot was opened. Used for ordering and diagnostics. |

**Uniqueness constraint**: `uri` must be unique within the list. If a plot with the same URI is opened again, the existing entry is updated (not duplicated).

### OpenPlotsState

The complete persisted state, stored as a single entry in `workspaceState`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | Yes | Schema version for forward compatibility. Initial value: `1`. |
| `plots` | OpenPlotReference[] | Yes | Ordered list of currently-open plots. Order reflects the sequence in which plots were opened. |

**Storage key**: `debrief.openPlots`

**Storage location**: `ExtensionContext.workspaceState` (VS Code workspace-scoped persistence)

## State Transitions

```
[No state]                          (first activation, or all plots closed)
    │
    ├── openPlot(ref) ──────────────► [1 plot open]
    │                                     │
    │                    openPlot(ref2) ──►│ [2 plots open]
    │                                     │     │
    │                    closePlot(ref) ──►│     │ [1 plot open]
    │                                     │     │
    │                    closePlot(ref2) ──►────►│ [No state]
    │                                           │
    └── restoreOnStartup() ────────────────────►│ (reads persisted list, opens each)
```

### Transition Rules

1. **Open**: Append `OpenPlotReference` to `plots[]`. If URI already exists, move it to the end (update `openedAt`).
2. **Close**: Remove the entry matching the URI from `plots[]`.
3. **Restore**: Read `plots[]`, attempt to open each sequentially. Remove entries that fail to load (file missing/corrupt). Persist the cleaned list.
4. **Corrupt state**: If `workspaceState` returns unparseable data, treat as empty list.

## Validation Rules

- `uri` must start with `stac://`
- `version` must be a positive integer
- `plots` must be an array (may be empty)
- `openedAt` must be a valid ISO 8601 string
- Duplicate URIs in `plots[]` are not allowed (enforced by service logic)

## Persistence Behaviour

| Event | Action | Timing |
|-------|--------|--------|
| Plot opened | Add to `plots[]`, persist | Immediate (async write) |
| Plot closed | Remove from `plots[]`, persist | Immediate (async write) |
| VS Code startup | Read `plots[]`, restore each | During `activate()` |
| Restoration failure (single plot) | Remove from `plots[]`, persist cleaned list | After all restoration attempts |
| Corrupt stored data | Replace with empty state | During `activate()` |

## Relationship to Existing Entities

- **RecentPlot** (from `RecentPlotsService`): Complementary, not overlapping. `RecentPlot` tracks history; `OpenPlotReference` tracks current state. A plot can appear in both lists simultaneously.
- **SessionStore** (from `SessionManager`): `OpenPlotReference` identifies *which* plots to restore; `SessionStore` manages the *runtime state* of each restored plot.
- **STAC Item**: `OpenPlotReference.uri` points to a STAC item. The reference is a pointer, not a copy — if the STAC item changes between sessions, the updated version is loaded.
