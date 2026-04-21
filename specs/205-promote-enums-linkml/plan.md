# Implementation Plan: Promote DisplayMode and PlaybackState to LinkML

**Branch**: `205-promote-enums-linkml` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/205-promote-enums-linkml/spec.md`

## Summary

Both `PlaybackStateEnum` and `DisplayModeEnum` already exist in the LinkML master schema (`session-state.yaml`) and are already referenced by `TemporalSlice` via `range:`. The Python generator correctly uses them in Pydantic models. The only schema-level change required is a **vocabulary update** to `DisplayModeEnum`: rename values `normal` → `full` and `snailTrail` → `trail` to match the canonical `shared/components` vocabulary.

The TypeScript generator (`gen-typescript`) emits `string` for all enum-ranged slots — a known limitation addressed by the `generate.py` post-processor. Add two post-processor patches following the existing `PointShape` pattern: inject `export type PlaybackState = \`${PlaybackStateEnum}\`` and `export type DisplayMode = \`${DisplayModeEnum}\`` immediately after each enum declaration, then narrow `TemporalSlice.playbackState` and `TemporalSlice.displayMode` from `string` to those derived types.

Delete all four hand-typed enum definitions (two `DisplayMode`, two `PlaybackState`), migrate the session-state store and tests from `'normal'`/`'snailTrail'` to `'full'`/`'trail'`, widen the components' two-value `PlaybackState` consumers to the three-value superset, and add schema golden fixtures for both enums. No new dependencies; single atomic PR.

## Technical Context

**Language/Version**: Python 3.11 (schema source, Pydantic generation, fixtures), TypeScript 5.x (generated types, consumer packages)
**Primary Dependencies**: LinkML ≥ 1.7.0 (`gen-pydantic`, `gen-typescript`, `gen-json-schema`), Pydantic v2, existing `@debrief/schemas` package, existing `shared/schemas/scripts/generate.py` post-processor
**Storage**: N/A — no persistence format changes (session-state `displayMode` field value changes from `'normal'` → `'full'` and `'snailTrail'` → `'trail'` in test fixtures; no on-disk format used in production yet)
**Testing**: `pytest` (schema adherence: `test_golden.py`, `test_roundtrip.py`, new enum fixtures), `vitest` (session-state temporal tests + persistence tests updated for new vocabulary, component tests widened for `PlaybackState`), `pnpm exec tsc --noEmit` (generated TS + consumer packages typecheck cleanly)
**Target Platform**: Cross-platform dev; CI on Ubuntu via `task verify`
**Project Type**: Monorepo — touches `shared/schemas/` (schema source + generate.py), `shared/components/` (delete hand-typed types, update consumers), `services/session-state/` (delete hand-typed types, migrate vocabulary, update tests). No new packages.
**Performance Goals**: N/A — type-level consolidation. CI time delta within noise.
**Constraints**:
- **Single atomic PR** — schema edit, regen, post-processor patch, and consumer migration reviewed together (SC-008)
- **Zero new `any`/`as` casts** at migration sites
- **Constitution Article XV** — `TemporalSlice.playbackState` and `displayMode` must not remain `string` in the generated TS interface; narrowed to enum-derived template-literal types
- **Vocabulary migration** — all `'normal'` → `'full'` and `'snailTrail'` → `'trail'` must be completed before merge; no translation shims permitted
**Scale/Scope**: 1 LinkML enum modified (vocabulary rename), 2 TS post-processor patches added, 4 hand-typed type declarations deleted, ~14 source files updated (import swaps + vocabulary), 4 test files updated, 3 new schema fixture files added, 1 ADR entry

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Indirect | ✅ Pass | No runtime / offline / failure-mode changes. Pure type consolidation. |
| II. Schema Integrity | **Direct driver** | ✅ Pass — uphold | Feature eliminates hand-typed drift and restores single-source-of-truth. Adherence tests extended with enum fixtures. |
| III. Data Sovereignty | N/A | ✅ Pass | No provenance, storage, or export changes. |
| IV. Architectural Boundaries | N/A | ✅ Pass | No service/UI boundary shifts. |
| V. Extensibility | Indirect | ✅ Pass | Contrib extensions already consume `@debrief/schemas`; migration only changes names and improves rigor. |
| VI. Testing | **Direct** | ✅ Pass | New schema fixtures added; session-state temporal + persistence tests updated; component tests widened. CI `task verify` must stay green. |
| VII. Test-Driven AI Collaboration | **Direct** | ✅ Pass | Spec + checklist + contracts exist before code. Completion measured against SC-001…SC-008. |
| VIII. Documentation | **Direct** | ✅ Pass | ADR entry in `docs/project_notes/decisions.md` is required (FR-015). |
| IX. Dependencies | N/A | ✅ Pass | No new dependencies. |
| X. Security | N/A | ✅ Pass | No secrets, no network. |
| XI. Internationalisation | N/A | ✅ Pass | No user-facing strings. |
| XII. Community Engagement | Indirect | ✅ Pass | Covered by planning-post + LinkedIn summary. |
| XIII. Contribution Standards | **Direct** | ✅ Pass | Atomic PR, review required, CI must pass. |
| XIV. Pre-Release Freedom | Enabling | ✅ Pass | Pre-v4.0.0 — vocabulary rename (`normal` → `full`, `snailTrail` → `trail`) is a breaking change permitted without a deprecation period. |
| XV. Strict Type Safety | **Direct driver** | ✅ Pass — uphold | `TemporalSlice.playbackState` and `displayMode` narrowed from `string` to enum-derived template-literal types via post-processor (same pattern as `PointShape`). No new `any` in generated or authored code. |

