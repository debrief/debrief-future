# Feature Specification: Wire Up File Actions in Associated Files Dropdown

**Feature Branch**: `001-wire-file-actions`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Wire up file actions in Associated Files dropdown (GitHub issue #171)"
**Issue**: [#171](https://github.com/debrief/debrief-future/issues/171)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Associated File (Priority: P1)

As a user viewing a plot's associated files, I want to open a file directly in the editor so that I can view or edit its contents without manually navigating to it.

**Why this priority**: Opening files is the most fundamental and frequently used action. Users expect clicking to open files, making this the core functionality.

**Independent Test**: Can be fully tested by selecting "Open" from the dropdown menu on any associated file and verifying the file opens in the editor.

**Acceptance Scenarios**:

1. **Given** a plot with associated files displayed in the ActivityPanel, **When** I click "Open" on a file, **Then** the file opens in the editor.
2. **Given** a file that is already open in another tab, **When** I click "Open", **Then** focus moves to the existing tab rather than opening a duplicate.

---

### User Story 2 - Reveal File in System Explorer (Priority: P2)

As a user, I want to reveal an associated file in my operating system's file explorer so that I can access the file location for external operations (copying, moving, sharing).

**Why this priority**: Revealing files in the system explorer is a common workflow need that enables integration with external tools and file management.

**Independent Test**: Can be fully tested by selecting "Reveal in Explorer" on any associated file and verifying the system file browser opens with the file selected.

**Acceptance Scenarios**:

1. **Given** a plot with associated files in the ActivityPanel, **When** I click "Reveal in Explorer", **Then** the system file explorer opens with the file highlighted.
2. **Given** a file on a mapped network drive, **When** I click "Reveal in Explorer", **Then** the network location opens correctly (or an appropriate error is shown if unavailable).

---

### User Story 3 - Delete Associated File (Priority: P3)

As a user, I want to delete an associated file after confirmation so that I can remove files I no longer need while being protected from accidental deletion.

**Why this priority**: Delete is a destructive action that requires careful implementation with confirmation. It's lower priority than read-only operations but essential for file management.

**Independent Test**: Can be fully tested by selecting "Delete" on an associated file, confirming the deletion, and verifying the file is removed from both the filesystem and the UI.

**Acceptance Scenarios**:

1. **Given** a file in the Associated Files dropdown, **When** I click "Delete", **Then** a confirmation dialog appears before any deletion occurs.
2. **Given** the confirmation dialog is displayed, **When** I confirm deletion, **Then** the file is removed from the filesystem and disappears from the Associated Files list.
3. **Given** the confirmation dialog is displayed, **When** I cancel, **Then** no deletion occurs and the file remains.

---

### User Story 4 - Open File With Application Picker (Priority: P4)

As a user, I want to choose which application opens a file so that I can use specialized viewers or editors for specific file types.

**Why this priority**: "Open With" is an advanced feature useful for specialized workflows. Most users will use the default "Open" action.

**Independent Test**: Can be fully tested by selecting "Open With" on an associated file and verifying the application picker dialog appears.

**Acceptance Scenarios**:

1. **Given** a file in the Associated Files dropdown, **When** I click "Open With", **Then** the system's application picker dialog appears.
2. **Given** an application is selected in the picker, **When** I confirm, **Then** the file opens in the selected application.

---

### Edge Cases

- What happens when a file no longer exists on disk? The action should display an error message and optionally offer to remove the stale reference.
- What happens when the user lacks permissions to delete a file? An appropriate error message should be shown without crashing.
- What happens when "Reveal in Explorer" is triggered on a web-client variant (no filesystem access)? A simulated modal should explain the limitation.
- What happens when multiple files are selected? The current design handles single-file actions only; multi-select is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect the `onFileAction` callback from `AssociatedFilesDropdown` through to the extension host
- **FR-002**: System MUST handle the "open" action by opening the file in the editor
- **FR-003**: System MUST handle the "openWith" action by displaying the system application picker
- **FR-004**: System MUST handle the "reveal" action by opening the system file explorer with the file selected
- **FR-005**: System MUST handle the "delete" action by showing a confirmation dialog before removing the file
- **FR-006**: System MUST remove deleted files from the Associated Files list in the UI after successful deletion
- **FR-007**: System MUST display appropriate error messages when file operations fail
- **FR-008**: Web-client variant MUST display a modal dialog simulating operations that cannot be performed in the browser

### Key Entities

- **Associated File**: A file linked to a plot, with attributes including path, name, and type
- **File Action**: An operation that can be performed on a file (open, openWith, reveal, delete)
- **Confirmation Dialog**: A modal requiring user approval before destructive operations

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Perform file operations (open, reveal, delete) on files associated with the current plot
- **Key Decision(s)**:
  1. Which action to perform on the selected file
  2. Whether to confirm deletion (when delete is selected)
  3. Which application to use (when "Open With" is selected)
- **Decision Inputs**: File name and path shown in dropdown; confirmation dialog shows file name being deleted

### Screen Progression

| Step | Screen/State              | User Action                  | Result                                           |
|------|---------------------------|------------------------------|--------------------------------------------------|
| 1    | ActivityPanel with files  | Click dropdown on a file     | Action menu appears with Open, Open With, Reveal, Delete |
| 2    | Action menu displayed     | Select an action             | Action-specific behavior triggers               |
| 3a   | (Open selected)           | N/A                          | File opens in editor                            |
| 3b   | (Reveal selected)         | N/A                          | File explorer opens with file selected          |
| 3c   | (Delete selected)         | Confirmation dialog appears  | User must confirm or cancel                     |
| 4    | Confirmation dialog       | Click Confirm or Cancel      | File deleted (confirm) or dialog dismissed (cancel) |

### UI States

- **Empty State**: No associated files to display (handled by existing UI - dropdown disabled or hidden)
- **Loading State**: Brief loading indicator while file operation is in progress
- **Error State**: Toast or inline message showing what went wrong (e.g., "File not found", "Permission denied")
- **Success State**: For delete: file removed from list; for other actions: no explicit success UI needed (the action itself is the feedback)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open any associated file within 1 second of clicking "Open"
- **SC-002**: All four file actions (open, openWith, reveal, delete) function correctly on first attempt
- **SC-003**: Delete action always shows confirmation before removing files
- **SC-004**: Error messages are displayed for all failure scenarios (file not found, permission denied, etc.)
- **SC-005**: Web-client variant displays appropriate modal for unsupported operations rather than failing silently

## Assumptions

- The `AssociatedFilesDropdown` component and `LayersToolbar` already exist and render the four action buttons
- The webview-to-extension messaging infrastructure exists and can be extended
- Standard file operations are available through the host environment (VS Code extension API for desktop)
- Delete confirmation follows platform conventions (modal dialog with confirm/cancel)

## Out of Scope

- Multi-file selection and batch operations
- Undo functionality for delete operations
- Custom file associations or default application preferences
- File rename functionality
