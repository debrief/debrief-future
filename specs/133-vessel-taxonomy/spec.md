# Feature Specification: Vessel Taxonomy and Hierarchical Filtering

**Feature Branch**: `133-vessel-taxonomy`
**Created**: 2026-03-07
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: User description: "[E08] Vessel taxonomy and hierarchical filtering — hierarchical vessel classification tree, subtree filtering in filter bar dropdown (requires #125, #127)"
**Depends on**: #125 (STAC Extension spec + mock data fixtures), #127 (Filter bar lozenge UI)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse and Select from the Vessel Taxonomy Tree (Priority: P1)

An analyst filtering exercises by vessel class needs to navigate a multi-level taxonomy tree to find the right classification. The current CascadingMenu (#127) renders the tree and allows branch-node selection. This story refines the UX: the lozenge must display a human-readable label (not a raw path like `surface/warship/frigate/type23`), and the dropdown must indicate the current selection state when re-opened for editing.

**Why this priority**: Usability of the vessel class filter is the core purpose of #133. Without readable labels and selection feedback, the taxonomy tree is functional but confusing.

**Independent Test**: Open the vessel class dropdown, navigate to a leaf node (e.g., Type 23 Frigate), select it, verify the lozenge displays the leaf label ("Type 23 Frigate"), then click the lozenge to re-edit and verify the previously selected node is marked as current.

**Acceptance Scenarios**:

1. **Given** the filter bar plus (+) button is clicked and "Vessel Class" is selected, **When** the CascadingMenu opens, **Then** the top-level items are the taxonomy domains (Surface Vessel, Subsurface Vessel, Unknown/Unclassified) with submenu arrows for those with children.
2. **Given** the analyst hovers over "Warship" in the Surface submenu, **When** the submenu expands, **Then** child categories (Frigate, Destroyer, Carrier, Corvette, Patrol Vessel) are shown, each with further submenu arrows if they have children.
3. **Given** the analyst selects a leaf node "Type 23 Frigate", **When** the lozenge is created, **Then** the lozenge displays "Vessel Class: Type 23 Frigate" (using the taxonomy label, not the path ID `surface/warship/frigate/type23`).
4. **Given** the analyst selects a branch node "Warship", **When** the lozenge is created, **Then** the lozenge displays "Vessel Class: Warship" and filtering matches all exercises containing any vessel in the warship subtree (frigates, destroyers, carriers, corvettes, patrol vessels).
5. **Given** a "Vessel Class: Warship" lozenge exists and the analyst clicks it to edit, **When** the CascadingMenu re-opens, **Then** the "Warship" item is marked with a check (✓) indicator using the existing `current` prop on `CascadingMenuItem`.

---

### User Story 2 — Search Within the Taxonomy Dropdown (Priority: P2)

An analyst who knows the vessel type they want (e.g., "Astute") should not have to navigate multiple menu levels to find it. A search input at the top of the CascadingMenu allows type-ahead filtering, showing only matching nodes and their ancestor paths.

**Why this priority**: The taxonomy has 20+ leaf nodes across 4 levels. Keyboard search is essential for power users who know what they want.

**Independent Test**: Open the vessel class dropdown, type "ast" in the search box, verify only "Astute-class SSN" (and its ancestor path) appears, select it, and verify the lozenge is created correctly.

**Acceptance Scenarios**:

1. **Given** the vessel class CascadingMenu is open, **When** it renders, **Then** a search input appears at the top of the menu with placeholder text "Search vessel types...".
2. **Given** the search input is focused and the analyst types "frig", **When** the menu updates, **Then** only taxonomy nodes matching "frig" (case-insensitive) and their ancestors are shown: Surface Vessel > Warship > Frigate (with children Type 23, Type 26).
3. **Given** the search input contains "type 45", **When** the menu updates, **Then** "Type 45 Destroyer" is shown with its ancestor path (Surface Vessel > Warship > Destroyer > Type 45 Destroyer), and non-matching branches are hidden.
4. **Given** the search input contains "xyz" (no matches), **When** the menu updates, **Then** a "No matching vessel types" message is displayed.
5. **Given** the search input contains text and the analyst clears it, **When** the input is emptied, **Then** the full taxonomy tree is restored.

---

### User Story 3 — Display Match Counts per Taxonomy Node (Priority: P3)

An analyst wants to know how many exercises match each vessel class before selecting it, so they can make informed filtering decisions. Each node in the taxonomy dropdown shows a count badge indicating how many items in the current data set contain vessels in that subtree.

**Why this priority**: Counts prevent "dead-end" selections where the analyst picks a class with zero matches. This is a significant UX improvement over blind navigation.

**Independent Test**: Load 100 mock fixtures, open the vessel class dropdown, verify that branch nodes show aggregate counts (e.g., "Warship (45)") and leaf nodes show direct counts (e.g., "Type 23 Frigate (12)"). Verify that counts update after other filters narrow the data set.

**Acceptance Scenarios**:

1. **Given** 100 mock exercises are loaded and no filters are active, **When** the vessel class dropdown opens, **Then** each taxonomy node displays a count badge showing the number of exercises with at least one vessel in that subtree.
2. **Given** a branch node "Warship" has children Frigate (12), Destroyer (8), Carrier (3), Corvette (2), Patrol (1), **When** the analyst views the Warship node, **Then** it displays "Warship (26)" — the count of exercises matching any descendant (may be less than the sum if exercises have multiple vessel types).
3. **Given** a "Nationality: French" filter is active (narrowing to 15 exercises), **When** the vessel class dropdown opens, **Then** counts reflect only the filtered subset, not the full data set.
4. **Given** a leaf node has zero matches in the current filtered set, **When** the dropdown renders, **Then** that node appears dimmed/disabled with count "(0)" and cannot be selected.

---

### User Story 4 — Extend the Taxonomy with New Vessel Types (Priority: P4)

A development team member needs to add a new vessel type to the taxonomy (e.g., a new frigate class). The taxonomy is defined in a single JSON file and consumed by the filter engine and UI components. Adding a new type requires only editing the JSON file — no code changes.

**Why this priority**: Extensibility is a success criterion, but adding vessel types is an infrequent maintenance task, not a daily user workflow.

**Independent Test**: Add a new vessel type to `vessel-taxonomy.json`, reload the fixture data, verify the new type appears in the CascadingMenu dropdown and is filterable.

**Acceptance Scenarios**:

1. **Given** the `vessel-taxonomy.json` file, **When** a developer adds a new leaf node `"type31": { "label": "Type 31 Frigate" }` under `frigate.children`, **Then** the CascadingMenu renders "Type 31 Frigate" as a selectable option under Frigate without any code changes.
2. **Given** a new branch node is added (e.g., `"amphibious": { "label": "Amphibious Vessel", "children": { ... } }` under `warship`), **When** the taxonomy is reloaded, **Then** the new branch appears with submenu navigation and hierarchical filtering works for its subtree.
3. **Given** the LinkML schema module for the STAC extension, **When** a new vessel type is added to the JSON taxonomy, **Then** the schema does not require modification (vessel classes are path strings, not enums).

---

### User Story 5 — Storybook Stories for Taxonomy Navigation (Priority: P5)

A developer reviewing the filter bar needs Storybook stories that specifically exercise the vessel taxonomy dropdown through multi-level navigation, search, branch selection, and count display.

**Why this priority**: Storybook is the primary development and review environment for shared components. Stories are required for all UI features per project convention.

**Independent Test**: Run Storybook, navigate to the vessel taxonomy stories, interact with each story variant (full tree, search, with counts, branch selection).

**Acceptance Scenarios**:

1. **Given** Storybook is running, **When** the developer opens the FilterBar story group, **Then** a "Vessel Taxonomy" story section exists with at least 4 story variants.
2. **Given** the "Full Tree Navigation" story, **When** interacting with the CascadingMenu, **Then** all 4 taxonomy levels are navigable with realistic data.
3. **Given** the "With Match Counts" story, **When** the dropdown opens, **Then** count badges are visible on all nodes reflecting the mock data distribution.
4. **Given** the "Search" story, **When** typing in the search input, **Then** the tree filters dynamically.

---

### Edge Cases

- What happens when the taxonomy JSON is malformed or missing? The filter engine falls back to an empty taxonomy and the vessel class filter type is disabled in the plus (+) dropdown with a tooltip explaining the issue.
- What happens when an exercise's `debrief:vessel_classes` contains a path not present in the current taxonomy? The value is still used for filtering (exact path match) but does not appear in the taxonomy tree. The lozenge displays the raw path as fallback.
- What happens when the analyst types in the search box while a submenu is open? The submenu closes and search results replace the tree view.
- What happens when two exercises have different vessel types from the same branch? The branch count counts distinct exercises, not distinct vessel-type occurrences. An exercise with both Type 23 and Type 26 frigates counts once toward the Frigate branch.
- What happens when the taxonomy has only one level (flat list)? CascadingMenu renders a flat dropdown with no submenu arrows. This is a degenerate case but should work.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The vessel class lozenge MUST display the taxonomy node label (e.g., "Type 23 Frigate"), not the raw path ID (e.g., `surface/warship/frigate/type23`).
- **FR-002**: The `taxonomyToCascadingItems` adapter MUST set the `current` property on the `CascadingMenuItem` matching the currently selected vessel class value when the editor is re-opened.
- **FR-003**: The CascadingMenu MUST include an optional search input that filters the taxonomy tree by substring match (case-insensitive) on node labels.
- **FR-004**: When search is active, only matching nodes and their ancestor chain MUST be displayed; non-matching branches MUST be hidden.
- **FR-005**: Each taxonomy node in the dropdown MUST display a count badge showing the number of items matching that subtree.
- **FR-006**: Count computation MUST use the existing `buildDescendantMap()` function from the filter engine to resolve subtree membership.
- **FR-007**: Taxonomy node counts MUST reflect the currently filtered data set (after applying all other active filters), not the full unfiltered set.
- **FR-008**: Taxonomy nodes with zero matches in the current filtered set MUST appear dimmed and MUST NOT be selectable.
- **FR-009**: The taxonomy data model MUST remain a plain JSON file (`vessel-taxonomy.json`) editable without code changes. New vessel types added to this file MUST appear in the UI automatically.
- **FR-010**: When a `debrief:vessel_classes` path in an exercise does not match any node in the loaded taxonomy, the raw path MUST be used as the lozenge display text (graceful degradation).
- **FR-011**: The search input MUST clear when the CascadingMenu is dismissed and re-opened.
- **FR-012**: Storybook stories MUST demonstrate: full tree navigation, search filtering, match counts, branch node selection, and edge cases (empty search, zero-count nodes).

### Key Entities

- **Vessel Taxonomy**: A hierarchical tree of vessel classifications with 4 levels (domain > role > class > type). Defined in `vessel-taxonomy.json`. Consumed by the filter engine and CascadingMenu.
- **Taxonomy Node**: A single node in the tree. Has an `id` (used as path segment), `label` (human-readable display name), and optional `children`. Mapped to `VesselTaxonomyNode` in TypeScript and `CascadingMenuItem` for the menu.
- **Taxonomy Path**: A slash-separated string identifying a vessel type's position in the tree (e.g., `surface/warship/frigate/type23`). Stored in `debrief:vessel_classes` arrays in STAC items. Used by the filter engine for hierarchical matching.
- **Match Count**: The number of items in the current (possibly filtered) data set that have at least one `debrief:vessel_classes` entry matching a given taxonomy subtree. Computed per-node for display in the dropdown.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Select a vessel class (or category) to filter exercises by the type of vessels involved.
- **Key Decision(s)**:
  1. Whether to select a specific vessel type (leaf) or an entire category (branch)
  2. Which level of the taxonomy hierarchy to filter at (broad "Surface Vessel" vs. narrow "Type 23 Frigate")
- **Decision Inputs**: Taxonomy tree structure with labels, match counts per node showing how many exercises match, and visual hierarchy indicating specificity level.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Filter bar with plus (+) button | Analyst clicks plus (+), selects "Vessel Class" | CascadingMenu opens showing taxonomy domains with search input |
| 2 | CascadingMenu showing top-level domains with counts | Analyst hovers "Surface Vessel (72)" | Submenu opens showing Surface roles (Warship, Auxiliary, Merchant) with counts |
| 3 | Warship submenu showing classes | Analyst types "type 23" in search input | Tree filters to show only Surface > Warship > Frigate > Type 23 Frigate |
| 4 | Filtered tree showing single match | Analyst clicks "Type 23 Frigate (12)" | Lozenge "Vessel Class: Type 23 Frigate" created, results narrow to 12 exercises |
| 5 | Lozenge active, analyst wants to broaden | Analyst clicks lozenge, changes selection to "Warship" | Lozenge updates to "Vessel Class: Warship", results broaden to 26 exercises |

### UI States

- **Empty State**: When taxonomy JSON fails to load, the "Vessel Class" option in the plus (+) dropdown is disabled with tooltip "Vessel taxonomy not available".
- **Loading State**: Not applicable — taxonomy is loaded synchronously from bundled JSON.
- **Error State**: If a `debrief:vessel_classes` value doesn't match any taxonomy node, the lozenge shows the raw path with a subtle warning indicator.
- **Success State**: Normal operation — CascadingMenu shows the tree with counts, analyst navigates and selects.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Vessel class lozenges display human-readable labels for all 20+ taxonomy leaf nodes and all branch nodes, verified against the full `vessel-taxonomy.json` fixture.
- **SC-002**: Searching for any 3-character substring that matches a taxonomy node label returns that node (and ancestors) within 100ms, verified with the full taxonomy in Storybook.
- **SC-003**: Match counts per taxonomy node are accurate against the 100-item mock data set from #125, verified by comparing dropdown counts to manual filtering results for at least 5 nodes at different tree levels.
- **SC-004**: Branch node selection (e.g., "Warship") correctly filters for all descendant vessel types, matching the existing `buildDescendantMap()` behavior in the filter engine.
- **SC-005**: Adding a new vessel type to `vessel-taxonomy.json` makes it appear in the dropdown without any TypeScript or CSS changes, verified by a test that loads a modified taxonomy.
- **SC-006**: Storybook stories cover at least 4 variants (full tree, search, counts, branch selection) and are reviewable in the project Storybook.
- **SC-007**: Zero-count taxonomy nodes are visually distinct (dimmed) and not selectable, preventing dead-end filter selections.

## Assumptions

- The existing `CascadingMenu` component (#127) provides the rendering foundation. This feature extends it with search and count capabilities rather than replacing it.
- The `taxonomyToCascadingItems` adapter (#127) is the integration point between the taxonomy data model and the menu UI. Enhancements (counts, current-selection marking, search filtering) are made through this adapter and the `CascadingMenuItem` interface.
- Match count computation happens in the filter bar component (or a dedicated hook), not in the filter engine itself. The filter engine provides `buildDescendantMap()` for resolving subtree paths; the count aggregation logic is UI-layer concern.
- The `vessel-taxonomy.json` file is the single source of truth for taxonomy structure. The LinkML schema defines the property types but does not enumerate vessel classes (they are path strings, not enum values).
- Search is a UI-only feature — it filters the dropdown display, not the underlying data. The CQL2 filter expression uses the selected node ID, not the search text.
- Count badges may optionally show "(0)" for empty subtrees rather than hiding them entirely, since hiding nodes changes the tree structure and may confuse analysts who expect to see certain categories. The zero-count nodes are dimmed and non-selectable instead.
