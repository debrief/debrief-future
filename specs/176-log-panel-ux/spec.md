# Feature Specification: Analysis Log Panel — Rich Card UX

**Feature Branch**: `176-log-panel-ux`  
**Created**: 2026-04-02  
**Status**: Complete (2026-04-20)  
**Input**: User description: "Analysis Log Panel Rich Card UX — transform the provenance log panel from raw PROV data into analyst-readable cards with tool icons, parameter chips, and multiple view modes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Analysis History (Priority: P1)

An analyst opens the Log panel to review the sequence of operations applied to their tracks. Each operation appears as a visually distinct card showing the tool name, an icon indicating the tool category, the track(s) involved, timestamp, duration, and the parameters used. The analyst scrolls through the timeline (newest-first) to understand what has been done and in what order.

**Why this priority**: This is the core value of the panel — making the provenance record human-readable. Without this, all other stories have no foundation.

**Independent Test**: Can be fully tested by loading a plot with multiple logged operations and verifying that each card displays the correct tool name, icon, track badge, timestamp, duration, and parameter chips.

**Acceptance Scenarios**:

1. **Given** a plot with 5 logged operations, **When** the analyst opens the Log panel, **Then** 5 cards appear in newest-first order, each showing the tool name, category icon, step number, and formatted parameters.
2. **Given** an operation that ran for 250ms, **When** the card is displayed, **Then** the duration reads "250ms".
3. **Given** an operation that ran for 2.3 seconds, **When** the card is displayed, **Then** the duration reads "2.3s".
4. **Given** an operation with a rationale note, **When** the card is displayed, **Then** a speech-bubble icon appears in the header, and hovering shows the rationale text as a tooltip.
5. **Given** a parameter whose value was explicitly set (non-default), **When** the chip is displayed, **Then** a small red dot marker appears beside the chip.

---

### User Story 2 - Understand Parameter Values at a Glance (Priority: P1)

An analyst inspects a card's parameter chips to understand the settings used for a particular operation. Each chip displays a type-appropriate icon prefix (colour swatch, `#` for numbers, `≡` for enums, `↔` for ranges, `⊤`/`⊥` for booleans) and the formatted value, allowing rapid comprehension without expanding the card.

**Why this priority**: Parameter comprehension is essential to the analyst understanding *how* an operation was configured. This is tightly coupled to Story 1.

**Independent Test**: Can be tested by rendering cards with each parameter type and verifying the correct icon, formatting, and non-default marker appear.

**Acceptance Scenarios**:

1. **Given** a parameter with a colour value "green", **When** the chip renders, **Then** a coloured swatch block appears followed by the text "green".
2. **Given** a numeric parameter with value 30 and unit "s", **When** the chip renders, **Then** it displays `# 30 s`.
3. **Given** a boolean parameter set to true, **When** the chip renders, **Then** it displays `⊤ yes`.
4. **Given** a range parameter with min 10 and max 200 in metres, **When** the chip renders, **Then** it displays `↔ 10 m – 200 m`.
5. **Given** a parameter with no tool schema type available, **When** the chip renders, **Then** the system infers the type from the value using heuristic rules.

---

### User Story 3 - Select a Card for Focus (Priority: P2)

An analyst clicks a card to select it, visually highlighting it with a distinct border and background. Only one card is selected at a time. This selection is local UI state and not persisted.

**Why this priority**: Selection provides the interaction foundation for future features (detail expansion, map linkage) and gives the analyst a way to focus on a specific operation.

**Independent Test**: Can be tested by clicking cards and verifying visual selection state toggles correctly with only one card highlighted at a time.

**Acceptance Scenarios**:

1. **Given** no card is selected, **When** the analyst clicks a card, **Then** it becomes visually selected with a highlighted border and background.
2. **Given** card A is selected, **When** the analyst clicks card B, **Then** card B becomes selected and card A returns to normal.
3. **Given** a disabled card, **When** the analyst clicks it, **Then** it becomes selected (disabled cards are still interactive).

---

### User Story 4 - Switch Between View Modes (Priority: P2)

An analyst switches between four view tabs — Timeline, By Feature, Compact, and Detailed — to see the same log data organised differently depending on their current task.

**Why this priority**: Multiple views allow analysts to adapt the panel to their workflow, but the default Timeline view (Story 1) must work first.

**Independent Test**: Can be tested by switching between tabs and verifying each view renders the correct layout and grouping.

**Acceptance Scenarios**:

1. **Given** the panel is open, **When** the analyst selects the "Timeline" tab, **Then** all entries appear newest-first as full cards.
2. **Given** the panel is open, **When** the analyst selects the "By Feature" tab, **Then** entries are grouped by track name under collapsible group headers.
3. **Given** the panel is open, **When** the analyst selects the "Compact" tab, **Then** cards show header and meta rows only, without the parameters row.
4. **Given** the panel is open, **When** the analyst selects the "Detailed" tab, **Then** cards show full content plus expanded input/output feature ID lists.

