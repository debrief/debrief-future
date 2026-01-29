# Implementation Plan: Wire TimeController to TemporalTrackLayer

**Branch**: `039-wire-timecontroller-temporal-track` | **Date**: 2026-01-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/039-wire-timecontroller-temporal-track/spec.md`

## Summary

Wire the existing TimeController sidebar to the map webview so that scrubbing time and toggling display mode updates track rendering in real-time. Port the binary-search temporal algorithms from `shared/components` into the vanilla JS map webview, extend `TrackRenderer` with temporal state, and forward `displayMode` changes through the message pipeline.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension webview)
**Primary Dependencies**: Leaflet (vanilla JS), VS Code webview API, `@debrief/session-state` (Zustand store)
**Storage**: N/A (in-memory temporal state only)
**Testing**: Vitest (unit tests for temporal algorithms)
**Target Platform**: VS Code extension webview (Chromium-based)
**Project Type**: Monorepo — changes span `apps/vscode` and `services/session-state` (read-only)
**Performance Goals**: Smooth playback at 60fps — O(log n) binary search per track per frame
**Constraints**: No React in map webview; must use vanilla Leaflet API
**Scale/Scope**: 6 files modified, 1 new file, ~200 lines of new code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status |
|---------|------|--------|
| I. Defence-Grade Reliability | Offline-only, no cloud deps | PASS — pure client-side rendering |
| II. Schema Integrity | No schema changes | PASS — no data model changes |
| IV. Architectural Boundaries | Services never touch UI | PASS — all changes in frontend/webview layer |
| VI. Testing | Unit tests required | PASS — temporalUtils.ts will have unit tests |
| VII. Test-Driven AI | Tests before implementation | PASS — tests defined for temporal algorithms |
| VIII. Documentation | Spec before code | PASS — spec.md complete |
| IX. Dependencies | Minimal, vetted deps | PASS — no new dependencies |
| XIV. Pre-Release Freedom | Breaking changes OK | N/A — no breaking changes |

**Post-design re-check**: All gates still pass. No new dependencies, no schema changes, no architectural boundary violations.

## Project Structure

### Documentation (this feature)

```text
specs/039-wire-timecontroller-temporal-track/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: type documentation
├── quickstart.md        # Phase 1: build/test guide
├── contracts/
│   └── webview-messages.ts  # New message type contract
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/vscode/src/
├── webview/
│   ├── web/
│   │   ├── temporalUtils.ts       # NEW — binary search + slice (ported from shared)
│   │   ├── trackRenderer.ts       # MODIFY — add temporal state + rendering
│   │   └── map.ts                 # MODIFY — wire handleSetCurrentTime + handleSetDisplayMode
│   ├── messages.ts                # MODIFY — add SetDisplayModeMessage
│   └── mapPanel.ts                # MODIFY — forward displayMode from session state
└── views/
    └── timeRangeView.ts           # VERIFY — displayMode already persisted to SessionStore

apps/vscode/tests/
└── unit/
    └── temporalUtils.test.ts      # NEW — unit tests for ported algorithms
```

**Structure Decision**: All changes within existing `apps/vscode` package. One new source file (`temporalUtils.ts`) and one new test file. No new packages or structural changes.

## Media Components

*Existing Storybook stories demonstrate the target behavior for reference.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| TemporalTrack | `shared/components/src/MapView/TemporalTrack.stories.tsx` | `temporal-track.js` | Shows full/trail modes with time scrubbing |
| TimeController | `shared/components/src/TimeController/TimeController.stories.tsx` | `time-controller.js` | Shows playback UI controls |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/mapview-temporaltrack`

## Complexity Tracking

No constitution violations. No complexity justifications needed.
