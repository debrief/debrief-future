# Research: Dynamic Blog Component Bundling

**Feature**: 016-dynamic-blog-components
**Date**: 2026-01-17

## Research Questions

1. How to bundle Storybook stories into self-contained JS files?
2. What bundler to use (esbuild, Vite, Rollup)?
3. How to ensure bundles are truly self-contained?
4. What's the best embed pattern for Jekyll/GitHub Pages?

---

## R1: Bundling Approach

### Decision: esbuild with custom entry point

### Rationale

esbuild offers the best combination of speed and simplicity for creating self-contained React component bundles:

1. **Fast** - Sub-second builds even for complex components
2. **Simple configuration** - Minimal setup required
3. **Tree-shaking** - Only includes used code
4. **CSS bundling** - Handles styles inline
5. **Already in ecosystem** - Used by Vite, familiar to team

### Alternatives Considered

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Storybook iframe embed | No build step | Loads full Storybook runtime, fragile URLs | Defeats the purpose (fragile URLs) |
| Storybook export | Official approach | Complex config, large bundles | Too much Storybook baggage |
| Vite library mode | Good for libraries | Overkill for single-component bundles | Unnecessary complexity |
| Rollup | Mature, flexible | Slower, more config | esbuild simpler for this use case |
| Webpack | Universal support | Slowest, most complex | Overkill |

### Implementation Pattern

```javascript
// bundle-component.mjs
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./entry.tsx'],
  bundle: true,
  outfile: 'component.js',
  format: 'iife',
  globalName: 'ComponentDemo',
  external: [], // Bundle everything
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  loader: {
    '.tsx': 'tsx',
    '.css': 'css'
  },
  minify: true,
});
```

Entry file pattern:
```tsx
// entry.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MyComponent } from './MyComponent';

const container = document.getElementById('my-component-demo');
if (container) {
  const root = createRoot(container);
  root.render(<MyComponent {...defaultProps} />);
}
```

---

## R2: Self-Containment Strategy

### Decision: Bundle all dependencies, use IIFE format

### Rationale

To ensure components work in any environment (Jekyll, GitHub Pages, any static host):

1. **IIFE format** - Runs immediately, doesn't pollute global scope (except intentionally)
2. **Bundle React** - Don't assume React is available on page
3. **Inline CSS** - No separate stylesheet loading
4. **No external imports** - Everything in one file

### Size Considerations

| Component Type | Estimated Size | Acceptable |
|----------------|----------------|------------|
| Simple UI widget | 50-100KB | ✅ Yes |
| With charting library | 200-400KB | ⚠️ Marginal |
| Complex with many deps | 500KB+ | ❌ Split or exclude |

**Recommendation**: Set soft limit of 500KB per bundle. Larger components should be evaluated for splitting or excluded from bundling.

---

## R3: Jekyll/GitHub Pages Integration

### Decision: Standard HTML snippet with script tag

### Rationale

Jekyll supports raw HTML in markdown. The simplest, most reliable pattern:

```html
<div id="timeline-demo" style="height: 400px; border: 1px solid #e1e4e8; border-radius: 6px;"></div>
<script src="/assets/components/feature-name/timeline-demo.js"></script>
```

### Benefits

1. **No Jekyll plugins needed** - Works with GitHub Pages default build
2. **No special markdown processing** - Standard HTML passthrough
3. **Author controls styling** - Container div is customizable
4. **Lazy loading possible** - Add `defer` or `async` to script tag

### Alternative Patterns Rejected

| Pattern | Why Rejected |
|---------|--------------|
| Jekyll include | Requires template, harder to maintain |
| Web Component | Additional abstraction layer, browser support |
| iframe | Isolation good but sizing/styling harder |
| Dynamic import | Requires module bundler on consuming site |

---

## R4: Embedding UX

### Decision: Responsive width, author-controlled height

### Implementation

Bundle entry should:

1. Find container by ID
2. Render at 100% width of container
3. Use container's height (author sets via CSS)
4. Apply sensible defaults if not styled

```tsx
// Entry pattern with sizing
const container = document.getElementById('timeline-demo');
if (container) {
  // Default height if not set
  if (!container.style.height) {
    container.style.height = '400px';
  }

  const root = createRoot(container);
  root.render(
    <div style={{ width: '100%', height: '100%' }}>
      <TimelineComponent />
    </div>
  );
}
```

---

## R5: Storybook Link Pattern

### Decision: Include permanent Storybook URL in blog post

### Rationale

Blog posts should include both:
1. **Embedded component** - Quick inline demo
2. **Storybook link** - Full experience with controls

The permanent Storybook URL format:
```
https://debrief.github.io/debrief-future/storybook/?path=/story/{component-id}--{story-name}
```

Example in blog post:
```markdown
Try the timeline scrubbing below:

<div id="timeline-demo" style="height: 300px;"></div>
<script src="/assets/components/timeline-feature/timeline-demo.js"></script>

[Explore the full component with controls →](https://debrief.github.io/debrief-future/storybook/?path=/story/timeline--default)
```

---

## Summary of Decisions

| Question | Decision |
|----------|----------|
| Bundler | esbuild with IIFE format |
| Self-containment | Bundle all deps including React |
| Size limit | 500KB soft limit per bundle |
| Embed format | HTML div + script tag |
| Sizing | 100% width, author-controlled height |
| Storybook link | Include permanent URL in every post with embedded demos |

---

## Open Questions (Deferred to Implementation)

1. **Bundle caching**: Should bundles have content hashes in filenames?
   - *Likely yes for cache busting, but adds complexity to publish workflow*

2. **Multiple bundles per page**: Any conflicts if same React version?
   - *Should be fine with IIFE isolation, verify during implementation*

3. **CSS isolation**: Do we need shadow DOM or CSS modules?
   - *Start without, add if style conflicts emerge*
