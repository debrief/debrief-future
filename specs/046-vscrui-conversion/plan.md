# Implementation Plan: vscrui Component and Theme Library Conversion

**Feature Branch**: `046-vscrui-conversion`
**Spec**: [spec.md](spec.md)
**SRD**: [docs/045-vscrui-conversion-srd.md](../../docs/045-vscrui-conversion-srd.md)
**Complexity**: Medium → Sonnet model for implementation

## Overview

Convert FeatureList and LayersToolbar components from raw HTML elements to vscrui library components, eliminate hardcoded colours, fix dark-mode media queries, and add platform icons. Five phases, infrastructure first.

## Phase 1: Infrastructure Setup

**Goal**: Install vscrui, fix token gaps, and fix dark-mode selectors before touching any components.

### Task 1.1 — Install vscrui dependency

- Add `vscrui` to `shared/components/package.json` dependencies
- Run `pnpm install` to verify no conflicts
- **Verify**: `vscrui` listed in `node_modules`, no peer dependency warnings

### Task 1.2 — Import Codicon CSS in Storybook preview

- Add `import 'vscrui/dist/codicon.css'` to `.storybook/preview.tsx`
- **Verify**: Codicon icons render in Storybook (inspect any `codicon-*` class)

### Task 1.3 — Add attention colour token

- Add `--debrief-color-attention` to `shared/components/src/styles/tokens.css`
- Light value: `rgba(255, 193, 7, 0.6)`
- Dark value: `rgba(255, 193, 7, 0.6)` (same for both themes)
- **Verify**: Token available in Storybook DevTools under both themes

### Task 1.4 — Replace hardcoded colour values (7 instances)

Files and replacements:

| File | Current | Replacement |
|------|---------|-------------|
| `AssociatedFilesDropdown.css:112` | `color: #c62828` | `color: var(--debrief-color-danger)` |
| `AssociatedFilesDropdown.css:127` | `color: #c62828` | `color: var(--debrief-color-danger)` |
| `AssociatedFilesDropdown.css:116` | `rgba(198, 40, 40, 0.06)` | Token-based equivalent |
| `YellowHalo.css:8` | `rgba(255, 193, 7, 0.6)` | `var(--debrief-color-attention)` |
| `YellowHalo.css:11` | `rgba(255, 193, 7, 0.5)` | `var(--debrief-color-attention)` with opacity adjustment |
| `YellowHalo.css:14` | `rgba(255, 193, 7, 0)` | `transparent` or `var(--debrief-color-attention)` at 0 opacity |

- **Verify**: `grep -rn 'rgb\|rgba\|#[0-9a-fA-F]' shared/components/src/ --include='*.css'` returns zero matches outside `tokens.css`

### Task 1.5 — Replace prefers-color-scheme media queries with ThemeProvider selectors

- `FeatureList.css` (lines 185-208): Replace `@media (prefers-color-scheme: dark)` with `[data-theme='dark']` selector
- `FilterDropdown.css`: Same replacement
- Move token overrides into `[data-theme='dark']` blocks
- **Verify**: `grep -rn 'prefers-color-scheme' shared/components/src/ --include='*.css'` returns zero matches

## Phase 2: FilterDropdown Conversion

**Goal**: Convert the component with the highest element count first.

### Task 2.1 — Convert search input to TextField

- Replace `<input type="text" className="debrief-filter-dropdown__search-input">` with `<TextField>`
- Preserve `placeholder` prop and `onChange` callback (fires every keystroke)
- Remove corresponding CSS class styles (vscrui handles styling)
- **Verify**: Typing in search field filters list; placeholder text visible

### Task 2.2 — Convert checkboxes to Checkbox

- Replace 4 static checkboxes (name, type, platform, attachments) with `<Checkbox label="...">`
- Replace dynamic feature kind checkboxes with `<Checkbox label={kind}>`
- Preserve `checked` and `onChange` props
- **Verify**: Toggling checkboxes filters feature list; dynamic kinds render from data

### Task 2.3 — Convert visibility radio group to Dropdown

- Replace 3 radio buttons (All / Hidden only / Visible only) with `<Dropdown>` component
- Map radio `onChange` to Dropdown `onChange` with same value semantics
- **Verify**: Selecting dropdown option filters by visibility state

### Task 2.4 — Convert action row buttons to Button

- Replace 5 icon buttons with `<Button appearance="icon">`
- Swap inline SVGs for Codicon `<Icon>` where mapping exists (select-all → `check-all`, check → `check`, add → `add`, remove → `remove`)
- Retain inline SVG for eraser (no Codicon equivalent)
- **Verify**: All action buttons functional; icons render in all themes

### Task 2.5 — Evaluate and convert temporal inputs

- Test if vscrui `<TextField type="datetime-local">` works
- If yes: convert both date-time inputs
- If no: style native `<input type="datetime-local">` with `--debrief-*` tokens and raise a backlog item
- **Verify**: Date-time selection works; clear buttons functional

