# Feature Specification: Log Panel Flip-Card Interaction

**Feature Branch**: `113-prov-card-flip`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "Log Panel: Flip-Card Interaction Model — replaces alert-dialog parameter editing with a flip-card paradigm for provenance card editing, live tool re-execution, and inline metadata management"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flip Card to Edit Parameters (Priority: P1)

An analyst is reviewing the Log Panel timeline and wants to adjust a tool's parameters. They click the pencil/edit icon on the card header. The card flips with a smooth animation to reveal the edit face, which shows all parameters as rich, type-aware controls (sliders for bounded numbers, dropdowns for enums, toggles for booleans, etc.). The analyst adjusts a parameter and the tool re-executes live, updating the map immediately. When finished, the analyst clicks Done to flip back to the read-only face.

**Why this priority**: This is the core value proposition — replacing the separate Tune dialog with an in-place, discoverable interaction. Without the flip-to-edit mechanism, all other edit-face features (disable, delete, rationale) have no surface to appear on. This story delivers the fundamental interaction model.

**Independent Test**: Can be fully tested by opening the Log Panel, clicking the edit icon on a card, verifying the flip animation occurs, checking that type-appropriate controls appear for each parameter, modifying a value, and verifying the map updates with re-executed results.

**Acceptance Scenarios**:

1. **Given** a Log Panel card in read-only mode showing a calculation tool entry, **When** the analyst clicks the pencil icon in the card header, **Then** the card performs a smooth flip animation to reveal the edit face with type-aware parameter controls.
2. **Given** a card on the edit face with a bounded numeric parameter, **When** the analyst drags the slider to a new value, **Then** the tool re-executes with the new value (after a brief debounce) and the map updates with new results.
3. **Given** a card on the edit face with an enum parameter, **When** the analyst selects a different value from the dropdown, **Then** the tool re-executes immediately and the map updates.
4. **Given** the edit face is showing, **When** the analyst clicks Done, **Then** the card flips back to the read-only face showing the updated parameter values.

---

### User Story 2 - Schema-Driven Controls with Lazy Loading (Priority: P2)

When the analyst flips a card, the system queries the tool's schema to determine the correct control type for each parameter. While loading, the edit face shows a placeholder skeleton. Once the schema arrives, the correct controls render in. Schemas are cached for the session so subsequent flips of entries from the same tool are instant.

**Why this priority**: The type-aware controls are what make parameter editing intuitive rather than error-prone. Without schema-driven rendering, users would face raw text inputs for every parameter type, losing the benefit of sliders, colour pickers, and validated inputs. Lazy loading ensures the read-only experience remains fast.

**Independent Test**: Can be fully tested by flipping a card and verifying a loading skeleton appears briefly, then correct controls render based on the tool's parameter types. Flipping a second card from the same tool should show controls instantly (from cache).

**Acceptance Scenarios**:

1. **Given** a card that has never been flipped in this session, **When** the analyst clicks the edit icon, **Then** the edit face initially shows a skeleton placeholder while the tool schema loads.
2. **Given** the schema has loaded, **When** controls render, **Then** each parameter displays the correct control type: slider for bounded numeric, numeric input for unbounded numeric, dropdown for enum, toggle for boolean, text input for string, colour picker for colour.
3. **Given** one card from tool "calculate-range" has been flipped and its schema cached, **When** the analyst flips a different card also from "calculate-range," **Then** controls render immediately without a loading skeleton.
4. **Given** a parameter lacks bounds in the schema, **When** the edit face renders, **Then** the system falls back to a numeric text input instead of a slider.

---

### User Story 3 - Single-Card Edit Constraint (Priority: P2)

Only one card may be in edit mode at a time. If the analyst flips a second card while another is already open for editing, the first card auto-closes (implicitly Done) and the second card flips open. This prevents the analyst from losing track of which card they are editing and ensures the replay engine only processes one change at a time.

**Why this priority**: This constraint is essential for a coherent editing experience. Without it, multiple simultaneous edits could trigger conflicting replays or confuse the analyst about which card is active. It shares P2 because the single-card constraint must be in place whenever editing is available.

**Independent Test**: Can be fully tested by flipping card A, then flipping card B, and verifying that card A flips back to read-only while card B opens for editing.

**Acceptance Scenarios**:

