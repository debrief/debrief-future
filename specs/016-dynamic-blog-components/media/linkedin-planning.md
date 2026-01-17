# LinkedIn Summary - Planning: Dynamic Blog Component Bundling

Screenshots of UI components don't let readers interact with them. Videos are passive. We're solving this.

Future Debrief is extending its speckit workflow to bundle interactive React component demos directly into blog posts. When we ship a new map widget or timeline control, the published post will include a live, embedded demo — not just static images.

The workflow repurposes existing Storybook stories, packages them as self-contained JavaScript bundles (target 500KB), and deploys them to GitHub Pages. Readers get hands-on experience without leaving the blog. No CDN dependencies, no server-side rendering, just plain HTML + script tags.

Key question we're exploring: Is 500KB a reasonable bundle size for interactive content, or should we target smaller?

We'd love your feedback on bundle size, embed approach (script tags vs iframes), and component selection strategy.

Read the full planning post: [link to blog]

#FutureDebrief #WebComponents #TechnicalWriting
