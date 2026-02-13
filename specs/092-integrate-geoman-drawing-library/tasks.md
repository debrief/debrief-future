# Tasks: Integrate Geoman Drawing Library

**Input**: Design documents from `specs/092-integrate-geoman-drawing-library/`
**Prerequisites**: plan.md (required), spec.md (required)

---

## Evidence Requirements

**Evidence Directory**: `specs/092-integrate-geoman-drawing-library/evidence/`

### Minimum Evidence

1. **Test Summary** (`evidence/test-summary.md`): vitest results + build verification
2. **Usage Example** (`evidence/usage-example.md`): How to use `useGeoman` hook
3. **Screenshots** (`evidence/screenshots/`): Storybook story showing Geoman drawing

---

## Phase 1: Setup (Install Dependency)

**Purpose**: Install Geoman and verify it resolves correctly

- [ ] T001 [US1] Install `@geoman-io/leaflet-geoman-free` in `shared/components/package.json` via `pnpm add @geoman-io/leaflet-geoman-free` from `shared/components/`
- [ ] T002 [US1] Run `pnpm install` from workspace root to update lockfile
- [ ] T003 [US1] Verify TypeScript types resolve: create a temporary test import of `@geoman-io/leaflet-geoman-free` and run `tsc --noEmit` in `shared/components/`

**Checkpoint**: Geoman package installed, types available, lockfile updated

---

## Phase 2: Core Integration — US1 (Geoman Initializes on Map) + US4 (No Regressions) 🎯 MVP

**Goal**: Create `useGeoman` hook, import CSS, verify no regressions

**Independent Test**: Import `useGeoman` in a test, mount MapView with it, verify `map.pm` exists

### Implementation

- [ ] T004 [US1] Create `shared/components/src/MapView/GeomanControl/useGeoman.ts` — implement `useGeoman` hook:
  - Call `L.PM.setOptIn(true)` at module level (before any map creation)
  - Accept options: `{ addControls?: boolean; controlOptions?: object }`
  - Use `useMap()` to get the Leaflet map instance
  - On mount: if `addControls` is true, call `map.pm.addControls(controlOptions)`
  - On unmount: call `map.pm.removeControls()` if controls were added
  - Return `{ map }` for consumers who need programmatic access
- [ ] T005 [P] [US1] Create `shared/components/src/MapView/GeomanControl/index.ts` — barrel export for `useGeoman` and its types
- [ ] T006 [US1] Add Geoman CSS import to `shared/components/src/MapView/MapView.tsx` — add `import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';` after the existing `import 'leaflet/dist/leaflet.css';` line
- [ ] T007 [US1] Add Geoman side-effect import to `shared/components/src/MapView/MapView.tsx` — add `import '@geoman-io/leaflet-geoman-free';` to trigger Geoman's auto-attachment to Leaflet
- [ ] T008 [US1] Update `shared/components/src/MapView/index.ts` — add `export { useGeoman } from './GeomanControl';` and `export type { UseGeomanOptions } from './GeomanControl';`

### Tests

- [ ] T009 [US4] Run existing MapView unit tests: `pnpm --filter @debrief/components test` — verify all pass without modification
- [ ] T010 [US1] Create `shared/components/src/MapView/GeomanControl/useGeoman.test.ts` — unit test that verifies:
  - `useGeoman` can be imported
  - When called without options, no controls are added (mock `map.pm.addControls` not called)
  - When called with `addControls: true`, `map.pm.addControls` is called

**Checkpoint**: Geoman hook exists, CSS imported, all existing tests pass

---

## Phase 3: Build Verification — US2 (VS Code Webview Bundle)

**Goal**: Verify esbuild bundles Geoman without errors for VS Code webview

- [ ] T011 [US2] Run `pnpm --filter debrief-vscode compile:webview` and verify exit code 0
- [ ] T012 [US2] Check `apps/vscode/dist/webview/mapView.js` exists and is non-empty after build
- [ ] T013 [US2] Run full VS Code extension compile: `pnpm --filter debrief-vscode compile` — verify both extension and webview builds succeed

**Checkpoint**: VS Code webview builds with Geoman without errors

---

## Phase 4: Storybook Story — US3 (Proof-of-Concept)

