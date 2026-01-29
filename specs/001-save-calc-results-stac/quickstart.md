# Quickstart: Save Analysis Results to STAC

## Prerequisites

- VS Code extension running with a loaded REP file
- At least one calc tool result displayed on the map (execute a tool via #038)

## Save a Result

1. Run a calc tool (e.g., range/bearing between two tracks)
2. Result appears on the map and in the Layers panel under "Results"
3. Right-click the result layer in the Layers panel
4. Click "Save Result"
5. Notification confirms: "Result saved to catalog"
6. The result layer icon updates to show it has been persisted

## Reopen a Saved Result

1. The saved result appears in the catalog alongside loaded plots
2. Open it like any other plot — features render on the map with result styling

## Verify Provenance

Inspect the saved STAC Item (in the catalog directory):
- `item.json` → `properties` contains tool name, version, parameters, timestamp
- `item.json` → `links` contains `derived_from` entries pointing to source items
- `features.geojson` → each feature has `properties.provenance` with fine-grained lineage

## Development

### Python (debrief-stac)

```bash
cd services/stac
uv run pytest tests/test_results.py -v
```

### TypeScript (VS Code extension)

```bash
cd apps/vscode
npm run test -- --grep "saveResult"
```
