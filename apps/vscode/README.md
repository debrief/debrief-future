# Debrief VS Code Extension

Maritime tactical analysis extension for Visual Studio Code. Browse STAC catalogs, display plots on interactive maps, select data elements, and run analysis tools.

## Features

- **Browse STAC Catalogs**: View registered STAC stores in the Explorer panel with virtual folders
- **Interactive Map Display**: Display vessel tracks and reference locations on Leaflet maps
- **Track Selection**: Click, Shift+click, and Ctrl+click to select tracks for analysis
- **Analysis Tools**: Discover and execute context-sensitive analysis tools via debrief-calc
- **Result Layers**: View computed analysis results as overlay layers on the map
- **Time Filtering**: Filter visible data by time range
- **Export**: Export map views as PNG images

## Requirements

- VS Code 1.85.0 or later
- Node.js 18+ (for development)
- Python 3.11+ with debrief-calc (optional, for analysis tools)

## Installation

### From Marketplace

Search for "Debrief Maritime Analysis" in the VS Code Extensions marketplace.

### From VSIX

1. Download the `.vsix` file from the releases page
2. In VS Code, open Command Palette (`Ctrl+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded file

## Getting Started

1. **Add a STAC Store**: Click the + button in the STAC Stores panel or run `Debrief: Add STAC Store`
2. **Open a Plot**: Double-click a plot in the Explorer or use `Debrief: Open Plot`
3. **Select Tracks**: Click tracks on the map to select them
4. **Run Analysis**: Choose a tool from the Tools panel and click Execute

## Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Debrief: Open Plot` | Open a plot from STAC stores | `Ctrl+Shift+O` |
| `Debrief: Add STAC Store` | Register a new STAC catalog | - |
| `Debrief: Select All Tracks` | Select all tracks in current plot | `Ctrl+A` |
| `Debrief: Clear Selection` | Clear current selection | `Escape` |
| `Debrief: Fit to All Tracks` | Zoom map to fit all tracks | `Ctrl+0` |
| `Debrief: Export as PNG` | Export current map view | - |

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `debrief.selection.glowEffect` | Enable animated glow on selected tracks | `true` |
| `debrief.tracks.defaultColors` | Color palette for tracks | 8 colors |
| `debrief.map.renderer` | Map renderer (canvas/svg) | `canvas` |
| `debrief.calc.pythonPath` | Python path for debrief-calc | `python` |
| `debrief.recentPlots.maxCount` | Maximum recent plots to remember | `10` |

## Extension Settings

This extension contributes the following settings:

* `debrief.selection.glowEffect`: Enable/disable the animated glow effect on selected tracks
* `debrief.tracks.defaultColors`: Array of hex colors for automatic track coloring
* `debrief.map.renderer`: Choose between Canvas (faster) or SVG rendering
* `debrief.calc.pythonPath`: Path to Python executable for debrief-calc integration
* `debrief.calc.connectionTimeout`: MCP connection timeout in milliseconds

## Known Issues

- PNG export requires the leaflet-image library to be loaded
- Time range filtering is currently placeholder functionality

## Release Notes

### 0.1.0

Initial release with core functionality:
- STAC store browsing
- Map display with tracks and locations
- Selection with visual feedback
- Analysis tool discovery and execution
- Layer management

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
