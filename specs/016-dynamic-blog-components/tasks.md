# Tasks: Dynamic Blog Component Bundling

**Input**: Design documents from `/specs/016-dynamic-blog-components/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete)

**Tests**: No automated tests for this feature - it modifies markdown workflow files that are validated by running the workflow.

**Organization**: Tasks are organized by workflow phase, following the speckit command sequence: plan → implement → pr → publish.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the workflow changes work as expected.

**Evidence Directory**: `specs/016-dynamic-blog-components/evidence/`
**Media Directory**: `specs/016-dynamic-blog-components/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| workflow-validation.md | Manual validation of workflow changes | After all workflow files updated |
| plan-example.md | Example plan.md with Media Components section filled | After speckit.plan changes |
| before-after-comparison.md | Diff summary showing changes to each file | After all changes complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | ✅ Created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | ✅ Created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with workflow changes | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by /speckit.pr |

---

## Phase 1: Foundation - Plan Template Update

**Purpose**: Add Media Components section to plan template - defines the data structure all other changes depend on

- [x] T001 Add Media Components section to plan template `.specify/templates/plan-template.md`

**Section to add after Project Structure:**

```markdown
## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| [Name] | `path/to/Story.stories.tsx` | `component-name.js` | [What it demonstrates] |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook
- [ ] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/[story-id]`

*If no components identified, write "None - backend/infrastructure feature"*
```

**Checkpoint**: Plan template ready - workflow command updates can proceed

---

## Phase 2: User Story 2 - Speckit Workflow Identifies Components (Priority: P2)

**Goal**: During planning, the workflow identifies which Storybook stories should be bundled for blog posts

**Independent Test**: Run `/speckit.plan` on a feature with visual components and verify Media Components section is populated

### Implementation for User Story 2

- [x] T002 Add Phase 1.5 Media Components Assessment to speckit.plan.md `.claude/commands/speckit.plan.md`

**Add after Phase 1 Design & Contracts section:**

```markdown
### Phase 1.5: Media Components Assessment

1. **Scan for Storybook stories** related to the feature
   - Check for .stories.tsx files in the feature scope
   - Look for components mentioned in spec.md

2. **Apply inclusion criteria**:
   - New visual component? → Include
   - Significant visual change? → Include
   - Interactive demo adds narrative value? → Include
   - Backend-only / minor UI tweak / no story? → Exclude

3. **Verify bundleability** for each candidate:
   - Existing Storybook story
   - Can render standalone (no app context)
   - Reasonable bundle size (< 500KB)

4. **Populate Media Components section** in plan.md:
   - Fill table with component name, story source, bundle name, purpose
   - Check applicable inclusion criteria
   - Add permanent Storybook link

5. **Get author confirmation** if components identified:
   - Present the Media Components section
   - Allow author to modify or decline suggestions

**Output**: plan.md with Media Components section populated
```

**Checkpoint**: Planning phase can now identify bundleable components

---

## Phase 3: User Story 3 - Implementation Produces Bundles (Priority: P2)

**Goal**: When Media Components are specified in plan.md, the implementation workflow builds self-contained bundles

**Independent Test**: Run `/speckit.implement` with Media Components specified and verify JS bundles are created

### Implementation for User Story 3

- [x] T003 Add Media Component Bundling step to speckit.implement.md `.claude/commands/speckit.implement.md`

**Add to Phase 4 (Polish) after evidence collection:**

```markdown
### Media Component Bundling

If plan.md has Media Components entries:

1. **For each component** in the Media Components table:
   - Locate the Storybook story source file
   - Create esbuild entry point that:
     - Imports the story's default export
     - Finds container by ID
     - Renders with createRoot
   - Build self-contained bundle using esbuild:
     - Format: IIFE
     - Bundle all dependencies (including React)
     - Inline CSS
     - Minify for production

2. **Store bundles** at `FEATURE_DIR/media/components/`:
   ```bash
   mkdir -p specs/{feature}/media/components/
   # Output: specs/{feature}/media/components/{bundle-name}.js
   ```

3. **Verify bundles**:
   - Each bundle is self-contained (no external Storybook deps)
   - Bundle size is reasonable (< 500KB, warn if larger)
   - Test render in isolated HTML page

