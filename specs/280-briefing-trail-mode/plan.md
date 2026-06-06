# Implementation Plan: Briefing Renderer Honours Trail Display Mode

**Branch**: `280-briefing-trail-mode` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/280-briefing-trail-mode/spec.md`

## Summary

The standalone briefing renderer ignores each Scene's captured `display_mode`, so
Trail-mode storyboards play back as a static full track instead of a growing
snail-trail (backlog #280, epic E13). The fix is **renderer-only**: in
`BriefingMap.tsx`, read `currentScene.properties.display_mode`; when it is `trail`,
render each time-stamped track trimmed to the current playback time (reusing the
main app's `sliceTrackToTime` helper for exact visual parity); when `full`, absent,
or unrecognised, render the whole track unchanged. Time-stamped tracks render as
stable-keyed `<Polyline>` layers whose positions update in place each frame —
smooth growth with no per-frame layer teardown. No schema, capture, export, or host
change (FR-006); the per-Scene `display_mode` and per-vertex `timestamps` are
already carried into the exported briefing.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, Article XV)
**Primary Dependencies**: React 18.x, react-leaflet 4.2 / Leaflet 1.9 (existing renderer stack); `@debrief/utils` `sliceTrackToTime` (NEW workspace dep — internal); `@debrief/schemas` `DisplayMode`, `@debrief/components` `SceneFeature`/`StoryboardPlot` (existing); Zustand store (existing)
**Storage**: N/A — reads the already-loaded briefing `FeatureCollection`; persists nothing
**Testing**: Vitest (unit — pure mapping + classification); Playwright via `run-playwright.mjs` + `@sparticuz/chromium` (E2E growth screenshot)
**Target Platform**: Modern browser — the air-gapped briefing SPA (offline by default) and the #273 live-Preview tab
**Project Type**: Single front-end app (`apps/briefing-renderer/`); thin frontend, no service involvement
**Performance Goals**: Smooth slider-scrub / playback (≈60 fps) for typical tracks (hundreds–low thousands of vertices); trail slice is O(log n) + O(k), updated in place
**Constraints**: Offline by default (no new network); no schema/capture/export/host change (FR-006); air-gapped #264 boot path untouched; strict types, no `any` (Article XV)
**Scale/Scope**: One component edited (`BriefingMap.tsx`), one workspace dep added, fixtures + unit tests + one Playwright spec. No NEEDS CLARIFICATION remain.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status |
|---------|------|--------|
| I — Defence-Grade Reliability | Offline by default; no silent failures | ✅ Renderer is the offline path; no network added. Malformed tracks fall back to full line (FR-007) — explicit, never blank/crash. |
| II — Schema Integrity | No hand-written schema; derived types | ✅ **No schema change.** Reuses generated `DisplayMode` + `SceneFeature` verbatim. |
| III — Data Sovereignty | Source preservation | ✅ Read-only over loaded features; stored geometry never mutated (trimming is a render-time projection). |
| IV — Architectural Boundaries | Frontends never persist; services never touch UI | ✅ Pure frontend render change; no persistence, no service call. IV.5: no re-listed boundary types — reuses `SceneFeature`/`DisplayMode`; the derived `TemporalTrack` is a render-local read-model, not a cross-boundary DTO mirroring a source subset. |
| VI / VII — Testing / TDD | Tests-first; unit + integration | ✅ Unit tests (Contracts A & B) + Playwright growth test (Contract C) written before implementation; Full/legacy fixture is the regression guard. |
| VIII — Documentation | Specs before code | ✅ Spec + this plan precede implementation. |
| IX — Dependencies | Minimal, vetted, justified | ✅ One **internal workspace** dep added (`@debrief/utils`) to reuse the canonical trail-slice helper — see justification below; no external/third-party dep. |
| XV — Strict Type Safety | No `any`; strict mode | ✅ `display_mode` read as `DisplayMode \| undefined`; ISO→epoch narrowed once at the validity gate; `<Polyline positions>` typed `LatLngTuple[]`. |

**Dependency justification (Article IX)**: `@debrief/utils` is an internal
`workspace:*` package already built in the monorepo (a transitive dep via
`@debrief/components`). Depending on it directly lets the renderer reuse the
**exact** `sliceTrackToTime` the main app uses, which is what makes FR-008 (visual
parity) true by construction rather than by a drift-prone copy. No third-party
surface is added.

**Result**: PASS (initial). No violations → Complexity Tracking is empty.
Re-checked after Phase 1 design: still PASS (design introduces no new types,
services, or persistence paths).

## Project Structure

### Documentation (this feature)

```text
specs/280-briefing-trail-mode/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — decisions (slice reuse, Polyline render, mode predicate, fallback)
├── data-model.md        # Phase 1 — boundary inputs + derived TemporalTrack read-model
├── quickstart.md        # Phase 1 — run/dev/test walkthrough
├── contracts/
│   └── trail-rendering.md   # Contracts A (pure mapping), B (classification), C (observable)
├── checklists/
│   └── requirements.md  # Spec quality checklist (all pass)
└── evidence/
    ├── opening-context.md          # Phase 2 — cached blog opener
    └── screenshots/                # Playwright output: trail-{start,growth,end}.png
