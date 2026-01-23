# Quickstart: REP File Loading Development

**Feature**: 021-load-rep-files-stac
**Date**: 2026-01-23

## Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.11+
- uv (Python package manager)
- VS Code 1.85+

## Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already)
cd /path/to/debrief-future

# Install VS Code extension dependencies
cd apps/vscode
pnpm install

# Install Python service dependencies
cd ../../services/io
uv sync

cd ../stac
uv sync
```

### 2. Start Python Services

In separate terminals:

```bash
# Terminal 1: debrief-io MCP server
cd services/io
uv run debrief-io-mcp

# Terminal 2: debrief-stac (if using MCP)
cd services/stac
uv run debrief-stac-mcp
```

### 3. Run Extension in Development Mode

```bash
cd apps/vscode
pnpm run dev
```

Press F5 in VS Code to launch Extension Development Host.

## Testing

### Run Unit Tests

```bash
cd apps/vscode
pnpm test
```

### Run Integration Tests

```bash
cd apps/vscode
pnpm test:integration
```

### Manual Testing Checklist

1. **Drag-Drop Flow (P1)**
   - [ ] Open a plot in the map panel
   - [ ] Drag a `.rep` file from Explorer onto the map
   - [ ] Verify progress indicator appears
   - [ ] Verify tracks appear on map
   - [ ] Verify map zooms to include new tracks

2. **Context Menu Flow (P2)**
   - [ ] Right-click a `.rep` file in Explorer
   - [ ] Select "Load into Debrief..."
   - [ ] Verify catalog picker appears
   - [ ] Select catalog, then item
   - [ ] Verify import completes

3. **Duplicate Detection**
   - [ ] Import same file twice
   - [ ] Verify warning message appears
   - [ ] Verify no duplicate created

4. **Error Handling**
   - [ ] Try importing malformed `.rep` file
   - [ ] Verify error message is helpful
   - [ ] Verify no partial state left behind

## Sample Data

Sample REP files for testing are in `demo/samples/`:

```
demo/samples/
├── nelson_track.rep      # Valid single track
├── multi_track.rep       # Multiple tracks
├── malformed.rep         # Invalid format (for error testing)
└── large_track.rep       # Performance testing (~1MB)
```

## Key Files to Modify

| File | Purpose |
|------|---------|
| `apps/vscode/src/services/importService.ts` | Import orchestration (NEW) |
| `apps/vscode/src/services/ioService.ts` | debrief-io communication (NEW) |
| `apps/vscode/src/services/stacService.ts` | Add asset/features methods |
| `apps/vscode/src/commands/importRep.ts` | Command handler (NEW) |
| `apps/vscode/src/views/catalogItemPicker.ts` | QuickPick UI (NEW) |
| `apps/vscode/src/webview/mapPanel.ts` | Handle drop events |
| `apps/vscode/src/webview/messages.ts` | Message type definitions |
| `apps/vscode/src/webview/web/map.ts` | Drop zone in webview |
| `apps/vscode/package.json` | Context menu contribution |

## Architecture Reference

```
User Action
    │
    ├── Drag-drop on map ──► mapPanel.ts ──► webview message
    │                                              │
    └── Context menu ──► importRep.ts ──► picker ──┤
                                                   │
                                                   ▼
                                           ImportService
                                                   │
                         ┌─────────────────────────┼─────────────────────────┐
                         │                         │                         │
                         ▼                         ▼                         ▼
                    IoService             StacService.addAsset    StacService.addFeatures
                         │                         │                         │
                         ▼                         ▼                         ▼
                    debrief-io                debrief-stac              debrief-stac
```

## Debugging Tips

### Extension Host Logs

View in Output panel → "Debrief" channel.

### Python Service Logs

```bash
# debrief-io verbose mode
DEBUG=1 uv run debrief-io-mcp
```

### Webview DevTools

In Extension Development Host:
1. Open Command Palette (Cmd/Ctrl+Shift+P)
2. "Developer: Open Webview Developer Tools"
3. Check Console for drop event logs

## Common Issues

### "Connection refused" for Python services

Ensure MCP servers are running. Check port configuration in `settings.json`.

### Drag-drop not working

- Verify file has `.rep` extension
- Check browser DevTools for drag event errors
- Ensure map panel is focused (not sidebar)

### Import succeeds but map doesn't update

- Check that `fitBounds` message is being sent
- Verify bounds calculation returns valid numbers
- Check Leaflet console for rendering errors
