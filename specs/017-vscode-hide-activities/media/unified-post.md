---
title: "Building Focused Analysis Environment"
date: 2026-01-23
layout: future-post
author: Ian
track: momentum
excerpt: "VS Code activity bar now shows only what matters for maritime analysis"
tags:
  - ux
---

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

The Debrief VS Code extension now automatically hides non-essential activity bar items when it activates. Instead of seeing Explorer, Search, Source Control, Debug, Extensions, and Testing, analysts see just two activities: **Explorer** (for browsing STAC stores) and **Debrief** (for analysis tools).

Five distractions removed. Zero functionality lost. The hidden activities still work if you need them — right-click the activity bar to restore any of them.

## How It Works

On first activation, the extension modifies VS Code's `workbench.activity.pinnedViewlets2` setting to hide:
- Search
- Source Control
- Run and Debug
- Extensions
- Testing

The hiding is **reversible** and **respects user choice**:
- Right-click activity bar → Show hidden activities
- Command Palette → `Debrief: Restore Default Activities`
- Settings → `debrief.hideActivities.enabled: false`

If you re-enable an activity manually, it stays visible on subsequent launches. We track your choices and don't override them.

## Technical Details

The implementation adds an `ActivityBarService` that:
1. Checks if hiding is enabled (default: yes)
2. Checks if this is the first run
3. Modifies visibility for target activities only
4. Stores a snapshot to detect user overrides later

**76 tests pass**, including tests for:
- First-run hiding behavior
- Protected views (Explorer and Debrief never hidden)
- User override detection
- Restore command functionality

All operations are local. No network calls. Works completely offline.

## Configuration

```json
{
  "debrief.hideActivities.enabled": true,
  "debrief.hideActivities.viewIds": [
    "workbench.view.search",
    "workbench.view.scm",
    "workbench.view.debug",
    "workbench.view.extensions",
    "workbench.view.testing"
  ]
}
```

Advanced users can customize which activities get hidden.

## What's Next

This is the first of several UX improvements for the analysis environment. Next up: workspace configuration and panel layouts that make better use of screen real estate for map-centric workflows.

> [View the PR](https://github.com/debrief/debrief-future/pull/XX) | [Read the spec](https://github.com/debrief/debrief-future/blob/main/specs/017-vscode-hide-activities/spec.md)
