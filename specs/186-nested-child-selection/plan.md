# Implementation Plan: Nested Child Selection

**Branch**: `186-nested-child-selection` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/186-nested-child-selection/spec.md`

## Summary

Deliver the nested-child-selection feature cleanly, on a path-based selection model with no backwards-compatibility accommodation (Article XIV.1). The core path utilities already exist in `services/session-state/src/utils/selectionPath.ts` (from feature 053); this plan delivers the additional behaviour required by 186:

- **Drop flat-ID semantics** from every consumer and enforce paths-only at every boundary (FR-010).
- **Formalise the Level Registry** as the LinkML single source of truth, with TypeScript and Pydantic bindings generated from it; reject unknown level names at the boundary (FR-003–FR-005).
- **Toggle semantics on Ctrl+click** with guaranteed uniqueness by path (FR-016).
- **Anchor tracking + Shift+click range** selection for contiguous sibling ranges under a shared parent at index-based levels (FR-021–FR-024).
- **Per-plot persistence** with re-resolution on restore; unresolvable paths retained and flagged (FR-017, FR-018).
- **Binary visual styles + primary overlay** on the map (FR-019, FR-020).
- **Observability** via structured LogService entries and an aggregate unresolvable-count in the selection details panel (FR-027, FR-028).
- **Measured 100 ms / 1,000-path response budget** with graceful degradation beyond (FR-025, FR-026).

## Technical Context

**Language/Version**: TypeScript 5.x (session-state, VS Code extension, shared components, web-shell), Python 3.11 (LinkML schemas and Pydantic model generation)
**Primary Dependencies**: Zustand ^5.0.0 (session-state store), React 18.x + react-leaflet 4.2 (map), Leaflet 1.9.x, LinkML >= 1.7.0 (schema source), gen-pydantic / gen-typescript (derived bindings), VS Code Extension API ^1.85.0, `@debrief/schemas` (generated types), `@debrief/session-state` (store + LogService), `@debrief/components` (MapView, FeatureList)
**Storage**: Per-plot persistence of the selection alongside other session state in the plot/workspace JSON payload; no new storage layer. Re-resolution happens against live data at restore time — paths that no longer resolve remain in the persisted entry and surface as unresolvable.
**Testing**: vitest (TypeScript unit + integration in session-state and shared/components), pytest (Python schema adherence for LinkML → Pydantic / JSON Schema round-trip), Playwright (webview E2E for click/Ctrl+click/Shift+click flows via `apps/web-shell`)
**Target Platform**: VS Code desktop extension (primary), web-shell (browser) for E2E coverage, Electron Loader
**Project Type**: Monorepo (pnpm workspaces + uv); no new packages introduced
**Performance Goals**: 100 ms end-to-end (click → map highlight + panels updated) for up to 1,000 selected paths (FR-025/FR-026)
**Constraints**: Offline-capable (Article I.1), no network dependency, strict type safety (Article XV — no `any`/`Any`), no new external dependencies, no forgiving parsers (Article XIV.4 — unknown level names and malformed paths rejected at the boundary)
**Scale/Scope**: Typical working selection ≤ 100 paths; Shift+click range scenarios push toward 500–1,000; absolute ceiling tested at 1,000; graceful degradation to 10,000 without crash

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core works without network | PASS | Selection is fully local in-memory + per-plot persistence on disk |
| I.3 No silent failures | Operations succeed fully or fail explicitly | PASS | FR-005, FR-012 reject malformed paths / unknown levels at boundary; FR-014/FR-018 retain + flag unresolvable entries |
| II.1 Single source of truth | LinkML master schema | PASS | Level Registry authored in `session-state.yaml`; Pydantic + TypeScript generated (FR-004). Runtime TypeScript `LEVEL_REGISTRY` constant becomes a derived artifact, not the source |
| II.2 Schema tests mandatory | Golden fixtures + round-trip | PASS | `contracts/golden-fixtures.json` and LinkML round-trip tests gate merge |
| III Data Sovereignty | Provenance always | N/A | Selection is ephemeral UI state, not a data transformation |
| IV.1 Services never touch UI | Python services return data only | PASS | Session-state is a TypeScript service; Python untouched. All UI changes confined to `shared/components/MapView` and VS Code webview |
| IV.2 Frontends never persist | Writes go through services | PASS | Persistence writes flow through `services/session-state/src/persistence/` |
| V Extensibility | Fail-safe loading | PASS | Unresolvable paths retained; unknown level names rejected at boundary without crashing the app |
| VI.2 Services require unit tests | No service without tests | PASS | New store actions (`toggleInSelection`, `selectRange`), anchor tracking, and LogService hook all receive unit tests |
| VI.3 Integration tests | End-to-end workflows | PASS | Playwright E2E covers click / Ctrl+click toggle / Shift+click range / tab-switch persistence |
| VII Test-Driven AI | Tests before implementation | PASS | Acceptance scenarios (US1–US5) and golden fixtures authored before code |
| VIII.1 Specs before code | No code without spec | PASS | spec.md + this plan precede all implementation |
| IX.1 Minimal dependencies | No new external dependencies | PASS | All utilities use stdlib TypeScript / already-installed dependencies |
| X Security | No secrets, no network assumptions | PASS | Selection state is local; no credentials |
| XI I18N | User-facing strings externalisable | NOTED | The unresolvable-entry tooltip/banner copy is user-facing and must route through i18n; internal path strings are identifiers and exempt |
| XIV.1 Pre-Release Freedom | Breaking changes permitted | EXERCISED | FR-010 drops the flat-ID form entirely; no deprecation path. All consumers updated together |
| XIV.4 Strict on import | No forgiving parsers | PASS | FR-005/FR-012 enforce strict validation; invalid paths / unknown levels throw at the boundary |
| XV.2 `any`/`Any` prohibited | Strict type safety | PASS | All new code typed strictly; generated Level Registry types preserve enums |
| XV.5 Type boundaries explicit | Validate untyped data at entry | PASS | Persisted JSON re-entry revalidated against Pydantic / LinkML types on restore |

**Gate result**: PASS — no violations. Article XIV.1 is *exercised*, not violated: the spec explicitly delivers a clean breaking change, and the constitution grants that freedom pre-v4.0.0.

**Post-Phase 1 re-check**: PASS — design artifacts (data-model.md, contracts/*, quickstart.md) confirm every gate remains satisfied. No new external dependencies introduced; Level Registry moved into LinkML as a first-class class; generated bindings carry the enum into TypeScript and Pydantic without `any`/`Any`.

## Project Structure

### Documentation (this feature)

```text
specs/186-nested-child-selection/
├── plan.md              # This file
├── research.md          # Phase 0: decisions + rejected alternatives (created during /speckit.clarify)
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: developer quickstart
├── contracts/           # Phase 1: API contracts
│   ├── selection-path.ts      # Path utility API (refactored from 053)
│   ├── store-actions.ts       # New/changed store actions (toggle, selectRange, anchor)
│   ├── persistence.ts         # Per-plot persistence + restore + re-resolution
│   ├── log-schema.ts          # Structured log entry schema for unresolvable paths
│   └── golden-fixtures.json   # Test fixtures (paths, ranges, restore scenarios)
├── checklists/
│   └── requirements.md        # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/schemas/
└── src/
    └── linkml/
        └── session-state.yaml          # LevelDefinition / AddressingMode promoted to normative registry; SelectionAnchor class added