## Phase 3: LayersToolbar Conversion

**Goal**: Convert toolbar buttons and icons.

### Task 3.1 — Convert toolbar buttons to Button

- Replace 6 toolbar `<button>` elements with `<Button appearance="icon">`
- Preserve `onClick`, `disabled`, `title` props
- Preserve disabled visual state via vscrui's built-in styling
- **Verify**: All toolbar actions work; disabled buttons visually distinct

### Task 3.2 — Replace inline SVG icons with Codicon

Using the mapping from the SRD:

| Button | Codicon |
|--------|---------|
| Delete | `trash` |
| Show | `eye` |
| Hide | `eye-closed` |
| Run | `play` |
| Search/Filter | `search` |
| Filter active | `filter` |

- Retain inline SVG for icons without Codicon equivalents (eraser, paperclip)
- **Verify**: Icons render in all three themes; no broken icon slots

## Phase 4: RunDropdown and AssociatedFilesDropdown Conversion

**Goal**: Convert remaining dropdown components.

### Task 4.1 — Convert RunDropdown menu items

- Replace `<button className="debrief-run-dropdown__menu-item">` with `<Button appearance="icon">` or appropriate list pattern
- **Verify**: Menu items functional; styling consistent with theme

### Task 4.2 — Convert AssociatedFilesDropdown

- Replace file row buttons with `<Button appearance="icon">`
- Replace context action buttons (Open, Open With, Reveal, Delete) with `<Button appearance="secondary">`
- Danger-coloured actions now use `var(--debrief-color-danger)` token (from Phase 1)
- **Verify**: File operations work; delete action shows danger styling in both themes

## Phase 5: Verification and Stories

**Goal**: Visual regression check and multi-context stories.

### Task 5.1 — Add multi-context stories

- Add `withMultiContext` decorator stories for:
  - LayersToolbar (Light, Dark, VS Code side-by-side)
  - FilterDropdown (Light, Dark, VS Code side-by-side)
- **Verify**: Stories render three variants simultaneously in Storybook

### Task 5.2 — Visual regression check

- Open every component story in Light, Dark, and VS Code themes
- Verify interactive states: hover, focus, disabled, active
- Verify no raw-styled remnants visible
- **Verify**: All components match theme styling with no visual artefacts

### Task 5.3 — Keyboard navigation verification

- Tab through all interactive elements in FeatureList + toolbar
- Enter/Space activate buttons and checkboxes
- Escape closes dropdowns
- FeatureRow div responds to keyboard events
- **Verify**: Navigation identical to pre-conversion behaviour

### Task 5.4 — Automated checks

- Run: `grep -rn 'rgb\|rgba\|#[0-9a-fA-F]' shared/components/src/ --include='*.css'` → zero matches outside `tokens.css`
- Run: `grep -rn 'prefers-color-scheme' shared/components/src/ --include='*.css'` → zero matches
- Run existing test suite → all pass without modification
- **Verify**: All automated checks pass

## File Change Summary

| File | Change Type |
|------|-------------|
| `shared/components/package.json` | Modify (add vscrui dep) |
| `.storybook/preview.tsx` | Modify (add Codicon CSS import) |
| `shared/components/src/styles/tokens.css` | Modify (add attention token) |
| `AssociatedFilesDropdown.css` | Modify (replace hardcoded colours) |
| `YellowHalo.css` | Modify (replace hardcoded colours) |
| `FeatureList.css` | Modify (replace media query) |
| `FilterDropdown.css` | Modify (replace media query) |
| `FilterDropdown.tsx` | Modify (vscrui components) |
| `LayersToolbar.tsx` | Modify (vscrui components) |
| `RunDropdown.tsx` | Modify (vscrui components) |
| `AssociatedFilesDropdown.tsx` | Modify (vscrui components) |
| `LayersToolbar.stories.tsx` | Modify (add multi-context story) |
| `FilterDropdown.stories.tsx` | Modify (add multi-context story) |

## Risk Mitigations

- **vscrui TextField doesn't support datetime-local**: Fall back to styled native input with tokens; raise backlog item
- **Codicon font missing in contexts**: Bundle via npm (REQ-INST-003), verify in Electron
- **Visual regression**: Compare before/after in all three themes before merging each phase

## Acceptance Criteria Mapping

| AC | Covered By |
|----|------------|
| AC-001 | Task 1.1 |
| AC-002 | Task 1.4 + Task 5.4 |
| AC-003 | Task 1.5 + Task 5.4 |
| AC-004 | Phases 2-4 |
| AC-005 | Task 5.2 |
| AC-006 | Tasks 2.4, 3.2 |
| AC-007 | All component tasks (preserve props/callbacks) |
| AC-008 | Task 5.3 |
| AC-009 | Task 1.3 |
| AC-010 | Task 5.1 |
