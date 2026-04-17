# 191 Spec Navigator — Implementation Status

**Last session ended**: 2026-04-17 (before /compact)
**Branch**: `191-spec-navigator`
**Worktree**: `/Users/ian/git/worktrees/191-spec-navigator`
**Latest commit**: `a4a88a72` — scaffold + foundation + core review loop
**Tests**: 61 passing (vitest); build 176 KB gzipped (under 400 KB budget)

## Done (committed)

### Phase 1 — Setup (T001–T019)
All scaffolding in place:
- `apps/spec-navigator/` with package.json, vite.config.ts, tsconfig.json, .eslintrc.cjs, vitest.config.ts, playwright.config.ts, run-playwright.mjs
- `index.html` with CSP meta tag (default-src/connect-src/script-src/style-src/img-src/base-uri/form-action)
- `src/strings.ts` (i18n-ready centralised strings), `src/styles/tokens.css`, `src/styles/app.css`
- `src/__tests__/cspPresence.test.ts` (parses CSP directives, asserts allowlist)
- `src/__tests__/bundleSize.test.ts` (reads dist/assets/*.js, fails if gzip > 400 KB)
- `.github/workflows/spec-navigator-publish.yml` (peaceiris/actions-gh-pages → /spec-navigator/)
- `Taskfile.yml` updated to run spec-navigator build + playwright after web-shell
- `CLAUDE.md` updated (Active Technologies + Before Pushing fallback)
- `README.md` with PAT setup instructions

### Phase 2 — Foundation (T020–T035)
All pure modules + tests:
- `src/types.ts` — unified Comment discriminated union + all entities from data-model.md
- `src/github/schemas.ts` — zod narrowers for PR / contents / create-comment / changed-files
- `src/github/api.ts` — typed REST wrappers with ApiError, status-code → ErrorKind mapping
- `src/github/auth.ts` — PAT get/set/clear/hasPat with in-memory cache
- `src/state/persistence.ts` — per-PR localStorage + schemaVersion quarantine + QuotaExceededError
- `src/state/commentsReducer.ts` — 8 actions, MAX_COMMENTS=100, MAX_BODY=10000, MAX_SNIPPET=2000
- `src/format/selectionAnchor.ts` — captureSelection + resolveAnchor, anchor format `<20>\x1F<20>\x1F<offset>`
- `src/format/renderFeedbackComment.ts` — trigger line + fenced json + human sections + stale-head admonition
- `src/format/classifyArtefact.ts` — path → ArtefactKind + mimeType

Tests covering every module (43 tests).

### Phase 3 components (but NOT all tests)
- `src/state/useFeature.ts` — resolves PR → head.sha → changed files → feature folder → artefact listing
- `src/state/useComments.ts` — wraps reducer + persistence, restores on mount, clears on submit
- `src/components/ArtifactTree.tsx` — grouped-by-kind nav with comment counts
- `src/components/ArtifactView.tsx` — dispatches on mimeType, memoised, owns fetch-on-select
- `src/components/MarkdownView.tsx` — react-markdown + remark-gfm + rehype-slug/autolink/highlight + cross-link interception
- `src/components/CodeView.tsx` — highlight.js for JSON/YAML/bash/python/diff/markdown
- `src/components/ImageView.tsx` — Blob → createObjectURL with large-file notice
- `src/components/SelectionAnchor.tsx` — debounced selectionchange → floating chip
- `src/components/CommentComposer.tsx` — all 3 levels, tag select, empty-body guard
- `src/components/CommentDrawer.tsx` — grouped drafts, edit/delete/clear with inline confirmation, stale badge, quota banner
- `src/components/SubmitButton.tsx` — single-flight, SHA recheck, success panel
- `src/components/StaleHeadModal.tsx`
- `src/components/SettingsPanel.tsx` — masked PAT input, probe, clear
- `src/components/ErrorBanner.tsx`
- `src/App.tsx` wiring it all together, `src/main.tsx` mounting

**Unit tests done**: `SubmitButton.test.tsx` (5 tests — disabled/empty, happy-path, stale-head modal, 401 mapping).

## Next up — what to do

Work through in this order. Every unit test should be a `.test.ts[x]` file under `src/**/__tests__/`. E2E tests go under `apps/spec-navigator/e2e/`.

### Task 9 — Phase 3 residual (mock GitHub server + 2 E2E + useFeature test)
1. Create a shared Playwright route-intercept fixture at `apps/spec-navigator/e2e/mock-github.ts` exporting `useMockGithubApi(page, scenario)`. Scenarios: `'stable-head'`, `'stale-head'`, `'401'`, `'empty-folder'`. It must intercept `api.github.com` and `raw.githubusercontent.com`.
2. `src/state/__tests__/useFeature.test.ts` (T047) — stub fetch, assert folder-from-changed-files resolution, assert empty-folder surfaces `no-feature-folder` error.
3. `e2e/submit.spec.ts` (T049) — mock stable-head scenario; load `?pr=<n>`; add one feature-level comment; submit; assert exactly one POST; assert POSTed body's fenced `spec-review-feedback-v1` block validates against `specs/191-spec-navigator/contracts/spec-review-feedback-v1.schema.json` (reuse zod parser in-test).
4. `e2e/stale-head.spec.ts` (T050) — mock returns a different head.sha on the second GET /pulls/:n; assert `stale-head-modal` opens; clicking Submit anyway POSTs with `originalHeadSha !== submittedAtHeadSha`; Cancel preserves drafts + no POST.

### Task 4 — Phase 4 tests
1. `src/components/__tests__/CommentComposer.test.tsx` (T058) — render each level; tag picker has 5 options (`COMMENT_TAGS`); empty body does not emit onSave.
2. `src/components/__tests__/SelectionAnchor.test.tsx` (T059) — chip visible only with non-empty selection; simulated click emits captured `{snippet, contextBefore, contextAfter, anchorHash}`. Use `@testing-library/react` + jsdom `document.createRange` / Selection polyfill; if jsdom selection is too flaky, test `captureSelection` directly with coordinates and skip the DOM-chip UI half (it's also covered by E2E).
3. Extend `e2e/submit.spec.ts` to add one document + one selection comment before submit, assert all three levels in payload (T060).

### Task 5 — Phase 5 tests
1. `src/components/__tests__/CommentDrawer.test.tsx` (T068) — groups feature + per-path; stale-path badge when path missing from artefacts; edit round-trip dispatches; delete shows inline confirm, confirms then deletes.
2. Extend `src/state/__tests__/persistence.test.ts` (T069) with the full lifecycle: write → reload → edit → reload → clear.
3. `e2e/drawer.spec.ts` (T070) — draft 3 comments, reload page, assert all 3 present; edit + delete; reload; Clear all with confirm; empty. Submit flow → reload → still empty (FR-022).

### Task 6 — Phase 6 tests
1. `src/components/__tests__/ArtifactView.test.tsx` (T076) — render markdown table + code + checkbox, render JSON with syntax highlight class, render image from Blob, cross-link click intercepts and calls `onCrossLinkNavigate`, raw toggle swaps content without re-fetch (mock fetch counter).
2. `src/__tests__/xssAdversarial.test.ts` (T077) — 10 standard payloads piped through MarkdownView; assert zero `<script>` nodes, zero `/^on/i` attributes, zero `javascript:` or `data:text/html` href/src. (React-markdown is safe-by-default, so this should pass without patching — but prove it.)
3. `src/components/__tests__/markdownRender.bench.ts` (T078) — real fixtures at `src/components/__tests__/fixtures/{50kb,150kb,300kb}.md` (copy from the project's own specs/*.md files). Soft-gate at 1000 ms in CI; log actual.
4. `e2e/render.spec.ts` (T079) — mock fixture PR with markdown + JSON + PNG + cross-link target; traverse and assert each renders; click cross-link stays in-app; toggle raw.

### Task 7 — Phase 7 tests
1. `src/components/__tests__/SettingsPanel.test.tsx` (T083) — scope docs visible; save flow calls setPat + probe; clear wipes storage + cache; reveal toggles input type; PAT string appears only in the input value, not elsewhere in the DOM.
2. Extend `src/github/__tests__/api.test.ts` (T084, new file) — 401 → credential-rejected, 404 → pr-not-found, 429 → rate-limit, 422 → server-validation, and Error.message never contains the PAT string. Use `vi.stubGlobal('fetch', …)` pattern from SubmitButton test.
3. `e2e/auth.spec.ts` (T085) — start with cleared storage, Settings opens by default, invalid PAT → scope error banner, valid PAT dismisses, Clear + next POST attempt → "not authenticated" error.

### Task 8 — Phase 8 (polish, evidence, media, PR)

**Soft-gaps and a11y** (code):
- `src/__tests__/softGaps.test.ts` (T086) — empty-folder banner, QuotaExceededError → banner + in-memory intact, 422 error → no PAT in message.
- `e2e/a11y.spec.ts` (T087) — `@axe-core/playwright` over 4 states (empty drawer, drafts drawer, settings open, stale-head modal) desktop + mobile viewport. Zero WCAG AA violations.

**Slash commands** (docs):
- NEW `.claude/commands/speckit.apply-feedback.md` (T088) — takes `pr-number comment-id`, fetches, extracts fenced block, validates against schema, walks each comment routing via Edit / AskUserQuestion. Include top-of-file `description:` and `handoffs:` frontmatter and a parse-failure fallback.
- TOUCH `.claude/commands/speckit.pr.md` (T089) — append a line to the PR body template: `Review in Spec Navigator: https://debrief.github.io/debrief-future/spec-navigator/?pr=<num>`. Guard against double-injection by checking for the URL fragment before appending.

**Evidence** — `specs/191-spec-navigator/evidence/`:
- `test-summary.md` (T090) — use `.specify/templates/evidence/test-summary-template.md`; fill YAML front matter (`feature: 191-spec-navigator`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`).
- `usage-example.md` (T091).
- `screenshots/landing.png` (T092), `drawer-open.png` (T093), `stale-head-modal.png` (T094), `settings-panel.png` (T095), `mobile.png` (T096), `interaction.gif` (T097 — Playwright `recordVideo`, under 5s/2MB).
- `pr-comment.md` (T098) — sanitised real PR comment body.
- `bundle-size.txt` (T099) — pipe from `vitest` stdout.
- `bench-results.txt` (T100) — from `vitest bench`.
- `axe-report.json` (T101).
- `csp-verified.txt` (T102) — from cspPresence.test stdout.

**Media**:
- Spawn `content-specialist` subagent for `media/shipped-post.md` (T103). Feed it spec.md, plan.md, evidence/. Include the screenshots + interaction GIF.
- `media/linkedin-shipped.md` (T104).

**Deploy smoke** (T105) — only after merge. Skip locally.

**PR** (T106) — run `/speckit.pr`. Depends on everything else being ✅.

## Commands to get started again

```sh
cd /Users/ian/git/worktrees/191-spec-navigator
pnpm --filter @debrief/spec-navigator test              # should be 61 passing
pnpm --filter @debrief/spec-navigator build             # should be under 400 KB gzipped
pnpm --filter @debrief/spec-navigator typecheck         # should pass
pnpm --filter @debrief/spec-navigator lint              # should pass
```

## Important context

- `preview-playwright` note: The cloud harness supports `@sparticuz/chromium`. Use `node apps/spec-navigator/run-playwright.mjs` — do NOT skip Playwright tests.
- The BACKLOG.md row for 191 is a DIFFERENT feature (Properties Panel) on the `main` branch. Do NOT strike it through when marking this feature complete. Instead: check whether `spec-navigator` has its own backlog row, or append the `implementing/complete` status note somewhere appropriate.
- The golden example at `contracts/pr-comment-body.example.md` has 5 comments and the exact expected shape. `renderFeedbackComment.test.ts` currently does structural checks, not byte-for-byte; upgrade to byte-for-byte if the PR reviewer wants (the example is stable).
- `useFeature.ts` uses `fetchChangedFiles` (PR files API) to find the `specs/NNN-*/` folder. If a PR touches multiple spec folders (rare), we pick the first match — the spec edge case says "a PR has no specs/NNN-* folder at all", but multi-spec is undefined; defer.
- Mobile / small viewport layout: CSS already includes a `@media (max-width: 720px)` rule reflowing to a single column. Verify in E2E at 375×812.

## Files NOT touched yet (for quick grep)

- `apps/spec-navigator/e2e/` (directory does not exist yet)
- `.claude/commands/speckit.apply-feedback.md`
- `specs/191-spec-navigator/evidence/` (directory does not exist yet)
- `specs/191-spec-navigator/media/shipped-post.md`
- `specs/191-spec-navigator/media/linkedin-shipped.md`
- `src/__tests__/xssAdversarial.test.ts`
- `src/__tests__/softGaps.test.ts`
- `src/components/__tests__/ArtifactView.test.tsx`, `CommentComposer.test.tsx`, `CommentDrawer.test.tsx`, `SelectionAnchor.test.tsx`, `SettingsPanel.test.tsx`, `markdownRender.bench.ts`
- `src/state/__tests__/useFeature.test.ts`
- `src/github/__tests__/api.test.ts`