---

### User Story 5 - Identify Disabled Operations (Priority: P3)

An analyst reviewing the log sees disabled operations rendered at reduced opacity with a "disabled" badge, making it immediately clear which operations are suppressed from calculation without removing them from the audit trail.

**Why this priority**: Disabled state visibility matters for audit comprehension but is less frequent than standard card browsing.

**Independent Test**: Can be tested by loading a log with disabled entries and verifying the visual treatment (opacity, badge) is applied correctly.

**Acceptance Scenarios**:

1. **Given** a log entry with `disabled === true`, **When** the card renders, **Then** it appears at 50% opacity with a red-tinted "disabled" badge in the meta row.
2. **Given** a disabled card, **When** the analyst clicks it, **Then** it becomes selected normally — disabled does not prevent interaction.
3. **Given** a disabled card, **When** the analyst views its parameters, **Then** all parameters are still displayed as normal chips.

---

### User Story 6 - Graceful Handling of Unknown or Incomplete Data (Priority: P3)

An analyst opens a log that contains entries for tools not yet registered in the tool manifest, entries with no parameters, snapshot entries, or entries missing optional fields. The panel renders gracefully in all cases without errors or blank cards.

**Why this priority**: Robustness is important for trust, but edge cases are encountered less frequently than the standard browsing flow.

**Independent Test**: Can be tested by loading logs with missing fields, unknown tools, and snapshot entries, then verifying each renders without errors.

**Acceptance Scenarios**:

1. **Given** a log entry for an unrecognised tool, **When** the card renders, **Then** it shows a neutral grey icon, the tool name verbatim, and raw parameter values as plain string chips.
2. **Given** a log entry with no parameters, **When** the card renders, **Then** it displays "No parameters" in muted italic text.
3. **Given** a snapshot entry, **When** the card renders, **Then** it displays "Manual checkpoint" in muted italic and omits the duration field.
4. **Given** a rationale field that is an empty string, **When** the card renders, **Then** no rationale icon is shown (treated as absent).
5. **Given** a log entry missing the execution_duration field, **When** the card renders, **Then** the duration is silently omitted from the meta row.

---

### Edge Cases

- What happens when multiple tracks are referenced in a single operation's `used[]` list? All track badges are shown, wrapping onto a second line if needed.
- What happens when the log contains hundreds of entries? The panel uses standard scrolling; virtualised rendering is assumed for performance but is an implementation detail.
- What happens when a parameter value is `null` or `undefined`? The chip renders the value as an empty string with the fallback plain-text style (no icon prefix).
- What happens when two operations have identical timestamps? Both cards are shown; ordering is stable (insertion order preserved).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render each provenance log entry as a visually distinct card containing a header row (step number, tool category icon, tool name, optional rationale icon), a meta row (track badge(s), optional disabled badge, timestamp, optional duration), and a parameters row (labelled chips).
- **FR-002**: The system MUST display cards in newest-first order by default (Timeline view).
- **FR-003**: The system MUST render parameter chips with type-appropriate icon prefixes: colour swatch for colours, `#` for numbers, `≡` for enums/strings, `↔` for ranges, and `⊤`/`⊥` for booleans.
- **FR-004**: The system MUST resolve parameter types using tool schema metadata first, then client-side heuristic inference, then plain string fallback.
- **FR-005**: The system MUST display a red dot marker (●) on parameter chips where the value is non-default.
- **FR-006**: The system MUST support four view tabs: Timeline (newest-first), By Feature (grouped by track), Compact (header + meta only), and Detailed (full card + feature ID lists).
- **FR-007**: The system MUST allow single-card selection via click, with visual highlighting, and only one card selected at a time.
- **FR-008**: The system MUST render disabled entries at 50% opacity with a "disabled" badge, while keeping them interactive and showing their parameters.
- **FR-009**: The system MUST display a rationale tooltip icon on cards that have a non-null, non-empty rationale value.
- **FR-010**: The system MUST display all track badges when an operation references multiple tracks, wrapping to additional lines as needed.
- **FR-011**: The system MUST render unknown tools with a neutral grey icon, the tool name verbatim, and raw parameter values as plain string chips.
- **FR-012**: The system MUST display "No parameters" in muted italic when an entry has no parameters, and "Manual checkpoint" in muted italic for snapshot entries.
- **FR-013**: The system MUST format duration as "Xms" when under 1 second, and "X.Xs" when 1 second or above. Duration is omitted for snapshot entries and when the field is missing.
- **FR-014**: The system MUST display timestamps in UTC format as "HH:MM:SS UTC".
- **FR-015**: The system MUST display tool category icons using five defined categories (import, style, calc, filter, snapshot) with distinct background colours, falling back to neutral grey for uncategorised tools.
- **FR-016**: The system MUST show a centred "No operations recorded yet." message when the log is empty.
- **FR-017**: All user-facing text strings (labels, placeholders, aria-labels) MUST use internationalisation string keys, not hard-coded literals.
- **FR-018**: The system MUST provide appropriate accessibility attributes: `aria-label` on chips and badges, `aria-selected` on selected cards, step number in card `aria-label`, and ARIA `tablist`/`tab`/`tabpanel` pattern for view tabs.

