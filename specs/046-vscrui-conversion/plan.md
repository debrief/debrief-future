# Implementation Plan: vscrui Component and Theme Library Conversion

**Branch**: `046-vscrui-conversion` | **Date**: 2026-02-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/046-vscrui-conversion/spec.md`

## Summary

Convert FeatureList and LayersToolbar raw HTML elements to vscrui library components, eliminate 7 hardcoded colour values via `--debrief-*` tokens, replace browser media queries with ThemeProvider selectors, and swap inline SVG icons for Codicon equivalents. Research confirmed vscrui provides Button, Checkbox, TextField, Dropdown, and Icon — all needed for this conversion. TextField does not support `type="datetime-local"`, so native date inputs are retained with token styling.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18+ components)
**Primary Dependencies**: vscrui (new), React 18, @debrief/components (existing)
**Storage**: N/A (frontend components only)
**Testing**: Vitest (unit), Playwright (e2e), Storybook (visual)
**Target Platform**: VS Code webview, Electron, Storybook (browser)
**Project Type**: Web (shared component library)
**Performance Goals**: N/A (no performance-sensitive changes)
**Constraints**: Offline-capable (no CDN), all themes must render correctly
**Scale/Scope**: ~13 files modified, ~30 element conversions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | vscrui bundled via npm, Codicon font included in package — no CDN |
| II. Schema Integrity | Schema tests mandatory | N/A | No schema changes |
| III. Data Sovereignty | Provenance always | N/A | No data transformations |
| IV. Architectural Boundaries | Services never touch UI | PASS | This is purely frontend component work |
| V. Extensibility | No vendor lock-in | PASS | vscrui is MIT-licensed, wraps standard HTML elements |
| VI. Testing | Tests required | PASS | Existing Vitest + Playwright tests must pass; Storybook visual verification |
| VII. Test-Driven AI | Definition of done first | PASS | Acceptance criteria defined in spec; contract JSON defines verification |
| VIII. Documentation | Specs before code | PASS | Spec and SRD complete |
| IX. Dependencies | Minimal, vetted | PASS | vscrui is the project-standard library (spec 031); single new dependency |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-v4.0.0 |

**Post-design re-check**: All gates still pass. No new dependencies beyond vscrui. No architectural boundary violations.

## Project Structure

### Documentation (this feature)

```text
specs/046-vscrui-conversion/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: vscrui API research, decision log
├── data-model.md        # Phase 1: prop mapping, token schema, CSS migration
├── quickstart.md        # Phase 1: usage examples for each vscrui component
├── contracts/           # Phase 1: verification contract JSON
│   └── component-conversion.json
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/               # Phase 2: blog/LinkedIn content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/
├── package.json                          # Add vscrui dependency
├── .storybook/
│   └── preview.tsx                       # Import codicon.css
└── src/
    ├── styles/
    │   └── tokens.css                    # Add --debrief-color-attention
    ├── FeatureList/
    │   ├── FeatureList.css               # Replace media query
    │   └── FeatureList.stories.tsx        # No changes (FeatureRow stays as div)
    └── LayersToolbar/
        ├── LayersToolbar.tsx              # Button + Icon conversion
        ├── LayersToolbar.css              # Remove raw button styles
        ├── LayersToolbar.stories.tsx       # Add multi-context story
        ├── FilterDropdown.tsx             # TextField, Checkbox, Dropdown conversion
        ├── FilterDropdown.css             # Replace media query, remove raw styles
        ├── FilterDropdown.stories.tsx      # Add multi-context story
        ├── RunDropdown.tsx                # Button conversion
        ├── AssociatedFilesDropdown.tsx     # Button conversion
        ├── AssociatedFilesDropdown.css     # Replace hardcoded colours
        └── YellowHalo.css                 # Replace hardcoded colours
