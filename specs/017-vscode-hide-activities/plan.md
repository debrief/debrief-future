# Implementation Plan: VS Code Extension Hide Default Activities

**Branch**: `017-vscode-hide-activities` | **Date**: 2026-01-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-vscode-hide-activities/spec.md`

## Summary

Configure the Debrief VS Code extension to hide non-essential activity bar items (Search, Source Control, Debug, Extensions, Testing) on activation, leaving only Explorer and Debrief visible. Implementation uses VS Code settings manipulation of `workbench.activity.pinnedViewlets2` since no direct extension API exists for this purpose.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code Extension)
**Primary Dependencies**: @vscode/api ^1.85.0
**Storage**: VS Code `context.globalState` for initialization tracking, user settings for visibility config
**Testing**: Vitest (unit), @vscode/test-electron (integration)
**Target Platform**: VS Code Desktop 1.85+ (Windows, macOS, Linux)
**Project Type**: VS Code Extension (part of monorepo)
**Performance Goals**: Activity hiding completes during extension activation (<100ms)
**Constraints**: Offline-capable, must not break hidden activities, user overrides respected
**Scale/Scope**: Single service class, ~150-200 LOC

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | PASS | All operations local to VS Code settings |
| I.2 | No cloud dependencies | PASS | No network calls |
| I.3 | No silent failures | PASS | Logs activation; visibility is observable |
| I.4 | Reproducibility | PASS | Same settings = same result |
| IV.1 | Services never touch UI | N/A | This is frontend code, not a service |
| VI.2 | Services require unit tests | PASS | ActivityBarService will have unit tests |
| VII.1 | Tests before implementation | PLAN | Test file created first |
| VIII.1 | Specs before code | PASS | spec.md exists |

**Gate Status**: PASS - No violations. All applicable articles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/017-vscode-hide-activities/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Configuration schema
├── quickstart.md        # Developer getting started
├── contracts/           # (empty - no external APIs)
├── media/               # Blog post drafts
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/vscode/
├── package.json                          # Add settings schema (debrief.hideActivities.*)
├── src/
│   ├── extension.ts                      # Initialize ActivityBarService early
│   └── services/
│       ├── activityBarService.ts         # NEW: Core hiding logic
│       └── activityBarService.test.ts    # NEW: Unit tests
└── test/
    └── integration/
        └── activityBar.test.ts           # NEW: Integration tests
```

**Structure Decision**: Extension of existing VS Code extension. New service follows existing `services/` pattern. Tests follow existing Vitest pattern.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

None - backend/infrastructure feature

This feature modifies VS Code extension behavior only. No visual React components are created or modified. The activity bar is controlled via VS Code's native APIs, not custom UI.

## Complexity Tracking

> No violations to justify. Implementation is straightforward.

## Implementation Phases

### Phase 1: Core Service (P1 Stories)

1. **Create ActivityBarService class**
   - `applyDefaults()` - hide target activities on first run
   - `isEnabled()` - check `debrief.hideActivities.enabled`
   - `getTargetViewIds()` - get list of activities to hide
   - `detectUserOverrides()` - compare current vs last-applied state

2. **Add configuration schema to package.json**
   - `debrief.hideActivities.enabled` (boolean, default: true)
   - `debrief.hideActivities.viewIds` (string[], default: standard list)

3. **Integrate into extension activation**
   - Initialize service before tree providers
   - Call `applyDefaults()` if enabled

### Phase 2: User Override Support (P2 Story)

1. **Track initialization state**
   - Use `context.globalState` to track first run
   - Store last-applied visibility snapshot

2. **Preserve user changes**
   - On subsequent activations, detect if user re-enabled items
   - Don't re-hide user-enabled items

3. **Add restore command**
   - `Debrief: Restore Default Activities`
   - Resets to VS Code defaults

### Phase 3: Testing

1. **Unit tests for ActivityBarService**
   - Mock VS Code configuration API
   - Test enable/disable toggle
   - Test user override detection

2. **Integration tests**
   - Extension activation with hiding
   - Settings persistence across reload
   - Restore command functionality

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| VS Code 1.85+ | Runtime | `workbench.activity.pinnedViewlets2` support |
| 006-speckit-vscode-extension | Parent | Debrief extension this feature extends |

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| VS Code changes internal setting name | Feature breaks | Low | Log warning if setting not found; degrade gracefully |
| User confusion at hidden activities | UX | Medium | Welcome message, easy restore path, setting description |
| Conflict with other extensions | Partial failure | Low | Only modify specific view IDs; don't reset all |

## Next Steps

After plan approval:
1. Run `/speckit.tasks` to generate detailed task breakdown
2. Implement `ActivityBarService` with tests
3. Update `package.json` with settings schema
4. Integrate into `extension.ts`
5. Run `/speckit.pr` to create pull request
