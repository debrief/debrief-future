# Tasks: Log Panel Flip-Card Interaction

**Feature**: 113-prov-card-flip / 114-keyboard-flip-card
**Date**: 2026-02-27
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Phase 1: Schema & Type Foundation [setup]

- [ ] T101 Add `disabled` and `rationale` attributes to LinkML schema `shared/schemas/src/linkml/log-entry.yaml`
- [ ] T102 [P] Add `disabled` and `rationale` fields to `shared/components/src/LogPanel/types.ts` (TimelineEntry)
- [ ] T103 [P] Add `disabled` and `rationale` fields to `services/session-state/src/log/types.ts` (LogEntry)
- [ ] T104 [P] Add flip-card strings to `shared/components/src/LogPanel/strings.ts`
- [ ] T105 [P] Add flip-card message types and EditFace-related types to `shared/components/src/LogPanel/types.ts`

## Phase 2: New UI Components [foundation]

- [ ] T201 Create `shared/components/src/LogPanel/CardFlip.tsx` — pure CSS 3D flip animation container (6A)
- [ ] T202 Create `shared/components/src/LogPanel/CardFlip.css` — flip animation styles
- [ ] T203 Create `shared/components/src/LogPanel/SkeletonLoader.tsx` — loading placeholder for schema fetch
- [ ] T204 Create `shared/components/src/LogPanel/SkeletonLoader.css` — skeleton shimmer animation
- [ ] T205 [P] Create `shared/components/src/LogPanel/SliderControl.tsx` — bounded numeric slider with readout
- [ ] T206 [P] Create `shared/components/src/LogPanel/ColorPickerControl.tsx` — NamedColor colour picker
- [ ] T207 [P] Create `shared/components/src/LogPanel/JsonEditorControl.tsx` — JSON textarea fallback
- [ ] T208 [P] Create `shared/components/src/LogPanel/DisableToggle.tsx` — disable switch with dependency warning
- [ ] T209 [P] Create `shared/components/src/LogPanel/DeleteConfirmation.tsx` — deletion confirmation prompt
- [ ] T210 [P] Create `shared/components/src/LogPanel/RationaleField.tsx` — rationale text area
- [ ] T211 Create `shared/components/src/LogPanel/EditFace.tsx` — edit face layout integrating all controls
- [ ] T212 Create `shared/components/src/LogPanel/EditFace.css` — edit face styles

## Phase 3: Component Integration [user-story-1]

- [ ] T301 Add dependency graph utilities to `shared/components/src/LogPanel/utils.ts` (cascadeDisable with visited guard F1)
- [ ] T302 Modify `shared/components/src/LogPanel/LogEntry.tsx` — refactor to support front/back face via CardFlip, add pencil icon, disabled/deleted styling
- [ ] T303 Modify `shared/components/src/LogPanel/LogPanel.tsx` — add editingActivityId state, schema cache (Map via useRef 3A), single-card constraint, schema request/response handling
- [ ] T304 Modify `shared/components/src/LogPanel/LogActionBar.tsx` — remove Tune button, add Rationale shortcut with flip-and-focus
- [ ] T305 Modify `shared/components/src/LogPanel/ParameterEditor.tsx` — add live-replay mode (remove commit/cancel when live), integrate slider for bounded numerics
- [ ] T306 Add disabled/edit-face styles to `shared/components/src/LogPanel/LogPanel.css`
- [ ] T307 Update `shared/components/src/LogPanel/index.ts` — export new components and types

## Phase 4: Service Layer [user-story-2]

- [ ] T401 Add `disableEntry()` and `setRationale()` methods to `services/session-state/src/log/logService.ts`
- [ ] T402 Modify `services/session-state/src/log/replayEngine.ts` — skip disabled entries during replay
- [ ] T403 Update `toTimelineEntry()` in `apps/vscode/src/views/logPanelView.ts` — map disabled and rationale fields

## Phase 5: Extension Wiring [user-story-3]

- [ ] T501 Add schema:request/response, disable:toggle, rationale:update message handlers to `apps/vscode/src/views/logPanelView.ts`
- [ ] T502 Add schema cache (Map in useRef), edit state management, and new message routing to `apps/vscode/src/webview/web/logPanel.tsx`

## Phase 6: Stories & Testing [polish]

- [ ] T601 Add flip-card stories to `shared/components/src/LogPanel/LogPanel.stories.tsx` (CardFlip, EditFace, DisableToggle, DeleteConfirmation, SingleCardConstraint)
- [ ] T602 [test] Run `task verify` to confirm build and tests pass

## Phase 7: Evidence & Media [evidence]

- [ ] T701 Create `specs/113-prov-card-flip/evidence/test-summary.md` with build/test results
- [ ] T702 Create `specs/113-prov-card-flip/evidence/usage-example.md` demonstrating the feature
- [ ] T703 Create `specs/113-prov-card-flip/media/shipped-post.md` — shipped blog post
- [ ] T704 Create `specs/113-prov-card-flip/media/linkedin-shipped.md` — LinkedIn summary

## Phase 8: PR Creation [release]

- [ ] T801 Create PR and publish blog: run /speckit.pr

## Evidence Requirements

| Artifact | Path | Description |
|----------|------|-------------|
| Test summary | `evidence/test-summary.md` | Build verification and test results |
| Usage example | `evidence/usage-example.md` | Flip-card interaction walkthrough |
