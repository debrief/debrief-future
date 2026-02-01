# Feature Specification: Layers Toolbar for FeatureList in shared-components

**Feature Branch**: `045-featurelist-layers-toolbar`
**Created**: 2026-01-31
**Status**: Draft
**Input**: User description: "Add layers toolbar to FeatureList in shared-components (prerequisite for #044)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter and Search Features (Priority: P1)

An analyst working with a plot containing dozens of features needs to quickly find specific tracks or contacts. They click the Filter button in the toolbar, type a name fragment, and the FeatureList filters to matching items. They can further narrow results by feature type checkboxes (Tracks, Contacts, Zones, Annotations) and visibility state.

**Why this priority**: Filtering is the most universally needed toolbar capability — every analyst with more than a handful of features will use it. It delivers value independently without requiring tool integration or file system access.

**Independent Test**: Can be fully tested with a Storybook story containing 20+ features. Verify filter text input narrows the list, type checkboxes toggle feature categories, and the filter icon indicator changes when any filter is active.

**Acceptance Scenarios**:

1. **Given** a FeatureList with 30 features, **When** the analyst types "HMS" in the filter search box with Name scope checked, **Then** only features whose name contains "HMS" are shown
2. **Given** the filter dropdown is open with Tracks and Contacts checked, **When** the analyst unchecks Contacts, **Then** only Track features remain visible in the list
3. **Given** one or more filters are active, **When** the analyst looks at the toolbar, **Then** the search icon has changed to a filter icon indicating active filtering
4. **Given** active filters, **When** the analyst clears all filters, **Then** the full feature list is restored and the icon reverts to the search icon

---

### User Story 2 - Selection-Scoped Actions: Delete and Visibility (Priority: P2)

An analyst selects several features in the FeatureList and wants to hide them from the map or delete them. They click the Visibility button to toggle visibility, or the Delete button to remove selected features.

**Why this priority**: Delete and visibility are fundamental layer management operations that analysts use constantly. They require only selection state, no external service integration.

**Independent Test**: Storybook story with selectable features. Select features, click Delete — verify callback fires with selected IDs. Click Visibility — verify callback fires to toggle visibility state.

**Acceptance Scenarios**:

1. **Given** 3 features selected in the FeatureList, **When** the analyst clicks the Delete button, **Then** an `onDelete` callback is invoked with the 3 selected feature IDs
2. **Given** 2 visible features selected, **When** the analyst clicks the Visibility button, **Then** an `onToggleVisibility` callback is invoked with those feature IDs
3. **Given** no features selected, **When** the analyst looks at the toolbar, **Then** the Delete and Visibility buttons are visually disabled

---

### User Story 3 - Run Context-Sensitive Tools (Priority: P3)

An analyst selects a track and a contact, then clicks the Run button to see what analysis tools are available for that selection. The dropdown shows categories (File, Edit, View, Analysis) with the Analysis submenu populated from ToolMatch results. When the selection changes and new tools become available, a yellow halo briefly appears on the Run button.

**Why this priority**: Tool execution is the most complex toolbar feature, requiring integration with the ToolMatch system. It depends on selection state infrastructure from P2 and has more moving parts.

**Independent Test**: Storybook story with mock ToolMatchService providing fixture tools. Select features, open Run dropdown — verify menu structure matches categories, Analysis submenu shows context-sensitive tools. Change selection — verify yellow halo appears and clears after ~3 seconds.

**Acceptance Scenarios**:

1. **Given** a track selected and ToolMatchService returning TMA tools, **When** the analyst clicks Run, **Then** the dropdown shows File/Edit/View/Analysis categories with TMA tools under Analysis
2. **Given** the Run dropdown is closed and the selection changes causing available tools to change, **When** 3 seconds pass, **Then** a yellow halo animation appears on the Run button and fades
3. **Given** the yellow halo is active, **When** the analyst opens the Run dropdown, **Then** the halo clears immediately
4. **Given** an analyst clicks a tool in the Analysis submenu, **When** the tool is selected, **Then** an `onRunTool` callback is invoked with the tool ID and selected feature IDs

---

### User Story 4 - Associated Files Browser (Priority: P4)

An analyst wants to see what source files and analysis results are associated with the current plot. They click the Associated Files button to see a Sources/Results tree. When a new result is generated (by running a tool), a yellow halo briefly appears on the button.

**Why this priority**: Associated files browsing requires knowledge of STAC item structure and file system concepts. It provides value but is less frequently used than filtering or direct feature manipulation.