```

### Source Code (repository root)

```text
apps/briefing-renderer/
├── package.json                              # + "@debrief/utils": "workspace:*"
├── src/
│   ├── components/
│   │   ├── BriefingMap.tsx                    # THE FIX: read display_mode; classify temporal tracks;
│   │   │                                      #   render tracks as stable-keyed <Polyline> (sliced in Trail mode)
│   │   └── __tests__/
│   │       └── BriefingMap.trail.test.tsx     # NEW unit tests — Contracts A & B
│   └── fixtures/
│       └── dev-fixture.ts                     # EXTEND: add a Trail scene + a Full scene
└── playwright/tests/
    └── briefing-zip-trail-mode.spec.ts        # NEW Playwright growth test — Contract C (writes evidence PNGs)
```

**Structure Decision**: Single front-end app. All changes live under
`apps/briefing-renderer/`. The only cross-package touchpoint is consuming
`sliceTrackToTime` from the existing `@debrief/utils` workspace package.

## Media Components

None — the change is a map-rendering behaviour in the briefing-renderer SPA, not a
standalone Storybook component. It is demonstrated via the Playwright "growth"
screenshots (`trail-start` → `trail-growth` → `trail-end`), which are the right
medium for an animated/temporal effect and feed the feature post directly. No
`.stories.tsx` is added or changed.

## Storybook E2E Testing

None — no new or changed Storybook component.

## Web-Shell E2E Testing

None for web-shell. The affected surface is the **standalone briefing renderer**,
which has its own Playwright suite. The end-to-end coverage for this feature is a
new spec there:

| Workflow | Components Involved | Key Selectors | Interactions |
|----------|---------------------|---------------|--------------|
| Trail scene grows over playback | `BriefingMap` (`<Polyline>` tracks), `TimeSlider` | `[data-testid="briefing-map"]`, the trail polyline layer (tagged for measurement), time-slider | load Trail-scene briefing; sample trail length at start, mid, end; assert monotonic growth + capture `trail-{start,growth,end}.png` |
| Full / legacy scene unchanged | `BriefingMap` (`<GeoJSON>`/`<Polyline>` full) | `[data-testid="briefing-map"]` | load Full and legacy briefings; assert full track at all positions, no console error |

**Run Commands**:
- Cloud: `cd apps/briefing-renderer && node run-playwright.mjs briefing-zip-trail-mode`
- Local: `pnpm --filter @debrief/briefing-renderer test:e2e -- briefing-zip-trail-mode`

**Test File Location**: `apps/briefing-renderer/playwright/tests/briefing-zip-trail-mode.spec.ts`

## Complexity Tracking

No constitution violations — section intentionally empty.
