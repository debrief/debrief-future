# Implementation Plan: Filter Bar Platform Chips

**Branch**: `186-filter-chips` (development branch: `claude/filter-chips-speckit-TR8Bd`) | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/186-filter-chips/spec.md`

## Summary

Add a new **platform chip** to the existing Filter Bar (#127) that captures a compound, same-platform predicate (e.g. "nationality=GB AND domain=subsurface" → one "British submarine" chip). The chip serialises to a single `array_filter` CQL2 node over `debrief:platforms`, consumed by the already-complete filter engine (#185). Implementation is **UI-only**: extend the lozenge model to carry a compound predicate, add a compound value editor, wire the new chip type through the distinct-value hook, reducer, CQL2 serialise/deserialise, Storybook, unit tests, and E2E tests.

No changes are made to the filter engine, STAC service, LinkML schemas, or the `debrief:platforms` data shape. All evaluation and CQL2 round-tripping are delegated to existing APIs in `shared/components/src/filter-engine/`.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x component library under `shared/components/`)
**Primary Dependencies**: `@debrief/schemas` (PlatformRecord type), `@debrief/components` filter engine (#126/#185 — CompoundPredicate, ArrayFilterPredicate, `array_filter` evaluator and CQL2 serde), `@dnd-kit/core` (drag lifecycle reused from #127), `vscrui` (icon set used by existing chips), `crypto.randomUUID()` (lozenge IDs, already in use)
**Storage**: N/A (client-side filter state; persistence through existing `SavedFiltersStorage` interface from #128)
**Testing**: Vitest (component + hook unit tests co-located under `shared/components/src/FilterBar/__tests__/`), Playwright (Storybook E2E under `shared/components/e2e/FilterBar.spec.ts`)
**Target Platform**: Browser (Storybook preview and VS Code webview, both reached through the shared components package). Offline-capable: the chip renders and evaluates entirely client-side — no network dependency.
**Project Type**: Single — shared component library (`shared/components/`); consumers already wired through pnpm workspace.
**Performance Goals**: Indistinguishable-from-instant filter re-evaluation for catalogs up to ~500 items (existing FilterBar target from #127; compound evaluation is O(items × platforms × predicate-nodes) which is already trivial at this scale). No perceptible regression on catalogs with no platform chips.
**Constraints**: No new runtime dependencies. No `any`/`Any` in production code (Constitution XV). Full type coverage under `strict: true`. No changes to the existing Lozenge CSS tokens that could regress #127 visual snapshots — additive styling only.
**Scale/Scope**: A single new `filterType` value plus a new editor surface and ~6 reducer branches. Touches ~10 files in `shared/components/src/FilterBar/` and 1 file in `shared/components/src/filter-engine/cql2-json.ts` to teach deserialisation how to reconstruct a platform chip. Zero changes to Python services.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Check | Status |
|---------|-------|--------|
| I. Defence-Grade Reliability | Feature is pure client-side UI; offline by default; no silent failures — malformed saved filters surface through the existing restore-error banner. | ✅ Pass |
| II. Schema Integrity | No schema changes. Consumes `PlatformRecord` from the generated `@debrief/schemas` package as-is. | ✅ Pass |
| III. Data Sovereignty | No data transformations; provenance unchanged. No new network calls or telemetry. | ✅ Pass |
| IV. Architectural Boundaries | Thick service, thin frontend: no Python service touched. All logic lives in the frontend shared component library. | ✅ Pass |
| V. Extensibility | Filter bar remains extensible — new `filterType` slots in via the existing `FILTER_TYPE_OPTIONS` registry. No core surface broken. | ✅ Pass |
| VI. Testing | Unit tests for reducer, editor, and CQL2 round-trip; Playwright story tests for visual and interaction coverage. No production code merged without tests. | ✅ Pass (committed in Phase 1 contracts) |
| VII. Test-Driven AI Collaboration | Acceptance scenarios in `spec.md` become executable tests before implementation — test list enumerated in `/contracts/test-list.md`. | ✅ Pass |
| VIII. Documentation | This plan, research.md, data-model.md, contracts, quickstart.md; Storybook stories double as living docs. Entry added to CHANGELOG.md at PR time. | ✅ Pass (planned) |
| IX. Dependencies | Zero new dependencies. | ✅ Pass |
| X. Security | No secrets, no classified data paths, no network calls. | ✅ Pass |
| XI. Internationalisation | New user-facing strings go through `constants.ts` alongside existing strings (`getFilterTypeLabel`, etc.) — already i18n-ready. | ✅ Pass |
| XII. Community Engagement | Feature is visible in Storybook on GitHub Pages and in the preview deployment; planning post drafted for debrief.github.io. | ✅ Pass |
| XIII. Contribution Standards | Atomic commits, PR review, CI green before merge. | ✅ Pass |
| XIV. Pre-Release Freedom | Extending the lozenge shape is a breaking change to saved-filter records, but we are pre-v4.0.0 — deprecation rules suspended. Migration is documented in `data-model.md`. | ✅ Pass |
| XV. Strict Type Safety | All new types explicit; no `any`; discriminated unions for the extended `LozengeItem`; `strict: true` applies. | ✅ Pass |

**No violations → no Complexity Tracking entries required.**

### Post-Design Re-Evaluation (Phase 1 gate)

After design artifacts (`research.md`, `data-model.md`, `contracts/*.md`, `quickstart.md`) were produced, every Constitution check above was re-run against the final design:

- No new dependencies were introduced by the design (IX ✓).
- All new types are explicit discriminated unions with no `any` (XV ✓).
- The breaking change to `LozengeItem` is backwards-loadable via a `shape: 'simple'` coercion on restore, preserving the spirit of Article I.3 (no silent failures) because the pre-feature shape is mechanically and fully recoverable (XIV remains permissive pre-v4.0.0).
- The CQL2 round-trip contract explicitly documents the lossy cases and routes them through the existing `FILTER_ERROR_MESSAGE` banner rather than silent degradation (I.3 ✓).
- The test list in `contracts/test-list.md` traces every FR and SC to a concrete test before implementation begins (VII ✓).

Gate passes. No amendments required.

## Project Structure

### Documentation (this feature)

```text
specs/186-filter-chips/
├── plan.md              # This file (/speckit.plan output)
├── spec.md              # Feature specification (/speckit.specify output)
├── research.md          # Phase 0 output — architectural decisions
├── data-model.md        # Phase 1 output — extended LozengeItem + compound predicate mapping
├── quickstart.md        # Phase 1 output — how to run and demo the feature locally
├── contracts/
│   ├── filter-bar-api.md    # New/changed public surface of the FilterBar component
│   ├── cql2-roundtrip.md    # CQL2 JSON shape produced by platform chips
│   └── test-list.md         # Enumerated test cases (mapping acceptance scenarios → tests)
├── checklists/
│   └── requirements.md  # Spec quality checklist (already in place)
├── media/
│   ├── planning-post.md      # Blog announcement draft
│   └── linkedin-planning.md  # LinkedIn summary
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

The feature is a **single-project** shared-component change. No new top-level directories are introduced.

```text
shared/
└── components/
    └── src/
        ├── FilterBar/
        │   ├── FilterBar.tsx                    # Wire new filter type through add/edit/remove
        │   ├── FilterTypeMenu.tsx               # Add "Platform" entry to add-filter menu
        │   ├── Lozenge.tsx                      # Render compound chip label (multi-attr summary)
        │   ├── Lozenge.css                      # Additive styling for platform chip distinction
        │   ├── PlatformValueEditor.tsx          # NEW — compound-attribute picker
        │   ├── ValueEditor.tsx                  # Dispatch to PlatformValueEditor for platform type
        │   ├── types.ts                         # Extend LozengeItem for compound predicates
        │   ├── useFilterBar.ts                  # Reducer: add/edit platform lozenge with compound payload
        │   ├── useDistinctValues.ts             # Distinct attribute-value map for platform editor
        │   ├── constants.ts                     # New FILTER_TYPE_OPTION, label, UI strings
        │   ├── FilterBar.stories.tsx            # Story demonstrating the platform chip
        │   ├── SavedFilters.stories.tsx         # Round-trip story including a platform chip
        │   └── __tests__/
        │       ├── useFilterBar.test.ts          # Existing — extend with compound lozenge reducer cases
        │       ├── Lozenge.test.tsx              # Existing — extend with platform chip rendering
        │       ├── ValueEditor.test.tsx          # Existing — extend with dispatch-to-platform test
        │       ├── PlatformValueEditor.test.tsx  # NEW — editor validation, confirm/disable
        │       └── useDistinctValues.test.ts     # Existing — extend with platform attribute map
        ├── filter-engine/
        │   ├── cql2-json.ts                     # Already serialises ArrayFilterPredicate; may extend deserialiser hint for FilterBar-shape
        │   └── __tests__/
        │       └── array-filter-cql2.test.ts    # Existing — extend with FilterBar-emitted round-trips
        └── e2e/
            ├── FilterBar.spec.ts                # Extend with add/edit/negate/remove platform chip
            └── SavedFilters.spec.ts             # Extend with save/restore of a platform chip
```

**Structure Decision**: Stay within the existing single shared-components package. The feature extends three surfaces: the lozenge model (`types.ts`, `useFilterBar.ts`), the editor (`ValueEditor.tsx` + new `PlatformValueEditor.tsx`), and the distinct-value hook. One touch-point in `filter-engine/cql2-json.ts` ensures round-trip deserialisation lands back in the new `kind: 'platform-lozenge'` shape.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FilterBar (platform chip) | `shared/components/src/FilterBar/FilterBar.stories.tsx` (new story: *"With Platform Chip"*) | `filter-bar-platform.js` | Demonstrate building a compound "GB + subsurface" chip and the resulting filtered catalog set |

**Inclusion Criteria Applied**:
- [x] New visual component (a distinctive chip variant)
- [x] Significant visual change (a new chip shape in the filter bar)
- [x] Interactive demo adds narrative value (compound chip construction is the whole point)

**Bundleability Verified**:
- [x] Stories exist in Storybook (`FilterBar.stories.tsx` is the canonical home; add new exported story)
- [x] Components render standalone (FilterBar already runs in Storybook without app context)
- [x] Reasonable bundle size expected (< 500KB — FilterBar bundle is already this size; the addition is a small editor component)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/filterbar-filterbar--with-platform-chip`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FilterBar.stories.tsx` — *With Platform Chip* | Rendering, chip label, filtered-item count assertion, CQL2 JSON snapshot | light, dark, vscode | click (+), select "Platform", pick nationality, pick domain, confirm, assert chip + result set, toggle negate, assert set flips, remove |
| `SavedFilters.stories.tsx` — *Platform chip round-trip* | Save, clear, restore, assert filtered items and chip attributes identical | light, vscode | save with name, click clear, restore from saved list, assert chip + items |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants (theme snapshots under existing Playwright infrastructure)
- [x] Interactive elements respond to user input (add, edit, negate, remove, drag-to-OR)
- [x] Accessibility attributes present (data-testid, aria-*) — reuse existing patterns from Lozenge
- [x] Screenshots captured for evidence (via existing e2e evidence pipeline)

**Test File Location**: `shared/components/e2e/FilterBar.spec.ts` (extended) and `shared/components/e2e/SavedFilters.spec.ts` (extended)

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=filterbar-filterbar--with-platform-chip&globals=theme:light
/iframe.html?id=filterbar-filterbar--with-platform-chip&globals=theme:dark
/iframe.html?id=filterbar-filterbar--with-platform-chip&globals=theme:vscode
```

## VS Code Webview E2E Testing

None — no VS Code extension changes. The FilterBar lives in `shared/components/` and is consumed by both the web-shell and the VS Code extension. Because this feature is additive and reuses the existing lozenge surface end-to-end, no new extension selectors or workflows are required. (The existing extension e2e suite will continue to exercise the FilterBar indirectly.)

## Complexity Tracking

No Constitution violations. No entries required.
