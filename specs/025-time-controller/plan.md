# Implementation Plan: Time Controller UI/UX

**Branch**: `025-time-controller` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-time-controller/spec.md`

## Summary

Build a time controller component for the VS Code extension sidebar that enables analysts to navigate through time-stamped track data. The component provides a time scrubber for manual navigation, play/pause controls for animated playback, speed selection (1x-8x), and keyboard shortcuts. Implemented as a React component in the shared-react-components library for reuse across Debrief frontends.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18+, VS Code Webview API
**Storage**: N/A (component state only, time position managed via props/context)
**Testing**: Vitest + React Testing Library + Storybook
**Target Platform**: VS Code webview (Electron-based)
**Project Type**: Component library (shared-react-components)
**Performance Goals**: 10 fps minimum animation, <100ms response to user input
**Constraints**: Offline-capable, VS Code webview sandbox, no external network calls
**Scale/Scope**: Single panel component, ~500 LOC estimated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | PASS | No network calls; all time calculations local |
| I.3 | No silent failures | PASS | Disabled state when no data; clear UI feedback |
| II.1 | Schema single source of truth | N/A | UI component; consumes data, doesn't define schema |
| III.1 | Provenance always | N/A | Display-only; no data transformation |
| IV.1 | Services never touch UI | PASS | This IS the UI layer |
| IV.2 | Frontends never persist | PASS | No persistence; state via props/context |
| VI.2 | Services require unit tests | PASS | Component tests required |
| VIII.1 | Specs before code | PASS | Specification complete |
| XII.1 | Public by default | PASS | Part of open-source shared components |

**Gate Status**: PASSED - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/025-time-controller/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (component props interface)
├── checklists/          # Validation checklists
│   └── requirements.md  # Spec quality checklist (complete)
└── media/               # Phase 2 output
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/
└── components/
    └── time-controller/
        ├── TimeController.tsx       # Main component
        ├── TimeController.test.tsx  # Unit tests
        ├── TimeController.stories.tsx # Storybook stories
        ├── useTImePlayback.ts       # Playback logic hook
        ├── useTimePlayback.test.ts  # Hook tests
        ├── TimeScrubber.tsx         # Scrubber sub-component
        ├── PlaybackControls.tsx     # Play/pause/speed sub-component
        ├── TimeDisplay.tsx          # Time display sub-component
        └── index.ts                 # Public exports
```

**Structure Decision**: Component lives in `shared/components/time-controller/` as part of the shared-react-components library. This enables reuse across VS Code extension, Electron loader app, and future frontends. Sub-components are co-located for maintainability.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| TimeController | `time-controller/TimeController.stories.tsx` | `time-controller.js` | Full controller demo with mock time range |
| TimeScrubber | `time-controller/TimeScrubber.stories.tsx` | `time-scrubber.js` | Scrubber interaction patterns |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (to be created)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/time-controller--default`

## Complexity Tracking

> No Constitution violations to justify. Component is straightforward UI with no architectural concerns.

*None - simple component implementation*
