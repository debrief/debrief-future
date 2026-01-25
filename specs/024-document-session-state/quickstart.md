# Quickstart: Session State Management

**Feature**: 024-document-session-state
**Audience**: Developers implementing or integrating with the session state service

## Overview

The session state service provides centralized state management for the Debrief VS Code extension. It tracks temporal navigation, spatial viewport, feature selection, and document lifecycle.

**Key Components**:
- **State Store**: Zustand-based reactive state (TypeScript)
- **MCP Server**: Tool interface for Python clients
- **SSE Endpoint**: Real-time updates for debug dashboard
- **Debug Dashboard**: Standalone HTML app for development

## Quick Setup

### Prerequisites

- Node.js 18+
- pnpm
- Python 3.11+ (for client testing)

### Install Dependencies

```bash
# Install TypeScript dependencies
cd services/session-state
pnpm install

# Install Python client (optional)
cd services/session-state-py
uv pip install -e .
```

### Start Standalone Server

```bash
# Development mode with auto-reload
cd services/session-state
pnpm dev

# Production mode
pnpm start
```

Server starts at `http://localhost:3001` with:
- MCP endpoint: `POST /mcp`
- SSE endpoint: `GET /sse`
- Health check: `GET /health`

### Open Debug Dashboard

Open `tools/debug-dashboard/index.html` directly in a browser, or serve it:

```bash
# Simple HTTP server for dashboard
cd tools/debug-dashboard
python -m http.server 8080
# Open http://localhost:8080
```

The dashboard connects to `http://localhost:3001` by default. Override with `?server=http://other:port`.

## Usage Examples

### TypeScript: Subscribe to State Changes

```typescript
import { getSessionStore } from '@debrief/session-state';

const store = getSessionStore();

// Subscribe to entire state
store.subscribe((state) => {
  console.log('State changed:', state);
});

// Subscribe to specific slice (fine-grained)
store.subscribe(
  (state) => state.temporal.currentTime,
  (currentTime) => {
    console.log('Current time:', currentTime);
  }
);
```

### TypeScript: Update State

```typescript
import { getSessionStore } from '@debrief/session-state';

const store = getSessionStore();

// Update current time
store.getState().setCurrentTime({
  epoch: Date.now(),
  iso: new Date().toISOString(),
});

// Update selection
store.getState().setSelection(['feature-001', 'feature-002']);

// Clear selection
store.getState().clearSelection();
```

### TypeScript: Undo/Redo

```typescript
import { getSessionStore } from '@debrief/session-state';

const store = getSessionStore();

// Check availability
const canUndo = store.temporal.getState().pastStates.length > 0;
const canRedo = store.temporal.getState().futureStates.length > 0;

// Perform undo/redo
store.temporal.getState().undo();
store.temporal.getState().redo();

// Undo multiple steps
store.temporal.getState().undo(5);
```

### Python: Access via MCP

```python
from debrief_session import SessionClient

# Connect to standalone server
client = SessionClient("http://localhost:3001/mcp")

# Get current state
state = client.get_state()
print(f"Current time: {state.temporal.current_time}")

# Get specific slice
temporal = client.get_temporal_state()
print(f"Playback rate: {temporal.playback_rate}")

# Update state
client.set_current_time(epoch=1706097600000)

# Or with ISO string
client.set_current_time(iso="2024-01-24T12:00:00.000Z")

# Set selection
client.set_selection(["track-001", "track-002"], primary="track-001")

# Undo/redo
client.undo()
client.redo(steps=3)
```

### JavaScript: Connect to SSE

```javascript
// In debug dashboard or other JS client
const eventSource = new EventSource('http://localhost:3001/sse');

eventSource.addEventListener('state-sync', (event) => {
  const data = JSON.parse(event.data);
  console.log('Full state:', data.state);
});

eventSource.addEventListener('temporal.currentTime', (event) => {
  const data = JSON.parse(event.data);
  console.log('Time changed:', data.value);
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

### Session Persistence

```typescript
import { getSessionStore } from '@debrief/session-state';

const store = getSessionStore();

// Save session
await store.getState().saveSession('/path/to/session.json');

// Load session (resets ephemeral state)
await store.getState().loadSession('/path/to/session.json');

// Check dirty state
if (store.getState().document.dirty) {
  console.log('Unsaved changes!');
}
```

## API Reference

### MCP Tools

| Tool | Description |
|------|-------------|
| `session.getState` | Get full state or specific slice |
| `session.setCurrentTime` | Set playback/display time |
| `session.setViewport` | Set map viewport |
| `session.setSelection` | Set selected features |
| `session.undo` | Revert to previous state |
| `session.redo` | Reapply undone change |
| `session.save` | Save session to file |
| `session.load` | Load session from file |

See [contracts/mcp-tools.yaml](./contracts/mcp-tools.yaml) for full schema.

### SSE Events

| Event | Description |
|-------|-------------|
| `state-sync` | Full state on connection |
| `temporal.*` | Temporal slice field changes |
| `spatial.*` | Spatial slice field changes |
| `features.*` | Features slice field changes |
| `document.*` | Document slice field changes |
| `batch-update` | Multiple fields changed |
| `error` | Error notification |

See [contracts/sse-events.yaml](./contracts/sse-events.yaml) for full schema.

## Testing

### Run TypeScript Tests

```bash
cd services/session-state
pnpm test           # Run all tests
pnpm test:unit      # Unit tests only
pnpm test:int       # Integration tests
pnpm test:watch     # Watch mode
```

### Run Python Client Tests

```bash
cd services/session-state-py
pytest              # Run all tests
pytest -v           # Verbose
```

### Manual Testing with Dashboard

1. Start the standalone server: `pnpm dev`
2. Open the debug dashboard in browser
3. Use Python client or MCP tools to modify state
4. Verify dashboard updates in real-time

## Troubleshooting

### Dashboard Not Connecting

- Verify server is running (`curl http://localhost:3001/health`)
- Check CORS: Server allows all origins in development
- Check browser console for errors
- Try `?server=http://127.0.0.1:3001` instead of localhost

### State Not Updating

- Check SSE connection (browser Network tab)
- Verify subscription selectors are correct
- Check for JavaScript errors in console

### Undo Not Working

- Ephemeral state changes (playback) are not tracked
- Rapid changes are throttled (100ms)
- History limited to 50 steps

## Architecture Notes

### Embedded vs Standalone

The same state management code works in both modes:

- **Embedded (VS Code)**: TypeScript components access store directly; Python uses HTTP
- **Standalone (Debug)**: All clients use HTTP/MCP

### State Categories

| Category | Examples | In Undo History | Persisted |
|----------|----------|-----------------|-----------|
| Persistent | currentTime, viewport, selection | Yes | Yes |
| Ephemeral | playbackState, dirty, undoStack | No | No |

### Performance Targets

- UI updates: <100ms (SC-001)
- Dashboard updates: <200ms (SC-008)
- Undo/redo: Instant (local operation)