1. **Given** card A is in edit mode, **When** the analyst clicks the edit icon on card B, **Then** card A flips back to read-only mode and card B flips to edit mode.
2. **Given** card A is in edit mode with modified parameters, **When** the analyst flips card B, **Then** card A's changes are committed (Done is implicit) before card B opens.
3. **Given** no card is in edit mode, **When** the analyst clicks the edit icon on any card, **Then** only that card flips to edit mode.

---

### User Story 4 - Disable and Re-enable Log Entries (Priority: P3)

On the edit face, the analyst finds a disable toggle. Toggling it off causes the system to replay the timeline without that step — effectively skipping it. The read-only face updates to show the card greyed out with a strikethrough on the tool name. The disabled entry remains in the timeline and can be re-enabled at any time by flipping the card again and toggling the switch back on.

**Why this priority**: Disabling entries allows analysts to experiment with "what if this step didn't happen" without permanently removing data. This is a less destructive alternative to deletion and supports exploratory analysis.

**Independent Test**: Can be fully tested by flipping a card, toggling disable, verifying the map updates (replays without that step), verifying the card appears greyed out on the front face, then re-enabling and verifying the map reverts.

**Acceptance Scenarios**:

1. **Given** a card on the edit face with the disable toggle in the "enabled" position, **When** the analyst toggles it to "disabled," **Then** the system replays the timeline without that step and the map updates accordingly.
2. **Given** a disabled card (greyed out, strikethrough on tool name), **When** the analyst flips it to the edit face and re-enables it, **Then** the system replays the timeline including that step and the card returns to normal appearance.
3. **Given** entry B depends on entry A's output and both are enabled, **When** the analyst disables entry A, **Then** entry B is auto-disabled with a visual warning indicating the dependency.

---

### User Story 5 - Delete Log Entries (Priority: P3)

On the edit face, a Delete button allows the analyst to remove an entry from the history. A confirmation prompt warns that all subsequent steps will replay without this entry. After confirmation, the entry is soft-deleted (shown struck-through until the next snapshot) and subsequent operations replay.

**Why this priority**: Deletion is the permanent counterpart to disabling. It is intentionally behind a confirmation step and only accessible from the edit face (requiring a deliberate flip) to prevent accidental data loss.

**Independent Test**: Can be fully tested by flipping a card, clicking Delete, confirming in the dialog, and verifying the entry is visually struck through, subsequent entries replay, and the map updates.

**Acceptance Scenarios**:

1. **Given** a card on the edit face, **When** the analyst clicks the Delete button, **Then** a confirmation prompt appears warning that subsequent steps will replay without this entry.
2. **Given** the confirmation prompt is showing, **When** the analyst confirms deletion, **Then** the entry is soft-deleted (shown struck-through), subsequent entries replay, and the map updates.
3. **Given** the confirmation prompt is showing, **When** the analyst cancels, **Then** nothing changes and the card remains in edit mode.
4. **Given** a soft-deleted entry, **When** the analyst views the timeline, **Then** the entry remains visible (struck-through) until the next snapshot is created.

---

### User Story 6 - Edit Analyst Rationale (Priority: P4)

The edit face includes an editable text area for analyst rationale — free-text notes explaining why this operation was performed or why parameters were chosen. The action bar's Rationale button serves as a shortcut: clicking it flips the selected card and auto-focuses the rationale field.

**Why this priority**: Rationale capture supports provenance and audit requirements. While valuable, it does not affect analytical results and is primarily a documentation feature. It has lower priority than parameter editing, disabling, and deleting.

**Independent Test**: Can be fully tested by flipping a card and typing rationale text, verifying it persists after flipping back and re-opening. Also tested by selecting a card and clicking the Rationale action bar button, verifying the card flips and the rationale field is focused.

**Acceptance Scenarios**:

1. **Given** a card on the edit face, **When** the analyst types text in the rationale field, **Then** the text is saved to the provenance entry.
2. **Given** a card with saved rationale, **When** the analyst flips it back to read-only and then flips to edit again, **Then** the previously entered rationale text is preserved.
3. **Given** a card is selected in the Log Panel, **When** the analyst clicks the Rationale action bar button, **Then** the card flips to the edit face and the rationale text area receives focus.

---

### User Story 7 - Action Bar Updates (Priority: P4)

The Log Panel action bar is updated to remove the Tune button (replaced by the flip-card interaction) and retain four actions: Revert to Here, Revert This, Snapshot, and Rationale. The Rationale button provides the shortcut to flip-and-focus described above.