**Goal**: Create interactive Storybook story demonstrating Geoman drawing

- [ ] T014 [US3] Create `shared/components/src/MapView/Geoman.stories.tsx` with stories:
  - **GeomanToolbar**: MapView with `useGeoman({ addControls: true })` — shows Geoman toolbar, demonstrates polygon/rectangle/marker drawing
  - **GeomanProgrammatic**: MapView where a button enables drawing mode programmatically via `map.pm.enableDraw('Polygon')` — demonstrates API usage without toolbar
  - **GeomanDisabled**: Default MapView with Geoman loaded but dormant — demonstrates no visual change (regression proof)
- [ ] T015 [US3] Add Storybook action logging for `pm:create` events in the stories — when a shape is drawn, log the GeoJSON geometry to Storybook actions panel
- [ ] T016 [US3] Verify stories render in all three themes (light, dark, vscode) by running Storybook locally

**Checkpoint**: Interactive Storybook stories demonstrate Geoman drawing capability

---

## Phase 5: Proof-of-Concept — "Add Rectangle" Button (Temporary)

**Goal**: Prove Geoman works end-to-end by adding a temporary "Add Rectangle" button to the LeafletToolbar. This button enables Geoman rectangle drawing mode when clicked. The rectangle is drawn on the map but NOT persisted. This is deliberately temporary — will be superseded by #093 (drawing toolbar).

- [ ] T017 [US1] Add a temporary "Add Rectangle" button to `LeafletToolbar` in `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`:
  - Add a rectangle icon button (use a simple SVG or Unicode character) to the toolbar
  - On click: call `map.pm.enableDraw('Rectangle')` to enter rectangle drawing mode
  - On `pm:create`: exit drawing mode (single-draw behavior)
  - Mark the button/code with `// TEMPORARY: 092-proof-of-concept — remove when #093 lands`
- [ ] T018 [US1] Verify in Storybook: open any MapView story with the toolbar visible, click "Add Rectangle", draw a rectangle on the map, confirm the rectangle renders
- [ ] T019 [US2] Verify in VS Code webview build: run `pnpm --filter debrief-vscode compile`, confirm the rectangle button appears in the map toolbar when running the extension

**Checkpoint**: User can click "Add Rectangle" in the toolbar, draw a rectangle on the map — proves Geoman integration works end-to-end

---

## Phase 6: Polish & Evidence Collection

**Purpose**: Capture evidence and finalize

- [ ] T020 Run full test suite: `pnpm --filter @debrief/components test` — capture output
- [ ] T021 Create evidence directory: `mkdir -p specs/092-integrate-geoman-drawing-library/evidence/screenshots`
- [ ] T022 Capture test summary in `specs/092-integrate-geoman-drawing-library/evidence/test-summary.md`
- [ ] T023 Write usage example in `specs/092-integrate-geoman-drawing-library/evidence/usage-example.md` showing how to use `useGeoman` hook
- [ ] T024 Update `specs/092-integrate-geoman-drawing-library/spec.md` status from "Draft" to "Implemented"

**Checkpoint**: Evidence collected, ready for PR creation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Core)**: Depends on Phase 1 — T004-T008 are sequential; T009-T010 run after T008
- **Phase 3 (Build)**: Depends on Phase 2 — verify build only after code changes
- **Phase 4 (Story)**: Depends on Phase 2 — needs `useGeoman` hook to exist
- **Phase 5 (Proof-of-Concept)**: Depends on Phase 2 — needs Geoman initialized on map
- **Phase 6 (Polish)**: Depends on Phases 2-5

### Parallel Opportunities

- T005 can run in parallel with T004 (different files)
- T009 can run in parallel with T010 (different test files)
- Phase 3 and Phase 4 can run in parallel (build verification and story creation are independent)

---

## Notes

- Geoman auto-attaches to Leaflet on import — the side-effect import in MapView.tsx is sufficient
- `L.PM.setOptIn(true)` is critical — without it, Geoman auto-manages all layers and breaks existing track interaction
- CSS is loaded as text by esbuild (`--loader:.css=text`) — same mechanism as `leaflet/dist/leaflet.css`
- The `'unsafe-inline'` CSP in the VS Code webview HTML already permits CSS injection
- Commit after each phase checkpoint
