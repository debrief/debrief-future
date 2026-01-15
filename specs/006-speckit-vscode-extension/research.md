# Research: Debrief VS Code Extension

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15
**Purpose**: Resolve technical unknowns and capture design decisions

---

## Summary

All technical unknowns resolved. This document captures research findings for VS Code webview patterns, Leaflet integration, virtual file system providers, and MCP client integration.

---

## 1. VS Code Webview Patterns

### Webview Panel Lifecycle

**Decision**: Three-tier state persistence strategy

**Rationale**: VS Code webviews are destroyed when hidden; state must be explicitly managed.

| Tier | Method | Use Case |
|------|--------|----------|
| 1. Within-session | `getState()`/`setState()` | Map position, selection (survives tab hide/show) |
| 2. Cross-session | `WebviewPanelSerializer` | Restore last opened plot on VS Code restart |
| 3. Keep-alive | `retainContextWhenHidden` | Avoid unless state is truly unserializable |

**Alternatives Considered**:
- Always use `retainContextWhenHidden`: Rejected due to high memory overhead
- No state persistence: Rejected due to poor UX

### Extension ↔ Webview Communication

**Decision**: Typed message protocol with request IDs for async operations

**Rationale**: VS Code provides `postMessage()` and `onDidReceiveMessage()`. Type safety and request correlation improve maintainability.

```typescript
interface Message {
  type: string;
  requestId?: string;
  payload?: unknown;
}
```

**Alternatives Considered**:
- Unstructured messages: Rejected for lack of type safety
- `@estruyf/vscode` library: Consider for async/await abstractions

### Content Security Policy

**Decision**: Restrictive CSP with `webview.cspSource`, nonces for scripts

**Rationale**: Security requirement. Webviews must set CSP to prevent XSS vulnerabilities.

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  img-src ${webview.cspSource} data:;
  script-src 'nonce-${nonce}';
  style-src ${webview.cspSource};
">
```

**Alternatives Considered**:
- No CSP: Rejected for security risk
- `'unsafe-inline'`: Rejected; defeats CSP purpose

### Asset Loading

**Decision**: Use `webview.asWebviewUri()` for all resources

**Rationale**: Webviews cannot access `file:` URIs directly. `asWebviewUri()` converts paths to secure `vscode-resource:` scheme.

```typescript
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'main.js')
);
```

---

## 2. Leaflet Integration

### Bundling

**Decision**: esbuild with dual-target configuration (Node.js extension host, browser webview)

**Rationale**: esbuild builds complete in 300-700ms vs 50+ seconds with webpack. All assets bundled locally for CSP compliance and offline operation.

**Alternatives Considered**:
- webpack: Rejected for slow build times
- CDN-loaded Leaflet: Rejected; violates offline-first principle

### Performance for 10k+ Track Points

**Decision**: Canvas renderer with CircleMarkers, viewport-based rendering

**Rationale**: SVG creates DOM nodes per element (slow for 10k+). Canvas renders to single element. CircleMarkers are 50% faster than complex icon markers.

```typescript
const map = L.map('map', {
  preferCanvas: true,
  renderer: L.canvas({ padding: 0.5 })
});
```

| Renderer | Capacity |
|----------|----------|
| SVG | Up to ~1,000 elements |
| Canvas | 10k-100k elements |
| WebGL | 100k+ elements |

**Alternatives Considered**:
- SVG renderer: Rejected for performance at 10k scale
- WebGL (deck.gl): Rejected as overkill for 10k requirement

### Layer Management

**Decision**: Custom LayerManager class with L.LayerGroup for logical grouping

**Rationale**: Separate source layers (tracks) from result layers (analysis outputs) from UI layers (selection highlights). Enables batch operations and z-index control.

```typescript
interface LayerManager {
  sourceLayers: L.LayerGroup;   // Original tracks
  resultLayers: L.LayerGroup;   // Analysis outputs
  uiLayers: L.LayerGroup;       // Highlights, tooltips
}
```

### Selection Handling

**Decision**: Leaflet event system with modifier key detection

**Rationale**: Native event handling with click, Shift+click, Ctrl+click per spec.

| Action | Result |
|--------|--------|
| Click track | Select single |
| Shift+Click | Add to selection |
| Ctrl/Cmd+Click | Toggle selection |
| Click empty | Clear selection |

**Known Issue**: Polyline clicks bubble to map; must call `L.DomEvent.stopPropagation(e)`.

### PNG Export

**Decision**: leaflet-image library for canvas-based export

**Rationale**: Purpose-built for Leaflet, works within CSP constraints, no server required.

**Requirements**:
- All layers must use canvas renderer
- Wait for tiles to load before capture
- Disable animations during export

**Alternatives Considered**:
- html2canvas: Rejected; issues with Leaflet transforms
- Server-side rendering: Rejected; violates offline-first

---

## 3. Virtual Folder Provider (Explorer Integration)

### Custom File System Scheme

**Decision**: Register `stac://` scheme via `registerFileSystemProvider()`