```

**Structure Decision**: All changes are within the existing `shared/components` package. No new directories or packages needed.

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

| File | Current | Replacement |
|------|---------|-------------|
| `AssociatedFilesDropdown.css:112` | `color: #c62828` | `color: var(--debrief-color-danger)` |
| `AssociatedFilesDropdown.css:127` | `color: #c62828` | `color: var(--debrief-color-danger)` |
| `AssociatedFilesDropdown.css:116` | `rgba(198, 40, 40, 0.06)` | `color-mix(in srgb, var(--debrief-color-danger) 6%, transparent)` |
| `YellowHalo.css:8` | `rgba(255, 193, 7, 0.6)` | `var(--debrief-color-attention)` |
| `YellowHalo.css:11` | `rgba(255, 193, 7, 0.5)` | `color-mix(in srgb, var(--debrief-color-attention) 83%, transparent)` |
| `YellowHalo.css:14` | `rgba(255, 193, 7, 0)` | `transparent` |

- **Verify**: `grep -rn 'rgb\|rgba\|#[0-9a-fA-F]' shared/components/src/ --include='*.css'` returns zero matches outside `tokens.css`

### Task 1.5 — Replace prefers-color-scheme media queries

- `FeatureList.css` (lines 185-208): Replace `@media (prefers-color-scheme: dark)` with `[data-theme='dark']`
- `FilterDropdown.css`: Same replacement
- Move token overrides into `[data-theme='dark']` blocks
- **Verify**: `grep -rn 'prefers-color-scheme' shared/components/src/ --include='*.css'` returns zero matches

## Phase 2: FilterDropdown Conversion

**Goal**: Convert the component with the highest element count first.

### Task 2.1 — Convert search input to TextField

- Replace `<input type="text">` with vscrui `<TextField>`
- Note: `TextField.onChange` passes string directly (not event) — adapt callback
- **Verify**: Typing filters list; placeholder visible

### Task 2.2 — Convert checkboxes to Checkbox

- Replace 4 static + N dynamic checkboxes with `<Checkbox label="..." checked={...} onChange={...}>`
- **Verify**: Toggling checkboxes filters feature list

### Task 2.3 — Convert visibility radio group to Dropdown

- Replace 3 radio buttons with `<Dropdown options={['All', 'Hidden only', 'Visible only']}>`
- Decision from R3: Dropdown matches VS Code panel conventions
- **Verify**: Selection filters by visibility state

### Task 2.4 — Convert action row buttons to Button + Icon

- Replace icon buttons with `<Button appearance="icon"><Icon name="..." /></Button>`
- Codicon mappings: check-all, check, add, remove; retain SVG for eraser
- **Verify**: All actions functional; icons render in all themes

### Task 2.5 — Style native temporal inputs with tokens

- Decision from R2: TextField does not support `type="datetime-local"` — keep native
- Style with `--debrief-bg-*`, `--debrief-fg-*`, `--debrief-border-*` tokens
- **Verify**: Date-time inputs match theme styling

## Phase 3: LayersToolbar Conversion

### Task 3.1 — Convert toolbar buttons to Button

- Replace 6 `<button>` elements with `<Button appearance="icon">`
- Preserve onClick, disabled, title props
- **Verify**: All toolbar actions work; disabled state visible

### Task 3.2 — Replace inline SVG icons with Codicon

- trash, eye, eye-closed, play, search, filter → `<Icon name="...">`
- Retain SVG for eraser, paperclip (no Codicon equivalent — see R4)
- **Verify**: Icons render in all three themes

## Phase 4: RunDropdown and AssociatedFilesDropdown

### Task 4.1 — Convert RunDropdown menu items

- Replace menu item `<button>` elements with `<Button appearance="icon">`
- **Verify**: Menu items functional

### Task 4.2 — Convert AssociatedFilesDropdown

- File row buttons → `<Button appearance="icon">`
- Context actions (Open, Open With, Reveal, Delete) → `<Button appearance="secondary">`
- Danger styling uses `var(--debrief-color-danger)` (from Phase 1)
- **Verify**: File operations work; danger styling in both themes

