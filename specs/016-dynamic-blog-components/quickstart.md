# Quickstart: Media Components in Speckit Workflow

This guide explains how to use the Media Components feature to include interactive component demos in blog posts.

## Overview

When building features with visual components, you can now bundle Storybook stories as self-contained demos for blog posts. The components render inline without Storybook chrome.

## Workflow Integration

### During Planning (`/speckit.plan`)

The plan agent will assess your feature for bundleable components:

1. **Automatic detection**: Scans for Storybook stories related to your feature
2. **Inclusion criteria applied**:
   - New visual component → Include
   - Significant visual change → Include
   - Interactive demo adds value → Include
   - Backend-only / minor tweak → Exclude

3. **You confirm**: Review the Media Components section in plan.md

### Example Media Components Section

```markdown
## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| Timeline | `shared/components/Timeline.stories.tsx` | `timeline-demo.js` | Interactive time scrubbing |
| MapView | `shared/components/MapView.stories.tsx` | `map-view.js` | Pan/zoom track visualization |

**Storybook Link**: https://debrief.github.io/debrief-future/storybook/?path=/story/timeline--default
```

### During Implementation (`/speckit.implement`)

If Media Components are specified, the implementation workflow will:

1. Build bundles using esbuild
2. Store them at `specs/{feature}/media/components/`
3. Verify self-containment and size

### During PR/Publish (`/speckit.pr`)

The publish workflow will:

1. Copy bundles to `assets/components/{post-slug}/`
2. Create both feature PR and blog PR
3. Include component assets in the blog PR

## Writing Blog Posts with Components

### HTML Embed Pattern

In your shipped-post.md:

```markdown
## Try It Yourself

Drag the slider to scrub through the vessel tracks:

<div id="timeline-demo" style="height: 300px; border: 1px solid #e1e4e8; border-radius: 6px;"></div>
<script src="/assets/components/timeline-feature/timeline-demo.js"></script>

[Explore the full component with controls →](https://debrief.github.io/debrief-future/storybook/?path=/story/timeline--default)
```

### Sizing Options

| Style | Code | Result |
|-------|------|--------|
| Fixed height | `style="height: 300px;"` | Exact 300px tall |
| Aspect ratio | `style="aspect-ratio: 16/9;"` | Maintains proportion |
| Min/max | `style="min-height: 200px; max-height: 500px;"` | Bounded |

### Multiple Components

You can embed multiple components in one post:

```html
<div id="map-demo" style="height: 400px;"></div>
<script src="/assets/components/feature-name/map-view.js"></script>

<div id="timeline-demo" style="height: 200px;"></div>
<script src="/assets/components/feature-name/timeline-demo.js"></script>
```

Each bundle uses IIFE format with unique container IDs, so they won't conflict.

## Requirements for Bundleability

Your component must:

1. **Have a Storybook story** - The story defines what gets bundled
2. **Render standalone** - No app context (auth, global state) required
3. **Be reasonably sized** - Soft limit of 500KB per bundle
4. **Work with default props** - Story should have sensible defaults

## When NOT to Bundle

- Backend/infrastructure features (nothing visual to demo)
- Minor UI tweaks (not worth the bundle overhead)
- Components requiring authentication or complex state
- Large components with many dependencies (> 500KB)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bundle too large | Check for heavy dependencies, consider splitting |
| Component doesn't render | Verify container ID matches entry point |
| Styles missing | Ensure CSS is imported in component or story |
| Conflicts with page | Use unique container IDs, check for global CSS |

## Example End-to-End

1. Feature creates new Timeline component with story
2. `/speckit.plan` identifies it in Media Components section
3. Author confirms (or modifies)
4. `/speckit.implement` builds `timeline-demo.js` bundle
5. `/speckit.pr` creates PRs with blog post + bundle
6. Blog post shows interactive timeline inline
7. Readers click link for full Storybook experience
