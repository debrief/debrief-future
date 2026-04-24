# Feature Specification: Storyboard Edit Suite — Webview Wiring + Web-shell Harness + Error Triage

**Feature Branch**: `230-storyboard-edit-wiring`
**Created**: 2026-04-24
**Status**: Draft
**Input**: Backlog item 230 (approved, V=4 M=4 A=4 Total=12, Medium complexity). Source: [docs/ideas/230-storyboard-edit-wiring-srd.md](../../docs/ideas/230-storyboard-edit-wiring-srd.md). Parent: #218 Storyboarding Edit Suite + Housekeeping.

---

## Context

Feature #218 landed the full orchestration, service, component, and command-handler surface for the Storyboard edit suite (94 of 104 tasks, 2,983 tests green). It did **not** wire the webview-side integration required to make the edit suite usable end-to-end from inside the Storyboard panel. Today, the edit features are reachable only via the VS Code command palette and #217's hard-block "Open for editing" button — there is no in-panel way to discover or trigger them. As a consequence, the Phase 5 Playwright coverage (T068/T087/T094), the evidence screenshots (T097), and the shipped blog post (T101/T102) were all deferred.

This feature closes those gaps and triages two pre-existing user-visible errors (a first-capture viewport race and a `Failed to load plot` toast on certain STAC items) so that #218 can ship with a clean polish-loop experience.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit a Scene's description from the panel (Priority: P1)

An analyst has just produced a Storyboard and wants to iterate on each Scene's title and description to make the playback meaningful. From inside the Storyboard panel, they expand a Scene row with a single click, edit its description, and save — without leaving the panel, touching the command palette, or opening a modal dialog.

**Why this priority**: This is the primary value proposition of the whole edit suite. Without an in-panel edit affordance, analysts cannot iterate fluidly; every description change requires finding the right command in the palette. The polish loop stalls here. Every other user story is a variation on reaching the same underlying edit capability.

**Independent Test**: Open the Storyboard panel against a plot with at least two Scenes. Click the chevron next to a Scene row. An inline edit form appears in place, with the current description pre-filled. Edit the text and submit. The form closes, the row updates to show the new description, and a Log Panel card records the change. Repeat with double-click on a different row — the same form appears for that row.

**Acceptance Scenarios**:

