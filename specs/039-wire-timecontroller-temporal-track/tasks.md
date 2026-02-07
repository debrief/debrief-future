# Tasks: Wire TimeController to TemporalTrackLayer

**Input**: Design documents from `/specs/039-wire-timecontroller-temporal-track/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests for temporal algorithms are required (spec.md Testing Strategy).

---

## Evidence Requirements

**Evidence Directory**: `specs/039-wire-timecontroller-temporal-track/evidence/`
**Media Directory**: `specs/039-wire-timecontroller-temporal-track/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for temporalUtils + existing tests | After all tests pass |
| usage-example.md | Step-by-step walkthrough of scrubbing tracks | After wiring complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: New file creation and scaffolding

- [x] T001 Create temporal utilities module `apps/vscode/src/webview/web/temporalUtils.ts`
- [x] T002 [P] Create temporal utilities test file `apps/vscode/tests/unit/temporalUtils.test.ts`

---

## Phase 2: Foundation — Temporal Algorithms & Message Types

**Purpose**: Core algorithms and types that all rendering tasks depend on

### Tests (write first, must fail)

- [x] T003 [test] Write unit tests for `findNearestPointIndex` — empty array, single element, exact match, between elements, before/after range `apps/vscode/tests/unit/temporalUtils.test.ts`
- [x] T004 [P][test] Write unit tests for `sliceTrackToTime` — empty input, before start, at start, mid-track, at end, after end `apps/vscode/tests/unit/temporalUtils.test.ts`

### Implementation

- [x] T005 Implement `findNearestPointIndex` binary search in `apps/vscode/src/webview/web/temporalUtils.ts`
- [x] T006 Implement `sliceTrackToTime` in `apps/vscode/src/webview/web/temporalUtils.ts`
- [x] T007 [P] Add `SetDisplayModeMessage` to `ExtensionToWebviewMessage` union `apps/vscode/src/webview/messages.ts`
- [x] T008 Verify tests pass for T003 and T004

**Checkpoint**: Temporal algorithms tested and message types defined

---

## Phase 3: TrackRenderer Temporal Rendering (Priority: P1) 🎯 MVP

**Goal**: TrackRenderer responds to `setCurrentTime` and `setDisplayMode`, rendering tracks with temporal awareness

**Independent Test**: Call `trackRenderer.setCurrentTime(epochMs)` and verify polyline coordinates update; call `setDisplayMode('trail')` and verify track is sliced

### Implementation

- [x] T009 Add cached timestamp state (`Map<string, number[]>`) to TrackRenderer — parse `Track.times` ISO strings to epoch ms on `renderTracks()` `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T010 Add `currentTime: number | null` and `displayMode: 'full' | 'trail'` state fields to TrackRenderer `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T011 Add highlight marker layer storage (`Map<string, L.CircleMarker>`) to TrackRenderer `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T012 Implement `setCurrentTime(time: number)` — for each track: compute nearest index, update polyline via `setLatLngs()`, update/create/remove highlight marker `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T013 Implement `setDisplayMode(mode: 'full' | 'trail')` — store mode, re-apply temporal rendering if currentTime is set `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T014 Implement `clearTemporalState()` — reset to static full-track polylines, remove all highlight markers `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T015 Update `clear()` to also clean up highlight markers and cached timestamps `apps/vscode/src/webview/web/trackRenderer.ts`

**Checkpoint**: TrackRenderer can render temporal tracks — unit algorithms tested, rendering logic complete

---

## Phase 4: Message Wiring — Extension Host to Webview

**Goal**: TimeController changes flow through the full pipeline to the map webview

**Independent Test**: Scrub TimeController slider → map tracks update; toggle display mode → map switches rendering

### Implementation

- [x] T016 Implement `handleSetCurrentTime` in map.ts — call `trackRenderer.setCurrentTime(message.time)` `apps/vscode/src/webview/web/map.ts`
- [x] T017 Implement `handleSetDisplayMode` in map.ts — call `trackRenderer.setDisplayMode(message.displayMode)` `apps/vscode/src/webview/web/map.ts`
- [x] T018 Add `'setDisplayMode'` case to message handler switch in map.ts `apps/vscode/src/webview/web/map.ts`
- [x] T019 Extend `subscribeToTemporal` callback in MapPanel to forward `displayMode` changes (map `'normal'→'full'`, `'snailTrail'→'trail'`) `apps/vscode/src/webview/mapPanel.ts`
- [x] T020 Verify `timeRangeView.ts` already persists displayMode to SessionStore (read-only check — should need no changes) `apps/vscode/src/views/timeRangeView.ts`

**Checkpoint**: Full pipeline wired — TimeController → SessionStore → MapPanel → webview → TrackRenderer

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Regression checks, evidence, media, PR

### Verification

- [x] T021 Run existing VS Code extension tests to confirm no regressions
- [x] T022 Run temporalUtils unit tests to confirm all pass
- [x] T023 Verify tracks render correctly when no temporal state is active (currentTime is null — static mode)

### Evidence Collection

- [x] T024 Capture test summary in `specs/039-wire-timecontroller-temporal-track/evidence/test-summary.md`
- [x] T025 Create usage demonstration in `specs/039-wire-timecontroller-temporal-track/evidence/usage-example.md`

### Media Content

- [x] T026 Create shipped blog post in `specs/039-wire-timecontroller-temporal-track/media/shipped-post.md`
- [x] T027 [P] Create LinkedIn shipped summary in `specs/039-wire-timecontroller-temporal-track/media/linkedin-shipped.md`

### PR Creation

- [x] T028 Create PR and publish blog: run /speckit.pr

**Task T028 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — tests first, then implementation
- **Phase 3 (TrackRenderer)**: Depends on Phase 2 (algorithms + message types)
- **Phase 4 (Wiring)**: Depends on Phase 3 (TrackRenderer must have setCurrentTime/setDisplayMode)
- **Phase 5 (Polish)**: Depends on Phases 3 + 4

### Within Phases

- Phase 2: T003 and T004 are parallel; T005/T006 depend on T001; T007 is independent
- Phase 3: T009-T011 are sequential setup; T012-T015 depend on T009-T011
- Phase 4: T016-T018 (map.ts) can run in parallel with T019 (mapPanel.ts); T020 is independent

### Parallel Opportunities

```bash
# Phase 1: Both files can be created in parallel
T001 + T002

# Phase 2: Tests can be written in parallel
T003 + T004

# Phase 2: Message type can be added in parallel with algorithm implementation
T005/T006 + T007

# Phase 4: map.ts and mapPanel.ts changes are independent
T016/T017/T018 + T019
```

---

## Implementation Strategy

### MVP First (Phase 1-3)

1. Complete Phase 1: Create files
2. Complete Phase 2: Algorithms + tests + message type
3. Complete Phase 3: TrackRenderer temporal rendering
4. **STOP and VALIDATE**: TrackRenderer can render temporal tracks with hardcoded test values

### Full Delivery (Phase 4-5)

5. Complete Phase 4: Wire message pipeline end-to-end
6. Complete Phase 5: Verify, collect evidence, create PR

---

## Notes

- [P] tasks = different files, no dependencies
- Spec requires unit tests for temporal algorithms (Testing Strategy section)
- DisplayMode mapping: session-state `'normal'/'snailTrail'` ↔ webview `'full'/'trail'`
- Track.times is `string[]` (ISO 8601) — cache as `number[]` (epoch ms) on load
- Use `polyline.setLatLngs()` for efficient per-frame updates (no full re-render)
- Run `/speckit.pr` after all tasks complete to create PR with evidence
