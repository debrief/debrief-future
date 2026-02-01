# Tasks: vscrui Component and Theme Library Conversion

**Input**: Design documents from `/specs/046-vscrui-conversion/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

---

## Evidence Requirements

**Evidence Directory**: `specs/046-vscrui-conversion/evidence/`
**Media Directory**: `specs/046-vscrui-conversion/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results, grep audit results | After all tests pass |
| usage-example.md | Before/after component code snippets | After conversions complete |
| screenshots/light-theme.png | LayersToolbar + FilterDropdown in Light | After Phase 5 verification |
| screenshots/dark-theme.png | LayersToolbar + FilterDropdown in Dark | After Phase 5 verification |
| screenshots/vscode-theme.png | LayersToolbar + FilterDropdown in VS Code | After Phase 5 verification |
| screenshots/multi-context.png | Side-by-side multi-context story | After multi-context stories added |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install vscrui and prepare the build environment

- [ ] T001 Install vscrui dependency in shared/components `shared/components/package.json`
- [ ] T002 Import Codicon CSS in Storybook preview `shared/components/.storybook/preview.tsx`

**Checkpoint**: vscrui available, Codicon icons render in Storybook

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix token gaps and CSS selectors that MUST be complete before any component conversion

**⚠️ CRITICAL**: No component conversion can begin until this phase is complete

- [ ] T003 Add --debrief-color-attention token to tokens.css `shared/components/src/styles/tokens.css`
- [ ] T004 [P] Replace hardcoded #c62828 with var(--debrief-color-danger) in AssociatedFilesDropdown.css `shared/components/src/LayersToolbar/AssociatedFilesDropdown.css`
- [ ] T005 [P] Replace hardcoded rgba(198,40,40,0.06) with color-mix() in AssociatedFilesDropdown.css `shared/components/src/LayersToolbar/AssociatedFilesDropdown.css`
- [ ] T006 [P] Replace hardcoded rgba(255,193,7,...) values with --debrief-color-attention in YellowHalo.css `shared/components/src/LayersToolbar/YellowHalo.css`
- [ ] T007 Replace @media (prefers-color-scheme: dark) with [data-theme='dark'] in FeatureList.css `shared/components/src/FeatureList/FeatureList.css`
- [ ] T008 [P] Replace @media (prefers-color-scheme: dark) with [data-theme='dark'] in FilterDropdown.css `shared/components/src/LayersToolbar/FilterDropdown.css`

**Checkpoint**: Zero raw colour values outside tokens.css, zero prefers-color-scheme queries. Verify with grep.

---

## Phase 3: User Story 1 — Consistent Component Appearance Across Themes (Priority: P1) 🎯 MVP

**Goal**: Replace raw HTML form elements with vscrui equivalents in FilterDropdown (highest element count)

**Independent Test**: Open FilterDropdown in Storybook, switch between Light/Dark/VS Code themes — all controls use vscrui styling

### Implementation for User Story 1