**Outcome**: No violations. No entries required in the Complexity Tracking table.

**Post-design re-check (2026-04-21, after research + data-model + contracts + quickstart)**: All 15 articles remain ✅ Pass. Research §4 formally documents why the `PointShape` template-literal pattern (rather than direct enum references) is Article-XV-compliant and ergonomically appropriate (consumers can continue string-literal comparisons without coercion). Research §5 confirms no generator upgrade is needed — the post-processor handles the narrowing. No new dependencies added. No scope creep.

## Project Structure

### Documentation (this feature)

```text
specs/205-promote-enums-linkml/
├── plan.md                 # This file
├── research.md             # Phase 0: generator behaviour + consumer inventory
├── data-model.md           # Phase 1: enum definitions and TemporalSlice narrowing
├── quickstart.md           # Phase 1: migration recipe for consumers (before/after)
├── contracts/
│   └── linkml-enums.md     # Phase 1: exact YAML changes + expected generator outputs
├── checklists/
│   └── requirements.md     # From /speckit.specify
├── media/
│   ├── planning-post.md    # Phase 2
│   └── linkedin-planning.md # Phase 2
└── spec.md                 # From /speckit.specify
```

### Source Code (repository root)

This feature touches existing paths only — no new packages or directories are created.

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   └── session-state.yaml       # EDIT: rename DisplayModeEnum values normal→full, snailTrail→trail
│   └── generated/                   # Fully regenerated after schema edit
│       ├── python/debrief_schemas/__init__.py   # DisplayModeEnum values change; TemporalSlice already uses enum types
│       ├── typescript/types.ts                   # DisplayModeEnum values change; new PlaybackState/DisplayMode type aliases; TemporalSlice fields narrowed
│       └── json-schema/debrief.schema.json       # DisplayModeEnum permissible values change
├── scripts/generate.py              # EDIT: add PlaybackState + DisplayMode template-literal type injections + TemporalSlice narrowing patches
└── fixtures/
    └── session-state/               # NEW directory with enum golden fixtures
        ├── valid/
        │   ├── playback-state-stopped.json
        │   ├── playback-state-playing.json
        │   ├── playback-state-paused.json
        │   ├── display-mode-full.json
        │   └── display-mode-trail.json
        └── invalid/
            ├── playback-state-unknown.json
            └── display-mode-legacy-normal.json   # validates that 'normal' is now rejected

shared/components/src/
├── utils/types.ts                   # DELETE `type DisplayMode = 'full' | 'trail'`; import DisplayMode from @debrief/schemas
├── TimeController/
│   ├── types.ts                     # DELETE `type PlaybackState = 'playing' | 'paused'`; import PlaybackState from @debrief/schemas; widen PlaybackControlsProps to accept 'stopped'
│   └── index.ts                     # Re-export PlaybackState + DisplayMode from @debrief/schemas (name-compatible)
├── ActivityPanel/
│   ├── types.ts                     # Replace inline `'full' | 'trail'` and `'playing' | 'paused'` literals with DisplayMode and PlaybackState imports
│   └── ActivityPanel.tsx            # Replace inline `(mode: 'full' | 'trail')` and `(state: 'playing' | 'paused')` with typed imports; handle 'stopped' in playback handler
└── MapView/
    └── PositionSymbolsLayer.tsx     # Replace inline `'full' | 'trail'` with DisplayMode import

services/session-state/src/
└── types/temporal.ts                # DELETE `type PlaybackState = 'stopped' | 'playing' | 'paused'`; DELETE `type DisplayMode = 'normal' | 'snailTrail'`; import both from @debrief/schemas; update DEFAULT_TEMPORAL_SLICE.displayMode from 'normal' to 'full'

services/session-state/tests/
├── unit/slices/temporal.test.ts     # Update 'normal' → 'full' and 'snailTrail' → 'trail' throughout
└── unit/persistence.test.ts        # Update 'snailTrail' → 'trail' and 'normal' → 'full' in fixtures + assertions

docs/project_notes/
└── decisions.md                     # APPEND dated ADR entry
```

**Structure Decision**: Monorepo — no new packages introduced. The enum sources (`@debrief/schemas`) are an existing transitive dependency of all affected packages. Template-literal type aliases (`PlaybackState`, `DisplayMode`) are injected by the post-processor in the same generated file, keeping them collocated with the enum declarations. Consumers use the same type names as before — only the import origin changes.

## Media Components

None — backend/infrastructure feature. This is a LinkML vocabulary rename + TypeScript type consolidation. No new user-facing components are created, and no component rendering changes. The display rendering (snail-trail vs full track) is unchanged — only the type names change.

## Storybook E2E Testing

None — no interactive UI components. The migration does not change component behaviour or add new UI. Existing component tests (including `TimeController`, `DisplayModeToggle`, and Storybook-driven stories) continue to run as part of `pnpm test` and will catch any accidental breakage from the import-source change.

## VS Code Webview E2E Testing

None — no extension workflow changes. This is a type-level consolidation; no VS Code extension logic, no webview rendering, and no MCP tool outputs change.

## Complexity Tracking

*No entries — Constitution Check passes cleanly with no violations.*