1. **Given** a Storyboard panel showing three Scene rows, **When** the analyst clicks the chevron on the second row, **Then** the inline edit form opens for that row and the chevron flips to its expanded state.
2. **Given** the edit form is open for Scene B, **When** the analyst clicks the chevron on Scene C, **Then** Scene B's form closes and Scene C's form opens (only one row's form is ever open at a time).
3. **Given** the edit form is open with unsaved changes, **When** the analyst presses the submit affordance, **Then** the new description is persisted, the form closes, and a Log Panel card appears confirming the edit.
4. **Given** the edit form is open, **When** the analyst double-clicks the Scene row body (not the overflow trigger), **Then** the form toggles closed (double-click is a redundant discoverability path that mirrors chevron behaviour).

---

### User Story 2 - Perform the full Scene action set from a right-click menu (Priority: P1)

An analyst wants to delete a Scene they no longer need, duplicate another Scene to produce a near-identical playback step, copy a Scene across to a second Storyboard in the same plot, or refresh a Scene's thumbnail after the underlying track has moved. They right-click (or press the Context Menu key) on the Scene row and pick the action from a contextual menu.

**Why this priority**: Equal-priority with Story 1 because the full polish loop needs every op to be reachable from the panel, not just description edits. Without this, the suite looks half-wired and analysts keep falling back to the command palette for anything beyond description changes.

**Independent Test**: Right-click on any Scene row. A menu appears listing six actions (Edit description, Update to current, Duplicate, Copy to other storyboard, Delete, Refresh thumbnail). Each action produces the same observable outcome as invoking its equivalent command from the palette.

**Acceptance Scenarios**:

1. **Given** a Scene row with the pointer hovering over it, **When** the analyst right-clicks (or presses `Shift+F10` with the row focused), **Then** the overflow menu opens showing the six Scene-level actions.
2. **Given** the overflow menu is open, **When** the analyst chooses **Delete**, **Then** the Scene is soft-deleted, an Undo toast appears at the bottom of the panel, and a Log Panel card records the deletion.
3. **Given** an Undo toast is visible after a soft-delete, **When** the analyst clicks **Undo** within the session, **Then** the Scene is restored byte-identically (same attributes, same thumbnail reference) and a Log Panel card records the undo.
4. **Given** the overflow menu is open, **When** the analyst chooses **Duplicate**, **Then** a new Scene appears immediately after the source Scene with its title suffixed (e.g. "(copy)"), sharing the source's attributes.
5. **Given** the overflow menu is open and the plot contains a second Storyboard, **When** the analyst chooses **Copy to other storyboard**, **Then** they are prompted to pick the destination Storyboard and the Scene is copied there.
6. **Given** a Scene whose source features have moved since capture, **When** the analyst chooses **Refresh thumbnail**, **Then** the thumbnail regenerates from the current features and the row updates in place.

---

### User Story 3 - See and resolve stale Scenes (Priority: P2)

An analyst returns to a Storyboard after editing the underlying plot. Scenes whose source features have changed since the Scene was captured show a visible "stale" marker with a tooltip naming which features diverged. The analyst can refresh a single Scene's thumbnail or bulk-refresh every stale Scene at the Storyboard level.

**Why this priority**: High-value but secondary to the core polish loop — analysts can still ship a Storyboard without the stale affordance as long as they remember to re-capture. The value kicks in once Storyboards have been around long enough for features to drift. Worth shipping alongside the polish loop because the service layer already computes staleness.

**Independent Test**: Capture two Scenes, edit the underlying track features, re-open the Storyboard panel. The affected Scene rows show a stale marker. Clicking the marker or the **Refresh** affordance re-captures the thumbnail and the marker clears.

**Acceptance Scenarios**:

1. **Given** a Scene whose source features have changed since capture, **When** the Storyboard panel refreshes, **Then** the Scene row displays a stale badge with a tooltip listing the diverged feature IDs.
2. **Given** a Scene with a stale badge, **When** the analyst clicks **Refresh thumbnail** (from chevron panel or overflow menu), **Then** the thumbnail regenerates and the badge clears on success.
3. **Given** the Storyboard has two or more stale Scenes, **When** the analyst invokes the Storyboard-level **Refresh all stale** action, **Then** every stale Scene regenerates in a single operation and each produces its own Log Panel card.
4. **Given** a thumbnail refresh fails (e.g. underlying capture pipeline error), **When** the failure returns, **Then** the badge remains and an error toast surfaces the reason without losing the stale marker.

---

### User Story 4 - Reach the polish loop from a headless test surface (Priority: P2)

A developer or automated test harness needs to exercise the full Storyboard edit workflow without launching VS Code. They navigate to an interactive web-shell page that mounts the Storyboard panel against an in-memory mock of the extension services, complete with configurable initial state (which Scenes are stale, which have pending deletes, which have missing source data).

**Why this priority**: The web-shell harness is how the team validates polish-loop regressions and produces the evidence screenshots and interaction GIF. Without it, Playwright coverage of the edit suite is stuck inside the VS Code iframe (historically flaky) and the #218 evidence artefacts cannot be captured. Secondary to end-user stories but a hard prerequisite for shipping #218's Phase 6.

**Independent Test**: Open the web-shell harness URL for the Storyboard edit page. Panel renders with a small fixture Storyboard. Every interactive path (expand, edit, overflow menu, delete+undo, duplicate, copy-to-other, update-to-current, refresh, stale badge, bulk refresh, Storyboard rename/describe) can be driven by a Playwright test without VS Code involvement.

**Acceptance Scenarios**:

1. **Given** the web-shell is running, **When** a Playwright test navigates to the Storyboard edit harness URL, **Then** the panel renders with a deterministic fixture and is ready for interaction.
2. **Given** the harness URL carries initial-state query-string knobs (e.g. which Scenes start stale, which have pending deletes, which have missing source data), **When** the page loads, **Then** the panel renders in exactly the requested initial state.
3. **Given** the four Storybook stories that demonstrate the edit suite (form visible, undo toast visible, stale badge visible, missing-data remediation visible), **When** opened in Storybook, **Then** each story is **fully interactive** — chevron clicks open the real form, Undo restores the row, Refresh clears the stale badge — rather than frozen on a static fixture.

---

### User Story 5 - Open a fresh plot and capture without spurious errors (Priority: P3)

An analyst opens a plot they have not loaded this session and immediately captures a Scene. The capture succeeds cleanly. A second analyst opens a plot that previously surfaced a `Failed to load plot` toast in the past; it now opens without the toast and, if something does go wrong, the output channel records exactly which step in the load path failed.

**Why this priority**: Error triage is critical for shipping #218 with a clean experience but does not unblock the polish loop itself — those errors were pre-existing and analysts had learned to retry around them. Addressing them here prevents the new panel affordances from sitting behind an error toast on first interaction.

**Independent Test**: (a) Open a plot never loaded this session, immediately press Capture before panning the map — no "viewport not reported" toast appears. (b) Reproduce the original failing `Failed to load plot` scenario against the specific plot captured in PR #520's manual test — plot opens cleanly; the output channel would record the failing step if something still goes wrong.

**Acceptance Scenarios**:

1. **Given** a fresh plot has just been opened, **When** the analyst clicks Capture before panning or interacting with the map, **Then** the capture succeeds and no `Capture failed — map has not reported a viewport yet` toast appears.
2. **Given** the specific plot that failed in PR #520's manual test, **When** the analyst opens it, **Then** the plot loads cleanly without the `Failed to load plot` toast.
3. **Given** any plot still fails to load, **When** the failure occurs, **Then** the Debrief output channel records the precise load step that returned null (e.g. item file missing, parse error, missing required field), enabling targeted diagnosis.
4. **Given** any additional error is surfaced during follow-up manual testing, **When** it is reproduced, **Then** it is either fixed in this feature (if it is a wiring gap introduced by #218's webview work) or captured as a new backlog item with a reproduction recipe (if the root cause predates #218 and is non-trivial).

---

### Edge Cases

- **Only one form open at a time**: Opening a new row's edit form while another is already open must collapse the previous one automatically; the user should never see two forms expanded simultaneously.
- **Overflow menu keyboard access**: The menu must be reachable and navigable without a mouse (Context Menu key / `Shift+F10` to open, arrow keys to traverse, `Enter` to activate, `Escape` to dismiss).
- **Undo after session close**: The Undo toast reflects a session-scoped buffer. On plot close the buffer finalises; re-opening the plot never re-surfaces the Undo toast.
- **Deep-copy failure on copy-to-other**: When copying a Scene to another Storyboard fails mid-operation (e.g. thumbnail deep-copy error), the destination Storyboard must not be left with a partial Scene; the operation either completes or rolls back cleanly.
- **Missing source data remediation**: A Scene whose source features have been deleted from the plot (not merely edited) must surface a remediation affordance rather than a silent stale badge — the analyst needs to decide whether to delete the Scene or swap its source.
- **Escape key inside the edit form**: Pressing `Escape` while the textarea has focus behaves as normal (does not close the form); pressing `Escape` when the form has focus but the textarea does not closes the form.
- **Stale flag while form is open**: If a Scene becomes stale while its edit form is open, the stale badge appears on the row without disturbing the form; the analyst's in-flight edit is not discarded.
- **Bulk refresh partial failure**: When `Refresh all stale` encounters one failing Scene, remaining Scenes continue to refresh; each failure surfaces its own toast and the corresponding stale badge remains.

---

## Requirements *(mandatory)*

### Functional Requirements

**In-panel row-level affordance**

- **FR-001**: Every Scene row MUST expose a chevron control that toggles an inline edit form for that row. The chevron visibly reflects the expanded/collapsed state.
- **FR-002**: Double-clicking anywhere on a Scene row (excluding the overflow-menu trigger) MUST toggle the inline edit form for that row. Single-click MUST continue to behave as today (transport-select, per #217).
- **FR-003**: Right-clicking a Scene row (or pressing `Shift+F10` / the Context Menu key with the row focused) MUST open a contextual overflow menu offering the six Scene-level actions: **Edit description**, **Update to current**, **Duplicate**, **Copy to other storyboard**, **Delete**, **Refresh thumbnail**.
- **FR-004**: At most one Scene row's edit form MUST be open at any time. Opening a new row's form MUST collapse the previously open one automatically.
- **FR-005**: Every overflow-menu action MUST produce the same observable outcome as invoking its equivalent command from the VS Code command palette (same prompts where applicable, same success/error toasts, same Log Panel cards).

**Panel reducer and data flow**

- **FR-006**: The Storyboard panel MUST maintain the following local display state: which row's edit form is open, which Scenes are currently flagged stale (with their unresolved feature IDs), and which Undo toast (if any) is currently visible.
- **FR-007**: The panel MUST receive authoritative state updates from the extension for scene rows, stale flags, and pending undo toasts; local display state MUST NOT drift from the extension's authoritative state.
- **FR-008**: The refresh cycle that supplies the panel with data MUST remain bounded by the number of Scenes in the active Storyboard (the O(active-storyboard Scenes) invariant established in #218 must not be broken by this feature).
- **FR-009**: Every user-triggered edit action in the panel MUST be surfaced to the extension as a single standalone event; the panel MUST NOT bundle multiple user intents into one event, and MUST NOT carry derived state from another action's result.
- **FR-010**: Dismissing an Undo toast MUST be panel-local; it MUST NOT require an extension round-trip (the session-scoped buffer finalises on plot close regardless of whether the toast was dismissed).

**Storyboard-level affordances**

- **FR-011**: Users MUST be able to rename the Storyboard and edit its description from the panel.
- **FR-012**: Users MUST be able to invoke a **Refresh all stale** action at the Storyboard level that regenerates every stale Scene's thumbnail; each Scene's refresh MUST produce its own Log Panel card, and a partial failure MUST NOT prevent remaining Scenes from being refreshed.

**Web-shell harness (interactive polish-loop surface)**

- **FR-020**: A dedicated web-shell page MUST mount the Storyboard panel against an in-memory mock of the extension services that mirrors the extension's message contract faithfully enough for the panel to behave identically to its VS Code counterpart.
- **FR-021**: The harness URL MUST accept query-string parameters that configure the initial state (at minimum: which Scenes start stale, which have pending deletes, which have missing source data) so automated tests can set up a scenario deterministically.
- **FR-022**: Every click path in the polish loop MUST be exercisable inside the harness without any VS Code involvement.
- **FR-023**: The existing edit-suite Storybook stories MUST be upgraded from static fixtures to **fully interactive** stories that share the same behavioural layer as the VS Code panel; a reviewer looking at a story MUST be able to click through the flow and see real state transitions rather than frozen placeholders.

**End-to-end test coverage**

- **FR-030**: Automated end-to-end tests MUST drive the full polish loop via the web-shell harness, including: rename → describe → delete-and-undo → update-to-current → duplicate → duplicate-at-colliding-timestamp → copy-to-other-storyboard → deep-copy-failure (induced via mock) → Storyboard rename and describe.
- **FR-031**: Automated end-to-end tests MUST cover the stale detection and refresh flows (single-scene refresh + bulk refresh-all-stale) via the web-shell harness.
- **FR-032**: Automated end-to-end tests MUST cover the missing-data routing and remediation affordance via the web-shell harness.
- **FR-033**: A thin complementary end-to-end test MUST run inside VS Code (code-server) covering **only** flows that require real VS Code chrome: command-palette invocation for each of the eleven new commands, native input-box prompts (rename, duplicate-timestamp, storyboard rename), native quick-pick (copy-to-other destination), and native notification toasts.
- **FR-034**: The VS Code end-to-end test MUST NOT duplicate click flows already covered by the web-shell suite; its purpose is only to prove the VS Code-chrome integration points.
- **FR-035**: Every successful edit op in the end-to-end test runs MUST be validated by asserting that a matching Log Panel card is emitted.

**Evidence artefacts**

- **FR-040**: The end-to-end test run MUST produce the evidence screenshots enumerated in #218's evidence requirements table, saved under `specs/218-storyboarding-edit/evidence/screenshots/`.
- **FR-041**: The end-to-end test run MUST produce a short (< 5 s, < 2 MB) interaction recording demonstrating the core polish loop (rename → describe → delete-and-undo → refresh-stale) suitable for embedding in the shipped blog post.

**Error triage**

- **FR-050**: Opening a fresh plot and immediately capturing a Scene (before any user interaction with the map) MUST NOT surface the `Capture failed — map has not reported a viewport yet` error. The panel MUST report an initial viewport to the extension reliably regardless of whether downstream map events fire.
- **FR-051**: When a plot fails to load, the Debrief output channel MUST record which specific step in the load path returned null (missing item file, parse error, missing required field, etc.) so the failure can be diagnosed from the output channel alone.
- **FR-052**: The specific plot that surfaced `Failed to load plot` in PR #520's manual test MUST open cleanly after the fix.
- **FR-053**: Any additional user-visible error surfaced during follow-up manual testing MUST be either fixed in this feature (if the root cause is a wiring gap introduced by #218's webview work) or captured as a new backlog item with a reproduction recipe (if the root cause predates #218 and is non-trivial).

### Key Entities

- **Scene edit view-model**: The per-Scene display bundle the panel needs to render a row. Combines Scene attributes (title, description, timestamp, thumbnail reference), stale status (stale flag + unresolved feature IDs), and any pending undo-toast descriptor.
- **Undo toast descriptor**: Session-scoped record of the most recent soft-delete. Contains the deleted Scene's identity and enough context to render the toast; clears on plot close or when superseded by a newer deletion.
- **Stale flag**: Derived marker per Scene indicating whether its source features have diverged since capture. Carries the list of unresolved feature IDs for tooltip display.
- **Mock extension port (harness-only)**: In-memory simulation of the extension's message surface used by the web-shell harness to let the panel run identically outside VS Code. Mirrors the real contract's message shapes and ordering; is never shipped to end users.

---

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Iterate on a Storyboard by editing each Scene's metadata, removing Scenes that no longer belong, duplicating and copying Scenes across Storyboards, and keeping thumbnails current — all without leaving the Storyboard panel.
- **Key Decision(s)**:
  1. Which Scene to edit or act on (identified by row position, thumbnail preview, and title).
  2. Which action to perform on that Scene (edit description / update to current / duplicate / copy to other storyboard / delete / refresh thumbnail).
  3. For Copy to other storyboard — which destination Storyboard to copy into.
  4. Whether to undo a just-deleted Scene before the session closes.
  5. Whether to refresh a single stale Scene now, bulk-refresh all stale Scenes, or leave them stale for later.
- **Decision Inputs**: Each Scene row shows its thumbnail preview, title, timestamp, and any stale badge (with tooltip naming the diverged features). The Undo toast shows the just-deleted Scene's title. The overflow menu is labelled with action names the analyst already knows from the command palette.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Storyboard panel — all rows collapsed | Click chevron on a Scene row (or double-click the row body, or right-click → **Edit description**) | The row's inline edit form opens; any previously open form closes |
| 2 | Scene row expanded — edit form visible | Edit the description, then submit | Form closes, row updates to show the new description, Log Panel records the edit |
| 3 | Scene row — pointer hovering | Right-click the row | Overflow menu opens with six Scene-level actions |
| 4 | Overflow menu open | Choose **Delete** | Row disappears from the list; Undo toast appears at the bottom of the panel; Log Panel records the deletion |
| 5 | Undo toast visible | Click **Undo** (within session) | Deleted Scene reappears in its original position; Log Panel records the undo |
| 6 | Scene row with stale badge | Click **Refresh thumbnail** (chevron panel or overflow) | Thumbnail regenerates; stale badge clears on success |
| 7 | Storyboard header — some Scenes stale | Invoke **Refresh all stale** | Every stale Scene's thumbnail regenerates; each produces its own Log Panel card |

### UI States

- **Empty State**: When the active plot has no Storyboards, the panel shows an empty-state message directing the analyst to capture a Scene to create one. When a Storyboard has no Scenes yet, the panel shows a prompt to capture the first Scene.
- **Loading State**: During any long-running action (thumbnail refresh, copy-to-other, bulk refresh), the affected row or Storyboard header shows a subdued spinner or progress indicator; the rest of the panel remains interactive.
- **Error State**: Action failures (deep-copy failure, refresh failure, rename conflict, etc.) surface a VS Code toast with an actionable message; the affected Scene's row retains its prior state (e.g. stale badge remains if refresh failed). In diagnostic mode, the output channel records the failing step.
- **Success State**: On each successful action the corresponding row updates in place (new title, fresh thumbnail, row removed for a delete) and a Log Panel card is emitted for traceability. For `Refresh all stale`, a summary toast reports the count refreshed + the count failed.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From inside the Storyboard panel, an analyst can reach every edit action through at least one panel-native affordance (chevron, double-click, overflow menu, or Storyboard header) — zero actions require falling back to the command palette.
- **SC-002**: The polish loop runs end-to-end under automated test — rename, describe, delete, undo, update-to-current, duplicate, duplicate-at-colliding-timestamp, copy-to-other, deep-copy-failure, Storyboard rename and describe, single-Scene refresh, bulk refresh, missing-data remediation — all driven without launching VS Code.
- **SC-003**: Every edit op recorded by the end-to-end tests produces exactly one matching Log Panel card, matching the operation type expected for that action.
- **SC-004**: All evidence screenshots enumerated in #218's evidence-requirements table are captured under `specs/218-storyboarding-edit/evidence/screenshots/`, and a short (< 5 s, < 2 MB) interaction recording of the core polish loop is produced.
- **SC-005**: Opening a fresh plot and immediately pressing Capture succeeds in 100% of the test runs — the `Capture failed — map has not reported a viewport yet` toast never appears.
- **SC-006**: The specific plot that surfaced `Failed to load plot` in PR #520's manual test opens cleanly; every subsequent load failure (if any) is attributable to a specific step recorded in the Debrief output channel.
- **SC-007**: The existing #218 test suite (2,983 tests) remains 100% green; this feature introduces zero regressions in that suite.
- **SC-008**: The refresh cycle that feeds the panel stays within the O(active-storyboard Scenes) bound already established by #218 — the performance budget for `onPlotOpened` (≤ 50 ms median at spec scale) holds.
- **SC-009**: At least one reviewer unfamiliar with the code can exercise the polish loop from the four interactive Storybook stories alone (chevron, undo, stale badge, missing-data remediation) and reach every action the panel supports, without reading documentation.
- **SC-010**: Every functional requirement in this spec is covered by at least one automated test (reducer unit test, component test, or end-to-end test).