**Independent Test**: Storybook story with mock file tree data. Verify Sources and Results sections render with file names. Click a file — verify context menu appears with Open, Open With, Reveal in Explorer, Delete options. Verify yellow halo on simulated new result.

**Acceptance Scenarios**:

1. **Given** a plot with 2 source files and 3 result files, **When** the analyst clicks Associated Files, **Then** a dropdown shows Sources (2 items) and Results (3 items) in a tree
2. **Given** the Associated Files dropdown is open, **When** the analyst clicks a result file, **Then** a context menu appears with Open, Open With..., Reveal in Explorer, Delete options
3. **Given** a source file is shown in the context menu, **When** the analyst clicks Delete, **Then** a warning about provenance chain is displayed before the `onDeleteFile` callback fires
4. **Given** a new result file is added, **When** the analyst looks at the toolbar, **Then** a yellow halo appears on the Associated Files button for ~3 seconds

---

### User Story 5 - Temporal Filtering (Priority: P5)

An analyst working with a long-duration exercise wants to filter features by time range. They open the Filter dropdown and set "Features after" and "Features before" datetime values to narrow the list to a specific period.

**Why this priority**: Temporal filtering requires datetime picker UI components and temporal metadata on features. It builds on the P1 filter infrastructure but is a more specialized use case.

**Independent Test**: Storybook story with features having temporal metadata. Set before/after datetime values — verify list filters to features within the time range.

**Acceptance Scenarios**:

1. **Given** features spanning January to March, **When** the analyst sets "Features after" to Feb 1 and "Features before" to Feb 28, **Then** only February features are shown
2. **Given** temporal filters active, **When** combined with a text search filter, **Then** both filters apply additively (intersection)

---

### Edge Cases

- What happens when no features are selected and selection-scoped buttons are clicked? → Buttons are disabled; no callback fires
- What happens when ToolMatchService returns zero tools for the current selection? → Analysis submenu shows "No tools available" disabled item; other categories still available
- What happens when the feature list is empty? → Toolbar renders but all buttons are disabled except Filter (which shows "No features")
- What happens when filter matches zero features? → Empty state shown in list; filter remains active with clear option
- What happens when Associated Files has no sources or results? → Sections render with "No files" placeholder text

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toolbar component MUST render 5 buttons in two groups: selection-scoped (Delete, Visibility, Run) on the left, plot-scoped (Filter, Associated Files) on the right
- **FR-002**: Selection-scoped buttons MUST be disabled when no features are selected
- **FR-003**: Filter dropdown MUST support text search with configurable scope (Name, Type, Platform, Attachments), with Name, Type, Platform checked by default
- **FR-004**: Filter dropdown MUST support feature type checkboxes (Tracks, Contacts, Zones, Annotations) that are additive with text search
- **FR-005**: Filter dropdown MUST support visibility filters (show hidden only, show visible only)
- **FR-006**: Filter dropdown MUST support temporal filters with before/after datetime inputs
- **FR-007**: Filter dropdown MUST provide "Apply to Selection" actions: Select matched, Add matched to selection, Remove matched from selection
- **FR-008**: Filter state indicator MUST change toolbar icon from search to filter variant when any filter is active
- **FR-009**: Run dropdown MUST show nested menu with File, Edit, View, Analysis categories per the layers-toolbar-spec
- **FR-010**: Run dropdown Analysis submenu MUST be populated from ToolMatchService based on current selection
- **FR-011**: Run button MUST show yellow halo CSS animation when available tools change due to selection change; halo clears after ~3 seconds or when dropdown is opened
- **FR-012**: Associated Files dropdown MUST display Sources and Results tree from provided file data
- **FR-013**: Associated Files dropdown MUST show context menu on file click: Open, Open With..., Reveal in Explorer, Delete
- **FR-014**: Delete on a Source file MUST display a provenance chain warning before invoking callback
- **FR-015**: Associated Files button MUST show yellow halo when new Results file is added; clears after ~3 seconds or when dropdown is opened
- **FR-016**: All user-visible strings MUST be externalisable (no hardcoded English) per Constitution Article XI
- **FR-017**: Component MUST have no VS Code dependencies — pure shared-components implementation
- **FR-018**: Multi-suffix file convention (`<name>.<viewer-type>.<format>`) MUST be supported in Associated Files display

### Key Entities

