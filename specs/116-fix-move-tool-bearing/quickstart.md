# Quick Start: PROV Log Input Snapshot for Mutation Replay

**Feature**: 116-fix-move-tool-bearing

## What This Feature Does

When a coordinate-mutating tool (like move-shape) executes, it now stores the feature's **pre-operation geometry** in the PROV log entry. This enables correct replay: when a user tunes a parameter (e.g., changes the bearing from 90 to 0), the system applies the new parameter to the **original position**, not the current (already-moved) position.

## Key Files to Know

| File | What It Does |
|------|-------------|
| `shared/schemas/src/linkml/log-entry.yaml` | Master schema — defines `InputFeatureState` class |
| `services/calc/debrief_calc/models.py` | Python model — `InputFeatureState` + `LogEntry.input_state` |
| `services/calc/debrief_calc/provenance.py` | Creates log entries with optional inputState |
| `services/calc/debrief_calc/executor.py` | Captures pre-tool geometry for mutation tools |
| `services/session-state/src/log/types.ts` | TypeScript types (already had `InputFeatureState`) |
| `services/session-state/src/log/logService.ts` | Restores inputState during replay (already worked) |

## How It Works

### At Execution Time (Python executor)

```
1. User selects feature(s) and invokes a mutation tool
2. executor.py checks: is this a mutation tool? (output_kind starts with "mutation/")
3. If yes: snapshot input features' geometry + spatial properties → InputFeatureState[]
4. Execute the tool handler (modifies geometry)
5. Create LogEntry with inputState attached
6. Attach LogEntry to output features' provenance array
```

### At Replay Time (TypeScript session-state)

```
1. User changes a parameter on a PROV log card (e.g., bearing slider)
2. logService.tuneEntry() finds the target entry
3. Reads inputState from the entry
4. Restores features to pre-tool geometry (from inputState)
5. Writes restored GeoJSON to disk
6. Replay engine re-executes from the target entry with new parameter
7. Appends TuneAnnotation to provenance
```

## Testing the Feature

### Python Unit Tests

```bash
# Run all calc tests
uv run pytest services/calc/tests/ -v

# Run just the provenance tests
uv run pytest services/calc/tests/test_provenance.py -v

# Run move-shape tests
uv run pytest services/calc/tests/tools/shape/manipulation/test_move_shape.py -v
```

### What to Verify

1. **InputState captured**: After executing move-shape, inspect the output feature's provenance — the last entry should have `inputState` with the pre-move geometry.

2. **Idempotent replay**: Execute move-shape, then "replay" with the same parameters — result should match original output.

3. **Changed bearing**: Move a circle East (bearing=90), then replay with bearing=0 — circle should end up North of the *original* position, not North of the moved position.

4. **Non-mutation tools unaffected**: Execute a non-mutation tool (e.g., calculate-range) — the LogEntry should have `inputState: null`.

## Convention for New Mutation Tools

If you're implementing a new coordinate-mutating tool:

1. Set `output_kind` to start with `"mutation/"` (e.g., `"mutation/shape/rotated"`)
2. That's it — the executor automatically captures inputState for any tool with a `mutation/` output_kind
3. The replay system automatically uses inputState when replaying your tool

No changes needed in your tool handler. The executor handles everything.
