# Research: Session State Management

**Feature**: 024-document-session-state
**Date**: 2026-01-24

## Executive Summary

This document captures research findings for the session state management implementation. Key decisions involve using Zustand for TypeScript state management, MCP SDK with Streamable HTTP transport for Python integration, and better-sse for real-time dashboard updates.

---

## Decision 1: State Management Library

**Decision**: Use Zustand with `zustand/vanilla` for non-React contexts

**Rationale**:
- Zustand's vanilla store works in any TypeScript environment (VS Code extension context)
- Built-in `subscribeWithSelector` middleware enables fine-grained reactive subscriptions
- Minimal bundle size (~1KB), zero dependencies
- Excellent TypeScript support with proper type inference
- Proven slices pattern for organizing state into logical modules

**Alternatives Considered**:
- **Redux Toolkit**: Too heavyweight for single-session state; unnecessary boilerplate
- **MobX**: Requires decorators or `makeAutoObservable`; more complex mental model
- **XState**: Better for complex state machines; overkill for simple reactive state
- **Custom EventEmitter**: Would require implementing subscription selectors manually

**Key Implementation Patterns**:

```typescript
// Vanilla store for VS Code extension (non-React)
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';

const store = createStore<SessionState>()(
  subscribeWithSelector((set, get) => ({
    temporal: { /* ... */ },
    spatial: { /* ... */ },
    features: { /* ... */ },
    document: { /* ... */ },
  }))
);

// Fine-grained subscription to specific slice
store.subscribe(
  (state) => state.temporal.currentTime,
  (currentTime, prevTime) => {
    // Only fires when currentTime changes
  }
);
```

---

## Decision 2: Undo/Redo Middleware

**Decision**: Use Zundo middleware for Zustand

**Rationale**:
- Purpose-built for Zustand; integrates seamlessly
- Configurable history limit (meets SC-005: ≥50 steps)
- `partialize` option to exclude ephemeral state from history
- Throttling support for rapid state changes (pan/zoom)
- Simple API: `undo()`, `redo()`, `clear()`

**Alternatives Considered**:
- **Custom implementation**: Would require implementing history stack, state snapshots
- **zustand-middleware-undo**: Less actively maintained than Zundo
- **Immer patches**: More complex; Zundo is simpler for full-state snapshots

**Configuration**:

```typescript
import { temporal } from 'zundo';

const store = createStore<SessionState>()(
  subscribeWithSelector(
    temporal(
      (set, get) => ({ /* state */ }),
      {
        limit: 50,
        partialize: (state) => ({
          // Only track these slices in undo history
          temporal: state.temporal,
          spatial: state.spatial,
          features: state.features,
          // Exclude document.dirty, document.history
        }),
        handleSet: (handleSet) =>
          throttle(handleSet, 100), // Debounce rapid changes
      }
    )
  )
);
```

---

## Decision 3: MCP Transport

**Decision**: Use Streamable HTTP transport (not deprecated HTTP+SSE)

**Rationale**:
- Streamable HTTP is the recommended transport for remote MCP servers
- Supports both stateless (simpler) and stateful (session-aware) modes
- Works with Express.js via `@modelcontextprotocol/express` package
- DNS rebinding protection built-in for security
- Single endpoint (`/mcp`) handles all MCP operations

**Alternatives Considered**:
- **stdio transport**: Only works for subprocess communication; not suitable for HTTP
- **HTTP+SSE transport**: Deprecated in favor of Streamable HTTP
- **Custom REST API**: Would require separate Python client; MCP provides standard interface

**Implementation Pattern**:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Stateless mode (simpler - recommended for this use case)
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on('close', () => transport.close());
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

---

## Decision 4: Real-Time Dashboard Updates

**Decision**: Use better-sse for Server-Sent Events

**Rationale**:
- Zero dependencies, spec-compliant SSE implementation
- Built-in channel support for broadcasting to multiple clients
- Native event ID support for reconnection and missed event recovery
- TypeScript-first with proper type definitions
- Works seamlessly with Express.js