- **Feature**: A map feature (track, contact, zone, annotation) with properties including name, type, platform, visibility state, and temporal range
- **ToolMatch**: A context-sensitive tool offering from ToolMatchService, categorized into Analysis subcategories (TMA, Track Processing, Statistics)
- **AssociatedFile**: A file in the Sources or Results folder of a STAC item, with name, path, and multi-suffix type information
- **FilterState**: The combined state of all active filters (text query, scope, type checkboxes, visibility, temporal range)

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Manage features in a plot efficiently — filter, select, run tools, browse files
- **Key Decision(s)**:
  1. Which features to act on (selection + filtering)
  2. Which tool to run on selected features
  3. Which associated file to open/inspect
- **Decision Inputs**: Feature list with current selection, active filter indicators, context-sensitive tool availability, source/result file inventory

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Toolbar above FeatureList | Click Filter button | Filter dropdown opens |
| 2 | Filter dropdown open | Type search text, toggle checkboxes | Feature list filters in real-time |
| 3 | Filtered list shown | Select features | Selection-scoped buttons become enabled |
| 4 | Features selected | Click Run button | Run dropdown shows context-sensitive menu |
| 5 | Run dropdown open | Click Analysis > TMA tool | `onRunTool` callback fires; dropdown closes |
| 6 | Tool result available | Yellow halo on Associated Files | Analyst clicks Associated Files to see new result |

### Component Layout

```
┌──────────────────────────────────────────────────┐
│ [ 🗑 ] [ 👁 ] [ ▶ Run ▼ ]  ···  [ 🔍 ▼ ] [ 📎 ▼ ] │
│  ─ ─ ─ selection ─ ─ ─       ─ ─ plot scope ─ ─  │
├──────────────────────────────────────────────────┤
│                                                    │
│              Feature List (existing)               │
│                                                    │
└──────────────────────────────────────────────────┘
```

### UI States

- **Empty State**: Toolbar renders with all buttons disabled except Filter. Filter shows "No features" when opened.
- **No Selection State**: Selection-scoped buttons (Delete, Visibility, Run) disabled. Plot-scoped buttons (Filter, Associated Files) remain enabled.
- **Filtered State**: Filter icon changes to indicate active filters. Feature list shows only matching items. Badge or count may indicate "showing N of M".
- **Tool Change State**: Yellow halo animation on Run button for ~3 seconds after available tools change.
- **New Result State**: Yellow halo animation on Associated Files button for ~3 seconds after new result file appears.

## Component Architecture

### Props Interface

```typescript
interface LayersToolbarProps {
  /** Currently selected feature IDs */
  selectedFeatureIds: string[];
  /** All features in the current plot */
  features: Feature[];
  /** Tool match results for current selection */
  toolMatches: ToolMatchResult[];
  /** Associated source files */
  sourceFiles: AssociatedFile[];
  /** Associated result files */
  resultFiles: AssociatedFile[];
  /** Whether tool matches have changed since last dropdown open */
  toolsChanged: boolean;
  /** Whether new results have been added since last dropdown open */
  resultsChanged: boolean;

  // Callbacks
  onDelete: (featureIds: string[]) => void;
  onToggleVisibility: (featureIds: string[]) => void;
  onRunTool: (toolId: string, featureIds: string[]) => void;
  onFilterChange: (filterState: FilterState) => void;
  onApplyToSelection: (action: 'select' | 'add' | 'remove', matchedIds: string[]) => void;
  onFileAction: (file: AssociatedFile, action: 'open' | 'openWith' | 'reveal' | 'delete') => void;
  onDropdownOpened: (dropdown: 'run' | 'associated') => void;

  // I18N
  labels?: Partial<ToolbarLabels>;
}
```

### Filter State

```typescript
interface FilterState {
  textQuery: string;
  searchScope: {
    name: boolean;    // default: true
    type: boolean;    // default: true
    platform: boolean; // default: true
    attachments: boolean; // default: false
  };
  featureTypes: {
    tracks: boolean;
    contacts: boolean;
    zones: boolean;
    annotations: boolean;
  };
  visibility: 'all' | 'hidden-only' | 'visible-only';
  temporal: {
    before: string | null; // ISO 8601
    after: string | null;  // ISO 8601
  };
}
```

### Associated File

```typescript
interface AssociatedFile {
  name: string;
  path: string;
  category: 'source' | 'result';
  /** Parsed from multi-suffix convention */
  viewerType?: string; // e.g., '2d', 'table', 'text', 'grid-3d'
  format?: string;     // e.g., 'json', 'geojson', 'csv'
}
```

## Phased Delivery

### Phase 1: Search/Filter Dropdown
- `FilterDropdown` component with own Storybook story
- All filter sections: text search with scope, feature type checkboxes, visibility, temporal, apply-to-selection
- Filter state indicator (search → filter icon)
- Dark theme variant