**Why this priority**: This is a layout change that follows from the new interaction model. The Tune button becomes redundant since tuning is now accessible via the card flip. The remaining buttons retain their existing functionality.

**Independent Test**: Can be fully tested by verifying the action bar displays exactly four buttons (Revert to Here, Revert This, Snapshot, Rationale) with no Tune button present.

**Acceptance Scenarios**:

1. **Given** the Log Panel is open, **When** the analyst views the action bar, **Then** four buttons are visible: Revert to Here, Revert This, Snapshot, and Rationale. The Tune button is absent.
2. **Given** a Log entry is selected, **When** the analyst clicks the Rationale button, **Then** the selected card flips to the edit face with the rationale field focused.
3. **Given** no Log entry is selected, **When** the analyst views the action bar, **Then** the action buttons are visibly disabled.

---

### User Story 8 - Live Replay with Debounced Updates (Priority: P2)

When the analyst modifies parameters on the edit face, changes are debounced before triggering tool re-execution. Slider drags and continuous inputs are debounced so that rapid adjustments result in a single replay. Discrete changes like dropdown selections trigger immediately. If replay takes noticeable time, a subtle progress indicator appears on the card.

**Why this priority**: Live replay is what makes the flip-card interaction feel responsive and direct. Without debouncing, slider drags would flood the system with replay requests. Without progress indication, long replays would leave the analyst uncertain about state.

**Independent Test**: Can be fully tested by rapidly dragging a slider and verifying only one replay executes after the drag completes, selecting a dropdown value and verifying immediate replay, and observing the progress indicator during a slow tool execution.

**Acceptance Scenarios**:

1. **Given** a slider parameter on the edit face, **When** the analyst drags the slider continuously for 1 second, **Then** the tool re-executes once after the analyst stops dragging (not on every intermediate position).
2. **Given** a dropdown parameter, **When** the analyst selects a new value, **Then** the tool re-executes immediately without waiting for a debounce period.
3. **Given** a replay that takes more than a brief threshold, **When** re-execution is in progress, **Then** a subtle progress indicator is visible on the card until replay completes.

---

### Edge Cases

