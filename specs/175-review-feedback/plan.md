# Implementation Plan: Review Feedback

**Branch**: `175-review-feedback` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/175-review-feedback/spec.md`

## Summary

Add review feedback capability to STAC plots. Analysts and reviewers attach review notes to any plot; notes can be resolved, reopened, edited, and deleted with full provenance tracking. The STAC Catalog Browser displays review state badges and provides a "Review status" filter. Implementation spans LinkML schema (review entities), Python service (debrief-stac CRUD with optimistic locking), and TypeScript frontend (filter engine, badges, review panel).

## Technical Context

**Language/Version**: Python 3.11 (service, schema), TypeScript 5.x (frontend components, VS Code extension)
**Primary Dependencies**: Pydantic v2 (models), LinkML >= 1.7.0 (schema), `ulid` (ID generation), React 18.x (UI), `@tanstack/react-virtual` (list virtualisation)
**Storage**: Local filesystem STAC catalogs (JSON files) — `item.json` modified, `features.geojson` untouched
**Testing**: pytest (Python), vitest (TypeScript), Playwright (E2E)
**Target Platform**: VS Code extension + web-shell (desktop), offline-capable
**Project Type**: Monorepo (Python services + TypeScript frontends)
**Performance Goals**: Badge updates within 2 seconds of feedback change; filter response instant for catalogs with hundreds of plots
**Constraints**: Offline-capable (no network required), optimistic locking for concurrent access
**Scale/Scope**: Tens to hundreds of review items per plot; hundreds of plots per catalog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All operations are local filesystem; no network required |
| I. Defence-Grade Reliability | No silent failures | PASS | Optimistic locking returns explicit conflicts; validation rejects empty notes |
| II. Schema Integrity | Single source of truth (LinkML) | PASS | New `review.yaml` LinkML module generates Pydantic + TS types |
| II. Schema Integrity | Schema tests mandatory | PASS | Golden fixtures + round-trip tests planned |
| III. Data Sovereignty | Provenance always | PASS | Edit/delete actions recorded in `debrief:review_log` |
| III. Data Sovereignty | Audit trail immutable | PASS | Review log is append-only |
| IV. Architectural Boundaries | Services never touch UI | PASS | `review.py` returns data; UI rendering in React components |
| IV. Architectural Boundaries | Frontends never persist | PASS | All writes go through debrief-stac MCP tools |
| IV. Architectural Boundaries | Services have zero MCP dependency | PASS | Domain logic in `review.py`; MCP wrappers in `mcp_server.py` |
| VI. Testing | Services require unit tests | PASS | Unit tests for all review operations planned |
| VI. Testing | CI MUST pass | PASS | Tests added to existing CI pipeline |
| VIII. Documentation | Specs before code | PASS | This plan + spec precede implementation |
| IX. Dependencies | Minimal, vetted dependencies | PASS | Only `ulid` added (minimal, no transitive deps) |
| XI. Internationalisation | I18N from the start | PASS | User-facing strings in React components will be externalisable |
| XV. Strict Type Safety | Explicit types everywhere | PASS | Schema-generated types; no `Any`/`any` in production code |

**Pre-design gate**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/175-review-feedback/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── review-tools.md  # MCP tool contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/src/linkml/
├── review.yaml                  # NEW — LinkML review entities
└── stac-extension.yaml          # MODIFIED — import review property

shared/schemas/src/generated/
├── python/debrief_schemas/      # REGENERATED — includes ReviewItem etc.
└── typescript/                  # REGENERATED — includes ReviewItem etc.

services/stac/src/debrief_stac/
├── review.py                    # NEW — review domain logic
├── mcp_server.py                # MODIFIED — add review tools
└── models.py                    # MODIFIED — add review models (if not fully generated)

services/stac/tests/
├── test_review.py               # NEW — unit tests for review operations
└── test_review_mcp.py           # NEW — MCP tool integration tests

shared/components/src/
├── filter-engine/
│   ├── types.ts                 # MODIFIED — add review-status FilterType
│   └── matchers.ts              # MODIFIED — add review-status matcher
├── ExerciseListView/
│   └── ExerciseListView.tsx     # MODIFIED — add review badges
└── ReviewPanel/                 # NEW — review detail panel
    ├── ReviewPanel.tsx
    ├── ReviewPanel.css
    ├── ReviewPanel.stories.tsx
    └── ReviewPanel.test.tsx

shared/components/src/StacBrowser/
└── StacBrowser.tsx              # MODIFIED — wire ReviewPanel into detail view
```

**Structure Decision**: This feature is additive within the existing monorepo structure. No new top-level directories. Python service code extends `debrief-stac`; TypeScript components extend `shared/components`.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|-------------|-------------|---------|
| ReviewPanel | `shared/components/src/ReviewPanel/ReviewPanel.stories.tsx` | `review-panel.js` | Demonstrates feedback list with resolve/reopen/edit/delete actions |
| ExerciseListView (badges) | `shared/components/src/ExerciseListView/ExerciseListView.stories.tsx` | `exercise-list-badges.js` | Shows review state badges on plot list entries |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (to be created during implementation)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/review-reviewpanel--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ReviewPanel.stories.tsx` | Rendering, accessibility, state display | light, dark, vscode | click resolve, click reopen, click edit, click delete, add note |
| `ExerciseListView.stories.tsx` | Badge rendering per review state | light, dark, vscode | verify badge presence/absence/colour |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ReviewPanel.spec.ts`, `shared/components/e2e/ExerciseListView.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=review-reviewpanel--default&globals=theme:light
/iframe.html?id=review-reviewpanel--default&globals=theme:dark
/iframe.html?id=review-reviewpanel--default&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Add review note to plot | Catalog Browser, Plot Detail | `.review-panel`, `.review-badge`, `[data-testid="add-review"]` | open plot, add note, verify badge appears |
| Filter by review status | Catalog Browser | `.filter-bar`, `[data-testid="review-status-filter"]` | select filter, verify list updates |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-review-feedback.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

No constitution violations to justify. All design choices align with established patterns.
