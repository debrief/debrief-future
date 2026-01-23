# Data Model: VS Code Extension Hide Default Activities

**Feature**: 017-vscode-hide-activities
**Date**: 2026-01-23

## Overview

This feature modifies VS Code workspace settings and extension state. No persistent data model beyond configuration.

---

## Entities

### 1. ActivityVisibilityConfig

User-facing configuration for the feature.

**Location**: `package.json` contributes.configuration

```typescript
interface ActivityVisibilityConfig {
  /** Master toggle for activity hiding behavior */
  'debrief.hideActivities.enabled': boolean;  // default: true

  /** Specific activities to hide (advanced users) */
  'debrief.hideActivities.viewIds': string[];  // default: built-in list
}
```

**Default viewIds to hide**:
- `workbench.view.search`
- `workbench.view.scm`
- `workbench.view.debug`
- `workbench.view.extensions`
- `workbench.view.testing`

---

### 2. PinnedViewlet (VS Code Internal)

VS Code's internal representation of activity bar item state.

**Location**: `workbench.activity.pinnedViewlets2` user setting

```typescript
interface PinnedViewlet {
  id: string;        // e.g., "workbench.view.search"
  pinned: boolean;   // Whether item is pinned (usually true)
  visible: boolean;  // Whether item is visible in activity bar
  order: number;     // Position in activity bar
}

// Full setting structure
type PinnedViewlets = PinnedViewlet[];
```

**Note**: This is a VS Code internal setting. The extension reads/writes it but does not own the schema.

---

### 3. ActivityHidingState (Extension State)

Extension-managed state to track initialization and user changes.

**Location**: `context.globalState` (VS Code extension storage)

```typescript
interface ActivityHidingState {
  /** Has the extension ever applied activity hiding? */
  initialized: boolean;

  /** Timestamp of last settings modification by extension */
  lastModified: number;  // Unix epoch ms

  /** Snapshot of visibility states when extension last modified settings */
  lastAppliedState: Record<string, boolean>;  // viewId -> visible
}

// Storage key
const STATE_KEY = 'debrief.activityHiding';
```

---

## State Transitions

```
                      Extension Activates
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Check hideActivities.enabled │
              └──────────────────────────────┘
                     │              │
                  enabled        disabled
                     │              │
                     ▼              ▼
        ┌────────────────────┐   [No action]
        │  Check initialized  │
        └────────────────────┘
              │          │
          first run    repeat
              │          │
              ▼          ▼
     ┌─────────────┐  ┌──────────────────┐
     │ Apply hiding │  │ Detect user      │
     │ Set init=true│  │ overrides &      │
     └─────────────┘  │ preserve them    │
                      └──────────────────┘
```

---

## Settings Schema

To be added to `apps/vscode/package.json`:

```json
{
  "debrief.hideActivities.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Hide default VS Code activities (Search, Source Control, Debug, Extensions, Testing) on extension activation. Disable to restore all default activities."
  },
  "debrief.hideActivities.viewIds": {
    "type": "array",
    "items": { "type": "string" },
    "default": [
      "workbench.view.search",
      "workbench.view.scm",
      "workbench.view.debug",
      "workbench.view.extensions",
      "workbench.view.testing"
    ],
    "description": "Activity bar view IDs to hide. Advanced: modify to customize which activities are hidden."
  }
}
```

---

## Relationships

```
┌─────────────────────────────────┐
│        VS Code Settings         │
│  (workbench.activity.pinned...) │
└───────────────┬─────────────────┘
                │ reads/writes
                ▼
┌─────────────────────────────────┐
│      ActivityBarService         │
│   (apps/vscode/src/services/)   │
└───────────────┬─────────────────┘
                │ reads
                ▼
┌─────────────────────────────────┐
│  Debrief Extension Config       │
│ (debrief.hideActivities.*)      │
└─────────────────────────────────┘
                │
                │ persists state
                ▼
┌─────────────────────────────────┐
│    Extension Global State       │
│    (context.globalState)        │
└─────────────────────────────────┘
```

---

## Validation Rules

| Rule | Constraint |
|------|------------|
| VR-001 | `hideActivities.enabled` must be boolean |
| VR-002 | `hideActivities.viewIds` must be array of non-empty strings |
| VR-003 | View IDs should follow pattern `workbench.view.*` (warning if not) |
| VR-004 | Explorer (`workbench.view.explorer`) should not be in hidden list (warning) |