### Key Entities

- **Log Entry (Card)**: A single provenance activity record rendered as a card. Contains tool name, tool version, parameters, input/output feature references, timestamp, duration, disabled state, and rationale.
- **Parameter Chip**: A visual representation of one parameter value. Contains the inferred or declared type, the value, a label, and a default/non-default indicator.
- **Tool Category**: A classification of tools into families (import, style, calc, filter, snapshot) that determines the icon background colour. Declared in the tool manifest.
- **Track Badge**: A pill-shaped label showing the platform name from referenced input features. Multiple badges may appear per card.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: The analyst wants to review and understand the history of operations applied to their data, including what tools were run, with which parameters, and in what order.
- **Key Decision(s)**:
  1. Which view mode best suits the current review task (chronological, by track, compact overview, or full detail)?
  2. Which specific operation to focus on (card selection) for closer inspection?
- **Decision Inputs**: Tool category icons provide visual grouping at a glance. Parameter chips with type icons and non-default markers show what was configured. Track badges identify which data was affected. Timestamps and durations give temporal context. The rationale tooltip provides analyst reasoning.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Log panel opens showing Timeline view | Analyst scans card list | Newest-first cards with tool icons, parameter chips, and metadata are visible |
| 2 | Timeline view with multiple cards | Analyst clicks a card | Card becomes visually selected (highlighted border and background) |
| 3 | Card selected | Analyst hovers over rationale icon | Tooltip displays the rationale text |
| 4 | Timeline view | Analyst clicks "By Feature" tab | Cards regroup under collapsible track-name headers |
| 5 | By Feature view | Analyst clicks "Compact" tab | Cards shrink to header + meta rows only (no parameters) |
| 6 | Compact view | Analyst clicks "Detailed" tab | Cards expand to show full content plus input/output feature ID lists |

### UI States

- **Empty State**: Centred message reading "No operations recorded yet." displayed when the log has no entries.
- **Loading State**: Standard panel loading indicator while provenance data is being fetched from the STAC service.
- **Error State**: If provenance data cannot be loaded, a centred error message is shown with a description of the issue. Individual cards with unknown tools or missing fields render gracefully with fallback styling rather than showing errors.
- **Success State**: The full card list is displayed in the selected view mode. The most recently selected card (if any) is visually highlighted.

## Assumptions

- The existing PROV data model and MCP tool interfaces are stable and will not change as part of this feature.
- Tool category is declared in a tool manifest; there is no name-prefix inference. Until a manifest exists for a tool, it gets a neutral grey icon.
- The panel is read-only — all write operations (editing parameters, disabling entries, adding rationale) are out of scope and handled by separate features.
- Timestamps are always in UTC. No local time conversion is provided.
- Card selection is ephemeral UI state — it is not persisted across panel reloads or sessions.
- The panel renders within a VS Code extension webview and must conform to VS Code light theme styling.

## Out of Scope

- Flip-card edit face (editing parameters, disabling entries, adding rationale)
- Panel-level actions (Revert to here, Revert this, Snapshot button placement)
- Card drag-to-reorder
- Log filtering and search
- Map selection linkage (clicking a card highlighting features on the map)
- Time axis visualisation
- Diff view (comparing input_state before/after an operation)
- Audit export (generating a human-readable report from the log)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can identify the tool name, category, and parameters of any logged operation within 3 seconds of viewing its card, without expanding or hovering.
- **SC-002**: Analysts can distinguish non-default parameter values from defaults at a glance via the red dot marker, with 100% accuracy across all parameter types.
- **SC-003**: Analysts can switch between all four view modes (Timeline, By Feature, Compact, Detailed) in under 1 second per switch, with the panel re-rendering correctly each time.
- **SC-004**: All edge cases (unknown tools, missing fields, empty logs, snapshot entries) render without errors or blank cards — zero visual breakage in all defined scenarios.
- **SC-005**: All interactive elements (cards, tabs, rationale tooltips) are operable via keyboard and screen reader, meeting ARIA accessibility standards for the defined patterns.
- **SC-006**: The panel correctly renders logs containing at least 100 entries without noticeable scroll lag or rendering delay.