## Phase 5: Verification and Stories

### Task 5.1 — Add multi-context stories

- `withMultiContext` decorator for LayersToolbar and FilterDropdown
- Shows Light, Dark, VS Code side-by-side
- **Verify**: Three variants render simultaneously

### Task 5.2 — Visual regression check

- All stories in Light, Dark, VS Code themes
- Interactive states: hover, focus, disabled, active
- **Verify**: No visual artefacts

### Task 5.3 — Keyboard navigation verification

- Tab, Enter, Space, Escape through all interactive elements
- FeatureRow div responds to keyboard events
- **Verify**: Navigation identical to pre-conversion

### Task 5.4 — Automated checks

- Zero raw colour values in component CSS
- Zero prefers-color-scheme queries
- All existing tests pass
- **Verify**: Contract in `contracts/component-conversion.json` satisfied

## File Change Summary

| File | Change Type |
|------|-------------|
| `shared/components/package.json` | Modify (add vscrui dep) |
| `shared/components/.storybook/preview.tsx` | Modify (add Codicon CSS import) |
| `shared/components/src/styles/tokens.css` | Modify (add attention token) |
| `shared/components/src/LayersToolbar/AssociatedFilesDropdown.css` | Modify (token colours) |
| `shared/components/src/LayersToolbar/YellowHalo.css` | Modify (token colours) |
| `shared/components/src/FeatureList/FeatureList.css` | Modify (replace media query) |
| `shared/components/src/LayersToolbar/FilterDropdown.css` | Modify (replace media query) |
| `shared/components/src/LayersToolbar/FilterDropdown.tsx` | Modify (vscrui components) |
| `shared/components/src/LayersToolbar/LayersToolbar.tsx` | Modify (vscrui components) |
| `shared/components/src/LayersToolbar/RunDropdown.tsx` | Modify (vscrui components) |
| `shared/components/src/LayersToolbar/AssociatedFilesDropdown.tsx` | Modify (vscrui components) |
| `shared/components/src/LayersToolbar/LayersToolbar.stories.tsx` | Modify (multi-context story) |
| `shared/components/src/LayersToolbar/FilterDropdown.stories.tsx` | Modify (multi-context story) |

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| LayersToolbar | `LayersToolbar/LayersToolbar.stories.tsx` | `layers-toolbar.js` | Shows toolbar with vscrui buttons and Codicon icons |
| FilterDropdown | `LayersToolbar/FilterDropdown.stories.tsx` | `filter-dropdown.js` | Shows converted form controls (TextField, Checkbox, Dropdown) |

**Inclusion Criteria Applied**:
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/layerstoolbar`

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| vscrui TextField doesn't support datetime-local | Confirmed in R2 — retain native input with token styling |
| Codicon font missing in contexts | Bundle via npm (offline); verify in Electron and VS Code webview |
| Visual regression | Compare before/after in all three themes per phase |
| vscrui styling conflicts with tokens | vscrui uses --vscode-* vars which our adapter maps — test in isolation first |

## Acceptance Criteria Mapping

| AC | Covered By |
|----|------------|
| AC-001 (vscrui in package.json) | Task 1.1 |
| AC-002 (zero raw colours) | Task 1.4 + Task 5.4 |
| AC-003 (zero media queries) | Task 1.5 + Task 5.4 |
| AC-004 (all elements converted) | Phases 2-4 |
| AC-005 (all themes render) | Task 5.2 |
| AC-006 (Codicon icons) | Tasks 2.4, 3.2 |
| AC-007 (props preserved) | All component tasks |
| AC-008 (keyboard nav) | Task 5.3 |
| AC-009 (attention token) | Task 1.3 |
| AC-010 (multi-context stories) | Task 5.1 |

## Complexity Tracking

No constitution violations. No complexity justifications needed.