### Phase 2: Toolbar Shell + Selection Buttons
- `LayersToolbar` component with 5 button slots
- Delete and Visibility buttons wired to callbacks
- Selection-aware disabled state
- Own Storybook story

### Phase 3: Run Dropdown
- Nested context menu with File/Edit/View/Analysis categories
- Analysis submenu from ToolMatchService integration
- Yellow halo animation on tool change
- Own Storybook story with mock tool data

### Phase 4: Associated Files Dropdown
- Sources/Results tree display
- Context menu on file click (Open, Open With, Reveal, Delete)
- Provenance warning on source delete
- Yellow halo on new results
- Multi-suffix convention display
- Own Storybook story

### Phase 5: Combined FeatureList + Toolbar
- Integrate toolbar above existing FeatureList
- Full integration story with interactive selection driving tool matching
- Dark theme variant for complete assembly

## Files to Create

| File | Purpose |
|------|---------|
| `shared/components/src/LayersToolbar/LayersToolbar.tsx` | Main toolbar component with 5 buttons |
| `shared/components/src/LayersToolbar/LayersToolbar.css` | Toolbar styles with CSS custom properties |
| `shared/components/src/LayersToolbar/FilterDropdown.tsx` | Filter/search dropdown component |
| `shared/components/src/LayersToolbar/FilterDropdown.css` | Filter dropdown styles |
| `shared/components/src/LayersToolbar/RunDropdown.tsx` | Run button nested context menu |
| `shared/components/src/LayersToolbar/RunDropdown.css` | Run dropdown styles |
| `shared/components/src/LayersToolbar/AssociatedFilesDropdown.tsx` | Associated files tree + context menu |
| `shared/components/src/LayersToolbar/AssociatedFilesDropdown.css` | Associated files styles |
| `shared/components/src/LayersToolbar/YellowHalo.css` | Shared yellow halo animation keyframes |
| `shared/components/src/LayersToolbar/types.ts` | TypeScript interfaces (FilterState, AssociatedFile, ToolbarLabels, props) |
| `shared/components/src/LayersToolbar/index.ts` | Public exports |
| `shared/components/src/LayersToolbar/LayersToolbar.stories.tsx` | Storybook stories for all phases |
| `shared/components/src/LayersToolbar/FilterDropdown.stories.tsx` | Standalone filter dropdown stories |

## Files to Modify

| File | Change |
|------|--------|
| `shared/components/src/index.ts` | Export LayersToolbar, FilterDropdown, and types |
| `shared/components/src/FeatureList/FeatureList.tsx` | Add optional `toolbar` prop or compose with LayersToolbar in stories |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Filter dropdown renders all sections (text search, scope, type, visibility, temporal, apply-to-selection) and each filter narrows the feature list correctly
- **SC-002**: All 5 toolbar buttons render with correct icons and tooltips matching the layers-toolbar-spec
- **SC-003**: Run dropdown shows nested File/Edit/View/Analysis menu; Analysis submenu updates based on ToolMatch results for current selection
- **SC-004**: Associated Files dropdown displays Sources/Results tree with working context menu (Open, Open With, Reveal, Delete)
- **SC-005**: Yellow halo animations appear on Run (tool change) and Associated Files (new result) buttons, clearing after ~3 seconds or on dropdown open
- **SC-006**: Selection-scoped buttons disable when no features are selected
- **SC-007**: Filter state indicator changes icon when any filter is active
- **SC-008**: Storybook stories exist for each phase (FilterDropdown standalone, toolbar shell, Run dropdown, Associated Files, combined FeatureList+Toolbar)
- **SC-009**: Dark theme variants render correctly in all stories
- **SC-010**: All user-visible strings are externalisable via labels prop — no hardcoded English
- **SC-011**: Zero VS Code dependencies in any shared-components file

## Constitution Compliance

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| I.3 | No silent failures | Delete/visibility callbacks include feature IDs; empty selection prevents action |
| IV.1 | Services never touch UI | Toolbar is pure UI; tool metadata and file data provided via props |
| IV.2 | Frontends never persist | All state managed via callbacks to host; no direct writes |
| V.1 | Fail-safe loading | Missing tool data or file data renders gracefully with empty/disabled states |
| V.2 | Schema compliance | Associated files follow multi-suffix convention |
| X/XI | I18N from start | All labels externalisable via `labels` prop |

## Out of Scope

- VS Code integration (separate task: unified activity panel #044)
- Actual tool execution (mocked callbacks only)
- Actual file operations — delete, open, reveal (mocked callbacks only)
- Map toolbar / navigation controls
- Right-click context menus on feature rows
- Viewer implementations for multi-suffix file types