4. **Record in evidence/**:
   - List of bundled components
   - Bundle sizes
   - Any bundling issues encountered

**Output**: `FEATURE_DIR/media/components/` with JS bundles
```

**Checkpoint**: Implementation phase can now build component bundles

---

## Phase 4: User Story 4 - Publish Deploys Bundles (Priority: P3)

**Goal**: The publish workflow copies component bundles alongside blog posts to the website

**Independent Test**: Run `/speckit.pr` with bundles present and verify website PR includes assets/components/

### Implementation for User Story 4

- [x] T004 Update speckit.pr.md to pass component bundles to publish `.claude/commands/speckit.pr.md`

**Add after step 12 (Check for publishable media content):**

```markdown
### Component Bundle Handling

12a. **Check for component bundles**:
    ```bash
    if [ -d "$FEATURE_DIR/media/components/" ]; then
        COMPONENTS_ARG="--components $FEATURE_DIR/media/components/"
    else
        COMPONENTS_ARG=""
    fi
    ```

12b. **Update /publish invocation** to include components:
    ```
    Skill tool:
      skill: "publish"
      args: "$FEATURE_DIR/media/shipped-post.md --feature-pr $FEATURE_PR_URL $COMPONENTS_ARG"
    ```
```

- [x] T005 [P] Add Arguments table entry for --components `.claude/commands/publish.md`

**Add to Arguments table:**

```markdown
| `--components <path>` | Path to component bundles directory | `--components specs/016/media/components/` |
```

- [x] T006 Add Component Bundle Deployment section to publish.md `.claude/commands/publish.md`

**Add after Image handling section:**

```markdown
### Component Bundle Deployment

If `--components` argument provided:

1. **Parse component path**:
   ```bash
   COMPONENTS_DIR="$COMPONENTS_ARG"
   if [ -d "$COMPONENTS_DIR" ]; then
       echo "Found component bundles at $COMPONENTS_DIR"
   else
       echo "Warning: --components specified but directory not found"
   fi
   ```

2. **Create component directory** in website repo:
   ```bash
   mkdir -p assets/components/{post-slug}/
   ```

3. **Copy bundles**:
   ```bash
   cp -r "$COMPONENTS_DIR"/* assets/components/{post-slug}/
   ```

4. **Update paths in blog post**:
   - Component paths: `./components/foo.js` → `/assets/components/{post-slug}/foo.js`

5. **Add to commit**:
   ```bash
   git add assets/components/{post-slug}/
   ```

6. **Update PR checklist** to include component verification:
   ```markdown
   - [ ] Component bundles load correctly
   - [ ] Interactive elements respond to user input
   ```
```

**Checkpoint**: Full workflow now supports component bundling from plan to publish

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, documentation, evidence collection, and PR creation

### Workflow Validation

- [x] T007 Create validation checklist in `specs/016-dynamic-blog-components/evidence/workflow-validation.md`
- [x] T008 [P] Document before/after file changes in `specs/016-dynamic-blog-components/evidence/before-after-comparison.md`

### Evidence Collection

- [x] T009 Create example plan.md showing Media Components section `specs/016-dynamic-blog-components/evidence/plan-example.md`

### Media Content

- [x] T010 Create shipped blog post `specs/016-dynamic-blog-components/media/shipped-post.md`
- [x] T011 [P] Create LinkedIn shipped summary `specs/016-dynamic-blog-components/media/linkedin-shipped.md`

### PR Creation

- [x] T012 Create PR and publish blog: run /speckit.pr

**Task T012 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)**: No dependencies - starts immediately
- **Phase 2 (US2 - Plan)**: Depends on Phase 1 (needs template structure)
- **Phase 3 (US3 - Implement)**: Depends on Phase 2 (needs plan to have Media Components)
- **Phase 4 (US4 - Publish)**: Depends on Phase 3 (needs bundles to exist)
- **Phase 5 (Polish)**: Depends on Phase 4 (needs full workflow complete)

### Task Dependencies

```
T001 (plan template)
  ↓
T002 (speckit.plan)
  ↓
T003 (speckit.implement)
  ↓
T004, T005, T006 (speckit.pr + publish) [T005, T006 can run in parallel]
  ↓
T007, T008, T009 (validation + evidence) [all can run in parallel]
  ↓
T010, T011 (media content) [can run in parallel]
  ↓
T012 (PR creation) - MUST BE LAST
```

### Parallel Opportunities

Within Phase 4:
- T005 (publish args) and T006 (publish deployment) can run in parallel after T004

Within Phase 5:
- T007, T008, T009 can all run in parallel
- T010, T011 can run in parallel

---

## Implementation Strategy

### MVP First (Phase 1-2 Only)

1. Complete Phase 1: Add Media Components section to plan template
2. Complete Phase 2: Update speckit.plan to populate section
3. **STOP and VALIDATE**: Run /speckit.plan on a test feature, verify Media Components appears
4. This proves the identification workflow works

### Incremental Delivery

1. Phase 1 → Plan template ready
2. Phase 2 → Planning can identify components (testable!)
3. Phase 3 → Implementation can build bundles (testable!)
4. Phase 4 → Publishing can deploy bundles (end-to-end testable!)
5. Phase 5 → PR with evidence

### Sequential Workflow

This feature is inherently sequential - each phase depends on the previous:
- Can't identify components without the section definition
- Can't build bundles without knowing what to build
- Can't deploy bundles without having built them

---

## Notes

- All changes are to markdown files - no compiled code
- Validation is manual: run the workflow commands and verify behavior
- The Media Components section is optional - features without visual components skip it
- Bundle building requires esbuild - ensure it's available in the environment
- **Evidence is required** - capture artifacts that prove the workflow works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