**Rationale**: FileSystemProvider enables native Explorer integration for STAC stores as virtual folders.

```typescript
vscode.workspace.registerFileSystemProvider('stac', stacProvider, {
  isCaseSensitive: true,
  isReadonly: true
});
```

**Activation Event**: `onFileSystem:stac`

### TreeDataProvider vs FileSystemProvider

**Decision**: Use both - FileSystemProvider for Explorer, TreeDataProvider for sidebar panels

**Rationale**:

| Use Case | Provider |
|----------|----------|
| STAC catalog browsing | FileSystemProvider (Explorer) |
| Tools panel | TreeDataProvider (sidebar) |
| Layers panel | TreeDataProvider (sidebar) |

### Drag and Drop to Webview

**Decision**: HTML5 drag events in webview with `postMessage` to extension

**Rationale**: Since VS Code 1.90+, files dragged from Explorer to webview work via standard `DragEvent` with `text/uri-list` data.

```javascript
document.addEventListener('drop', (e) => {
  const uriList = e.dataTransfer.getData('text/uri-list');
  vscode.postMessage({ type: 'openPlots', uris: uriList.split('\n') });
});
```

### Refresh and Watch Patterns

**Decision**: Debounced `onDidChangeFile` events with 5ms buffer

**Rationale**: Multiple rapid changes should be batched to avoid UI flicker. Always update `mtime` in `FileStat` when content changes.

---

## 4. MCP Client Integration

### Client Initialization

**Decision**: Lazy-loaded singleton with subprocess-based STDIO transport

**Rationale**: STDIO is recommended for local MCP servers. Lazy loading defers connection until first tool invocation. Aligns with offline-first principle.

```typescript
const transport = new StdioClientTransport({
  command: "python3",
  args: ["-m", "debrief_calc.mcp.server"]
});
```

**Alternatives Considered**:
- HTTP/SSE transport: Rejected; STDIO simpler for local use
- Eager connection: Rejected; delays activation

### Tool Discovery

**Decision**: Cache tool metadata on first query with 60-second TTL

**Rationale**: Caching avoids redundant round-trips. Client-side filtering enables responsive UX when selection changes.

### Offline Handling

**Decision**: Graceful degradation with explicit unavailability state

**Rationale**: Constitution I.1 requires offline functionality. Display/selection must work without MCP. Users must know when tools are unavailable (Constitution I.3).

| State | Tools Panel Display |
|-------|---------------------|
| Available | List of applicable tools |
| Unavailable | "Install debrief-calc" guidance |
| Error | Error message with retry button |

### Progress Reporting

**Decision**: MCP progress notifications + VS Code `withProgress` API

**Rationale**: Native VS Code notification UI with cancel button. Progress token enables server-side cancellation.

### Error Handling

**Decision**: Typed errors with exponential backoff (1s base, 3 retries max) and circuit breaker

**Rationale**: Different error types require different responses. Circuit breaker prevents overwhelming struggling service.

| Error Type | Recovery |
|------------|----------|
| Timeout (-32001) | Retry with backoff |
| Connection closed (-32000) | Reconnect, then retry |
| Tool not found | Show error, no retry |
| Execution error | Show error, allow manual retry |

---

## 5. Existing Service Integration Patterns

Based on existing debrief service implementations:

### debrief-config Integration

From Stage 3 spec, TypeScript library provides:
- `readConfig()`: Get current configuration
- `getStores()`: List registered STAC stores
- XDG-compliant paths on all platforms

### debrief-stac Integration

From Stage 1, STAC operations via:
- `listCatalogs()`: Enumerate catalogs in a store
- `getCatalog(path)`: Load catalog metadata
- `getItem(catalogPath, itemId)`: Load plot item

### debrief-calc Integration

From Stage 5, MCP-based tools:
- `list_tools()`: Discover available tools
- `run_tool(name, features, params)`: Execute tool
- Progress notifications via MCP protocol

---

## Summary Table

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| Webview state | Three-tier persistence | Balance memory vs UX |
| Communication | Typed messages + request IDs | Type safety, async correlation |
| CSP | Restrictive with nonces | Security requirement |
| Map rendering | Canvas + CircleMarkers | Performance for 10k points |
| Layer management | Custom LayerManager | Separation of concerns |
| Selection | Leaflet events + modifiers | Native interaction model |
| PNG export | leaflet-image | Offline-capable, CSP-compliant |
| Explorer integration | FileSystemProvider | Native VS Code patterns |
| Sidebar panels | TreeDataProvider | Custom analysis controls |
| MCP client | Lazy singleton + STDIO | Offline-first, efficient |
| Tool caching | 60s TTL client-side | Responsive UX |
| Error handling | Backoff + circuit breaker | Resilience |

---

## References

- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code FileSystemProvider](https://code.visualstudio.com/api/extension-guides/virtual-documents)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [leaflet-image](https://github.com/mapbox/leaflet-image)
- [esbuild for VS Code Extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
