# Add dynamic component bundling for blog posts

## Problem

Linking to Storybook stories from blog posts is fragile — story URLs change during project refactoring, breaking embedded demos. We need a way to include interactive component demos in blog posts that remains stable over time.

## Proposed Solution

Package Storybook stories as self-contained JS bundles published alongside blog posts:

1. **Storage**: Bundles stored in `debrief.github.io` at `/assets/components/{post-slug}/`
2. **Delivery**: Self-contained JS files loaded via script tags
3. **Inclusion**: Authors add HTML snippets in markdown: `<div id="demo-name"></div><script src="/assets/components/{post-slug}/demo-name.js"></script>`
4. **Build**: On-demand during `/publish` skill execution — bundles only what's needed for that post
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
