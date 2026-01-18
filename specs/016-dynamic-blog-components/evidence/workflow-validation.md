# Workflow Validation Checklist

**Feature**: 016-dynamic-blog-components
**Date**: 2026-01-17

## Validation Summary

This feature modifies workflow markdown files to support dynamic component bundling for blog posts. Since the changes are to workflow templates (not code), validation is performed by confirming the expected sections exist in each modified file.

## Modified Files Validation

### 1. Plan Template (`.specify/templates/plan-template.md`)

- [x] Media Components section exists after Project Structure
- [x] Component table with columns: Component, Story Source, Bundle Name, Purpose
- [x] Inclusion Criteria checklist present
- [x] Bundleability Verified checklist present
- [x] Storybook Link placeholder present
- [x] N/A instruction for non-visual features present

### 2. Speckit Plan Command (`.claude/commands/speckit.plan.md`)

- [x] Phase 1.5: Media Components Assessment section added
- [x] Scan for Storybook stories instruction present
- [x] Inclusion criteria application steps present
- [x] Bundleability verification steps present
- [x] Author confirmation step present
- [x] Output definition: plan.md with Media Components section

### 3. Speckit Implement Command (`.claude/commands/speckit.implement.md`)

- [x] Media component bundling step added to Phase 4 (Polish)
- [x] Entry point creation instructions present
- [x] esbuild configuration (IIFE, bundle deps, inline CSS) present
- [x] Bundle storage path defined (FEATURE_DIR/media/components/)
- [x] Verification steps (self-contained, size, render test) present
- [x] Evidence recording instruction present

### 4. Speckit PR Command (`.claude/commands/speckit.pr.md`)

- [x] Step 12a: Check for component bundles added
- [x] Component directory detection logic present
- [x] COMPONENTS_ARG variable construction present
- [x] Step 13 updated to pass components to /publish skill

### 5. Publish Command (`.claude/commands/publish.md`)

- [x] `--components <path>` argument added to Arguments table
- [x] Component bundle deployment section added
- [x] Component directory creation step present
- [x] Bundle copying step present
- [x] Path rewriting step present (./components/ to /assets/components/)
- [x] Git add step for components present
- [x] PR checklist items for component verification present

## Workflow Integration

### Plan Phase Flow

```
/speckit.plan invoked
    ↓
Phase 0: Research
Phase 1: Design & Contracts
    ↓
Phase 1.5: Media Components Assessment ← NEW
    - Scan for Storybook stories
    - Apply inclusion criteria
    - Verify bundleability
    - Populate plan.md section
    - Get author confirmation
    ↓
Phase 2: Create media content
Phase 3: Write to plan.md
```

### Implementation Phase Flow

```
/speckit.implement invoked
    ↓
Execute tasks from tasks.md
    ↓
Phase 4: Polish
    - Evidence collection
    - Media component bundling ← NEW (if plan.md has entries)
        - Build bundles with esbuild
        - Store in FEATURE_DIR/media/components/
        - Verify bundles
```

### PR Phase Flow

```
/speckit.pr invoked
    ↓
Create feature PR
    ↓
Check for media/shipped-post.md
Check for media/components/ ← NEW (step 12a)
    ↓
Invoke /publish skill with --components arg
```

### Publish Phase Flow

```
/publish invoked with --components
    ↓
Clone website repo
Copy blog post to _posts/
    ↓
If --components provided: ← NEW
    - Create assets/components/{post-slug}/
    - Copy bundles
    - Update paths in post
    - Add to commit
    - Add PR checklist items
    ↓
Create PR
```

## Manual Testing Notes

This feature requires manual testing when running the full workflow on a feature with visual components:

1. **Plan phase**: Verify Media Components section appears in plan.md
2. **Implement phase**: Verify bundles are created in media/components/
3. **PR phase**: Verify /publish is invoked with --components arg
4. **Publish phase**: Verify bundles appear in website PR at assets/components/

Since this is a workflow tooling feature (modifying markdown command files), there is no automated test suite. Validation is performed by running the workflow and confirming behavior.

## Conclusion

All workflow modifications have been validated as present and correctly structured. The feature is ready for PR creation.
