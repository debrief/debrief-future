# Phase 0 Research: Spec Navigator & Review Tool

**Branch**: `191-spec-navigator`
**Date**: 2026-04-17

This document resolves every open technical choice surfaced by `plan.md` before design artefacts are written. No `NEEDS CLARIFICATION` markers remain after this phase.

---

## 1. Markdown rendering toolchain

**Decision**: `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings`, with **`rehype-highlight` + `highlight.js`** for fenced-code syntax highlighting.

**Rationale**:
- `react-markdown` is the de-facto React markdown renderer; stable, maintained, unist-based pipeline cleanly plugs in GFM + anchors.
- `remark-gfm` covers tables, task-list checkboxes, strikethrough, autolinks — all explicitly required by FR-006.
- `rehype-slug` + `rehype-autolink-headings` give heading anchors (FR-006) without hand-rolling slug logic.
- `rehype-highlight` + `highlight.js` weighs ≈ 40 KB gzipped with the common grammars (TS / JSON / YAML / bash / python / diff / markdown) — well inside the 400 KB bundle budget (see §11) with headroom for future additions. The output is static HTML with inline class names; no runtime JS required post-parse.
- Highlighting quality is visibly coarser than shiki, but: (a) the rendered surface is review content, not a code editor; (b) the bundle saving buys us reliable mobile first-paint (SC-005); (c) shiki can be revisited later if and only if it fits inside the budget after code-splitting.

**Alternatives considered**:
- `shiki` via `@shikijs/rehype` — VS-Code-parity highlighting, but ≈ 250 KB gzipped with common grammars bundled, which alone blows past the 400 KB main-chunk budget on top of React + react-markdown + the rehype plugin stack. Deferred until code-splitting or async grammar loading can bring the first-paint cost back under budget. Not currently planned for a follow-up.
- `marked` / `markdown-it` directly (no React renderer) — would force us to `dangerouslySetInnerHTML` and hand-wire cross-artefact link interception (see §7). More work, more XSS surface. Rejected.
- `mdx` — overkill; we are rendering authored markdown, not composing JSX into it.

---

## 2. Selection anchoring strategy

**Decision**: Capture three things, all of which travel in the submitted payload:

1. **Verbatim `snippet`** of the selected text (ground truth for relocation).
2. **Surrounding `contextBefore` / `contextAfter`** — roughly ±60 characters on each side of the selection — emitted as two separate fields in the payload so the downstream reader can widen the match when the same snippet appears more than once in the artefact.
3. **`anchorHash`** — a pinned, human-eyeballable string in the exact format:

   ```
   <first-20-chars-of-snippet>\x1F<last-20-chars-of-snippet>\x1F<char-offset-into-raw-source-at-fetch-time>
   ```

   The separator is ASCII US (`\x1F`, "unit separator") — it cannot appear in source markdown, so round-tripping is unambiguous. If the snippet is shorter than 20 chars, first and last segments overlap but the separator stays exactly where it is.

**Rationale**:
- Submission is the ground truth; the snippet is the only data the watcher strictly needs to locate the passage. Direct `fuzzysearch`-style scanning against the current artefact source is cheap and robust to whitespace changes.
- The offset is a hint, not a primary key — it lets a post-v1 refinement accept a "100% exact match" fast path before falling back to fuzzy snippet matching.
- Emitting context as two separate fields (not concatenated into the snippet) preserves "what the reviewer actually selected" while still giving the watcher disambiguation data. Closes the "same phrase appears twice" failure mode.
- Pinning the anchor format — with an explicit non-textual separator — means every implementation produces the same hash, and a golden-fixture test over three canonical selections can assert byte-exact output.
- Not storing DOM XPath / CSS selectors: they break on any re-render and leak rendering-library internals into the payload.

**Alternatives considered**:
- **Line-and-column anchor**: fragile; reviewers often select across lines, and lines renumber after edits.
- **GitHub line-comment API** (attaching directly to diff lines): explicitly out of scope per spec. Would also tie the tool to the PR's current diff state, not the spec itself.
- **Content-addressed hash of the whole block**: brittle — typo fix invalidates the anchor.
- **Opaque hex SHA-256 over the serialised parts**: debug-unfriendly when the watcher surfaces mismatches. The delimited-string form costs the same and stays human-readable.

**Round-trip test**: `format/__tests__/selectionAnchor.test.ts` will
- diff a freshly-captured anchor for three canonical selections against a golden fixture (byte-exact);
- verify that after slight edits to the surrounding source, `snippet` + `contextBefore` + `contextAfter` still deterministically locate the intended passage (top match is the intended passage).

