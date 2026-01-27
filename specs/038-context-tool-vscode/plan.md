# Implementation Plan: Context-Sensitive Tool Offering VS Code Integration

**Branch**: `038-context-tool-offering` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-context-tool-vscode/spec.md`

## Summary

Integrate the existing ToolMatchService from #027 into the VS Code extension to provide context-sensitive analysis tool discovery and execution. The extension will read selection state from the session-state service (#029), match against available tools from debrief-calc via MCP, and present applicable tools in three surfaces: sidebar panel, context menu, and command palette. Tool execution will persist results via debrief-stac with provenance metadata.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension)
**Primary Dependencies**: @debrief/components (ToolMatchService), @debrief/session-state (SessionManager, selection subscriptions), VS Code Extension API
**Storage**: N/A (pure integration - no new storage)
**Testing**: Vitest (unit), VS Code integration tests, Playwright (E2E)
**Target Platform**: VS Code (Electron on Windows, macOS, Linux)
**Project Type**: VS Code Extension (apps/vscode workspace)
**Performance Goals**: Tool matching < 100ms, UI update < 1s after selection change
**Constraints**: Offline-capable, must work without MCP connection (graceful degradation)
**Scale/Scope**: 50+ tools without degradation, multi-document support via session-state

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Defence-Grade Reliability | ✅ Pass | Offline by default - tool metadata cached, graceful degradation when calc service unavailable |
| II. Schema Integrity | ✅ Pass | Using existing Tool/SelectionRequirement schemas from #027 LinkML definitions |
| III. Data Sovereignty | ✅ Pass | Results persisted via debrief-stac with full provenance lineage |
| IV. Architectural Boundaries | ✅ Pass | Extension orchestrates services (calcService, stacService, sessionManager), no domain logic in UI |
| V. Extensibility | ✅ Pass | Tool discovery via MCP allows new tools without extension changes |
| VI. Testing | ✅ Pass | Unit tests for matching integration, E2E for tool execution |
| VII. Test-Driven AI Collaboration | ✅ Pass | Acceptance scenarios defined in spec, testable success criteria |
| VIII. Documentation | ✅ Pass | Spec complete, plan in progress |
| IX. Dependencies | ✅ Pass | Using existing workspace dependencies (@debrief/components, @debrief/session-state) |
| X. Security | ✅ Pass | No secrets, no external network calls beyond MCP localhost |
| XI. Internationalisation | ⚠️ Deferred | Tool names/descriptions from debrief-calc; i18n can be added later |
| XII. Community Engagement | ✅ Pass | Feature will be blogged, demo-able in Storybook |
| XIII. Contribution Standards | ✅ Pass | PR review required, CI must pass |
| XIV. Pre-Release Freedom | ✅ Pass | Pre-v4.0.0 - breaking changes permitted |

## Project Structure

### Documentation (this feature)

```text
specs/038-context-tool-vscode/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions
├── quickstart.md        # Integration guide
├── contracts/           # API contracts
├── media/               # Blog drafts
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 task breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── extension.ts                    # Add ToolMatchService initialization
│   ├── providers/
│   │   └── toolsTreeProvider.ts        # UPDATE: Integrate ToolMatchService
│   ├── services/
│   │   ├── calcService.ts              # UPDATE: Use ToolMatchService for matching
│   │   └── toolMatchAdapter.ts         # NEW: Bridge session selection to ToolMatchService
│   ├── commands/
│   │   └── executeTool.ts              # UPDATE: Execute via MCP, persist results
│   └── types/
│       └── tool.ts                     # UPDATE: Align with @debrief/components types
├── tests/
│   ├── unit/
│   │   ├── toolMatchAdapter.test.ts    # NEW: Adapter unit tests
│   │   └── toolsTreeProvider.test.ts   # UPDATE: With ToolMatchService mocks
│   └── integration/
│       └── toolExecution.test.ts       # NEW: End-to-end tool execution
└── test-data/
    └── local-store/
        └── items/
            └── exercise-alpha.geojson  # UPDATE: Add all supported feature kinds

shared/components/
└── src/
    └── ToolMatch/
        └── index.ts                    # EXISTING: Export ToolMatchService
```

**Structure Decision**: Extend existing VS Code extension structure. No new packages required - ToolMatchService is already exported from @debrief/components. New adapter bridges session-state selection to ToolMatchService Selection type.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ToolMatchHarness | `shared/components/src/ToolMatch/ToolMatchHarness/ToolMatchHarness.stories.tsx` | `tool-match-harness.js` | Demonstrates selection → tool matching logic |

**Inclusion Criteria Applied**:
- [x] New visual component (integration into VS Code sidebar - but VS Code panels aren't Storybook-able)
- [x] Interactive demo adds narrative value (ToolMatchHarness shows matching algorithm)

**Bundleability Verified**:
- [x] Stories exist in Storybook (ToolMatchHarness.stories.tsx confirmed)
- [x] Components render standalone (uses fixture data, no app context)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/toolmatch-toolmatchharness--default`

*Note: VS Code extension panels (ToolsTreeProvider) cannot be shown in Storybook. The ToolMatchHarness demonstrates the underlying algorithm.*

## Complexity Tracking

> No constitution violations requiring justification.

N/A - All gates pass.
