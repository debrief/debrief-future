# SRD: vscrui Component and Theme Library Conversion

**Document**: Software Requirements Definition
**Scope**: FeatureList + LayersToolbar conversion to vscrui and `--debrief-*` token system
**Related specs**: `specs/031-vscrui-component-library/spec.md`, `shared/components/vscrui.md`, `docs/storybook-vscode-theming.md`
**Date**: 2026-01-31

---

## 1. Background

The project specifies [vscrui](https://github.com/estruyf/vscrui) as the standard React component library for all web-based rendering contexts (VS Code webviews, Electron Loader, Storybook). vscrui replaces the deprecated Microsoft VS Code Webview UI Toolkit and provides components matching VS Code's native look and feel.

The FeatureList and LayersToolbar components (backlog item 045) were built using raw HTML elements (`<button>`, `<input>`, `<div role="button">`) with `--debrief-*` CSS custom properties for theming. This SRD defines the requirements for converting these components to use vscrui and fully aligning with the project's three-layer theming architecture.

### Current State

- **vscrui is not installed** — no `package.json` lists it as a dependency
- **Token system is partially adopted** — components use `var(--debrief-*, fallback)` but 7 raw color values remain
- **ThemeProvider infrastructure exists** — `tokens.css`, `vsCodeAdapter.ts`, and `ThemeProvider.tsx` are implemented
- **Storybook theming is operational** — Light/Dark/VS Code toolbar switcher works

---

## 2. Objectives

1. Replace raw HTML form elements with vscrui equivalents
2. Eliminate all hardcoded color values in favour of `--debrief-*` tokens
3. Ensure components render correctly in Light, Dark, and VS Code theme variants
4. Maintain backward compatibility — all existing props, callbacks, and behaviour must be preserved

---

## 3. Component Inventory and Mapping

### 3.1 Buttons (20+ instances)

| Location | Current | vscrui Target | Notes |
|----------|---------|---------------|-------|
| LayersToolbar toolbar buttons (6) | `<button className="debrief-layers-toolbar__btn">` | `<Button appearance="icon">` | Icon-only buttons; use vscrui Icon variant with Codicon or inline SVG |
| FilterDropdown action row (5) | `<button className="debrief-filter-dropdown__action-icon-btn">` | `<Button appearance="icon">` | Small 28px icon buttons; needs size customisation |
| FilterDropdown temporal clear (2) | `<button className="debrief-filter-dropdown__temporal-clear">` | `<Button appearance="icon">` | Inline × clear buttons |
| RunDropdown menu items (N) | `<button className="debrief-run-dropdown__menu-item">` | `<Button appearance="icon">` or custom list item | Context menu items; may need custom styling to match menu pattern |
| AssociatedFiles file rows (N) | `<button className="debrief-associated-files__file-row">` | `<Button appearance="icon">` | File list items with context menu |
| AssociatedFiles context actions (4) | `<button className="debrief-associated-files__context-btn">` | `<Button appearance="secondary">` | Open, Open With, Reveal, Delete |

**Requirement REQ-BTN-001**: All `<button>` elements must be replaced with vscrui `Button` components using the appropriate `appearance` prop (`primary`, `secondary`, or `icon`).

**Requirement REQ-BTN-002**: Icon-only toolbar buttons must use vscrui's icon button variant. Where Codicon equivalents exist (delete, eye, play, search, paperclip), use `<Icon>` from vscrui. Where no Codicon exists, retain inline SVG within the Button.

**Requirement REQ-BTN-003**: The `disabled` prop behaviour must be preserved — buttons must visually indicate disabled state through vscrui's built-in styling.

### 3.2 Text Input (1 instance)

| Location | Current | vscrui Target |
|----------|---------|---------------|
| FilterDropdown search | `<input type="text" className="debrief-filter-dropdown__search-input">` | `<TextField>` |

**Requirement REQ-TXT-001**: The search input must be replaced with vscrui `TextField` with `placeholder` prop. The `onChange` callback must fire on every keystroke (the component already debounces internally).

### 3.3 Checkboxes (4 static + N dynamic)

| Location | Current | vscrui Target |
|----------|---------|---------------|
| Search scope (name, type, platform, attachments) | `<label><input type="checkbox"> text</label>` | `<Checkbox label="text">` |
| Feature type kinds (dynamic) | `<label><input type="checkbox"> {kind}</label>` | `<Checkbox label={kind}>` |

**Requirement REQ-CHK-001**: All checkbox inputs must be replaced with vscrui `Checkbox` components. The `checked` and `onChange` props must be preserved.

**Requirement REQ-CHK-002**: Dynamic feature kind checkboxes must continue to render from the `featureKinds` array prop.

### 3.4 Radio Buttons (3 instances)

| Location | Current | vscrui Target |
|----------|---------|---------------|
| Visibility filter (All / Hidden only / Visible only) | `<label><input type="radio"> text</label>` | vscrui `Dropdown` or custom radio group |

**Requirement REQ-RAD-001**: The visibility radio group must be converted. vscrui does not provide a dedicated RadioGroup — evaluate whether to: (a) use a `Dropdown` with three options, or (b) create a custom radio group following vscrui's styling patterns. Decision should favour the approach that matches VS Code's native UI patterns (dropdowns are more common in VS Code panels than radio groups).

### 3.5 Date/Time Inputs (2 instances)

| Location | Current | vscrui Target |
|----------|---------|---------------|
| Temporal "after" filter | `<input type="datetime-local">` | `<TextField type="datetime-local">` or custom |
| Temporal "before" filter | `<input type="datetime-local">` | `<TextField type="datetime-local">` or custom |

**Requirement REQ-DT-001**: vscrui does not provide a dedicated date-time picker. The `<input type="datetime-local">` elements should be wrapped in vscrui `TextField` if it supports the `type` attribute pass-through, or remain as styled native inputs following vscrui's CSS custom property patterns. A backlog item should be raised if a custom date-time component is needed.

### 3.6 Interactive Div (1 instance)

| Location | Current | vscrui Target |
|----------|---------|---------------|
| FeatureRow | `<div role="button" tabIndex={0} onClick>` | Retain as `<div>` with ARIA attributes |

**Requirement REQ-ROW-001**: FeatureRow is a virtualised list item, not a standard button. It should remain as a `<div>` with `role="button"` and keyboard support. The styling must use `--debrief-*` tokens exclusively (it already does). No vscrui conversion needed for this element.

---

## 4. Theming Requirements

### 4.1 Token Compliance

**Requirement REQ-THM-001**: All CSS files must use `--debrief-*` tokens exclusively. No raw hex, rgb, or rgba colour values.

**Current violations** (7 instances):

| File | Line | Current Value | Required Token |
|------|------|---------------|----------------|
| `AssociatedFilesDropdown.css:112` | `color: #c62828` | `var(--debrief-color-danger)` |
| `AssociatedFilesDropdown.css:127` | `color: #c62828` | `var(--debrief-color-danger)` |
| `AssociatedFilesDropdown.css:116` | `rgba(198, 40, 40, 0.06)` | `var(--debrief-color-danger)` with opacity via `color-mix()` or dedicated token |
| `YellowHalo.css:8` | `rgba(255, 193, 7, 0.6)` | New token: `--debrief-color-attention` |
| `YellowHalo.css:11` | `rgba(255, 193, 7, 0.5)` | New token: `--debrief-color-attention` |
| `YellowHalo.css:14` | `rgba(255, 193, 7, 0)` | New token: `--debrief-color-attention` |

**Requirement REQ-THM-002**: Add the following tokens to `shared/components/src/styles/tokens.css`:

| Token | Purpose | Light Value | Dark Value |
|-------|---------|-------------|------------|
| `--debrief-color-attention` | Change notification halo | `rgba(255, 193, 7, 0.6)` | `rgba(255, 193, 7, 0.6)` |

### 4.2 Dark Theme via ThemeProvider

**Requirement REQ-THM-003**: Remove all `@media (prefers-color-scheme: dark)` blocks from component CSS files. Dark mode must be driven by ThemeProvider's `[data-theme='dark']` selector, not by the browser media query. This ensures Storybook's theme toolbar and VS Code theme sync work correctly.

**Affected files**:
- `FeatureList.css` (lines 185-208)
- `FilterDropdown.css` (dark theme section)

**Requirement REQ-THM-004**: Replace `@media (prefers-color-scheme: dark)` with `[data-theme='dark']` selector blocks. All dark-mode overrides must use `--debrief-*` tokens.

### 4.3 VS Code Theme Variant

**Requirement REQ-THM-005**: Components must render correctly under `[data-theme='vscode']`. Since vscrui components inherit VS Code's native CSS variables, and the `vsCodeAdapter.ts` maps `--vscode-*` to `--debrief-*`, no additional work is expected — but visual verification in Storybook's VS Code theme is required.

### 4.4 Codicon Icons

**Requirement REQ-ICN-001**: Where vscrui Codicon equivalents exist, replace inline SVG icons with `<Icon name="codicon-name" />` from vscrui.

**Codicon mapping for toolbar buttons**:

| Button | Current | Codicon |
|--------|---------|---------|
| Delete | Inline SVG (trash) | `trash` |
| Visibility (show) | Inline SVG (eye) | `eye` |
| Visibility (hide) | Inline SVG (eye-slash) | `eye-closed` |
| Run | Inline SVG (play) | `play` |
| Search/Filter | Inline SVG (magnifier) | `search` |
| Filter active | Inline SVG (funnel) | `filter` |
| Associated Files | Inline SVG (paperclip) | `link` or retain SVG |
| Clear filters (eraser) | Inline SVG | No Codicon — retain SVG |
| Select All | Inline SVG (double-check) | `check-all` |
| Select Matched | Inline SVG (check) | `check` |
| Add Matched | Inline SVG (plus) | `add` |
| Remove Matched | Inline SVG (minus) | `remove` |
| Show/Hide hidden | Inline SVG (eye variants) | `eye` / `eye-closed` |

**Requirement REQ-ICN-002**: Icons without Codicon equivalents (eraser, paperclip) should remain as inline SVG wrapped in vscrui `Button appearance="icon"`.

---

## 5. Storybook Requirements

**Requirement REQ-SB-001**: All stories must render correctly in Light, Dark, and VS Code theme variants via the Storybook toolbar switcher.

**Requirement REQ-SB-002**: Import `vscrui/dist/codicon.css` in `.storybook/preview.tsx` to enable Codicon rendering in stories.

**Requirement REQ-SB-003**: Add multi-context stories using `withMultiContext` decorator for key components (LayersToolbar, FilterDropdown, FeatureList WithToolbar) to show all three themes side-by-side.

---

## 6. Installation Requirements

**Requirement REQ-INST-001**: Add `vscrui` as a dependency to `shared/components/package.json`.

**Requirement REQ-INST-002**: Import `vscrui/dist/codicon.css` in the component library entry point or Storybook preview.

**Requirement REQ-INST-003**: Ensure the vscrui package and Codicon font are bundled offline (no CDN references).

---

## 7. Migration Strategy

### Phase 1: Infrastructure (prerequisite)

1. Install vscrui in `shared/components`
2. Import Codicon CSS in Storybook preview
3. Replace `@media (prefers-color-scheme: dark)` with `[data-theme='dark']` in all CSS files
4. Add missing tokens (`--debrief-color-attention`) to `tokens.css`
5. Eliminate all raw colour values

### Phase 2: FilterDropdown (highest element count)

1. Replace `<input type="text">` with `<TextField>`
2. Replace checkboxes with `<Checkbox>`
3. Convert visibility radio group to `Dropdown` or styled radio group
4. Replace action row buttons with `<Button appearance="icon">`
5. Evaluate temporal inputs

### Phase 3: LayersToolbar

1. Replace toolbar buttons with `<Button appearance="icon">`
2. Swap inline SVG icons for Codicon `<Icon>` where mappings exist
3. Retain custom SVG in vscrui Button where no Codicon exists

### Phase 4: RunDropdown and AssociatedFilesDropdown

1. Replace menu item buttons
2. Replace context menu action buttons
3. Migrate danger-coloured actions to use token

### Phase 5: Verification

1. Visual regression check in Light, Dark, VS Code themes
2. Add `withMultiContext` stories for key components
3. Verify all interactive states (hover, focus, disabled, active)
4. Verify keyboard navigation preserved
5. Verify no raw colour values remain (lint/grep check)

---

## 8. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC-001 | vscrui is listed in `shared/components/package.json` dependencies |
| AC-002 | Zero raw hex/rgb/rgba colour values in component CSS (excluding token definition files) |
| AC-003 | Zero `@media (prefers-color-scheme: dark)` in component CSS |
| AC-004 | All `<input>`, `<button>` elements replaced with vscrui equivalents (except FeatureRow div) |
| AC-005 | All stories render correctly in Light, Dark, and VS Code Storybook themes |
| AC-006 | Codicon icons used where mapping exists; inline SVG retained where no Codicon equivalent |
| AC-007 | All existing props, callbacks, and user interactions preserved |
| AC-008 | Keyboard navigation (Tab, Enter, Space, Escape) works identically |
| AC-009 | `--debrief-color-attention` token defined in `tokens.css` with light and dark values |
| AC-010 | Multi-context stories (`withMultiContext`) exist for LayersToolbar and FilterDropdown |

---

## 9. Out of Scope

- Converting components outside FeatureList and LayersToolbar (other shared components have their own conversion timeline)
- Creating custom vscrui components for gaps (raise backlog items instead)
- Changing component behaviour or adding new features during conversion
- Converting the VS Code extension webview itself (separate scope, item 044)

---

## 10. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| vscrui npm package | Not installed | Phase 1 prerequisite |
| `tokens.css` | Exists | Needs `--debrief-color-attention` addition |
| ThemeProvider | Exists | Functional, no changes needed |
| `vsCodeAdapter.ts` | Exists | Functional, no changes needed |
| Storybook theme toolbar | Exists | Functional, needs Codicon CSS import |
| Backlog item 031 (vscrui library spec) | Specified | This SRD covers implementation for 045 components |

---

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| vscrui component doesn't support a needed prop (e.g. `type="datetime-local"` on TextField) | Medium | Low | Fall back to styled native input with `--debrief-*` tokens |
| vscrui styling conflicts with existing `--debrief-*` tokens | Low | Medium | Test in isolation first; vscrui uses VS Code CSS variables which our adapter maps |
| Codicon font not available in all contexts | Low | Medium | Bundle via npm; verify in Electron and VS Code webview |
| Visual regression in existing stories | Medium | Medium | Compare before/after screenshots in all three themes before merging |