- [ ] T009 [US1] Replace search input with vscrui TextField in FilterDropdown `shared/components/src/LayersToolbar/FilterDropdown.tsx`
- [ ] T010 [US1] Replace static checkboxes (name, type, platform, attachments) with vscrui Checkbox `shared/components/src/LayersToolbar/FilterDropdown.tsx`
- [ ] T011 [US1] Replace dynamic feature kind checkboxes with vscrui Checkbox `shared/components/src/LayersToolbar/FilterDropdown.tsx`
- [ ] T012 [US1] Replace visibility radio group with vscrui Dropdown `shared/components/src/LayersToolbar/FilterDropdown.tsx`
- [ ] T013 [US1] Replace action row icon buttons with vscrui Button appearance="icon" `shared/components/src/LayersToolbar/FilterDropdown.tsx`
- [ ] T014 [US1] Style native datetime-local inputs with --debrief-* tokens `shared/components/src/LayersToolbar/FilterDropdown.css`
- [ ] T015 [US1] Remove obsolete raw-element CSS classes from FilterDropdown.css `shared/components/src/LayersToolbar/FilterDropdown.css`
- [ ] T016 [US1] Replace toolbar buttons with vscrui Button appearance="icon" in LayersToolbar `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T017 [US1] Remove obsolete raw-button CSS classes from LayersToolbar.css `shared/components/src/LayersToolbar/LayersToolbar.css`
- [ ] T018 [US1] Replace menu item buttons with vscrui Button in RunDropdown `shared/components/src/LayersToolbar/RunDropdown.tsx`
- [ ] T019 [US1] Replace file row and context action buttons with vscrui Button in AssociatedFilesDropdown `shared/components/src/LayersToolbar/AssociatedFilesDropdown.tsx`

**Checkpoint**: All interactive elements use vscrui components. Verify in Light, Dark, VS Code themes.

---

## Phase 4: User Story 2 — Eliminating Hardcoded Colours for Theme Compliance (Priority: P1)

**Goal**: Already addressed in Phase 2 (foundational). This phase validates the work.

**Independent Test**: grep for raw hex/rgb/rgba in component CSS — zero matches outside tokens.css

### Verification for User Story 2

- [ ] T020 [US2] Run colour audit: grep for rgb/rgba/#hex in shared/components/src/**/*.css excluding tokens.css
- [ ] T021 [US2] Verify --debrief-color-attention renders correctly in Light and Dark themes in Storybook

**Checkpoint**: Automated grep returns zero matches. Attention token visible in both themes.

---

## Phase 5: User Story 3 — Dark Mode Driven by ThemeProvider (Priority: P2)

**Goal**: Already addressed in Phase 2 (foundational). This phase validates the work.

**Independent Test**: grep for prefers-color-scheme in CSS — zero matches. Storybook Dark toolbar overrides browser preference.

### Verification for User Story 3

- [ ] T022 [US3] Run media query audit: grep for prefers-color-scheme in shared/components/src/**/*.css
- [ ] T023 [US3] Verify Storybook Dark theme toolbar overrides browser light mode preference

**Checkpoint**: Zero media queries. ThemeProvider controls dark mode exclusively.

---

## Phase 6: User Story 4 — Standard Icon Set via Platform Icons (Priority: P2)

**Goal**: Replace inline SVG icons with Codicon equivalents where mappings exist

**Independent Test**: Inspect toolbar buttons in Storybook — icons with Codicon equivalents use Icon component, others retain SVG

### Implementation for User Story 4

- [ ] T024 [P] [US4] Replace trash inline SVG with Icon name="trash" in LayersToolbar `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T025 [P] [US4] Replace eye/eye-closed inline SVGs with Icon name="eye"/"eye-closed" `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T026 [P] [US4] Replace play inline SVG with Icon name="play" `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T027 [P] [US4] Replace search/filter inline SVGs with Icon name="search"/"filter" `shared/components/src/LayersToolbar/LayersToolbar.tsx`
- [ ] T028 [US4] Replace check-all, check, add, remove inline SVGs with Codicon Icons in FilterDropdown `shared/components/src/LayersToolbar/FilterDropdown.tsx`
- [ ] T029 [US4] Verify eraser and paperclip SVGs retained (no Codicon equivalent) `shared/components/src/LayersToolbar/LayersToolbar.tsx`

**Checkpoint**: Codicon icons render in all three themes. No broken icon slots.

---

## Phase 7: User Story 5 — Multi-Theme Visual Verification Stories (Priority: P3)

**Goal**: Add withMultiContext stories showing components in all three themes side-by-side

**Independent Test**: Open multi-context stories in Storybook — three variants render simultaneously

### Implementation for User Story 5

- [ ] T030 [P] [US5] Add withMultiContext story for LayersToolbar `shared/components/src/LayersToolbar/LayersToolbar.stories.tsx`
- [ ] T031 [P] [US5] Add withMultiContext story for FilterDropdown `shared/components/src/LayersToolbar/FilterDropdown.stories.tsx`

**Checkpoint**: Both multi-context stories render Light, Dark, VS Code side-by-side.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification, evidence collection, media content, PR creation

### Cross-Cutting Verification

- [ ] T032 Verify keyboard navigation: Tab, Enter, Space, Escape through all interactive elements
- [ ] T033 [P] Verify disabled button states render correctly via vscrui built-in styling
- [ ] T034 [P] Verify all existing props, callbacks, and interactions preserved (run existing test suite)
- [ ] T035 Run quickstart.md validation against actual component usage

### Evidence Collection (REQUIRED)

