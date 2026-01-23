# Quickstart: VS Code Extension Hide Default Activities

**Feature**: 017-vscode-hide-activities
**Date**: 2026-01-23

## Overview

This feature adds automatic activity bar simplification to the Debrief VS Code extension. On activation, only Explorer and Debrief activities remain visible.

---

## Quick Setup

1. **Install/Update Debrief Extension**
   - The feature is built into the Debrief VS Code extension
   - No additional installation required

2. **Automatic Activation**
   - Open a workspace with STAC files or Debrief content
   - The extension activates and hides non-essential activities
   - Only Explorer and Debrief remain in the activity bar

---

## Configuration

### Disable Activity Hiding

If you prefer all default activities visible:

```json
// settings.json
{
  "debrief.hideActivities.enabled": false
}
```

### Customize Hidden Activities

For advanced users who want to keep specific activities:

```json
// settings.json
{
  "debrief.hideActivities.viewIds": [
    "workbench.view.search",
    "workbench.view.debug"
    // Removed: scm, extensions, testing - these will remain visible
  ]
}
```

---

## Restoring Hidden Activities

### Method 1: Right-Click Activity Bar
1. Right-click any visible activity bar item
2. Check the activities you want to show

### Method 2: Command Palette
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `Debrief: Restore Default Activities`

### Method 3: Settings
1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "debrief hide"
3. Uncheck "Hide Activities Enabled"

---

## Development Setup

### Prerequisites
- Node.js 18+
- VS Code 1.85+
- pnpm (for monorepo)

### Build & Test

```bash
# From repository root
cd apps/vscode

# Install dependencies
pnpm install

# Compile
pnpm run compile

# Run tests
pnpm test

# Launch extension in dev mode
# Press F5 in VS Code
```

### Key Files

| File | Purpose |
|------|---------|
| `src/services/activityBarService.ts` | Activity hiding logic |
| `src/extension.ts` | Service initialization |
| `package.json` | Settings schema, contribution points |

---

## Testing the Feature

### Manual Test Steps

1. **Verify hiding on first activation**
   - Start with fresh VS Code profile (or reset extension state)
   - Install/enable Debrief extension
   - Open a Debrief workspace
   - Expected: Only Explorer and Debrief in activity bar

2. **Verify user override persistence**
   - Right-click activity bar, show "Source Control"
   - Reload VS Code
   - Expected: Source Control remains visible

3. **Verify disable setting**
   - Set `debrief.hideActivities.enabled: false`
   - Reload VS Code
   - Expected: All default activities visible

4. **Verify offline operation**
   - Disconnect from network
   - Activate extension
   - Expected: Hiding works without network

---

## Troubleshooting

### Activities not hiding

1. Check `debrief.hideActivities.enabled` is `true` (default)
2. Ensure extension is activated (check Output > Debrief)
3. Try `Developer: Reload Window` command

### Hidden activity needed temporarily

Right-click the activity bar and check the item you need. It will remain visible until you choose to hide it again.

### Reset to defaults

1. Open Settings
2. Search for `workbench.activity.pinnedViewlets2`
3. Delete the setting (reset to default)
4. Set `debrief.hideActivities.enabled: false` then back to `true`
5. Reload window
