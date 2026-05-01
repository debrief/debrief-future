# Research Spike: Mermaid Diagrams in Feature Blog Posts

**Date:** 2026-04-26
**Branch:** `claude/research-mermaid-diagrams-0gl5e`
**Status:** ✅ **Verified end-to-end on 2026-04-26.** Option A1 (CDN-loaded `mermaid.js` in the `future-post` layout) is live. The cycle was tested by publishing a meta-post via `/publish-future-post` from `specs/239-mermaid-blog-rendering/` (originally numbered `999` as a sentinel; renumbered 2026-05-01); owner confirmed the embedded `flowchart LR` renders as a real diagram on `debrief.github.io`. Layout patch shipped as [debrief/debrief.github.io#90](https://github.com/debrief/debrief.github.io/pull/90). Decision recorded as ADR-026 in `docs/project_notes/decisions.md`. Staged patch retained under `docs/project_notes/mermaid-website-patch/` for reference.
**Scope:** Posts shipped to `debrief.github.io/_posts/` via `/speckit.pr` → `/publish`

## TL;DR

1. **Mermaid fences are already being authored** in shipped posts (e.g. `specs/061-generate-courses-speeds/media/shipped-post.md:24`), but the publishing pipeline does **nothing** to render them. They almost certainly ship to the live site as raw `<pre><code>` blocks. **First action of any implementation should be to load the live post in a browser** and confirm whether they render or not — this changes which option below is needed.
2. The publishing target is **stock GitHub Pages Jekyll** (no custom Actions build for the blog — only schema-docs uses a custom build). The `jekyll-mermaid` plugin is **not** in the GitHub Pages allowlist, so server-side rendering via plugin is not viable. The two viable options are: (a) include client-side `mermaid.js` in the `future-post` Jekyll layout on `debrief.github.io`, or (b) pre-render diagrams to SVG at publish time in `/publish`.
3. Schema-docs **already solve the same problem** for a different surface — they pre-build via MkDocs-Material with `mermaid2`, sync the rendered HTML to `debrief.github.io/future/schemas/`, and the synced HTML "preserves clickable Mermaid diagrams" (see `.claude/commands/publish.md:117-119, 360-362`). That precedent is a useful reference but not directly reusable for posts (different layout, different content cadence).

## Current Pipeline (what exists today)

```
specs/NNN/media/shipped-post.md     # authored locally, can contain ```mermaid blocks
        │
        ▼
/speckit.pr  ──► /publish  ──► jekyll-specialist
        │                              │
        │                              ├─ transform front matter (layout: future-post)
        │                              ├─ rewrite ./images/ paths → /assets/images/future-debrief/{slug}/
        │                              ├─ copy components → /assets/components/{slug}/
        │                              └─ commit to debrief.github.io@_posts/YYYY-MM-DD-slug.md
        ▼
                 GitHub Pages stock Jekyll build (kramdown)
                              │
                              ▼
                    https://debrief.github.io/future/...
```

**Key files:**

| File | Role |
|------|------|
| `.claude/commands/speckit.pr.md` | Initiates blog publish at PR time |
| `.claude/commands/publish.md` | Cross-repo publish workflow (clones website, transforms, opens PR) |
| `.claude/agents/media/jekyll.md` | Jekyll Specialist — front-matter & path transforms |
| `.claude/agents/website/publisher.md` | Mirror of above on the website-side |
| `.claude/agents/media/technical.md` | "Use Mermaid for diagrams (renders in GitHub)" — assumes GitHub README context, not Jekyll |
| `.specify/templates/tasks-template.md:32,65` | Already references `sequence.mermaid` as an evidence artefact |
| `specs/061-.../media/shipped-post.md:24-35` | Concrete example of an in-the-wild Mermaid fence in a shipped post |
| `specs/210-.../media/shipped-post.md`, `217-.../evidence/feature-integration.md` | Other posts with Mermaid |

**Observation:** the `/publish` pipeline does not parse, validate, transform, or render Mermaid. It is content-blind to fenced code blocks beyond image-path rewriting.

## Constraints

- **Offline-by-default** (CONSTITUTION.md, Article I). Pure CDN-loaded `mermaid.js` is a soft violation — readers without internet see code instead of diagrams. Bundling `mermaid.min.js` locally on `debrief.github.io` neutralises that. Pre-rendering to SVG at build time fully satisfies it.
- **GitHub Pages plugin allowlist.** `jekyll-mermaid`, `jekyll-mermaid-tag`, etc. are not on the allowlist. Either we client-side-render, pre-render, or move to a custom Actions Jekyll build (which is a much bigger change and out of scope here).
- **Author ergonomics.** Whatever we pick must keep ` ```mermaid ` fences as the authoring format — that's already what content-specialist and technical-specialist write, and it's what GitHub previews natively. We should not invent a new syntax (e.g. `{% mermaid %}` Liquid tags), because then the source post stops rendering on GitHub and in local Markdown previews.
- **Cadence.** Posts ship per-feature (~weekly). Whatever we pick has to cost ~zero per-post effort.

## Options

### Option A — Client-side `mermaid.js` in the `future-post` Jekyll layout *(target repo change)*

Add a single `<script>` tag to `_layouts/future-post.html` (or a partial included by it) on `debrief.github.io`. Two flavours:

- **A1 — CDN:** `<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'; mermaid.initialize({startOnLoad: true});</script>` plus a small shim that converts kramdown's `<pre><code class="language-mermaid">` blocks into `<pre class="mermaid">` (mermaid's own initializer expects the latter). ~20 lines total.
- **A2 — Vendored:** same, but commit `assets/js/mermaid.min.js` (~600 KB minified) to the website repo and serve from same origin. Offline-safe, slightly heavier git history.

