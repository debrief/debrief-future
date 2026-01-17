# Before/After Comparison

**Feature**: 016-dynamic-blog-components
**Date**: 2026-01-17

## Summary of Changes

| File | Section Added | Lines Changed |
|------|---------------|---------------|
| `.specify/templates/plan-template.md` | Media Components | +21 lines |
| `.claude/commands/speckit.plan.md` | Phase 1.5: Media Components Assessment | +25 lines |
| `.claude/commands/speckit.implement.md` | Media component bundling step | +15 lines |
| `.claude/commands/speckit.pr.md` | Step 12a: Component bundle handling | +14 lines |
| `.claude/commands/publish.md` | --components arg + Component bundle deployment | +38 lines |

**Total**: 5 files modified, ~113 lines added

---

## File-by-File Changes

### 1. `.specify/templates/plan-template.md`

**Before**: Project Structure section ended at line ~96

**After**: Added Media Components section after Project Structure:

```markdown
## Media Components

*Identify Storybook stories to bundle for blog post demos. This section is optional - skip if the feature has no visual components.*

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
- [ ] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/[story-id]`

*If no components identified, write "None - backend/infrastructure feature"*
```

---

### 2. `.claude/commands/speckit.plan.md`

**Before**: Phase 1 flowed directly to Phase 2

**After**: Added Phase 1.5 between Phase 1 and Phase 2:

```markdown
### Phase 1.5: Media Components Assessment

**Prerequisites:** Phase 1 complete (design artifacts exist)

**Purpose**: Identify Storybook stories to bundle for blog post demos. This enables interactive component demos in shipped posts.

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

**Output**: plan.md with Media Components section populated (or marked as N/A)
```

---

### 3. `.claude/commands/speckit.implement.md`

**Before**: Phase 4 (Polish) contained evidence collection only

**After**: Added media component bundling step after evidence collection:

```markdown
- **Media component bundling**: If plan.md has Media Components entries:
  - For each component in the Media Components table:
    - Locate the Storybook story source file
    - Create esbuild entry point that imports the story and renders with createRoot
    - Build self-contained bundle (IIFE format, include React, inline CSS, minify)
  - Store bundles at `FEATURE_DIR/media/components/`
  - Verify bundles: self-contained, < 500KB, renders in isolation
  - Record bundle details in evidence/
```

---

### 4. `.claude/commands/speckit.pr.md`

**Before**: Step 12 checked for publishable media content, then step 13 invoked /publish

**After**: Added step 12a between steps 12 and 13:

```markdown
12a. **Check for component bundles**:
    - Look for `FEATURE_DIR/media/components/` directory
    - If present, prepare to pass to /publish skill:
      ```bash
      if [ -d "$FEATURE_DIR/media/components/" ]; then
          COMPONENTS_ARG="--components $FEATURE_DIR/media/components/"
      else
          COMPONENTS_ARG=""
      fi
      ```
```

Step 13 updated to include `$COMPONENTS_ARG` in /publish invocation.

---

### 5. `.claude/commands/publish.md`

**Before**: Arguments table had 4 entries, Image handling section only

**After**:

**Arguments table** - Added new row:
```markdown
| `--components <path>` | Path to component bundles directory | `--components specs/016/media/components/` |
```

**Component bundle deployment** - Added after Image handling:

```markdown
**Component bundle deployment:**

If `--components` argument provided:

1. **Parse component path:**
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

3. **Copy bundles:**
   ```bash
   cp -r "$COMPONENTS_DIR"/* assets/components/{post-slug}/
   ```

4. **Update paths in blog post:**
   - Component paths: `./components/foo.js` → `/assets/components/{post-slug}/foo.js`

5. **Add to commit:**
   ```bash
   git add assets/components/{post-slug}/
   ```

6. **Update PR checklist** to include component verification:
   ```markdown
   - [ ] Component bundles load correctly
   - [ ] Interactive elements respond to user input
   ```
```

---

## Integration Points Summary

| Workflow Step | Integration Point | Data Flow |
|---------------|-------------------|-----------|
| Plan | Phase 1.5 Assessment | → plan.md Media Components section |
| Tasks | (reads from plan.md) | → tasks include bundling if applicable |
| Implement | Phase 4 bundling | plan.md → media/components/*.js |
| PR | Step 12a detection | media/components/ → COMPONENTS_ARG |
| Publish | --components handling | bundles → assets/components/{slug}/ |
