# Research: VS Code Extension Hide Default Activities

**Feature**: 017-vscode-hide-activities
**Date**: 2026-01-23

## Phase 0 Research Summary

This document captures research findings for implementing activity bar visibility control in the Debrief VS Code extension.

---

## Research Topic 1: VS Code Activity Bar Visibility API

### Decision: Use `workbench.activity.pinnedViewlets2` setting manipulation

### Rationale

VS Code does not provide a direct extension API for hiding other extensions' or built-in activity bar items. However, extensions can programmatically modify workspace/user settings, including the internal `workbench.activity.pinnedViewlets2` setting which controls activity visibility.

**Key findings:**
1. No direct `vscode.` API exists for hiding specific activities
2. The `workbench.activity.pinnedViewlets2` is a JSON object storing visibility state per view
3. Extensions can update this via `vscode.workspace.getConfiguration().update()`
4. User can override by right-clicking activity bar items

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Settings manipulation** | Works, respects user overrides | Uses internal setting | **Selected** |
| Wait for official API | Clean, supported | No timeline, may never exist | Rejected |
| Entirely hide activity bar | Simple | Too aggressive, loses Explorer | Rejected |
| Custom workspace config | Portable | Only works in specific workspaces | Rejected |

### Sources

- [VS Code Activity Bar Guidelines](https://code.visualstudio.com/api/ux-guidelines/activity-bar)
- [VS Code GitHub Issue #113757](https://github.com/microsoft/vscode/issues/113757) - Closed 2021
- [VS Code Custom Layout Docs](https://code.visualstudio.com/docs/configure/custom-layout)

---

## Research Topic 2: Activity Bar View Identifiers

### Decision: Target specific view IDs for hiding

### Rationale

VS Code uses specific identifiers for built-in activities. To hide them programmatically, we need the exact IDs:

| Activity | View ID | Source |
|----------|---------|--------|
| Explorer | `workbench.view.explorer` | Keep visible |
| Search | `workbench.view.search` | Hide |
| Source Control | `workbench.view.scm` | Hide |
| Run and Debug | `workbench.view.debug` | Hide |
| Extensions | `workbench.view.extensions` | Hide |
| Testing | `workbench.view.testing` | Hide |

**Note**: The when-clause context for SCM is `workbench.scm` but the view ID is `workbench.view.scm`.

### Implementation Pattern

```typescript
// Structure of workbench.activity.pinnedViewlets2
interface PinnedViewlet {
  id: string;      // e.g., "workbench.view.search"
  pinned: boolean;
  visible: boolean;
  order: number;
}

// Extension sets visibility to false for target views
const config = vscode.workspace.getConfiguration();
const pinnedViewlets = config.get('workbench.activity.pinnedViewlets2');
// Modify visibility for each target ID
await config.update('workbench.activity.pinnedViewlets2', modifiedViewlets, vscode.ConfigurationTarget.Global);
```

---

## Research Topic 3: User Override Behavior

### Decision: Read existing settings before applying defaults; respect user choices

### Rationale

Per FR-009, the extension must respect user overrides. The implementation should:

1. **On first activation**: Apply default hiding behavior
2. **On subsequent activations**: Check if user has manually re-enabled any activity
3. **Track user changes**: Store a "last known state" to detect manual changes
4. **Setting to disable**: Provide `debrief.hideActivities.enabled` setting (default: true)

### Implementation Pattern

```typescript
// Check if feature is enabled
const debriefConfig = vscode.workspace.getConfiguration('debrief');
const hideActivitiesEnabled = debriefConfig.get('hideActivities.enabled', true);

if (!hideActivitiesEnabled) {
  // User disabled the feature - don't modify any visibility
  return;
}

// Check for first-run vs subsequent run
const hasRunBefore = context.globalState.get('hideActivities.initialized', false);
if (!hasRunBefore) {
  // First run: apply default hiding
  await hideDefaultActivities();
  await context.globalState.update('hideActivities.initialized', true);
}
```

---

## Research Topic 4: Existing Extension Patterns

### Decision: Follow existing Debrief extension activation patterns

### Rationale

The Debrief extension (`apps/vscode/src/extension.ts`) already uses:
- `vscode.commands.executeCommand('setContext', ...)` for UI state
- Service classes for configuration (`ConfigService`)
- Context subscriptions for cleanup

The activity hiding logic should:
1. Be implemented as a new service: `ActivityBarService`
2. Be initialized early in `activate()` (before tree providers)
3. Use `setContext` to communicate hiding state if needed for UI

### Pattern from existing code

```typescript
// From extension.ts - follow this pattern
await vscode.commands.executeCommand('setContext', 'debrief.plotOpen', false);

// New for activity hiding
const activityBarService = new ActivityBarService(context);
await activityBarService.applyDefaults();
```

---

## Research Topic 5: Offline Capability

### Decision: All hiding logic is local; no network dependency

### Rationale

Per FR-010 and Constitution Article I (Defence-Grade Reliability), the feature must work offline. Activity bar visibility is:
- Stored in local VS Code settings
- Modified via synchronous API calls
- No external service dependencies

**Verification**: The implementation will not make any network calls. All settings are local file operations managed by VS Code.

---

## Research Topic 6: Reversibility and Safety

### Decision: Hidden activities remain functional; provide restore mechanism

### Rationale

Per FR-011, hidden activities must work normally when re-enabled. VS Code's native behavior ensures this:
- Hiding via settings doesn't unload the extension
- Activities remain in memory and functional
- User can re-enable via right-click at any time

**Restore options**:
1. Right-click activity bar → Show hidden items
2. Command Palette → `Debrief: Restore Default Activities`
3. Settings → `debrief.hideActivities.enabled: false`

---

## Unresolved Questions

None. All NEEDS CLARIFICATION items from the spec have been resolved through research.

---

## Technology Decisions Summary

| Aspect | Decision |
|--------|----------|
| API approach | Settings manipulation (`workbench.activity.pinnedViewlets2`) |
| View IDs | Standard VS Code identifiers (see table above) |
| User overrides | Detect and respect via state comparison |
| Toggle setting | `debrief.hideActivities.enabled` (boolean, default: true) |
| Implementation | `ActivityBarService` class in `apps/vscode/src/services/` |
| Offline | Fully local; no network calls |
