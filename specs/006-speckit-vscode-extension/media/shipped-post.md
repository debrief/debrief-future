---
title: "Debrief VS Code Extension: Maritime Analysis in Your Editor"
date: 2026-01-15
author: Debrief Team
category: Release
tags: [vscode, extension, maritime, analysis, stac, leaflet]
---

# Debrief VS Code Extension: Maritime Analysis in Your Editor

We're excited to announce the release of the **Debrief VS Code Extension** - bringing maritime tactical analysis directly into Visual Studio Code.

## What's New

The Debrief extension transforms VS Code into a powerful maritime analysis workstation. Browse your STAC catalogs, visualize vessel tracks on interactive maps, and run analysis tools - all without leaving your editor.

### Key Features

**1. Native STAC Integration**

STAC (SpatioTemporal Asset Catalog) stores appear as virtual folders in VS Code's Explorer panel. Browse catalogs, view plot metadata, and open plots with a double-click.

**2. Interactive Map Display**

Leaflet-powered maps render vessel tracks with smooth performance - even with 10,000+ track points. Hover for track details, customize colors, and export views as PNG.

**3. Intuitive Selection**

Select tracks using familiar patterns: click for single selection, Shift+click to add, Ctrl+click to toggle. Selected tracks glow with a subtle animated effect.

## Technical Highlights

- **TypeScript throughout** with strict mode enabled
- **esbuild** for fast, dual-target bundling
- **Vitest** for comprehensive unit test coverage
- **Canvas rendering** for smooth 10,000+ point performance
- **Webview state persistence** for seamless session restore

## Installation

Search for "Debrief Maritime Analysis" in the VS Code Extensions marketplace, or install from VSIX:

```bash
code --install-extension debrief-vscode-0.1.0.vsix
```

## Getting Started

1. Click the + button in STAC Stores to register your catalog
2. Double-click a plot to open the map view
3. Click tracks to select them
4. Use the toolbar to zoom, pan, and fit bounds

## What's Next

This release establishes the foundation for the Debrief analysis platform in VS Code. Future updates will bring:

- Analysis tool integration via MCP protocol
- Timeline visualization component
- Result layer overlays
- Cloud STAC catalog support

## Resources

- [Documentation](https://debrief.info/docs/vscode)
- [GitHub Repository](https://github.com/debrief/debrief-future)
- [Issue Tracker](https://github.com/debrief/debrief-future/issues)

---

The Debrief VS Code Extension represents Stage 6 of our tracer bullet delivery - the display and interaction layer that brings the entire platform together. We're excited to see how the maritime analysis community puts it to use.

*Try it today and let us know what you think!*
