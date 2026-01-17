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
