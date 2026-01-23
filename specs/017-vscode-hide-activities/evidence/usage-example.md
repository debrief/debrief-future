# Usage Example: VS Code Hide Activities

**Date**: 2026-01-23
**Feature**: 017-vscode-hide-activities

## Extension Activation Sequence

When the Debrief VS Code extension activates:

1. **ActivityBarService initializes** before other services
2. **First activation**: Hides Search, Source Control, Debug, Extensions, and Testing activities
3. **Subsequent activations**: Respects user overrides (doesn't re-hide manually enabled activities)

```typescript
// From extension.ts
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize activity bar service early (before tree providers)
  // This hides non-essential activities on first activation
  const activityBarService = new ActivityBarService(context);
  await activityBarService.applyDefaults();

  // ... rest of activation
}
```

## Configuration Options

### Enable/Disable Hiding

```json
{
  "debrief.hideActivities.enabled": true
}
```

Set to `false` to prevent automatic hiding.

### Custom View IDs

```json
{
  "debrief.hideActivities.viewIds": [
    "workbench.view.search",
    "workbench.view.scm",
    "workbench.view.debug",
    "workbench.view.extensions",
    "workbench.view.testing"
  ]
}
```

Advanced users can customize which activities to hide.

## Restore Command

Use `Debrief: Restore Default Activities` from the Command Palette to:
- Make all hidden activities visible again
- Reset the initialization state (allowing hiding to re-apply if desired)

## Protected Views

The following activities are **never hidden**, even if added to the viewIds list:
- `workbench.view.explorer` - Essential for file navigation
- Any view containing "debrief" - Debrief's own activity

## Technical Details

### Settings Key

Activity visibility is controlled via the VS Code internal setting:
```
workbench.activity.pinnedViewlets2
```

### State Tracking

| Key | Purpose |
|-----|---------|
| `hideActivities.initialized` | Tracks if hiding has been applied |
| `hideActivities.lastSnapshot` | Stores visibility state for override detection |

### Offline Capability

All operations are local. No network calls are made.
