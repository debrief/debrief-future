# Mermaid in Blog Posts — Website-Repo Patch

This directory contains the change that needs to land in
**`debrief/debrief.github.io`** to make Mermaid diagrams render in shipped
Future Debrief blog posts. It cannot be applied from this repo — the
`debrief-future` MCP scope does not extend to the website repo.

Decision context: ADR-026 in `docs/project_notes/decisions.md`.
Spike: `docs/project_notes/mermaid-in-blog-posts.md`.

## What to apply

A single block of HTML/Liquid into `_layouts/future-post.html`.

The block is in `future-post-layout-snippet.html` in this directory —
copy it verbatim into the layout, immediately before the closing
`</body>` tag. No other changes to the layout are required. No new
files in `assets/` are required (the script is pulled from the
jsDelivr CDN at runtime, only on posts that contain a Mermaid fence).

## Step-by-step

```sh
# 1. Clone the website repo
gh repo clone debrief/debrief.github.io
cd debrief.github.io

# 2. Open the layout
${EDITOR:-code} _layouts/future-post.html

# 3. Paste the contents of future-post-layout-snippet.html
#    immediately before </body>. Save.

# 4. Branch + commit
git checkout -b future-debrief/mermaid-rendering
git add _layouts/future-post.html
git commit -m "Render Mermaid diagrams in future-post layout

Adds a Liquid-gated <script type=\"module\"> block that loads
mermaid@11 from jsDelivr only on posts containing a language-mermaid
code class, then converts kramdown's emitted nested <code> blocks into
<pre class=\"mermaid\"> elements and runs the renderer.

Retroactively fixes the existing posts that already author Mermaid
fences (#061, #210). Decision recorded as ADR-026 in
debrief/debrief-future."

# 5. Push + open PR
git push -u origin future-debrief/mermaid-rendering
gh pr create --base master \
  --title "Render Mermaid diagrams in future-post layout" \
  --body "Loads mermaid@11 from jsDelivr on posts that contain a Mermaid fence. Retroactively renders existing diagrams (e.g. #061, #210). See ADR-026 in debrief/debrief-future for rationale."
```

## How to verify after merge

1. Wait for GitHub Pages to rebuild (~1–2 min after merge to `master`).
2. Visit one of the existing posts with a Mermaid fence:
   - https://debrief.github.io/future/2026/02/13/shipped-generate-courses-and-speeds-tool.html
     — should show a flowchart in the "How It Works" section
   - https://debrief.github.io/future/2026/04/24/building-un-skipping-the-webview-log-panel-e2e-suite.html
     — should show a sequenceDiagram (replacing the raw text seen on 2026-04-26)
3. Visit a post **without** a Mermaid fence (any older post). View source.
   Confirm there is no `cdn.jsdelivr.net/npm/mermaid` script tag —
   the Liquid guard should keep that page completely untouched.

## If the diagrams don't render

- **Browser console error from jsDelivr.** Either the CDN is down (rare)
  or the URL pinned to `mermaid@11` has been broken by a bad publish.
  Pin to a specific patch version: `mermaid@11.x.y`.
- **Diagrams render but layout looks wrong.** Mermaid's default theme
  may clash with the site palette. Pass `theme: 'neutral'` or
  `themeVariables: { … }` to `mermaid.initialize()` to tune.
- **Some diagrams render, some don't.** Look at the failing fence —
  almost always a syntax error in the diagram source. Mermaid will
  show its own red error box inline; fix the source post in
  `debrief-future` and republish via `/speckit.pr`.

## When to revisit

Per ADR-026, fall back to pre-rendering to SVG inside `/publish` if any
of the following become true:

- Diagrams need to appear in non-HTML contexts (RSS feed, PDF export).
- The site moves off stock GitHub Pages onto a custom Actions Jekyll
  build (in which case `jekyll-mermaid` becomes the simplest option).
- The CDN dependency becomes operationally painful.
