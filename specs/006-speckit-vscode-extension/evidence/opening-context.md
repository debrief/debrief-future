## What We're Building

A VS Code extension that brings Debrief maritime tactical analysis directly into the editor where analysts already work. The core workflow is browse, display, select, analyze, view: browse STAC catalogs in Explorer, display plots on interactive Leaflet maps, select tracks and reference locations, discover applicable analysis tools via MCP, execute tools, and view computed results as overlay layers.

This is stage 6 of our tracer bullet delivery — the display and interaction layer that pulls together everything we've built so far. It connects debrief-config for store locations, debrief-stac for catalog operations, and debrief-calc for analysis tools into a unified experience.

## How It Fits

The architecture principle remains "thick services, thin frontends." The extension contains zero domain logic — it's pure orchestration. Analysis happens in debrief-calc. Data operations happen in debrief-stac. Configuration lives in debrief-config. The extension just wires these together with VS Code's native patterns.

STAC stores appear as virtual folders in Explorer via FileSystemProvider. Double-click or drag a plot to open it. The sidebar contains analysis controls: time range filtering, context-sensitive tools, and layer management. Maps render in webview panels using Leaflet with canvas rendering for 10k+ track points without lag.

This separation means scientists can improve analysis algorithms without touching the extension, and extension developers can improve UX without understanding geodetic calculations.

## Key Decisions

**Leaflet with canvas renderer** — We need to display plots with 10,000+ track points. SVG hits performance walls around 1,000 elements. Canvas rendering gets us to 100k before we'd need WebGL. Leaflet is lightweight, well-documented, and has a mature plugin ecosystem for features like PNG export.

**FileSystemProvider for STAC stores** — Rather than building a custom tree view for catalog browsing, STAC stores appear as read-only virtual folders in VS Code's Explorer panel. This leverages familiar patterns: double-click to open, drag to editor, right-click context menus. Command palette provides search across all stores.

**Three-tier state persistence** — Webview state is notoriously tricky in VS Code. We're using `getState()`/`setState()` for within-session persistence (map position survives tab hiding), `WebviewPanelSerializer` for cross-session restoration, and avoiding `retainContextWhenHidden` except where absolutely necessary due to memory overhead.

**MCP client for tool discovery** — The extension connects to debrief-calc via Model Context Protocol over local STDIO. Tools are cached client-side with 60-second TTL. Selection changes trigger instant filtering of applicable tools without round-trips. If debrief-calc isn't available, the extension still works for browsing and display — tools just show as unavailable.

**Selection glow effect** — Selected tracks get an animated glow effect for clear visual feedback without obscuring geometry. This can be disabled in settings for performance-sensitive environments.
