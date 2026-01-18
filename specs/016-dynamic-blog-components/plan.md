# Implementation Plan: Dynamic Blog Component Bundling

**Branch**: `016-dynamic-blog-components` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-dynamic-blog-components/spec.md`

## Summary

Enable blog posts to include self-contained interactive component demos by extending the speckit workflow. Plan template gains a "Media Components" section, implementation builds bundles from Storybook stories, and publish workflow deploys bundles to GitHub Pages alongside blog posts. Components render inline without Storybook chrome, with links to permanent Storybook URLs for full experience.

## Technical Context

**Language/Version**: Markdown (command prompts and templates)
**Primary Dependencies**: None (pure markdown files interpreted by Claude Code)
**Storage**: N/A (no persistent data - modifies workflow templates)
**Testing**: Manual validation by running workflow commands on test features
**Target Platform**: Claude Code CLI + GitHub Pages (static hosting)
**Project Type**: Workflow tooling/documentation
**Performance Goals**: N/A (workflow speed unchanged)
**Constraints**: Must integrate seamlessly with existing speckit workflow
**Scale/Scope**: 5 markdown files to modify, 1 template to update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies | Status | Notes |
|-----------|---------|--------|-------|
| I. Offline by default | ✅ | PASS | Bundled components work offline on GitHub Pages |
| II. Schema integrity | ❌ | N/A | No data schema changes |
| III. Data sovereignty | ❌ | N/A | No user data handling |
| IV. Architectural boundaries | ❌ | N/A | Workflow tooling, not services |
| V. Extensibility | ✅ | PASS | Feature adds capability without breaking existing workflow |
| VI. Testing required | ✅ | PASS | Manual workflow validation planned |
| VII. Test-driven AI | ✅ | PASS | Acceptance criteria define completion |
| VIII. Specs before code | ✅ | PASS | Comprehensive spec exists |

**Gate Status**: ✅ PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/016-dynamic-blog-components/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Bundling approach research
├── quickstart.md        # How to use Media Components section
├── checklists/          # Quality checklists
│   └── requirements.md  # Specification quality checklist
└── media/               # Blog content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Files to Modify (repository root)

```text
.specify/templates/
└── plan-template.md          # Add "Media Components" section after Project Structure

.claude/commands/
├── speckit.plan.md           # Add step to populate Media Components section
├── speckit.implement.md      # Add step to build bundles when Media Components specified
├── speckit.pr.md             # Pass component bundle path to /publish skill
└── publish.md                # Add component bundle handling to cross-repo workflow
```

**Structure Decision**: This is a workflow tooling feature. No new source code directories needed. All changes are to existing markdown command/template files.

## Media Components Section Design

The new section to be added to `plan-template.md`:

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

## Workflow Integration Points

### 1. `/speckit.plan` (Plan Phase)

After Phase 1 design artifacts, before media content:

```markdown
### Phase 1.5: Media Components Assessment

1. **Scan for Storybook stories** related to the feature
2. **Apply inclusion criteria**:
   - New visual component? → Include
   - Significant visual change? → Include
   - Interactive demo adds narrative value? → Include
   - Backend-only / minor UI tweak / no story? → Exclude
3. **Verify bundleability** for each candidate
4. **Populate Media Components section** in plan.md
5. **Get author confirmation** if components identified
```

### 2. `/speckit.implement` (Implementation Phase)

Add to Phase 4 (Polish) after evidence collection:

```markdown
### Media Component Bundling

If plan.md has Media Components entries:

1. **For each component** in the Media Components table:
   - Locate the Storybook story source file
   - Build self-contained bundle using esbuild/Vite
   - Include: React runtime, component code, styles
   - Exclude: Storybook chrome, controls, addons

2. **Store bundles** at `FEATURE_DIR/media/components/`

3. **Verify bundles**:
   - Each bundle is self-contained (no external Storybook deps)
   - Bundle renders in isolation (test in browser)
   - Bundle size is reasonable (< 500KB per component)

4. **Record in evidence/**:
   - List of bundled components
   - Bundle sizes
   - Any bundling issues encountered
```

### 3. `/speckit.pr` (PR Phase)

Add after step 12 (Check for publishable media content):

```markdown
### Component Bundle Handling

12a. **Check for component bundles**:
    - Look for `FEATURE_DIR/media/components/` directory
    - If present, pass to /publish skill with blog post

12b. **Update /publish invocation**:
    ```
    Skill tool:
      skill: "publish"
      args: "$FEATURE_DIR/media/shipped-post.md --feature-pr $FEATURE_PR_URL --components $FEATURE_DIR/media/components/"
    ```
```

### 4. `/publish` (Publish Phase)

Add to "Apply content" section:

```markdown
### Component Bundle Deployment

If `--components` argument provided:

1. **Create component directory** in website repo:
   ```bash
   mkdir -p assets/components/{post-slug}/
   ```

2. **Copy bundles**:
   ```bash
   cp -r $COMPONENTS_DIR/* assets/components/{post-slug}/
   ```

3. **Update image handling section** to also handle component paths:
   - Component paths in blog: `./components/foo.js` → `/assets/components/{post-slug}/foo.js`

4. **Add to commit**:
   ```bash
   git add assets/components/{post-slug}/
   ```
```

## Complexity Tracking

> **No violations requiring justification.**

This feature extends existing workflow with new capabilities. No architectural violations or complexity additions needed.

