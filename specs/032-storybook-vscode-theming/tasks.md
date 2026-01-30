# Tasks: Document Storybook VS Code Theming Setup

**Input**: Design documents from `/specs/032-storybook-vscode-theming/`
**Prerequisites**: plan.md (required), spec.md (required)

---

## Evidence Requirements

**Evidence Directory**: `specs/032-storybook-vscode-theming/evidence/`
**Media Directory**: `specs/032-storybook-vscode-theming/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Verification that tables match source files | After doc complete |
| usage-example.md | Example of creating a themed component following the guide | After doc complete |

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

## Phase 1: Setup

**Purpose**: Prepare output locations

- [ ] T001 Create docs directory if needed and evidence directory `specs/032-storybook-vscode-theming/evidence/`

---

## Phase 2: Foundation — Read Source Files

**Purpose**: Extract accurate data from all theming source files before writing documentation

- [ ] T002 Read and extract all tokens from `shared/components/src/styles/tokens.css`
- [ ] T003 [P] Read and extract VS Code variable map from `shared/components/src/ThemeProvider/vsCodeAdapter.ts`
- [ ] T004 [P] Read ThemeProvider implementation from `shared/components/src/ThemeProvider/ThemeProvider.tsx`
- [ ] T005 [P] Read ThemeContext types from `shared/components/src/ThemeProvider/ThemeContext.ts`
- [ ] T006 [P] Read Storybook preview config from `shared/components/.storybook/preview.tsx`
- [ ] T007 [P] Read context decorators from `shared/components/.storybook/decorators/ContextDecorator.tsx`
- [ ] T008 [P] Read Storybook manager config from `shared/components/.storybook/manager.ts`

**Checkpoint**: All source data extracted — documentation writing can begin

---

## Phase 3: User Story 1 — Write Documentation (Priority: P1) MVP

**Goal**: Create `docs/storybook-vscode-theming.md` with all 7 sections from spec

**Independent Test**: Open the doc and verify every token in `tokens.css` appears in the token table, every entry in `VS_CODE_VARIABLE_MAP` appears in the mapping table, and the how-to guide uses only `--debrief-*` tokens

### Implementation

- [ ] T009 Write Section 1: Overview (three-layer architecture) `docs/storybook-vscode-theming.md`
- [ ] T010 Write Section 2: Token Reference table (all color tokens with light/dark values) `docs/storybook-vscode-theming.md`
- [ ] T011 Write Section 3: VS Code Variable Mapping table (all 20 entries) `docs/storybook-vscode-theming.md`
- [ ] T012 Write Section 4: Storybook Theme Toolbar `docs/storybook-vscode-theming.md`
- [ ] T013 Write Section 5: Context Decorators `docs/storybook-vscode-theming.md`
- [ ] T014 Write Section 6: How-To Add a New Themed Component `docs/storybook-vscode-theming.md`
- [ ] T015 Write Section 7: File Reference table `docs/storybook-vscode-theming.md`

**Checkpoint**: Documentation file complete

---

## Phase 4: User Story 2 — Update CLAUDE.md (Priority: P2)

**Goal**: Add reference to theming doc in CLAUDE.md Key Documents section

**Independent Test**: Grep `CLAUDE.md` for `storybook-vscode-theming`

- [ ] T016 Add theming doc reference to Key Documents section `CLAUDE.md`

**Checkpoint**: Both deliverables complete

---

## Phase 5: Polish & Cross-Cutting Concerns

### Evidence Collection (REQUIRED)

- [ ] T017 Create evidence directory `specs/032-storybook-vscode-theming/evidence/`
- [ ] T018 Verify token table completeness against `tokens.css` and capture results `specs/032-storybook-vscode-theming/evidence/test-summary.md`
- [ ] T019 [P] Verify mapping table completeness against `vsCodeAdapter.ts` `specs/032-storybook-vscode-theming/evidence/test-summary.md`
- [ ] T020 Create usage example showing a developer following the guide `specs/032-storybook-vscode-theming/evidence/usage-example.md`

### Media Content

- [ ] T021 Create shipped blog post `specs/032-storybook-vscode-theming/media/shipped-post.md`
- [ ] T022 [P] Create LinkedIn shipped summary `specs/032-storybook-vscode-theming/media/linkedin-shipped.md`

### PR Creation

- [ ] T023 Create PR and publish blog: run /speckit.pr

**Task T023 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundation (Phase 2)**: Depends on Phase 1. All T002–T008 can run in parallel
- **User Story 1 (Phase 3)**: Depends on Phase 2. T009–T015 are sequential (single file)
- **User Story 2 (Phase 4)**: Depends on Phase 1 only. Can run in parallel with Phase 3
- **Polish (Phase 5)**: Depends on Phases 3 and 4

### Parallel Opportunities

- Phase 2: All source file reads (T002–T008) can run in parallel
- Phase 3 + Phase 4: T016 (CLAUDE.md) can run in parallel with documentation writing
- Phase 5: T019 parallel with T018; T022 parallel with T021

---

## Implementation Strategy

### MVP First (Phase 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Read all source files
3. Complete Phase 3: Write the documentation file
4. **STOP and VALIDATE**: Check tables against source files
5. Deliver documentation for review

### Incremental Delivery

1. Setup + Foundation → Source data extracted
2. Write docs → Validate tables → MVP complete
3. Update CLAUDE.md → Cross-reference complete
4. Evidence + media → PR ready

---

## Notes

- This is a documentation-only feature — no code, no tests, no runtime changes
- All sections written to a single file (`docs/storybook-vscode-theming.md`)
- Token/mapping tables must be verified against source files, not approximated
- Evidence "tests" are manual verification that tables match source of truth