services/session-state/
├── src/
│   ├── types/
│   │   └── features.ts                 # FeatureSelection + anchor field; drop flat-ID JSDoc
│   ├── utils/
│   │   └── selectionPath.ts            # Refactor: registry loaded from generated LinkML binding, not hardcoded; add validateAgainstRegistry; add computeRange (index-based siblings)
│   ├── store/
│   │   └── slices/
│   │       └── features.ts             # Actions: toggleInSelection, selectRange, setAnchor; drop flat-ID code paths
│   ├── persistence/
│   │   ├── save.ts                     # Persist selection with plot state
│   │   ├── load.ts                     # Restore selection on plot reopen
│   │   └── resolve.ts                  # NEW: re-resolve persisted paths against live data; mark unresolvable
│   ├── log/
│   │   └── logService.ts               # Hook for FR-027 (warning-level structured entries for unresolvable paths)
│   └── server/
│       └── tools/
│           └── setSelection.ts         # MCP tool — enforce path shape, reject flat IDs
└── tests/
    ├── unit/
    │   ├── selectionPath.test.ts       # Registry validation, range computation
    │   ├── features-slice.test.ts      # toggleInSelection, selectRange, anchor lifecycle
    │   └── persistence-resolve.test.ts # Stale-path retention, unresolvable flagging
    └── integration/
        └── selection-persistence.test.ts  # Save → reload → re-resolve end-to-end

