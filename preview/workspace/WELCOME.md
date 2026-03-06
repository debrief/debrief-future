# Welcome to the Debrief Extension Preview

You are viewing a **browser-based preview** of the Debrief VS Code extension. This environment runs [code-server](https://github.com/coder/code-server) with the extension pre-installed and sample maritime data ready to explore.

## Getting Started

### 1. Explore the STAC Catalog

The sidebar contains the **STAC Explorer** panel. Click the Debrief icon in the activity bar (left side) to open it. You should see:

- **Exercise Alpha** — Naval exercise south of Plymouth with vessel tracks
- **Training Run 1** — Training scenario with track data

Click on an item to load it into the map view.

### 2. View Tracks on the Map

Once a plot is loaded, the **Map View** panel opens showing vessel tracks on an interactive Leaflet map. You can:

- Pan and zoom the map
- Click on tracks to select them
- Use the time controller to scrub through the timeline

### 3. Open REP Files

The `samples/` directory contains REP (Replay) format files:

- `boat1.rep` — Detailed vessel track
- `boat2.rep` — Second vessel track
- `shapes.rep` — Shape and annotation data
- `narrative.rep` — Text annotations
- `example-track.rep` — Two-vessel crossing course scenario

Right-click a `.rep` file and select **Debrief: Load File** to import it.

### 4. Check the Activity Panel

The activity bar also provides:

- **Layers** — Toggle track visibility, adjust styling
- **Tools** — Available analysis tools for selected data
- **Log** — Execution history and parameter tuning

## What to Review

If you're reviewing a PR, focus on:

1. **New or changed features** described in the PR description
2. **Extension activation** — Does the Debrief icon appear in the activity bar?
3. **Map rendering** — Do tracks display correctly on the map?
4. **Data loading** — Can you open sample files without errors?

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not visible in sidebar | Wait 10-15 seconds for extensions to activate, then reload |
| Map view is blank | Try loading a different sample file |
| Errors in notifications | Check the PR's CI status for build issues |

## About This Environment

- **Platform**: code-server (VS Code in the browser)
- **Extension**: Built from the PR branch
- **Data**: Sample STAC catalogs and REP files
- **Lifecycle**: This environment is ephemeral — it will be destroyed when the PR is closed or merged
