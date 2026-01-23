# Feature Specification: VS Code Extension Hide Default Activities

**Feature Branch**: `017-vscode-hide-activities`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "Configure VS Code extension to hide default activities on load"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Focused Analysis Environment (Priority: P1)

A maritime analyst opens VS Code with the Debrief extension activated to analyze track data. They see a streamlined activity bar with only the Explorer (for file/STAC browsing) and Debrief activities visible, allowing them to focus on track analysis without distraction from irrelevant VS Code features.

**Why this priority**: This is the core value proposition — removing visual clutter to create a focused analysis environment. Without this, users are distracted by development-focused activities (Source Control, Debug, Extensions) that aren't relevant to maritime analysis.

**Independent Test**: Can be fully tested by activating the Debrief extension and verifying the activity bar shows only Explorer and Debrief activities.

**Acceptance Scenarios**:

1. **Given** the Debrief extension is installed but not yet activated, **When** the extension activates (workspace opens with Debrief context), **Then** only the Explorer and Debrief activities are visible in the activity bar
2. **Given** VS Code has Search, Source Control, Run/Debug, Extensions, and Testing activities visible by default, **When** the Debrief extension activates, **Then** these activities are hidden from the activity bar
3. **Given** the user has custom activities from other extensions installed, **When** the Debrief extension activates, **Then** only Explorer and Debrief activities remain visible (other extension activities are also hidden)

---

### User Story 2 - New Debrief Activity (Priority: P1)

A maritime analyst wants to access Debrief-specific features through a dedicated location in the activity bar. They click on the Debrief activity icon to access Debrief tools and functionality.

**Why this priority**: The Debrief activity is the primary navigation point for Debrief-specific features. Without it, users have no clear entry point for Debrief functionality.

**Independent Test**: Can be tested by activating the extension and verifying a Debrief activity appears in the activity bar with an appropriate icon.

**Acceptance Scenarios**:

1. **Given** the Debrief extension activates, **When** the activity bar renders, **Then** a "Debrief" activity with a distinctive icon is visible
2. **Given** the Debrief activity is visible, **When** the user clicks on it, **Then** the Debrief sidebar view opens
3. **Given** the Debrief activity is visible, **When** the user hovers over it, **Then** a tooltip displays "Debrief" or similar identifying text

---

### User Story 3 - Restore Hidden Activities (Priority: P2)

A power user occasionally needs access to VS Code's Source Control activity to commit changes or the Extensions activity to manage other extensions. They can re-enable these hidden activities through VS Code settings without losing the Debrief configuration.

**Why this priority**: Important for flexibility but secondary to the core focused experience. Power users expect to be able to override default behaviors.

**Independent Test**: Can be tested by modifying VS Code settings to re-enable a hidden activity and verifying it reappears.

**Acceptance Scenarios**:

1. **Given** activities have been hidden by the Debrief extension, **When** the user opens VS Code settings and enables a hidden activity, **Then** that activity reappears in the activity bar
2. **Given** a user has manually re-enabled an activity, **When** the Debrief extension reactivates (e.g., VS Code restart), **Then** the user's preference to show that activity is respected
3. **Given** the user wants to restore all default activities, **When** they disable the "hide activities" setting, **Then** all standard VS Code activities reappear

---

### Edge Cases

- What happens when the extension activates in a non-Debrief workspace?
  - *Behavior*: The extension only activates in Debrief-specific contexts; if activated elsewhere, activity hiding does not apply
- How does the system handle when Explorer is already hidden by user preference?
  - *Behavior*: Explorer visibility is preserved as-is; the extension does not force-show Explorer if user has explicitly hidden it
- What happens if VS Code updates and adds new default activities?
  - *Behavior*: The extension hides activities by a defined list; new activities may remain visible until the extension is updated
- What happens if a user has no prior VS Code settings?
  - *Behavior*: Default Debrief-focused configuration applies (only Explorer and Debrief visible)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST hide the Search activity from the activity bar on activation
- **FR-002**: Extension MUST hide the Source Control activity from the activity bar on activation
- **FR-003**: Extension MUST hide the Run and Debug activity from the activity bar on activation
- **FR-004**: Extension MUST hide the Extensions activity from the activity bar on activation
- **FR-005**: Extension MUST hide the Testing activity from the activity bar on activation
- **FR-006**: Extension MUST keep the Explorer activity visible (not hide it)
- **FR-007**: Extension MUST register a new "Debrief" activity in the activity bar
- **FR-008**: Extension MUST provide a setting to disable the "hide activities" behavior
- **FR-009**: Extension MUST respect user overrides if they manually re-enable a hidden activity
- **FR-010**: Extension MUST work fully offline (no network dependency for hiding/showing activities)
- **FR-011**: Extension MUST NOT break hidden activities — they should function normally if re-enabled

### Key Entities

- **Activity**: A VS Code activity bar item (icon + associated sidebar view) that can be shown or hidden
- **Activity Bar Configuration**: User settings that control which activities are visible
- **Debrief Activity**: A custom activity registered by the Debrief extension with its own icon and sidebar view

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Upon extension activation, the activity bar displays exactly 2 activities (Explorer and Debrief) when no user overrides are configured
- **SC-002**: Hidden activities (Search, Source Control, Run/Debug, Extensions, Testing) can be individually re-enabled through VS Code settings
- **SC-003**: Extension activation completes without network connectivity (offline-capable)
- **SC-004**: Re-enabled activities function identically to their default behavior
- **SC-005**: Users can fully restore all default activities by toggling a single extension setting

## Assumptions

- The VS Code extension API supports programmatic hiding of activity bar items
- User settings overrides take precedence over extension-configured visibility
- The Debrief activity contents will be defined in a separate backlog item (out of scope for this spec)
- Activity hiding applies only when the Debrief extension is active in a relevant workspace context
- Standard VS Code settings persistence mechanisms will store user overrides

## Out of Scope

- Contents and functionality within the "Debrief" activity sidebar (separate backlog item)
- Activity hiding for non-Debrief workspaces (this is Debrief-extension-specific behavior)
- Customisation UI allowing users to select which specific activities to hide
- Automatic hiding of activities from other third-party extensions (only default VS Code activities are targeted)

## Dependencies

- VS Code Extension API for activity bar visibility control
- 006-speckit-vscode-extension (the Debrief VS Code extension this feature will be added to)