**Alternatives Considered**:
- **WebSocket (ws/socket.io)**: Bidirectional not needed; SSE is simpler for server-push
- **Long polling**: Higher latency, more resource intensive
- **express-sse**: Fewer features, less actively maintained
- **Custom SSE**: Would require implementing reconnection, keep-alive manually

**Reconnection Strategy**:
- Server maintains event history (last 100 events)
- Each event has unique incrementing ID
- Client sends `Last-Event-ID` header on reconnect
- Server replays missed events before resuming stream

```typescript
import { createSession, createChannel } from 'better-sse';

const stateChannel = createChannel();

app.get('/sse', async (req, res) => {
  const session = await createSession(req, res);

  // Handle reconnection
  const lastEventId = req.headers['last-event-id'];
  if (lastEventId) {
    // Replay missed events
  } else {
    // Send full state
  }

  stateChannel.register(session);
});

// Broadcast state change
stateChannel.broadcast(stateData, 'temporal.currentTime', eventId);
```

---

## Decision 5: Debug Dashboard Architecture

**Decision**: Standalone HTML app (not server-hosted)

**Rationale**:
- Keeps server minimal (pure API, no static file serving)
- Dashboard can evolve independently of server
- Aligns with "thick services, thin frontends" architecture
- Can be opened directly from file:// for development
- Easier testing without server restart

**CORS Configuration**:
- Allow `null` origin for file:// protocol
- Allow `localhost` for development
- No credentials required (no auth for debug tool)

```typescript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // file://
    callback(null, true); // Allow all in development
  }
}));
```

---

## Decision 6: Session File Format

**Decision**: JSON with schema version and metadata

**Rationale**:
- Human-readable for debugging
- Easy to parse in both TypeScript and Python
- Schema version enables forward migration
- Aligns with project's JSON-based approach (GeoJSON, STAC)

**Alternatives Considered**:
- **MessagePack/Protocol Buffers**: Overkill for small session files
- **YAML**: More complex parsing, no significant benefit
- **SQLite**: Heavy for simple key-value state

**File Structure**:

```json
{
  "$schema": "https://debrief.io/schemas/session-state-v1.json",
  "version": "1.0.0",
  "savedAt": "2026-01-24T12:00:00.000Z",
  "temporal": { /* ... */ },
  "spatial": { /* ... */ },
  "features": { /* ... */ }
}
```

---

## Decision 7: Time Representation

**Decision**: Epoch milliseconds (internal) + ISO 8601 UTC (serialization)

**Rationale**:
- Epoch milliseconds enable efficient comparison (FR-032)
- ISO 8601 UTC ensures interoperability (FR-033)
- Both formats available in state for different use cases
- Consistent with STAC temporal properties

**Implementation**:

```typescript
interface TimeInstant {
  epoch: number;  // Milliseconds since Unix epoch
  iso: string;    // ISO 8601 UTC string
}

// Helper to create TimeInstant
const createTimeInstant = (date: Date): TimeInstant => ({
  epoch: date.getTime(),
  iso: date.toISOString(),
});
```

---

## Technology Stack Summary

| Concern | Choice | Version | Notes |
|---------|--------|---------|-------|
| State management | Zustand | ^5.0.0 | With `subscribeWithSelector` |
| Undo/redo | Zundo | ^2.0.0 | 50-step limit |
| HTTP server | Express | ^4.18.0 | Mature, well-supported |
| MCP SDK | @modelcontextprotocol/sdk | ^1.0.0 | Streamable HTTP transport |
| SSE | better-sse | ^1.0.0 | Channel broadcasting |
| Schema validation | Zod | ^3.22.0 | MCP tool schemas |
| Testing | Vitest | ^1.0.0 | Fast, TypeScript-native |

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to handle viewport debouncing? | Zundo's `handleSet` with throttle (implementation detail per spec) |
| How to handle feature selection limits? | No enforced limit; reasonable performance expected per spec |
| Multi-editor support? | Deferred; single session per spec assumptions |
| Time step auto-calculation? | Application layer responsibility per spec assumptions |

---

## References

- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Zundo GitHub](https://github.com/charkour/zundo)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [better-sse Documentation](https://github.com/MatthewWid/better-sse)
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