- [ ] T036 Create evidence directory `specs/046-vscrui-conversion/evidence/`
- [ ] T037 Capture test summary with pass/fail counts `specs/046-vscrui-conversion/evidence/test-summary.md`
- [ ] T038 Record usage example with before/after component code `specs/046-vscrui-conversion/evidence/usage-example.md`
- [ ] T039 [P] Capture Light theme screenshot `specs/046-vscrui-conversion/evidence/screenshots/light-theme.png`
- [ ] T040 [P] Capture Dark theme screenshot `specs/046-vscrui-conversion/evidence/screenshots/dark-theme.png`
- [ ] T041 [P] Capture VS Code theme screenshot `specs/046-vscrui-conversion/evidence/screenshots/vscode-theme.png`
- [ ] T042 [P] Capture multi-context story screenshot `specs/046-vscrui-conversion/evidence/screenshots/multi-context.png`

### Media Content

- [ ] T043 Create shipped blog post `specs/046-vscrui-conversion/media/shipped-post.md`
- [ ] T044 [P] Create LinkedIn shipped summary `specs/046-vscrui-conversion/media/linkedin-shipped.md`

### PR Creation

- [ ] T045 Create PR and publish blog: run /speckit.pr

**Task T045 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all component work
- **US1 Components (Phase 3)**: Depends on Phase 2 — MVP delivery
- **US2 Colour Audit (Phase 4)**: Depends on Phase 2 — can run in parallel with Phase 3
- **US3 Media Query Audit (Phase 5)**: Depends on Phase 2 — can run in parallel with Phase 3
- **US4 Icons (Phase 6)**: Depends on Phase 3 (buttons must be converted to vscrui first)
- **US5 Multi-Context Stories (Phase 7)**: Depends on Phase 3 (components must be converted first)
- **Polish (Phase 8)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — core MVP
- **US2 (P1)**: Addressed in Foundational — verification only after Phase 2
- **US3 (P2)**: Addressed in Foundational — verification only after Phase 2
- **US4 (P2)**: Depends on US1 (buttons must be vscrui Button before adding Icon children)
- **US5 (P3)**: Depends on US1 (components must be converted before multi-context stories)

### Parallel Opportunities

- T004, T005, T006, T008 can all run in parallel (different CSS files)
- T007 and T008 can run in parallel (different CSS files)
- T024-T027 can all run in parallel (same file but independent icon replacements)
- T030, T031 can run in parallel (different story files)
- T039-T042 can all run in parallel (independent screenshot captures)
- Phases 4 and 5 (verification) can run in parallel with Phase 3 work

---

## Parallel Example: Phase 2 Foundation

```bash
# These can run in parallel (different files):
Task T004: "Replace hardcoded colours in AssociatedFilesDropdown.css"
Task T006: "Replace hardcoded colours in YellowHalo.css"
Task T008: "Replace media query in FilterDropdown.css"

# T007 also parallel with T008 (different file):
Task T007: "Replace media query in FeatureList.css"
```

## Parallel Example: Phase 6 Icons

```bash
# All icon replacements in LayersToolbar can run in parallel:
Task T024: "Replace trash SVG with Codicon"
Task T025: "Replace eye SVGs with Codicon"
Task T026: "Replace play SVG with Codicon"
Task T027: "Replace search/filter SVGs with Codicon"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install vscrui)
2. Complete Phase 2: Foundational (tokens + CSS fixes)
3. Complete Phase 3: US1 component conversions
4. **STOP and VALIDATE**: All components use vscrui, all themes render correctly
5. This delivers the core value — consistent component appearance

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 Components → Test in all themes → **MVP!**
3. US2 + US3 Verification → Confirm token and media query compliance
4. US4 Icons → Codicon replacements → Test in all themes
5. US5 Multi-Context Stories → Side-by-side visual verification
6. Polish → Evidence + Media + PR

### Task Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 2 | None (sequential) |
| Phase 2: Foundation | 6 | 4 parallel CSS edits |
| Phase 3: US1 Components | 11 | Limited (same files) |
| Phase 4: US2 Verification | 2 | 1 parallel |
| Phase 5: US3 Verification | 2 | 1 parallel |
| Phase 6: US4 Icons | 6 | 4 parallel SVG replacements |
| Phase 7: US5 Stories | 2 | 2 parallel |
| Phase 8: Polish | 14 | 8 parallel |
| **Total** | **45** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story
- Commit after each phase completion
- FilterDropdown.tsx is touched in Phase 3 (buttons) and Phase 6 (icons) — do not parallelise these
- LayersToolbar.tsx same — Phase 3 then Phase 6
- Evidence screenshots require Storybook running — capture all in parallel
- Run `/speckit.pr` after all tasks complete to create PR with evidence