---

## 3. GitHub authentication

**Decision**: **Fine-grained Personal Access Token**, pasted by the reviewer into the Settings panel, stored in `localStorage` under `spec-navigator:github-pat`. v1 only — OAuth device flow deferred.

**Rationale**:
- Fine-grained PATs scope cleanly to a single repository and specific permissions. Required scope for this tool: **`contents:read`** (fetch `specs/*` via the Contents API) + **`pull-requests:write`** (POST one issue comment per submission).
- Completely static-hostable: no client-secret to protect, no redirect URI to register, no server to receive the callback.
- Token never leaves the device except as an `Authorization: Bearer <pat>` header on requests to `api.github.com` / `raw.githubusercontent.com`. Zero third-party services involved.
- Settings panel documents required scope on-screen (FR-031) and offers one-click copy of the link to GitHub's PAT-creation page.

**Alternatives considered**:
- **OAuth device flow with a GitHub App**: better UX (no copy-paste), but requires either a client-side-exposed client ID (fine) *plus* a token-exchange endpoint (not fine — that's a backend). Deferred to a post-v1 iteration once we are willing to run one.
- **GitHub App with user token**: same problem — needs a server to finish the OAuth handshake.
- **Ask the user to install the `gh` CLI locally**: defeats the "works from a phone" non-functional requirement.

**Security posture**:
- PAT is never logged, never included in error messages, never rendered into the DOM as text.
- On wipe (`clear credential`), the key is deleted from `localStorage` and the in-memory copy is replaced with `null`. The next network call fails deterministically until a new token is set.
- README documents: fine-grained PAT, resource = `debrief/debrief-future`, permissions = `Contents: Read-only` + `Pull requests: Read and write`.
- **The containment promise is enforced by a Content-Security-Policy meta tag in `index.html`** — not just by convention. Directives:
  ```
  default-src 'self';
  connect-src 'self' https://api.github.com https://raw.githubusercontent.com;
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://raw.githubusercontent.com data:;
  base-uri 'self';
  form-action 'none';
  ```
  A compromised transitive dependency cannot `fetch` the PAT to any origin outside the `connect-src` allowlist. `style-src 'unsafe-inline'` is required for highlight.js theme injection; all other directives are strict. The CSP is asserted by a post-build vitest (`__tests__/cspPresence.test.ts`) that reads `dist/index.html` and parses the meta tag — removing or weakening it fails CI. An adversarial XSS fixture (`__tests__/xssAdversarial.test.ts`, 10 standard payloads) reruns against the markdown renderer on every dep bump.

---

## 4. Static hosting & publishing

**Decision**: GitHub Pages sub-path `https://debrief.github.io/debrief-future/spec-navigator/`, published by a new workflow `.github/workflows/spec-navigator-publish.yml` that **mirrors the existing `.github/workflows/storybook.yml` pattern exactly** — same action, same branch, adjacent destination directory.

**Rationale**:
- The repo already publishes gh-pages content (Storybook). Adding a sub-path under the same Pages site avoids creating a second origin and keeps the "no new hosting" promise.
- Triggering on path filter keeps unrelated commits from rebuilding the navigator and avoids noise in deploy history.
- Using the **same deployer** as storybook.yml — `peaceiris/actions-gh-pages@v4` with `destination_dir: spec-navigator` and `keep_files: true` — eliminates the "one workflow wipes the other's output" risk. `actions/deploy-pages` is *not* currently used for the storybook path; mixing deployers would create a corruption surface.
- `vite build --base=/debrief-future/spec-navigator/` produces a statically-hostable `dist/`.

**Workflow skeleton** (derived directly from `.github/workflows/storybook.yml`):

```yaml
name: Deploy Spec Navigator
on:
  push:
    branches: [main]
    paths:
      - 'apps/spec-navigator/**'
      - '.github/workflows/spec-navigator-publish.yml'
permissions:
  contents: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: corepack enable pnpm
      - run: pnpm install
      - run: pnpm --filter @debrief/spec-navigator build
      - uses: peaceiris/actions-gh-pages@v4
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/spec-navigator/dist
          destination_dir: spec-navigator
          keep_files: true
```

**Alternatives considered**:
- **Unify storybook + spec-navigator into a single matrixed workflow**: nicer long-term but touches an already-green pipeline and risks regressing Storybook deploy. Rejected — not this feature's job.
- **`actions/deploy-pages`** (modern GitHub-Pages action): conflicts with the `peaceiris` deployer that already owns the `gh-pages` branch. Rejected.
- **Separate `debrief-spec-navigator` repo**: adds a second repo to maintain, splits the `speckit.pr.md` update away from the navigator source. Rejected for drift risk.
- **Fly.io static app / Netlify / Vercel**: defeat the "no backend" promise or require new account ownership for no benefit.

---

## 5. Mobile text selection UX

**Decision**: Use the **native browser selection gesture** (long-press on mobile, drag on desktop); show the "Add comment" affordance as a small floating chip that appears next to the user's selection and disappears on dismissal.

**Rationale**:
- Platform-native selection behaviour is what users expect. Reimplementing selection (as Notion and Medium do on mobile) is expensive and brittle.
- On iOS Safari the native selection menu is invasive; we place our chip *above* the selection so it competes for attention but doesn't replace the system menu.
- A `selectionchange` listener debounced at 150 ms handles both desktop drag and mobile long-press without bespoke touch handling.

**Alternatives considered**:
- **Custom selection overlay**: fails accessibility (screen readers, VoiceOver), fragile on iOS.
- **Right-click context menu only**: excludes mobile entirely — violates SC-005.
- **"Quote this paragraph" instead of character-range**: too coarse for FR-014, reviewers routinely need to pin a specific phrase.

**Accessibility checklist**:
- Chip is keyboard-focusable and reachable via `Tab` after selection; `Enter` opens the composer.
- Chip has an accessible name (`Add comment on selection "<first 30 chars>…"`).
- Composer exposes `aria-label` and traps focus.

---

## 6. Draft persistence

**Decision**: `localStorage`, one key per PR: `spec-navigator:drafts:pr-<num>`. Value is a JSON-serialised `DraftCommentSet` including a `schemaVersion`.

**Rationale**:
- Draft payloads are small (< 50 KB even for a heavily-commented session). `localStorage` is synchronous and that simplicity is worth it at these sizes.
- Per-PR keying prevents the "drafts from feature A bleeding into feature B" edge case (FR-020).
- `schemaVersion` in the stored object means we can break-and-migrate without losing users' in-flight work: on load, we check the version; if older, we run a migration function; if newer (downgrade), we warn and discard rather than crash.

**Alternatives considered**:
- **IndexedDB**: async, transactional, effectively unlimited — but nothing here needs any of that. Added complexity with no payoff.
- **Server-side drafts**: explicitly out of scope per spec.
- **sessionStorage**: would lose drafts across tab close — the opposite of what we want (FR-019).

**Quota handling**: on `QuotaExceededError` during a write, the tool surfaces a banner ("your browser is out of local storage — clear space or submit what you have now") and keeps the in-memory copy intact. This can only realistically happen with hundreds of large comments; still handled explicitly rather than silently losing data.

---

## 7. Cross-artefact link resolution

**Decision**: Intercept clicks on anchor tags within the rendered pane; if the `href` resolves (after `URL` normalisation) to a path inside the currently-loaded feature folder, prevent default navigation and route the tree selection to the matching artefact. If the `href` is external (absolute URL to another host, or a path outside the feature folder), let the browser handle it normally (new tab) but add a small "external link" icon.

**Rationale**:
- Specs routinely cross-reference each other (`[plan](./plan.md)`, `[evidence](./evidence/foo.png)`); preserving those links as in-app navigation (FR-009) means the reviewer never loses the tree context or their draft state.
- Normalising `href` via the `URL` constructor with a base of `repo://specs/191-spec-navigator/<current-artefact>` catches both relative and root-relative forms cleanly.
- External links still work, so a spec linking to GitHub issues or external docs behaves as expected.

**Alternatives considered**:
- **Rewrite every link at render time via a rehype plugin**: more invasive and loses the original `href` for debugging. Click interception is simpler and localised.
- **Route everything through the router, including external links**: surprising UX (new tab is the norm for external links) and error-prone (would need to special-case protocol allowlists).

---

## 8. Machine-readable payload format

**Decision**: A fenced block in the submitted PR-comment body, tagged `json spec-review-feedback-v1`, whose contents validate against `contracts/spec-review-feedback-v1.schema.json`. The human-readable markdown below the fence is regenerated from the same data structure.

**Rationale**:
- GitHub markdown preserves fenced-code blocks verbatim in the REST response, so the PR watcher can extract and parse without fragile heuristics.
- The fence tag doubles as the schema identifier — no ambiguity about which version produced the payload.
- The rendered section is derived from the same object so the two cannot drift.

**Schema highlights** (full schema in `contracts/`):
- `schemaVersion` (literal `"spec-review-feedback-v1"`)
- `feature` (string — e.g. `"186-filter-chips"`)
- `pr` (integer)
- `originalHeadSha` — the pull-request head commit the reviewer was looking at when they started drafting (pinned at load time).
- `submittedAtHeadSha` — the pull-request head commit at POST time. When this differs from `originalHeadSha`, the reviewer has been shown and cleared the stale-head modal (see §12).
- `submittedAt` (ISO-8601 UTC)
- `comments[]` — a TypeScript discriminated union over `level` ∈ {`feature`, `document`, `selection`}, using a single unified `Comment` shape that serves both in-memory drafting and the wire payload. Draft-only timestamp fields (`createdAt`, `updatedAt`) are optional in the schema; they are carried through on submit rather than stripped, so there is one shape for both purposes.

**Single-type decision (7C)**: `DraftComment` and `SubmittedComment` are **the same TypeScript type** (see `data-model.md`). Draft-only fields are optional; the wire contract simply accepts them. Rationale: per reviewer direction, one source of truth wins over two types that diverge by one or two optional fields. The downside — drafting internals travel to the PR — is tolerable here because the fields involved are `createdAt` / `updatedAt`, which have no security or privacy implications.

**Alternatives considered**:
- **Front-matter-style YAML header**: GitHub's markdown renderer doesn't hide unknown front-matter, so it would clutter the human-readable view.
- **HTML comment block**: hidden from readers but also harder for humans to eyeball when debugging.
- **Two separate PR comments (one machine, one human)**: doubles the noise on the PR, contradicts FR-023 ("exactly one consolidated comment").
- **Separate `DraftComment` and `SubmittedComment` types** with a stripping step at submit: cleaner separation but adds a transformation that 7C explicitly rejects.

---

## 9. PR-watcher integration

**Decision**: Include the trigger phrase `@claude spec-review feedback submitted via spec-navigator.` as the first line of the submitted comment body. Ship a dedicated `/speckit.apply-feedback` slash command (`.claude/commands/speckit.apply-feedback.md`) in v1 so the reviewer flow is backed by a command with a precise contract, not the default watcher's generic behaviour.

**Rationale**:
- The trigger phrase keeps the existing PR-comment watcher in the loop for discovery.
- The slash command (a new file under `.claude/commands/`) gives us a precise, testable contract for parsing the fenced `spec-review-feedback-v1` payload and walking its comments — rather than betting on whatever the default watcher heuristics happen to do today.
- Adding the command as part of v1 avoids the "ship it, then discover the default loop is imprecise, then scramble to add the command" retrofit path.

**Alternatives considered**:
- **Rely on the default watcher only (no new command)**: simpler v1 but defers the precision question; any ambiguity in the watcher's parsing becomes a user-facing bug we catch in production.
- **GitHub Action hook that pulls our payload and calls Claude directly**: would fork the "one watcher" path and create two sources of truth.

---

## 10. Dependency audit (Article IX)

**Approved runtime dependencies** (production `dependencies` — each justified):

| Package | Purpose | Why this one |
|---------|---------|--------------|
| `react` ^18 | UI | Repo convention |
| `react-dom` ^18 | UI | Repo convention |
| `react-markdown` ^9 | Markdown rendering | See §1 |
| `remark-gfm` ^4 | GFM (tables, task lists) | Required by FR-006 |
| `rehype-slug` ^6 | Heading IDs | Required by FR-006 (anchors) |
| `rehype-autolink-headings` ^7 | Linkable headings | Required by FR-006 |
| `rehype-highlight` ^7 | Syntax highlighting (via highlight.js) | See §1; chosen over shiki to fit the 400 KB budget |
| `highlight.js` ^11 | Language grammars for `rehype-highlight` | Peer of the above |
| `zod` ^3.22.0 | Type-narrowed REST parsing + payload schema validation | Article XV boundary parsing; version-matched with `shared/config-ts` and `services/session-state` |

**Approved dev dependencies**:

| Package | Purpose |
|---------|---------|
| `vite` ^5 | Build (repo convention) |
| `@vitejs/plugin-react` ^4 | React plugin |
| `typescript` ^5 | Language |
| `vitest` ^1 | Unit tests + `vitest bench` for render benchmarks |
| `@playwright/test` ^1 | E2E tests (existing repo-wide dep) |
| `@axe-core/playwright` ^4 | Automated accessibility checks inside Playwright |
| `@sparticuz/chromium` (already in repo) | Playwright runtime (cloud + CI) |

**Rejected dependencies**:
- `shiki` — ~250 KB gzipped with common grammars; busts the 400 KB main-chunk budget. See §1.
- CSS-in-JS libraries (`styled-components`, `emotion`): repo uses plain CSS + custom properties.
- State libraries (`zustand`, `redux`): reducer + hook is sufficient at this scale.
- HTTP clients (`axios`, `ky`): `fetch` + `zod` covers every call we make.
- AJV for schema validation: `zod` already ships as a runtime-validating type parser and subsumes AJV for our JSON-Schema-shaped outbound payload.

---

## 11. Testing strategy

**Unit (Vitest)**:
- `commentsReducer`: add, edit, delete, retag, clear, load-from-storage, version-mismatch-migrate, stale-path flagging.
- `selectionAnchor`: byte-exact golden fixture for three canonical captures (§2); re-resolve against slight-edit source.
- `renderFeedbackComment`: golden-markdown comparison against `contracts/pr-comment-body.example.md` for each of the three granularities and combinations, including `contextBefore` / `contextAfter` rendering and `originalHeadSha` / `submittedAtHeadSha` emission.
- `github/schemas`: zod parses known-good fixtures, rejects known-bad.
- **`ArtifactView` component** (vitest + jsdom): renders markdown with tables / code / task-lists (FR-006); renders structured JSON/YAML with highlight.js (FR-007); renders images from a Blob (FR-008); cross-artefact link click intercept (FR-009); raw/rendered toggle (FR-010).
- **XSS adversarial fixture** (`__tests__/xssAdversarial.test.ts`): 10 standard payloads fed through the markdown renderer; assert the output DOM contains no `<script>` nodes and no attributes matching `/^on/i`. Reruns on every dep bump.
- **CSP presence** (`__tests__/cspPresence.test.ts`): reads `dist/index.html` after `vite build`; parses the `<meta http-equiv="Content-Security-Policy">` tag; fails if missing or if `connect-src` lists any origin outside `{'self', api.github.com, raw.githubusercontent.com}`.
- **Bundle size budget** (`__tests__/bundleSize.test.ts`): reads `dist/assets/*.js` after `vite build`; fails if the largest gzipped chunk exceeds 400 KB.
- **Soft-gap unit tests**: empty-folder response produces the "No feature folder" banner (FR edge case); `QuotaExceededError` during a write raises the banner and keeps the in-memory copy (§6); POST-422 from GitHub surfaces the server message without PAT leakage.

**Benchmark (Vitest bench)**:
- `renderFeedbackComment.bench.ts` + `markdownRender.bench.ts`: render three real spec files of 50 KB / 150 KB / 300 KB; assert the 200 KB-equivalent case completes under 500 ms on CI hardware (gate at 1000 ms if CI jitter is observed, and record actual times as visible-in-CI output).

**E2E (Playwright)**:
- `submit.spec.ts` — happy path against a mock GitHub REST server: load → browse → comment at each granularity → submit → assert exactly one POST whose body validates against `spec-review-feedback-v1.schema.json`.
- `stale-head.spec.ts` — the mock server returns a different `head.sha` on the second `GET /pulls/:n`; assert the stale-head modal appears, the reviewer's "Submit anyway" confirms, and the submitted payload contains `originalHeadSha !== submittedAtHeadSha` (§12).
- `render.spec.ts` — navigate through one artefact of every kind (markdown / JSON / YAML / PNG / cross-link target) and assert each renders; assert cross-link click stays inside the app; assert the raw/rendered toggle swaps views.
- `a11y.spec.ts` — `@axe-core/playwright` over the primary layout (artefact tree + reading pane + drawer open + settings panel open), asserting zero WCAG AA violations.
- Reuses `run-playwright.mjs` pattern from `apps/web-shell` so it runs in cloud sessions and CI.

**Manual verification against a real PR** (documented in `quickstart.md`):
- Open `?pr=<throwaway-PR>` on a local `vite dev`, configure a scratch PAT, submit a real comment, check it lands and the PR watcher acts on it.

---

## 12. Force-push detection on Submit

**Decision**: On Submit, re-fetch `GET /repos/:owner/:repo/pulls/:n` and compare the returned `head.sha` with the value captured when the reviewer first loaded the navigator. If they differ:

1. Hold the submission.
2. Show `StaleHeadModal` explaining that the PR has moved since the reviewer started drafting, quoting both commit SHAs (short form), and offering two actions: **Submit anyway** (proceeds, includes both SHAs in the payload) or **Cancel** (aborts; drafts preserved).
3. If the reviewer submits anyway, the payload includes both `originalHeadSha` (load-time) and `submittedAtHeadSha` (current). If the reviewer cancels, nothing is posted and drafts remain.

**Rationale**:
- Article I.3 ("no silent failures") is the decisive point: silently submitting feedback whose snippet anchors point at vanished content is a failure the reviewer would not discover until the watcher complains (or, worse, misinterprets).
- The snippet is still useful — that's why the choice is offered rather than forced.
- Both SHAs in the payload let the downstream reader tell "drafted against the same commit as is current" apart from "drafted against an older commit", without inspecting the rendered comment.

**Alternatives considered**:
- **Modal only, no payload field**: reviewer-visible, but downstream has no programmatic signal.
- **Payload field only, no modal**: programmatic signal, but the reviewer is unaware — borderline silent failure.
- **Refuse to submit when SHAs disagree**: paternalistic; the reviewer often has a legitimate reason to submit regardless (the edits were cosmetic, or the reviewer is addressing the force-pushed state directly).

---

## 13. Bundle size budget

**Decision**: Gzipped main chunk of `dist/` MUST NOT exceed 400 KB. Enforced by `__tests__/bundleSize.test.ts` which runs after `vite build`. Budget is documented in `plan.md` (Technical Context → Bundle budget) and in `research.md` §1.

**Rationale**:
- SC-005 requires the tool to work end-to-end from a mobile browser. Bundle weight is the single biggest determinant of mobile first-paint.
- Informal budgets drift; a test is the only forcing function.
- 400 KB sits comfortably above our projected footprint (React 18 + react-markdown + remark-gfm + rehype-highlight + highlight.js + zod ≈ 180 KB gzipped) with headroom for reasonable growth.

**Alternatives considered**:
- **No budget**: silent creep; SC-005 becomes aspirational.
- **Budget in a comment**: ignored by everyone including future-us.
- **`size-limit` package**: adds a dep for what one vitest file can do.

---

## 14. Memoisation discipline

**Decision**: `ArtifactView` is wrapped in `React.memo`; its props are stable-reference (artefact path + content hash). `CommentComposer` lives in a sibling subtree within `App.tsx`, not nested inside `ArtifactView`, so keystroke state-updates in the composer do not traverse the memoisation boundary.

**Rationale**:
- `ArtifactView` renders a large react-markdown AST — tens of milliseconds of wasted work per re-render on a 200 KB spec. If the composer were nested inside it, every keystroke would re-render the whole rendered markdown.
- Designing it right from the start is cheap; retrofitting after a mobile-lag report is costly and user-visible.

**Alternatives considered**:
- **Trust the implementer to notice**: "obvious" optimisations are routinely skipped and rediscovered under incident pressure.
- **Incremental-rendering markdown approach**: premature and much higher cost.

---

## 15. CI wiring for the new workspace

**Decision**: The new `apps/spec-navigator/` workspace is explicitly added to the repo's CI pipeline and to the local `task verify` chain.

- **`.github/workflows/ci.yml`** is updated so `pnpm --filter @debrief/spec-navigator lint`, `pnpm --filter @debrief/spec-navigator typecheck`, `pnpm --filter @debrief/spec-navigator test`, and `node apps/spec-navigator/run-playwright.mjs` all run as part of the existing CI matrix. (`pnpm install` picks up the new app automatically via the `apps/*` glob in `pnpm-workspace.yaml`; the filters are what make CI *run* it.)
- **`CLAUDE.md`** "Before Pushing" fallback section is updated so the recursive `pnpm --filter` steps also cover `@debrief/spec-navigator`, keeping the local verify chain and CI aligned. This closes the local/CI drift that a minimal "CI-only" wiring would leave open.

**Rationale**:
- Without explicit CI filters, the new workspace can ship broken while CI stays green — our worst failure mode (Article VI: "CI MUST pass" only means something if the new code is actually running).
- Syncing CLAUDE.md costs minutes and prevents "it worked on CI but not locally" (and vice versa) surprises.

---

## Summary

Every open question from `plan.md` has been resolved, and every decision from the review round is captured above. Design phase (Phase 1) is complete; task generation can proceed.