**Pros:** zero changes to `/publish`; authors keep using ` ```mermaid `; theming via mermaid's `themeVariables` lets us match the site palette; works for every existing and future post automatically (including the 3 already-published posts that contain Mermaid fences).
**Cons:** runtime JS dependency on every post page (only loaded if a post contains a diagram if we gate the include); A1 violates offline-by-default (mitigated by A2); change has to land in the **other** repo.

### Option B — Pre-render to SVG at publish time *(this repo change)*

Extend `/publish` (jekyll-specialist) to scan the post for ` ```mermaid ` fences, pipe each through the `@mermaid-js/mermaid-cli` (`mmdc`) headless renderer, write the SVG to `assets/images/future-debrief/{slug}/diagram-{n}.svg`, and replace the fence with `![Diagram N](/assets/images/future-debrief/{slug}/diagram-{n}.svg)`.

**Pros:** zero runtime JS; offline-clean; works against the existing stock Jekyll without touching the website layout; screenshot-of-record for archival posts; renders correctly even if the reader's network is degraded.
**Cons:** publish step gains a Node + Puppeteer/Chromium dependency (mmdc uses Puppeteer); SVGs are static — no zoom/click/copy; diagram changes in the source post require re-publishing; slightly more code to maintain in `/publish`. Existing already-published posts still need a one-shot backfill.

### Option C — Hybrid: pre-render *and* keep the source fence

