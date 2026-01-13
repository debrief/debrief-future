# Usage Example: Loader Mini-App

**Feature**: 004-loader-mini-app
**Date**: 2026-01-12

## Overview

The Debrief Loader is an Electron application that orchestrates file loading into STAC catalog plots. This document demonstrates the primary workflow.

## Prerequisites

1. At least one STAC store configured in debrief-config
2. A REP file to load
3. Python services available (debrief-io, debrief-stac)

## Workflow: Load File into New Plot

### Step 1: Open File with Loader

Right-click a `.rep` file in your file manager and select "Open with Debrief Loader".

The application launches showing the file being loaded:

```
┌─────────────────────────────────────────────┐
│  Debrief Loader                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Loading: exercise-data.rep                 │
│  ─────────────────────────────              │
│                                             │
│  Select destination store:                  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ ○ Local Analysis Store              │    │
│  │   /home/user/debrief/local-catalog  │    │
│  │   3 plots                           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│                     [ Cancel ]  [ Next > ]  │
└─────────────────────────────────────────────┘
```

### Step 2: Select Store

Click on the desired store to select it, then click "Next".

### Step 3: Configure Plot

On the plot configuration screen, you can either:
- **Add to Existing**: Select an existing plot from the list
- **Create New**: Enter a name for a new plot

```
┌─────────────────────────────────────────────┐
│  Loading: exercise-data.rep                 │
│  Store: Local Analysis Store                │
│  ─────────────────────────────              │
│                                             │
│  ┌──────────────────┬─────────────┐         │
│  │ Add to Existing  │ Create New  │         │
│  ├──────────────────┴─────────────┴────┐    │
│  │                                     │    │
│  │  Plot name:                         │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │ Exercise Bravo Analysis     │    │    │
│  │  └─────────────────────────────┘    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│              [ < Back ]  [ Cancel ] [ Load ]│
└─────────────────────────────────────────────┘
```

### Step 4: Processing

Click "Load" to begin processing. The application shows progress:

```
┌─────────────────────────────────────────────┐
│                Processing                   │
│                                             │
│  ████████████████░░░░░░░░░░░░░  60%        │
│                                             │
│           Adding features...                │
└─────────────────────────────────────────────┘
```

### Step 5: Complete

On success, the application displays the result:

```
┌─────────────────────────────────────────────┐
│                    ✓                        │
│             Load Complete                   │
│                                             │
│  Successfully loaded 45 features into       │
│  "Exercise Bravo Analysis"                  │
│                                             │
│  Store: Local Analysis Store                │
│  ✓ Provenance recorded                      │
│                                             │
│              [ Close ]                      │
└─────────────────────────────────────────────┘
```

## Workflow: First-Time Setup

If no stores are configured, the application guides users through creating one:

```
┌─────────────────────────────────────────────┐
│                   📦                        │
│           No stores configured              │
│                                             │
│  You need at least one STAC store to save   │
│  your data.                                 │
│                                             │
│       [ Create local store ]                │
│       [ Connect to remote (coming soon) ]   │
└─────────────────────────────────────────────┘
```

Clicking "Create local store" opens a form to create a new STAC catalog.

## Error Handling

If an error occurs, the application displays actionable guidance:

```
┌─────────────────────────────────────────────┐
│                    ⚠                        │
│                  Error                      │
│                                             │
│  Failed to parse file: Invalid format       │
│  at line 42                                 │
│                                             │
│  Suggested resolution:                      │
│  Check that the file is a valid REP format  │
│                                             │
│              [ Close ]                      │
└─────────────────────────────────────────────┘
```

## Key Features

- **Two-step wizard**: Store selection → Plot configuration
- **Full provenance**: Every load records source, parser, and timestamp
- **File association**: Open REP files directly from OS file manager
- **I18N ready**: All strings externalized for translation
- **Accessibility**: Keyboard navigation and ARIA labels throughout
