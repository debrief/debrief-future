# Feature Specification: Layers Panel Vertical Space Fix

**Feature Branch**: `101-layers-panel-vertical-space`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "Layers panel does not expand to fill vertical space — Layers section should flex-grow when Time Controller and Tools are collapsed; pure CSS fix"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Layers fills vertical space when siblings collapsed (Priority: P1)

When a user collapses both the Time Controller and Tools sections, the Layers section should expand to fill all remaining vertical space in the Activity Panel. Currently, a large whitespace gap appears below the layers list.

**Why this priority**: This is the core bug. The whitespace wastes screen real estate and looks broken, reducing confidence in the application's polish.

**Independent Test**: Can be fully tested by collapsing Time Controller and Tools sections and verifying the Layers section fills all remaining vertical height with no visible gap.

**Acceptance Scenarios**:

1. **Given** a plot is open with multiple layers, **When** the user collapses both Time Controller and Tools, **Then** the Layers section expands to fill all remaining vertical space in the Activity Panel with no whitespace gap below it.
2. **Given** both Time Controller and Tools are collapsed and Layers is expanded, **When** the user scrolls the layers list, **Then** the scroll area extends to the full expanded height of the Layers section.

---

### User Story 2 - Layers fills space when only one sibling collapsed (Priority: P2)

When a user collapses only one of the two sibling sections (either Time Controller or Tools, but not both), the Layers section should correctly share or claim the freed vertical space.

**Why this priority**: Partial-collapse states are common during normal usage and should also distribute space correctly.

**Independent Test**: Can be tested by collapsing only Time Controller (leaving Tools expanded) and verifying Layers and Tools share the available space, then collapsing only Tools (leaving Time Controller expanded) and verifying Layers claims the flexible space.

**Acceptance Scenarios**:

1. **Given** a plot is open, **When** the user collapses only Time Controller, **Then** Layers and Tools share the freed vertical space (the existing 50/50 split with resize handle still functions correctly).
2. **Given** a plot is open, **When** the user collapses only Tools, **Then** Layers expands to fill all remaining vertical space below the Time Controller header and the collapsed Tools header.

---

### User Story 3 - Expand/collapse transitions remain smooth (Priority: P3)

Re-expanding collapsed sections should correctly reclaim space from Layers without visual glitches or layout jumps.

**Why this priority**: The fix must not break the existing expand/collapse behaviour or the resize handle between Tools and Layers.

**Independent Test**: Can be tested by cycling through collapse/expand combinations for all three sections and verifying the layout adjusts smoothly each time.

**Acceptance Scenarios**:

1. **Given** Time Controller and Tools are collapsed (Layers fills space), **When** the user expands Tools, **Then** Layers and Tools share vertical space as before (50/50 split with resize handle).
2. **Given** all three sections are expanded, **When** the user collapses and re-expands each section in any order, **Then** the layout returns to its correct state each time with no leftover whitespace gaps.

---

### Edge Cases

- What happens when the Layers section itself is collapsed (all three collapsed)? Only section headers should be visible, with remaining space empty below them.
- What happens when all three sections are expanded and the panel is very short (small viewport)? Sections should respect their minimum heights and the flexible sections should shrink proportionally.
- What happens when the layers list has very few items (e.g., one layer) and fills the full panel height? The section container should still fill the space; the list content simply won't need to scroll.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Layers section MUST expand to fill all remaining vertical space in the Activity Panel when both Time Controller and Tools are collapsed.
- **FR-002**: The Layers section MUST expand to fill all remaining vertical space below fixed-height elements when Tools is collapsed and Time Controller is expanded (fixed-height).
- **FR-003**: The existing 50/50 flexible split between Tools and Layers (with resize handle) MUST continue to function when both are expanded.
- **FR-004**: The scrollable area within the Layers section MUST extend to the full height of the expanded section container, so all layers remain accessible via scrolling.
- **FR-005**: The fix MUST be CSS-only — no changes to component logic, state management, or layout calculation code.
- **FR-006**: Collapse and expand transitions MUST produce correct layouts for all combinations of section collapse states (8 combinations: 3 sections x collapsed/expanded).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: The user is not making a decision — this is a layout correction. The Layers section should passively fill available space.
- **Key Decision(s)**:
  1. No user decisions involved; the layout responds automatically to section collapse state.
- **Decision Inputs**: Not applicable — the layout behaviour is automatic.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|-------------|-------------|--------|
| 1 | All sections expanded | User collapses Time Controller | Time Controller shows only its header; Tools and Layers share freed space via 50/50 split |
| 2 | Time Controller collapsed | User collapses Tools | Tools shows only its header; Layers expands to fill all remaining vertical space |
| 3 | Only Layers expanded | User expands Tools | Tools reappears; Layers and Tools return to 50/50 split with resize handle |
| 4 | Tools and Layers expanded | User expands Time Controller | All three sections visible in their standard layout |

### UI States

- **All expanded**: Time Controller fixed at top, Tools and Layers share remaining space 50/50 with a draggable resize handle between them.
- **One flexible collapsed**: The remaining flexible section fills all available space below fixed-height elements and collapsed headers.
- **Both flexibles collapsed**: Only section headers visible; remaining vertical space is empty (no content to fill it).
- **All collapsed**: Three section headers stacked at the top; the rest of the panel is empty.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When both Time Controller and Tools are collapsed, the Layers section bottom edge is flush with (or within 1px of) the Activity Panel bottom edge — zero visible whitespace gap.
- **SC-002**: All 8 collapse-state combinations (3 sections x 2 states each) produce correct layouts with no orphaned whitespace.
- **SC-003**: The fix introduces no changes to component logic or scripting — purely style modifications.
- **SC-004**: Existing resize-handle behaviour between Tools and Layers continues to function identically when both are expanded.

## Assumptions

- The Activity Panel container already uses a vertical flex column layout filling its parent height, so the fix involves ensuring the Layers section's flex properties correctly respond to sibling collapse states.
- The evidence screenshot (`tests/e2e/evidence/real-webview-layers-focus.png`) accurately represents the current bug.
- "Pure CSS fix" means only style changes — no modifications to component logic or state management code.