Same as Option B, but emit both — leave the ` ```mermaid ` fence in the published post (so a future client-side renderer could enhance it) **and** insert the rendered SVG above it inside a `<details>` or as the visible artefact, with the fence collapsed for "view source". Highest fidelity, most code, probably overkill until we have a concrete reason.

### Option D — Do nothing; stop authoring Mermaid in posts

Replace existing fences with hand-drawn screenshots/asciinema/SVG-by-hand. Cheapest in build complexity, most expensive in author time, and we lose the GitHub-preview win. Listed for completeness only.

## Decision (2026-04-26)

**Option A1 — CDN-loaded `mermaid.js` in the `future-post` layout.**

The owner clarified that the blog site does not need to function offline, so the offline-by-default constraint that originally pushed toward A2 (vendored) does not apply here. A1 is strictly simpler:

- One Liquid-gated `<script type="module">` block in `_layouts/future-post.html`, pinned at `mermaid@11`.
- No vendored binary in the website repo's git history.
- Same retroactive coverage of the 3+ posts that already contain Mermaid fences.

Verification before this was accepted: the live 210 post ([`/future/2026/04/24/un-skipping-the-webview-log-panel-e2e-suite.html`](https://debrief.github.io/future/2026/04/24/un-skipping-the-webview-log-panel-e2e-suite.html)) was confirmed to currently render the `sequenceDiagram` source as raw text — i.e. the `future-post` layout has no Mermaid wiring today.

**Implementation notes from PR #90** (worth recording so the next person who reads the spike doesn't re-derive them):

- `_layouts/future-post.html` does not actually contain `</body>` — it sets `layout: future-default` in its front matter, and `_layouts/future-default.html` owns `<html>`, `<head>`, `<body>`. The post layout is rendered into `{{ content }}` inside the default. The script block was therefore appended at the end of `future-post.html` (after `</main>`), which lands inside `<body>` near the end of the rendered page. `type="module"` defers execution until DOM parse completes, so `mermaid.run()` still finds all the `<pre class="mermaid">` elements.
- Putting the block in `future-default.html` was considered and rejected: `page.content` is the post body, and gating the script on a per-post `language-mermaid` check belongs in the post layout, not the page-wide default.
- The `2026-02-13` post (`shipped-generate-courses-and-speeds-tool`) referenced in the original brief **does not yet exist** on `debrief.github.io`. Its source `specs/061-.../media/shipped-post.md` is in `debrief-future` but hasn't been pushed through the cross-repo publish flow yet. The layout change is content-agnostic — that post will pick up rendering automatically the moment it ships.
- The `2026-04-24` post's actual filename is `un-skipping-the-webview-log-panel-e2e-suite.md` (no `building-` prefix). The brief's verification URL was off by that prefix. Corrected URL is the link above.

Fall back to **Option B** (pre-render to SVG in `/publish`) if we later need diagrams to appear in non-HTML contexts (RSS feed, PDF export) or the site moves off stock GitHub Pages.

## Verification Steps Before Implementing

1. **Check live rendering today.** Open the published version of `specs/061-generate-courses-speeds/media/shipped-post.md` on `debrief.github.io` (URL likely `/future/2026/02/13/...`). Confirm whether the Mermaid fence is rendered or shown as raw code. (Could not verify from this sandbox — WebFetch returned 403.) If it's already rendering, the layout already has Mermaid wired up and this whole spike is moot.
2. **Inspect `_layouts/future-post.html`** in `debrief/debrief.github.io` for any existing Mermaid wiring or `<script>` includes.
3. **Confirm GH Pages build mode** for `debrief.github.io` (Settings → Pages → Build and deployment). If "GitHub Actions" is selected with a custom workflow, the plugin allowlist no longer applies and Option A becomes "use the `jekyll-mermaid` plugin", which is even simpler.
4. **Audit existing posts** for already-authored Mermaid fences:
   ```sh
   grep -l '```mermaid' specs/*/media/shipped-post.md specs/*/media/unified-post.md
   ```
   Currently returns 3 files. Backfill scope is small.

## Out of Scope for This Spike

- Mermaid in `evidence/`, planning posts, technical docs (`docs/`), or specs themselves. GitHub renders those already; no pipeline change needed.
- The MkDocs schema-docs Mermaid path — already working, separate workflow (`.github/workflows/schema-docs.yml`).
- Authoring guidelines (when to use a diagram vs. a code block vs. a screenshot). Belongs in the content-specialist / technical-specialist agent prompts, downstream of whatever option we pick.

## Open Questions

- Do we want a single `<script>` injected into every `future-post` page, or only pages that contain a diagram? Latter requires a Liquid `{% if page.content contains "language-mermaid" %}` guard in the layout — trivial.
- Do we want a fallback/error state when a diagram fails to parse? Mermaid's default is a red error box inline; that's probably fine for an author-controlled surface.
- Does ADR-018 (review apps) or any existing ADR speak to website-repo changes? Nothing found in `docs/project_notes/decisions.md`.
