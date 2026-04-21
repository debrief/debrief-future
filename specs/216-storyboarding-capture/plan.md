# Implementation Plan: Storyboarding — Capture

**Branch**: `216-storyboarding-capture` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/216-storyboarding-capture/spec.md`

## Summary

Ship the **Map Viewer capture flow** for the Storyboarding epic (#024) as a
thin VS Code extension slice that leans on three pieces of already-shipped
infrastructure:

1. **#215's headless CRUD module** (`@debrief/components/storyboard`) —
   `createStoryboard`, `createScene`, `getActiveStoryboardDefault`,
   `DuplicateTimestampError`, `formatDtg`. No domain logic re-implemented in
   the extension; the extension is orchestration only.
2. **#174's thumbnail capture pipeline** — `MapPanel.requestThumbnailCapture()`
   already produces large + small base64 PNGs from the live Leaflet DOM.
   Reused verbatim; this spec adds a **per-Scene** write path
   (`scene-{ulid}.png` under the STAC Item dir + a `scene-thumbnail-{id}`
   asset entry) instead of #174's plot-level `thumbnail.png`.
3. **Session-state store** (`@debrief/session-state`) — single source of
   truth for `viewport: ViewportPolygon`, `currentTime: epoch-ms`, and
   `hiddenFeatureIds`. Capture reads a consistent snapshot from
   `session.getState()`; no round-trip to the webview is needed.

New artefacts this slice adds: **one command handler** (`captureScene.ts`),
**one keybinding contribution** (`ctrl/cmd+alt+c` with
`when: "debrief.mapFocused"`), **one WebviewViewProvider** for the minimal
Storyboard panel (Scene list + thumbnails + DTG titles — playback /
editing belong to #217 and #218), **one per-Scene thumbnail service**, and
a small **MapPanel mutator** to swap the plot FeatureCollection when CRUD
returns a new one. Duplicate-timestamp collisions resolve through a modal
`showInformationMessage` with Replace / Offset (+1 s) / Cancel buttons;
first-capture Storyboard naming uses `showQuickPick` with inline
collision validation.

The extension path is entirely JavaScript runtime; no new Python code.

## Technical Context

> _To fill: Language, dependencies, storage, testing, platform, project
> type, perf goals, constraints, scale._

**Language/Version**: _TBD_
**Primary Dependencies**: _TBD_
**Storage**: _TBD_
**Testing**: _TBD_
**Target Platform**: _TBD_
**Project Type**: _TBD_
**Performance Goals**: _TBD_
**Constraints**: _TBD_
**Scale/Scope**: _TBD_

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> _To fill: per-Article decision table with status._

## Project Structure

### Documentation (this feature)

> _To fill: tree of `specs/216-storyboarding-capture/` artefacts._

### Source Code (repository root)

> _To fill: concrete tree of files touched / added — `apps/vscode/src/`,
> `shared/components/src/`, test locations._

**Structure Decision**: _TBD_

## Media Components

> _To fill in Phase 1.5: Storybook stories (if any) for blog demo, or
> "None — backend/infrastructure feature"._

## Storybook E2E Testing

> _To fill: story-level Playwright tests, or "None — no interactive
> Storybook components."_

## VS Code Webview E2E Testing

> _To fill: extension-level Playwright workflow through code-server._

## Complexity Tracking

> _Fill only if Constitution Check has violations that must be justified._
