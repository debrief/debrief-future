## What We're Building

The ability to drag a REP file from VS Code's file explorer directly onto the map panel, and have the track data appear. No wizards, no dialogs — just drop and see.

This sounds simple, but it's the kind of flow that makes tools feel native rather than bolted-on. Analysts receive new data files constantly. Getting that data into a plot should take seconds, not minutes of clicking through import dialogs.

We're also adding a right-click "Load into Debrief..." option for cases where you want to pick the destination plot explicitly. Same import, different trigger.

## How It Fits

This builds on three services we've already shipped: debrief-io for parsing REP files, debrief-stac for catalog storage, and the VS Code extension's map panel. The loader mini-app already handles file loading via Electron — this brings that capability directly into the editor where analysts already spend their time.

The architecture is deliberately simple: the extension orchestrates, the Python services do the work. No new parsing code, no new storage logic. Just wiring.

## Key Decisions

- **Drag-drop uses HTML5 events in the webview** — VS Code's tree drag-drop API only handles tree-to-tree operations, so we use standard browser APIs for the map panel.

- **Duplicate detection by filename** — If you try to import a file that's already an asset on the plot, you get a warning. We considered content hashing but it's overkill for single-file imports.

- **Two-step picker for context menu** — First select catalog, then select plot. Mirrors the loader mini-app pattern. Uses VS Code's native QuickPick so it's keyboard-navigable.

- **Auto-zoom after import** — The map adjusts bounds to show the newly imported tracks. Small touch, but it answers "did it work?" immediately.
