# Changelog

All notable changes to the Debrief VS Code Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-15

### Added

- **STAC Store Management**
  - Register local STAC catalogs as virtual folders in Explorer
  - Browse catalogs and plots in tree view
  - Validate store paths on registration
  - Handle invalid/moved store paths gracefully

- **Map Display**
  - Leaflet-based interactive map in webview panel
  - Render vessel tracks as polylines with color coding
  - Display reference locations as point markers
  - Track labels at start points
  - Tooltips on hover showing track metadata
  - Floating toolbar (zoom in, zoom out, fit bounds, export)
  - Scale control on map

- **Selection System**
  - Single-click selection
  - Shift+click multi-select
  - Ctrl/Cmd+click toggle selection
  - Click empty space to clear
  - Animated glow effect on selected tracks
  - Selection shown in VS Code Outline panel

- **Time Range Control**
  - Sidebar view for time range filtering
  - Full Range and Fit to Selection buttons
  - Time extent display from plot data

- **Analysis Tools**
  - Tool discovery via debrief-calc MCP
  - Context-sensitive tool filtering
  - Tool execution with progress notification
  - Result layer display with dashed styling
  - Layer visibility toggle
  - Clear all results function

- **Layer Management**
  - Source data layers (tracks, locations)
  - Result layers from tool execution
  - Visibility checkboxes per layer
  - Layer removal

- **User Experience**
  - Welcome view with recent plots
  - Command Palette commands with keyboard shortcuts
  - VS Code settings integration
  - Recent plots tracking

- **Configuration**
  - Selection glow effect toggle
  - Custom track color palette
  - Map renderer selection (canvas/svg)
  - Python path for debrief-calc
  - Connection timeout settings

### Technical

- TypeScript 5.x with strict mode
- esbuild for dual-target bundling (extension host + webview)
- Vitest for unit testing
- VS Code Extension API best practices
- Webview state persistence
- Message-based extension ↔ webview communication

[Unreleased]: https://github.com/debrief/debrief-future/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/debrief/debrief-future/releases/tag/v0.1.0