- What happens when the analyst clicks the card body (not the pencil icon)? Nothing — the flip is only triggered by the pencil icon, not by clicking the card body.
- What happens when a compound parameter (nested object or array) is encountered? The system falls back to a JSON editor for complex nested structures, while top-level primitives get their rich controls.
- What happens when the analyst clicks Done without changing any parameters? The card simply flips back to read-only. No replay is triggered since no values changed.
- What happens if the tool schema fails to load? The edit face shows an error message explaining that the schema could not be loaded, with a retry option. Parameter controls are not rendered until the schema is available.
- What happens when a disabled entry's dependency chain is re-enabled? When entry A is re-enabled, any entries that were auto-disabled due to dependency on A are presented with an option to re-enable as well.
- What happens when replay fails during a parameter change? The card shows an error indicator on the edit face. The analyst can adjust the parameter to a different value or click Done to revert to the previous value.
- What happens when the analyst flips a card for a tool that has no tunable parameters? The edit face still shows the metadata block, rationale field, disable toggle, and delete button. The parameter area shows a message: "This tool has no tunable parameters."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each Log entry card MUST have a read-only front face and an editable back face, with the edit face accessible only via the pencil/edit icon in the card header.
- **FR-002**: The front face MUST display content according to the selected presentation mode (Compact, Normal, Detailed) as defined in the Log Panel specification (#072).
- **FR-003**: The front face MUST NOT include any interactive parameter controls — parameters appear as plain read-only text.
- **FR-004**: The card MUST perform a smooth flip animation when transitioning between read-only and edit faces.
- **FR-005**: The card MUST adaptively grow in height when flipping to the edit face to accommodate the tool's parameters and metadata, with the height change animating smoothly.
- **FR-006**: The edit face MUST display all front-face content plus: rich parameter controls, metadata block (timestamp, duration, file-size, tool version, source file ref), analyst rationale field, disable toggle, delete button, and Done button.
- **FR-007**: The system MUST query the tool's schema on flip to determine parameter types, then render the appropriate control for each type: dropdown for enum, slider with numeric readout for bounded continuous numeric, numeric input with step buttons for unbounded continuous numeric, toggle switch for boolean, text input for string, colour picker for colour.
- **FR-008**: Tool schemas MUST be lazy-loaded on flip (not pre-fetched) with a loading skeleton shown while the schema loads.
- **FR-009**: Tool schemas MUST be cached after first access within the session, so subsequent flips for the same tool type render controls immediately.
- **FR-010**: When a parameter lacks bounds in the schema, the system MUST fall back to a numeric text input instead of a slider.
- **FR-011**: Complex nested parameters (arrays, objects) MUST fall back to a JSON editor while top-level primitives receive rich controls.
- **FR-012**: All parameter changes MUST be debounced before triggering tool re-execution — continuous inputs (e.g., slider drags) debounced at a short interval, discrete inputs (e.g., dropdown selection) triggering immediately.
- **FR-013**: Parameter changes MUST trigger live tool re-execution with the map updating to reflect the new results.
- **FR-014**: If tool re-execution takes noticeable time, the card MUST show a subtle progress indicator until completion.
- **FR-015**: Only one card MUST be in edit mode at a time. Flipping a second card MUST auto-close the first (implicit Done).
- **FR-016**: The flip MUST only be triggered by the pencil icon — clicking the card body MUST NOT trigger a flip.
- **FR-017**: The Done button on the edit face MUST flip the card back to read-only mode.
- **FR-018**: The edit face MUST include a disable toggle that, when activated, causes the system to replay the timeline skipping that entry.
- **FR-019**: A disabled entry MUST appear greyed out with a strikethrough on the tool name on the read-only front face.
- **FR-020**: Disabled entries MUST remain in the timeline and be re-enableable.
- **FR-021**: If disabling an entry causes a dependent entry to lose its input, the dependent entry MUST be auto-disabled with a visual warning indicating the dependency.
- **FR-022**: The edit face MUST include a Delete button that, when clicked, presents a confirmation prompt before proceeding.
- **FR-023**: Deleted entries MUST be soft-deleted — shown struck-through in the timeline until the next snapshot.
- **FR-024**: The edit face MUST include an editable text area for analyst rationale that persists to the provenance entry.
- **FR-025**: The action bar MUST display exactly four buttons: Revert to Here, Revert This, Snapshot, and Rationale — removing the previous Tune button.
- **FR-026**: The Rationale action bar button MUST flip the selected card to the edit face and auto-focus the rationale text area.
- **FR-027**: Action bar buttons MUST be visibly disabled when no Log entry is selected.
- **FR-028**: The tool version MUST be available on hover (tooltip) on the front face regardless of presentation mode.

### Key Entities

- **Card**: A Log entry display element with two faces (read-only front, editable back). Represents a single provenance entry in the timeline. Contains tool name, affected features, parameters, metadata, and rationale.
- **Front Face (Read-Only)**: The default display of a card showing content according to the selected presentation mode. No interactive controls — parameters shown as plain text.
- **Back Face (Edit)**: The editable display of a card revealed by flipping. Contains type-aware parameter controls, metadata block, rationale field, disable toggle, delete button, and Done button.
- **Rich Parameter Control**: A type-specific input widget rendered based on the tool's schema definition. Maps parameter types to appropriate visual controls (slider, dropdown, toggle, colour picker, text input, JSON editor).
- **Tool Schema**: The definition of a tool's parameters including their types, bounds, allowed values, and constraints. Lazy-loaded on first flip, cached per session.
- **Disable Toggle**: A switch on the edit face that marks an entry as skipped during replay. Triggers re-execution of the timeline without that step.
- **Analyst Rationale**: Free-text annotation on a provenance entry explaining the analyst's reasoning for the operation or parameter choices.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Adjust tool parameters, manage entry state (disable/delete), or annotate rationale — all in-place on the card without navigating to a separate dialog.
- **Key Decision(s)**:
  1. Which parameter value(s) to adjust — the analyst sees the current values and uses type-appropriate controls to explore alternatives.
  2. Whether to disable or delete an entry — the analyst evaluates whether the step should be temporarily skipped or permanently removed.
  3. What rationale to record — the analyst documents the reasoning behind the operation for future reference.
- **Decision Inputs**: The front face provides context (tool name, affected features, current parameters in the selected mode). The edit face provides the full metadata block (timestamp, duration, file-size, tool version, source file) and live map feedback as parameters change.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1    | Log Panel with cards in read-only mode | Click pencil icon on a card | Card flips with animation to reveal edit face; schema loading begins |
| 2    | Edit face with loading skeleton | Wait for schema to load | Skeleton replaced by type-aware parameter controls |
| 3    | Edit face with parameter controls | Adjust a slider or select a dropdown value | Tool re-executes (debounced) and map updates with new results |
| 4    | Edit face with updated results visible on map | Click Done | Card flips back to read-only face showing updated parameter values |
| 5    | Read-only card selected | Click Rationale action bar button | Card flips to edit face with rationale text area focused |
| 6    | Edit face with rationale focused | Type rationale text, click Done | Rationale saved; card flips back to read-only |
| 7    | Edit face visible | Toggle disable switch | Entry replays without this step; front face shows greyed-out card |
| 8    | Edit face visible | Click Delete | Confirmation prompt appears; on confirm, entry is soft-deleted |

### UI States

- **Empty State**: Not applicable — the flip interaction only exists on cards that are already present in the timeline. If the Log Panel is empty, no cards are available to flip.
- **Loading State**: When the card first flips, the edit face shows a skeleton/spinner placeholder while the tool schema loads. Controls render once the schema arrives.
- **Error State**: If the schema fails to load, the edit face shows an error message with a retry option. If replay fails after a parameter change, the card shows an error indicator with the option to adjust the value or revert.
- **Replay In Progress State**: A subtle progress indicator on the card during tool re-execution. Parameter controls remain usable (new changes queue behind the current replay).
- **Disabled State**: The front face renders the card greyed out with strikethrough on the tool name. The edit face shows the disable toggle in the "off" position.
- **Soft-Deleted State**: The card appears struck-through in the timeline until the next snapshot. The card cannot be flipped while in soft-deleted state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can flip a card and begin editing parameters within 2 seconds of clicking the pencil icon (including schema load time for first flip of a given tool type).
- **SC-002**: Subsequent flips of cards from the same tool type render edit controls in under 0.5 seconds (schema cached).
- **SC-003**: 90% of analysts successfully complete a parameter adjustment using the flip-card interaction on their first attempt without external guidance.
- **SC-004**: Live map updates from parameter changes appear within 1 second of the debounce period completing, for typical tool executions.
- **SC-005**: The flip animation completes smoothly without visible stutter or layout shift on the Log Panel.
- **SC-006**: Only one card is ever in edit mode at any given time — flipping a second card always auto-closes the first.
- **SC-007**: Disabling an entry causes the timeline to replay and the map to update, accurately reflecting the analysis without that step, within 5 seconds for a typical chain of 10 operations.
- **SC-008**: Deleting an entry always requires confirmation — no accidental deletions occur without the analyst explicitly confirming.

## Assumptions

- **A-001**: The Log Panel (#072) is fully implemented, providing the card-based timeline display, presentation modes, and action bar.
- **A-002**: The Replay and Parameter Tuning infrastructure (#076) is available, providing the replay engine, typed parameter support, and tool re-execution capability.
- **A-003**: Tool schemas exposing parameter types, bounds, and constraints are available via an existing schema query mechanism.
- **A-004**: The debounce interval for continuous parameter changes is configured at a sensible default (the idea document suggests 300ms) but the exact value is a tuning decision for implementation.
- **A-005**: The existing provenance data model supports analyst rationale as a text field on each entry.
- **A-006**: Soft-delete behaviour (struck-through entries surviving until next snapshot) is supported by the underlying provenance store.
- **A-007**: The action bar Tune button removal is coordinated with the Log Panel implementation — no other feature depends on the Tune button.

## Dependencies

- **#072 - Log Panel**: Provides the card-based timeline UI, presentation modes, action bar, and filter infrastructure that this feature extends.
- **#076 - Replay and Parameter Tuning**: Provides the replay engine, typed parameter infrastructure, revert operations, and live re-execution capability.
- **#071 - Log Recording Service**: Provides the provenance entry data model, timeline assembly, and the persistence layer for rationale and disable state.
- **#070 - PROV Schema Foundation**: Provides the LinkML schema definitions that underpin the provenance entries displayed on cards.

## Out of Scope

- **Branching** (#075): Creating alternative analysis branches from a historical point is not part of this feature.
- **Snapshot creation** (#074): The Snapshot action bar button retains its existing behaviour; this feature does not implement snapshot logic.
- **Multi-card simultaneous editing**: The design intentionally constrains editing to one card at a time.
- **Click-outside-to-close**: The edit face requires explicit Done, auto-close via another card flip, or Rationale action — no click-outside dismissal.
- **Web-shell support**: This feature targets the VS Code extension Log Panel only. A web-shell version is a future consideration.
