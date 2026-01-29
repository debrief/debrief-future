# Quickstart: 039 — Wire TimeController to TemporalTrackLayer

## Prerequisites

- Node.js 18+, pnpm
- VS Code (for extension testing)

## Build & Test

```bash
# From repo root
pnpm install
pnpm -F @debrief/vscode-extension build

# Run unit tests for the new temporalUtils
pnpm -F @debrief/vscode-extension test -- --grep temporal

# Run all extension tests
pnpm -F @debrief/vscode-extension test
```

## Manual Verification

1. Open VS Code with the extension loaded
2. Load a REP file (any sample with temporal track data)
3. Open the Time Range sidebar panel
4. Scrub the time slider → map tracks should update in real-time
5. Toggle display mode (Full ↔ Trail) → map should switch between full-track + marker and snail-trail rendering
6. Play/pause → tracks animate with playback

## Key Files

| File | Purpose |
|------|---------|
| `apps/vscode/src/webview/web/temporalUtils.ts` | Binary search + slice algorithms |
| `apps/vscode/src/webview/web/trackRenderer.ts` | Temporal track rendering in Leaflet |
| `apps/vscode/src/webview/web/map.ts` | Message handling for setCurrentTime/setDisplayMode |
| `apps/vscode/src/webview/messages.ts` | SetDisplayModeMessage type |
| `apps/vscode/src/webview/mapPanel.ts` | Forward displayMode from session state |
