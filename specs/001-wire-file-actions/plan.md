# Implementation Plan: Wire Up File Actions

**Branch**: `001-wire-file-actions` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-wire-file-actions/spec.md`

## Summary

Wire the existing `AssociatedFilesDropdown` UI actions (open, openWith, reveal, delete) through the ActivityPanel component to VS Code extension host handlers. The UI components exist and function correctly; this feature completes the callback chain and implements the file operations using VS Code APIs.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension and webview)
**Primary Dependencies**: VS Code Extension API ^1.85.0, React 18.x, @debrief/shared-components
**Storage**: Local filesystem (via VS Code workspace.fs API)
**Testing**: Vitest (unit), VS Code Extension Test (integration)
**Target Platform**: VS Code Desktop (primary), VS Code Web (limited functionality)
**Project Type**: VS Code extension with React webviews
**Performance Goals**: File operations complete within 1 second (SC-001)
**Constraints**: Web client cannot access local filesystem; must show informational modal
**Scale/Scope**: Single file operations; batch operations out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Defence-Grade Reliability** | PASS | Offline-compatible; no network required for file ops |
| **I.3 No silent failures** | PASS | Error messages for all failure scenarios (FR-007) |
| **III. Data Sovereignty** | PASS | Local file operations only; no external calls |
| **III.2 Source preservation** | CAUTION | Delete action removes files; confirmation required (FR-005) |
| **IV. Architectural Boundaries** | PASS | UI in webview, logic in extension host |
| **IV.1 Services never touch UI** | PASS | Extension returns results via messages |
| **VI. Testing** | PASS | Unit and integration tests defined in quickstart.md |
| **VIII. Documentation** | PASS | Spec, research, data-model, quickstart complete |
| **IX. Dependencies** | PASS | Uses VS Code API only; no new dependencies |

**Post-Design Re-check**: All gates pass. Delete operation includes mandatory confirmation dialog satisfying III.2.

## Project Structure

### Documentation (this feature)

```text
specs/001-wire-file-actions/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Data structures and relationships
├── quickstart.md        # Implementation guide
├── contracts/
│   └── messages.ts      # Message type contracts
├── checklists/
│   └── requirements.md  # Quality validation
└── media/               # Blog/LinkedIn content (Phase 2)
```

### Source Code (repository root)

```text
# Files to modify
apps/vscode/
├── src/
│   ├── webview/
│   │   ├── types.ts                    # Add FileActionMessage to union
│   │   └── web/
│   │       └── activityPanel.tsx       # Add onFileAction handler
│   └── views/
│       └── activityPanelView.ts        # Add message handler + file ops
└── src/test/
    └── integration/
        └── fileActions.test.ts         # Integration tests (new)

shared/components/
└── src/
    └── ActivityPanel/
        └── ActivityPanel.tsx           # Add onFileAction prop
```

**Structure Decision**: Modifications only; no new directories. Extends existing VS Code extension architecture.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| AssociatedFilesDropdown | `shared/components/src/LayersToolbar/AssociatedFilesDropdown.stories.tsx` | `files-dropdown.js` | Demonstrates file action menu |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change (actions now functional)
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/layerstoolbar-associatedfilesdropdown--default`

## Storybook E2E Testing

*Identify which Storybook stories require automated Playwright tests.*

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `AssociatedFilesDropdown.stories.tsx` | Rendering, menu display | light, dark, vscode | click dropdown, select action |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/AssociatedFilesDropdown.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=layerstoolbar-associatedfilesdropdown--default&globals=theme:light
/iframe.html?id=layerstoolbar-associatedfilesdropdown--default&globals=theme:dark
/iframe.html?id=layerstoolbar-associatedfilesdropdown--default&globals=theme:vscode
```

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