shared/components/
└── src/
    ├── MapView/
    │   ├── MapView.tsx                 # Binary styles (whole vs nested), primary overlay, click-modifier dispatch
    │   ├── MapView.stories.tsx         # Storybook story demonstrating nested selection + primary overlay
    │   └── styles/
    │       └── selection.ts            # Two style tokens + primary overlay
    └── FeatureList/
        └── FeatureList.tsx             # Render unresolvable aggregate count when count > 0

apps/vscode/
├── src/
│   ├── webview/
│   │   ├── messages.ts                 # Modifier state in click message (shift/ctrl/meta)
│   │   └── web/
│   │       └── mapView.tsx             # Emit click + modifier state; receive selection per-plot
│   ├── providers/
│   │   └── outlineProvider.ts          # Surface unresolvable-count indicator alongside selection details
│   └── services/
│       └── toolMatchAdapter.ts         # Root extraction — unchanged from 053, validated against new strict registry

apps/web-shell/
└── tests/
    └── e2e/
        └── nested-child-selection.spec.ts   # NEW: click, Ctrl+click toggle, Shift+click range, tab-switch persistence
```

**Structure Decision**: No new packages. Changes land in four existing packages (`shared/schemas`, `services/session-state`, `shared/components`, `apps/vscode`) plus one new E2E test file under `apps/web-shell`. The persistence layer (`services/session-state/src/persistence/`) gains a `resolve.ts` module to separate "load bytes" (already solved) from "re-resolve against live data" (new in 186).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| MapView (nested selection + primary overlay) | `shared/components/src/MapView/MapView.stories.tsx` — new `NestedSelection` story | `map-nested-selection.js` | Interactive demo showing whole-track vs position-level highlights, primary overlay, and mixed-depth multi-select |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change — binary styles + primary overlay are new visual contracts
- [x] Interactive demo adds narrative value — clickable positions, toggle, range selection read much better than screenshots

**Bundleability Verified**:
- [ ] Stories exist in Storybook (a new `NestedSelection` story will be authored during implementation — not yet in the repo)
- [x] Components render standalone — `MapView` already renders standalone in existing stories with mock GeoJSON
- [x] Reasonable bundle size expected — map stories today bundle well under 500 KB; this adds only new styles and a handler

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-mapview--nested-selection` (will exist after the story is authored)

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `MapView.stories.tsx` → `NestedSelection` | Rendering, binary styles, primary overlay, click/Ctrl+click/Shift+click | light, dark, vscode | click (whole-track), Ctrl+click (toggle), Shift+click (range), clear on empty-area click |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input — click dispatches selection; modifier keys change semantics
- [x] Accessibility attributes present — `data-testid` on selectable elements; ARIA labels for selection state
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/MapView-nested-selection.spec.ts`

**Theme Variant URLs** (for Storybook):

```text
/iframe.html?id=components-mapview--nested-selection&globals=theme:light
/iframe.html?id=components-mapview--nested-selection&globals=theme:dark
/iframe.html?id=components-mapview--nested-selection&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Select a position, Ctrl+click toggle, Shift+click range | Map Panel, Outline Panel | `.leaflet-container`, `[data-testid="position-point"]`, `[data-testid="outline-selection"]`, `[data-testid="unresolvable-count"]` | click, Ctrl+click (toggle on/off), Shift+click (inclusive range), tab-switch + return (persistence) |
| Stale-selection restore after reload | Map Panel, Outline Panel | `[data-testid="unresolvable-count"]`, `[data-testid="unresolvable-banner"]` | open plot with persisted selection, reload data with fewer positions, verify unresolvable entries surfaced |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors (`position-point`, `unresolvable-count`, `unresolvable-banner`)
- [x] Screenshots captured for evidence — selection states, mixed-depth multi-select, unresolvable banner

**Test File Location**: `tests/e2e/test-nested-child-selection.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

No constitution violations to justify. Article XIV.1 is exercised (breaking change delivered without backwards-compat); this is not a violation because the constitution grants this freedom explicitly pre-v4.0.0.
