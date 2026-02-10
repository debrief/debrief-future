# Implementation Plan: STAC File Tree Component

**Branch**: `077-stac-file-tree` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/077-stac-file-tree/spec.md`

## Summary

A shared React tree view component (`StacFileTree`) that renders the directory structure of a STAC catalog store. The component is backed by an injected filesystem adapter, enabling it to work with both real filesystems (VS Code extension, Node.js) and in-memory filesystems (memfs for Storybook and web-shell). Key capabilities include lazy directory expansion, double-click to open STAC Items, visual highlighting of new/changed files after snapshot operations, and collapsible integration in the web-shell sidebar.

## Technical Context

**Language/Version**: TypeScript 5.x (shared component library)
**Primary Dependencies**: React 18.x (peer), vscrui ^0.1.0 (icons, existing), memfs ^4.x (devDependency for fixtures)
**Storage**: N/A — reads filesystem via injected adapter, does not persist state
**Testing**: Vitest (unit), Playwright (Storybook E2E)
**Target Platform**: Browser (web-shell, Storybook), VS Code webview (future)
**Project Type**: Monorepo shared component (pnpm workspace)
**Performance Goals**: 200-item catalogs expand/collapse within 500ms perceived time
**Constraints**: Offline-capable (no network), works without VS Code APIs, zero hard dependency on memfs at runtime
**Scale/Scope**: Single shared component with Storybook stories and web-shell integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Component reads local filesystem only; no network calls |
| I. Defence-Grade Reliability | No silent failures | PASS | Error state displayed when filesystem access fails (FR-010) |
| II. Schema Integrity | Schema compliance | N/A | Component displays filesystem structure, does not create/modify schema data |
| III. Data Sovereignty | Source preservation | PASS | Component is read-only; never modifies files |
| IV. Architectural Boundaries | Services never touch UI | PASS | Component is a pure UI component in shared/components; no service logic |
| IV. Architectural Boundaries | Frontends never persist | PASS | Component reads only; all writes go through services |
| V. Extensibility | No vendor lock-in | PASS | Filesystem adapter pattern means no lock-in to memfs or Node fs |
| VI. Testing | Unit tests required | PASS | Vitest tests planned for all component logic |
| VI. Testing | Integration tests for workflows | PASS | Storybook stories + E2E tests cover end-to-end user flows |
| IX. Dependencies | Minimal, vetted dependencies | PASS | memfs is devDependency only (25M+ weekly downloads, Apache-2.0); no new runtime dependencies |
| XI. Internationalisation | I18N from the start | PASS | User-facing strings (empty state, error messages) will be externalisable |

**Pre-research gate**: PASS — no violations.
**Post-design re-check**: PASS — filesystem adapter pattern confirmed; memfs is dev-only; no new runtime dependencies added.

## Project Structure

### Documentation (this feature)

```text
specs/077-stac-file-tree/
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: development setup
├── contracts/           # Phase 1: API contracts
│   └── stac-file-tree-api.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/StacFileTree/
├── StacFileTree.tsx          # Main component
├── StacFileTree.css          # Styles (BEM + CSS custom properties)
├── StacFileTree.stories.tsx  # Storybook stories (6 variants)
├── StacFileTree.test.tsx     # Vitest unit tests
├── types.ts                  # TypeScript interfaces (FilesystemAdapter, TreeNode, etc.)
├── useTreeState.ts           # Custom hook: expand/collapse/cache management
├── highlightUtils.ts         # Highlight set computation (ancestor propagation)
├── fixtures.ts               # memfs fixture data for stories and tests
└── index.ts                  # Barrel export

shared/components/src/index.ts  # Add StacFileTree export

apps/web-shell/src/App.tsx       # Integrate StacFileTree in sidebar
```

**Structure Decision**: Shared component in existing `shared/components` package, following the established pattern (FeatureList, CatalogOverview). No new packages or workspaces created.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| StacFileTree | `shared/components/src/StacFileTree/StacFileTree.stories.tsx` | `stac-file-tree.js` | Interactive tree browsing with expand/collapse and change highlighting |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of this feature)
- [x] Components render standalone (no app context required — uses injected adapter)
- [x] Reasonable bundle size expected (< 500KB — no heavy dependencies)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/stacfiletree--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StacFileTree.stories.tsx` — Default | Tree renders with correct hierarchy | light, dark, vscode | expand, collapse, double-click item |
| `StacFileTree.stories.tsx` — Empty | Empty state message displayed | light, dark | none (static) |
| `StacFileTree.stories.tsx` — WithHighlights | Highlight indicators on correct nodes | light, dark | expand to reveal highlighted children |
| `StacFileTree.stories.tsx` — CurrentItemSelected | Current item visual distinction | light, dark | none (static) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/StacFileTree.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=stacfiletree--default&globals=theme:light
/iframe.html?id=stacfiletree--default&globals=theme:dark
/iframe.html?id=stacfiletree--default&globals=theme:vscode
```

## Complexity Tracking

No constitution violations — this section is intentionally empty.
