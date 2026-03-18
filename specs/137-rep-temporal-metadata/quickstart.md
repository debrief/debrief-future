# Quickstart: REP Loader Temporal Metadata (#137)

**Date**: 2026-03-18

## What This Feature Does

After a REP file is loaded, the system now computes the temporal extent (earliest and latest timestamps) from all track data and sets `start_datetime`, `end_datetime`, and `datetime` on the STAC Item. This enables accurate Timeline/Gantt view rendering and temporal filtering.

## How It Works

### Before (current behaviour)
```
Load REP → Create STAC Item (datetime = now()) → Add features → Done
```
Timeline/Gantt shows file load time, not exercise time.

### After (with this feature)
```
Load REP → Create STAC Item → Add features → Update temporal metadata → Done
                                                  ↓
                                    datetime = exercise start
                                    start_datetime = exercise start
                                    end_datetime = exercise end
```
Timeline/Gantt shows actual exercise duration.

## Files Modified

| File | Change |
|------|--------|
| `services/stac/src/debrief_stac/plot.py` | Add `update_temporal_metadata()` function |
| `services/stac/src/debrief_stac/models.py` | Extend `PlotMetadata` with `start_datetime`/`end_datetime` |
| `services/stac/src/debrief_stac/mcp_server.py` | Add MCP tool for `update_temporal_metadata` |
| `apps/vscode/src/services/stacService.ts` | Delegate `updateTemporalMetadata()` to MCP tool |
| `services/stac/tests/test_plot.py` | Add temporal metadata tests |
| `services/stac/tests/test_integration.py` | Add temporal metadata to integration test |

## Verification

```bash
# Run STAC service tests
uv run pytest services/stac/tests/ -v -k temporal

# Run VS Code extension tests
pnpm --filter @debrief/vscode test

# Full CI check
task verify
```
