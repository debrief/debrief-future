# Add dynamic component bundling for blog posts

## Problem

Linking to Storybook stories from blog posts is fragile — story URLs change during project refactoring, breaking embedded demos. We need a way to include interactive component demos in blog posts that remains stable over time.

## Proposed Solution

Package Storybook stories as self-contained JS bundles published alongside blog posts:

1. **Storage**: Bundles stored in `debrief.github.io` at `/assets/components/{post-slug}/`
2. **Delivery**: Self-contained JS files loaded via script tags
3. **Inclusion**: Authors add HTML snippets in markdown: `<div id="demo-name"></div><script src="/assets/components/{post-slug}/demo-name.js"></script>`
4. **Build**: During `/speckit.implement` — bundles built as implementation artifacts
5. **Naming**: Directory convention `{post-slug}` ties components to their posts

### Speckit Workflow Integration

This feature touches multiple points in the speckit workflow:

| Stage | Skill | Integration |
|-------|-------|-------------|
| Planning | `/speckit.plan` | Assess if spec has demo-able components; capture in media section of plan |
| Implementation | `/speckit.implement` | Build self-contained component bundle as part of implementation artifacts |
| PR & Publish | `/speckit.pr` | Include packaged component bundle in website PR alongside "shipped" blog post |

**Key workflow changes**:
- `plan.md` template needs a "Media Components" section to identify bundleable stories
- Implementation should produce a component bundle artifact when stories are identified
- `/publish` skill must handle both the blog post markdown AND the component bundle directory

### Files to Modify

| File | Change |
|------|--------|
| `.specify/templates/plan-template.md` | Add "Media Components" section after Project Structure |
| `.claude/commands/speckit.plan.md` | Add step to populate Media Components section |
| `.claude/commands/speckit.implement.md` | Add step to bundle stories when Media Components are specified |
| `.claude/commands/speckit.pr.md` | Pass component bundle path to `/publish` |
| `.claude/commands/publish.md` | Add component bundle handling alongside image handling |

### Implementation Details

**Bundling approach** (to be determined during `/speckit.plan`):
- Option A: Use Storybook's `storybook build --preview-url` for isolated story export
- Option B: Use esbuild/Vite to bundle story files with React runtime
- Option C: Use Storybook's CSF (Component Story Format) with custom minimal runtime

**Artifact location**:
```
specs/{feature}/media/
├── shipped-post.md       # Blog post (existing)
├── linkedin-shipped.md   # LinkedIn summary (existing)
└── components/           # NEW: built component bundles
    ├── timeline-demo.js
    └── map-view.js
```

**Media Components section in plan.md**:
```markdown
## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| Timeline  | `shared/components/Timeline.stories.tsx` | `timeline-demo.js` | Show interactive timeline scrubbing |
| MapView   | `shared/components/MapView.stories.tsx` | `map-view.js` | Demonstrate track visualization |

**Bundling notes**: [any special requirements for bundling these components]
```

## Success Criteria

- [ ] Component bundles are self-contained (no external Storybook dependencies)
- [ ] Bundles work in Jekyll/GitHub Pages environment
- [ ] `/publish` skill can bundle specified components alongside post
- [ ] Interactive demos work (pan, zoom, click handlers)
- [ ] Clear documentation for authors on how to include components

## Constraints

- Must work with GitHub Pages (static hosting, no server-side processing)
- Components must be interactive (not just static images)
- Build process integrated with existing `/publish` workflow

## Out of Scope

- Full Storybook controls panel in blog posts
- Automatic detection of which components a post needs
- Live editing of component props in the blog
