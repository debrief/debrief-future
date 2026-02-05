# Implementation Plan: Load Existing Result Files into Attachments Dropdown

**Branch**: `051-load-result-attachments` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/051-load-result-attachments/spec.md`

## Summary

Enable the VS Code extension to automatically load existing result files from a plot's STAC item assets when the plot is opened. This ensures analysis results persist across sessions by scanning the item's assets for entries with the `result` role or matching filename patterns, transforming them to `AssociatedFile` objects, and displaying them in the Attachments dropdown.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension)
**Primary Dependencies**: VS Code extension API, existing stacService, path module
**Storage**: Local filesystem STAC catalogs (read-only for this feature)
**Testing**: Jest with VS Code extension test utilities
**Target Platform**: VS Code extension
**Project Type**: Single project (VS Code extension monorepo)
**Performance Goals**: < 500ms added load time for 50 result files (per SC-004)
**Constraints**: Offline-capable, no network dependencies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Defence-Grade Reliability | PASS | Offline by default, file-based only |
| II. Schema Integrity | PASS | Uses existing STAC asset schema |
| III. Data Sovereignty | PASS | Read-only, no modification of source data |
| IV. Architectural Boundaries | PASS | Service returns data, frontend displays |
| V. Extensibility | PASS | Uses existing extensible interfaces |
| VI. Testing | PASS | Unit tests required for new methods |
| VII. Test-Driven AI | PASS | Acceptance criteria defined in spec |
| VIII. Documentation | PASS | Spec exists, plan created |
| IX. Dependencies | PASS | No new dependencies |
| X. Security | PASS | No secrets, local file access only |

## Project Structure

### Documentation (this feature)

```text
specs/051-load-result-attachments/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Getting started guide
├── contracts/           # API contracts (N/A - internal)
├── tasks.md             # Task breakdown (created by /speckit.tasks)
├── evidence/            # Test artifacts and evidence
└── media/               # Blog posts and content
```

### Source Code (repository root)

```text
apps/vscode/src/
├── services/
│   └── stacService.ts         # ADD: getResultFilesFromItem() method
├── views/
│   └── activityPanelView.ts   # MODIFY: call extraction on plot load
└── test/
    └── services/
        └── stacService.test.ts # ADD: unit tests for extraction

shared/components/src/
└── LayersToolbar/
    ├── types.ts                # EXISTING: AssociatedFile interface
    └── AssociatedFilesDropdown.tsx  # NO CHANGES: already handles results
```

**Structure Decision**: This feature adds methods to existing services within the VS Code extension. No new files required beyond test files.

## Media Components

None - backend/infrastructure feature

This feature involves service-layer changes to load data from STAC items. There are no new visual components or significant UI changes. The existing `AssociatedFilesDropdown` component already renders result files correctly.

## Storybook E2E Testing

None - no interactive UI components

The feature modifies data loading logic only. The UI component (`AssociatedFilesDropdown`) is unchanged and already has appropriate Storybook coverage.

## Complexity Tracking

No constitution violations requiring justification.

## Implementation Phases

### Phase 1: Core Extraction Logic

1. Add `getResultFilesFromItem()` method to stacService
2. Add helper to transform STAC asset to AssociatedFile
3. Add helper to parse multi-suffix viewer type

### Phase 2: Activity Panel Integration

1. Modify `activityPanelView.ts` to call extraction on plot load
2. Handle deduplication with runtime-added results
3. Ensure proper ordering (chronological, most recent first)

### Phase 3: Testing & Polish

1. Unit tests for extraction method
2. Unit tests for edge cases (empty, corrupted, missing metadata)
3. Integration test for full flow
4. Performance validation with 50+ files

## Acceptance Criteria Mapping

| Spec Criteria | Implementation |
|---------------|----------------|
| FR-001: Scan assets folder | `getResultFilesFromItem()` iterates assets |
| FR-002: Identify by metadata | Check `roles.includes('result')` |
| FR-003: Fallback to patterns | Check `debrief:toolId` or filename |
| FR-004: Populate dropdown | `_sendLayersUpdate()` sends to webview |
| FR-005: Consistent presentation | Use same AssociatedFile interface |
| FR-006: Handle missing folder | Return empty array if no assets |
| FR-007: Skip corrupted files | Try-catch with warning log |
| FR-008: Chronological order | Sort by file modification time |
| SC-004: < 500ms for 50 files | Single iteration, no file reads |

## Dependencies

- Existing stacService infrastructure
- Existing AssociatedFile interface
- Existing activity panel messaging

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| STAC items without assets | Return empty array gracefully |
| Mixed metadata quality | Use fallback identification |
| Large asset counts | O(n) iteration, no file reads |
