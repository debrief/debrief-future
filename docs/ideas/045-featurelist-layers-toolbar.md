# Add layers toolbar with search, run, and associated files to FeatureList in shared-components

## Problem

The FeatureList component in shared-components displays features but lacks the toolbar specified in docs/layers-toolbar-spec.md. Analysts need efficient access to selection-scoped actions (delete, visibility, run tool) and plot-scoped utilities (filter/search, associated files) without navigating menus. The toolbar should live entirely in shared-components with no VS Code dependencies, ready for later integration into a unified activity panel.

## Proposed Solution

Extend the existing FeatureList with a toolbar implementing all 5 buttons from the layers-toolbar-spec. Build incrementally with Storybook stories at each phase:

### Phase 1: Search/Filter Dropdown
- Standalone component with its own Story
- Full filter UI: text search with scope checkboxes (Name, Type, Platform, Attachments)
- Feature type checkboxes (Tracks, Contacts, Zones, Annotations)
- Visibility filters (show hidden/visible only)
- Temporal filters (before/after datetime pickers)
- Apply-to-selection actions
- Filter state indicator (search icon → filter icon when active)

### Phase 2: Outline Toolbar
- Toolbar component containing all 5 buttons: Delete, Visibility, Run, Filter, Associated Files
- Selection-scoped buttons (left): Delete, Visibility, Run
- Plot-scoped buttons (right): Filter, Associated Files
- Run dropdown uses existing ToolMatch/ToolMatchHarness system for context-sensitive tool selection
- Associated Files dropdown shows Sources/Results tree with context menu
- Yellow halo CSS animation on Run (when tools change) and Associated Files (when new results)
- Own Story demonstrating toolbar in isolation

### Phase 3: Combined FeatureList + Toolbar
- Integrate toolbar above existing FeatureList
- Story showing full combined view with interactive selection driving tool matching
- Dark theme variant

### Tool Selection
- Use existing `ToolMatchService` from shared-components for Run dropdown
- Reuse tool fixtures for demo/story purposes
- Run dropdown shows nested menu structure (File/Edit/View/Analysis categories)
- Analysis submenu populated from ToolMatch results

## Success Criteria
- [ ] Search/Filter dropdown renders all sections from spec, with own Story
- [ ] All 5 toolbar buttons render with correct icons and tooltips
- [ ] Run dropdown integrates ToolMatchService — tools update based on selection
- [ ] Associated Files dropdown shows Sources/Results tree
- [ ] Yellow halo animations work on Run and Associated Files buttons
- [ ] Filter state indicator changes icon when filters active
- [ ] Combined FeatureList+Toolbar Story shows full integration
- [ ] Dark theme variants for all stories
- [ ] All strings externalisable (no hardcoded English)
- [ ] No VS Code dependencies — pure shared-components

## Constraints
- Must live in `shared/components/` — no VS Code extension code
- Must have Storybook stories for each phase
- Reuse existing ToolMatch system for tool selection
- I18N: all labels externalisable per Constitution Article XI
- Mock data acceptable for Associated Files content

## Out of Scope
- VS Code integration (separate task: unified activity panel #044)
- Actual tool execution (mocked callbacks)
- Actual file operations (delete, open)
- Map toolbar / navigation controls
- Right-click context menus on feature rows
