## What We're Building

When a maritime analyst opens a plot in VS Code, they currently see the full VS Code activity bar: Explorer, Search, Source Control, Debug, Extensions, Testing. Five of those six activities have nothing to do with analysing ship tracks.

We're configuring the Debrief extension to hide those distractions automatically. When activated, only two activities remain visible: Explorer (for browsing STAC stores and files) and Debrief (for analysis tools, layers, and time control).

The hiding is reversible. Right-click the activity bar to restore any activity. Disable the feature entirely in settings. Power users who occasionally need Source Control can re-enable it; their choice persists across sessions.

## How It Fits

This is the first of several UX simplifications for the VS Code environment. The Debrief extension already registers its own activity with sidebar views for tools and layers. Now we're completing the picture by removing what doesn't belong.

The implementation touches only the extension activation — no changes to core services or schemas. It respects the Constitution's offline requirement (no network calls) and user override principle (user choices stick).

## Key Decisions

- **Settings manipulation over API**: VS Code has no extension API for hiding activities programmatically. We're modifying `workbench.activity.pinnedViewlets2` directly — an internal setting, but stable enough for our purposes
- **First-run only**: Hide activities on first activation, then respect user changes. If someone re-enables Search, we won't hide it again on next launch
- **Configurable list**: Advanced users can customise which activities get hidden via `debrief.hideActivities.viewIds` setting
