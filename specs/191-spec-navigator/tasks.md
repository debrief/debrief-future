---
description: "Implementation task list for 191 Spec Navigator & Review Tool"
---

# Tasks: Spec Navigator & Review Tool

**Branch**: `191-spec-navigator`
**Input**: Design documents from `/specs/191-spec-navigator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all present)

**Tests**: Tests are included inline per phase because the spec and plan are explicit about test coverage (Article VI mandate + 19 review decisions including XSS, CSP, bundle, bench, a11y, soft-gap tests).

**Organization**: Tasks are grouped by user story (P1 → P2) so each phase delivers an independently testable slice. Cross-cutting tests live in the phase that introduces the code they cover.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that demonstrate the feature works — used in the PR description, the shipped blog post, and future reference.

**Evidence Directory**: `specs/191-spec-navigator/evidence/`
**Media Directory**: `specs/191-spec-navigator/media/` (planning-post.md and linkedin-planning.md already exist from Phase 2 of `/speckit.plan`)

### Feature type

This is a **UI Component / Standalone App** feature (browser SPA deployed to GitHub Pages). Per the Quality Rubric: 3 theme screenshots + interaction GIF + runtime verification. Plus the additional artefacts specific to this app's review-loop behaviour.

### Planned Artefacts

| Artefact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright + bench summary with YAML front matter | After all tests pass in Phase 8 |
| `evidence/usage-example.md` | End-to-end walkthrough: `?pr=<num>` → browse → comment → submit | After Phase 7 |
| `evidence/screenshots/landing.png` | Initial load against a real PR (desktop viewport) | After Phase 3 |
| `evidence/screenshots/drawer-open.png` | Drawer with multiple drafts at all three granularities | After Phase 5 |
| `evidence/screenshots/stale-head-modal.png` | `StaleHeadModal` triggered via force-pushed scratch branch | After Phase 3 |
| `evidence/screenshots/settings-panel.png` | PAT entry screen with scope docs | After Phase 7 |
| `evidence/screenshots/mobile.png` | Narrow viewport (iPhone 14 class) showing two-pane + drawer + chip | After Phase 6 |
| `evidence/screenshots/interaction.gif` | Key interaction: select → add comment → save → appears in drawer (< 5s, < 2MB) | After Phase 4 |
| `evidence/pr-comment.md` | Raw body of a real submitted PR comment (sanitised SHAs) | After Phase 3 |
| `evidence/bundle-size.txt` | Output of the bundle-size check (`dist/` gzipped) | After Phase 1 + Phase 6 |
| `evidence/bench-results.txt` | `vitest bench` output for 50/150/300 KB renders | After Phase 6 |
| `evidence/axe-report.json` | `@axe-core/playwright` zero-violation report | After Phase 8 |
| `evidence/csp-verified.txt` | Output of `cspPresence.test.ts` showing directive allowlist | After Phase 1 |

### Media Content

| Artefact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature (✅ exists) | During `/speckit.plan` |
| `media/linkedin-planning.md` | LinkedIn summary for planning (✅ exists) | During `/speckit.plan` |
| `media/shipped-post.md` | Blog post celebrating completion | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with evidence attached | Final task |
| Blog PR | PR in `debrief/debrief.github.io` with shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Scaffold the new `apps/spec-navigator/` workspace so every subsequent phase has a known-good foundation to build on. Ends with `pnpm --filter @debrief/spec-navigator dev` serving an empty shell at the correct base path, with the CSP meta tag in place, the bundle-size check wired in, and CI running the new workspace's lint / typecheck / test / E2E.

**Independent test**: `pnpm --filter @debrief/spec-navigator build` produces `dist/` under the 400 KB gzipped main-chunk budget; `cspPresence.test.ts` passes; `pnpm -r typecheck` returns no new errors; CI runs the app's checks (verified by a throwaway commit touching only `apps/spec-navigator/README.md`).

### Workspace scaffold

- [x] T001 Create workspace manifest with deps from `research.md` §10 (`react`, `react-dom`, `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-highlight`, `highlight.js`, `zod ^3.22.0`; devDeps: `vite`, `@vitejs/plugin-react`, `typescript ^5`, `vitest ^1`, `@playwright/test ^1.58`, `@axe-core/playwright`, `@sparticuz/chromium` already at repo root) `apps/spec-navigator/package.json`
- [x] T002 [P] Configure Vite with `base: '/debrief-future/spec-navigator/'`, React plugin, build output to `dist/` `apps/spec-navigator/vite.config.ts`
- [x] T003 [P] Configure TypeScript with `strict: true`, no `any`, module resolution matching `apps/web-shell/tsconfig.json` `apps/spec-navigator/tsconfig.json`
- [x] T004 [P] Configure ESLint mirroring `apps/web-shell/.eslintrc.cjs` (no `any`, react-hooks, react) `apps/spec-navigator/.eslintrc.cjs`
- [x] T005 [P] Add Vitest config for unit tests + `vitest bench` support `apps/spec-navigator/vitest.config.ts`
- [x] T006 [P] Add Playwright wrapper using `@sparticuz/chromium` mirroring `apps/web-shell/run-playwright.mjs` `apps/spec-navigator/run-playwright.mjs`
- [x] T007 [P] Playwright config pointing at the built `dist/` served by `vite preview`, with a mock-GitHub fixture layer `apps/spec-navigator/playwright.config.ts`

### HTML entry, CSP, and app shell

- [x] T008 Create HTML entry with the CSP `<meta http-equiv="Content-Security-Policy">` tag carrying the exact directives from `plan.md` Technical Context → Constraints (default-src 'self'; connect-src 'self' api.github.com raw.githubusercontent.com; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' raw.githubusercontent.com data:; base-uri 'self'; form-action 'none') `apps/spec-navigator/index.html`
- [x] T009 Mount React root and render an empty `App` placeholder `apps/spec-navigator/src/main.tsx`
- [x] T010 Empty layout shell (two-pane + right drawer + top bar) with TODO stubs for later phases `apps/spec-navigator/src/App.tsx`
- [x] T011 [P] Centralised user-facing strings table (i18n-ready; no per-file literals) `apps/spec-navigator/src/strings.ts`
- [x] T012 [P] CSS tokens file with custom properties (colours, spacing, typography) mirroring `apps/web-shell/src/App.css` pattern `apps/spec-navigator/src/styles/tokens.css`
- [x] T013 [P] Base app CSS with two-pane + drawer layout — mobile-first, graceful narrow-viewport reflow `apps/spec-navigator/src/styles/app.css`

### README and documentation

- [x] T014 [P] Write the reviewer-facing README: PAT setup steps, required fine-grained PAT scope, local-dev command, troubleshooting `apps/spec-navigator/README.md`

### Build-time and infrastructure tests

- [x] T015 [test] `cspPresence.test.ts` — reads built `dist/index.html`, parses the CSP meta tag, asserts every directive matches the expected allowlist byte-for-byte `apps/spec-navigator/src/__tests__/cspPresence.test.ts`
- [x] T016 [P][test] `bundleSize.test.ts` — after `vite build`, reads `dist/assets/*.js`, fails if the largest gzipped chunk exceeds 400 KB; emits per-chunk gzip sizes to stdout so regressions are visible `apps/spec-navigator/src/__tests__/bundleSize.test.ts`

### CI and deploy wiring

- [x] T017 New gh-pages deploy workflow mirroring `.github/workflows/storybook.yml` exactly: `peaceiris/actions-gh-pages@v4`, `destination_dir: spec-navigator`, `keep_files: true`, path-filter trigger on `apps/spec-navigator/**` `.github/workflows/spec-navigator-publish.yml`
- [x] T018 Add `@debrief/spec-navigator` to the existing CI matrix: explicit `pnpm --filter @debrief/spec-navigator lint / typecheck / test` steps, plus `node apps/spec-navigator/run-playwright.mjs` `.github/workflows/ci.yml`
- [x] T019 [P] Add spec-navigator to the "Active Technologies" list AND update the "Before Pushing" fallback chain to include `pnpm --filter @debrief/spec-navigator` for lint / typecheck / test / e2e (closes the local-vs-CI drift that decision 2B would otherwise leave open — per deferred-item 3 in the review) `CLAUDE.md`

**Parallel opportunity**: T002–T007 are independent config files; T011–T014 touch different files; T015/T016 are in separate test files. Batch accordingly.


## Phase 2: Foundation

**Goal**: Build the shared type system, data contracts, REST client, persistence, reducer, selection-anchor helper, and feedback-comment renderer — everything that every user-story phase depends on. No UI assembled here; these are pure modules with unit tests.

**Independent test**: `pnpm --filter @debrief/spec-navigator test` passes for every module added in this phase; `tsc --strict` passes; zero `any`. Golden fixtures for the anchor format and the submission renderer match the files under `contracts/` byte-for-byte.

### Unified type system

- [x] T020 Define the unified `Comment` discriminated union (feature / document / selection variants), `CommentTag`, `DraftCommentSet`, `Submission`, `FeatureScope`, `Artefact`, and `Credential` types per `data-model.md` — one exported module, no implementation yet `apps/spec-navigator/src/types.ts`

### GitHub REST boundary (zod-narrowed)

- [x] T021 zod parsers for the four REST responses named in `contracts/github-rest-narrow.md` (pull request, directory listing, single file, issue-comment create) — strict, rejecting unknown-shape payloads `apps/spec-navigator/src/github/schemas.ts`
- [x] T022 [test] `github/schemas.test.ts` — zod parses known-good fixtures; rejects known-bad; verifies that PAT material is never interpolated into thrown errors `apps/spec-navigator/src/github/__tests__/schemas.test.ts`
- [x] T023 Typed REST wrapper using `fetch` + `Authorization: Bearer <pat>`, calling only `api.github.com` and `raw.githubusercontent.com`, mapping 401/403/404/422/rate-limit responses to discriminated error types from `strings.ts` `apps/spec-navigator/src/github/api.ts`

### Credential handling

- [x] T024 [P] PAT get/set/clear + "is-set" helpers with `localStorage` key `spec-navigator:github-pat`; in-memory cache invalidated on clear; never interpolates the PAT into log or error messages `apps/spec-navigator/src/github/auth.ts`
- [x] T025 [P][test] `github/auth.test.ts` — save/load/clear round-trip; clear wipes both storage and in-memory; PAT absent from any thrown `Error.message` `apps/spec-navigator/src/github/__tests__/auth.test.ts`

### localStorage persistence

- [x] T026 Per-PR `DraftCommentSet` read/write with `schemaVersion` field (key pattern `spec-navigator:drafts:pr-<num>`); `QuotaExceededError` caught and re-raised as a typed error the reducer can surface; version-mismatch → quarantine path into `spec-navigator:quarantine:<timestamp>` `apps/spec-navigator/src/state/persistence.ts`
- [x] T027 [test] `persistence.test.ts` — per-PR isolation (drafts for PR A absent when reading PR B); version-mismatch quarantine path; `QuotaExceededError` surfaces a typed error and leaves the in-memory copy intact `apps/spec-navigator/src/state/__tests__/persistence.test.ts`

### Reducer

- [x] T028 Pure reducer covering `ADD_COMMENT` / `EDIT_COMMENT` / `DELETE_COMMENT` / `RETAG_COMMENT` / `CLEAR_ALL` / `LOAD_FROM_STORAGE` / `MARK_STALE_PATHS` / `SUBMIT_OK` actions over a unified `Comment[]`; rejects empty `body`, duplicate ids, and add operations when `comments.length >= 100` with a typed-error return `apps/spec-navigator/src/state/commentsReducer.ts`
- [x] T029 [test] `commentsReducer.test.ts` — one case per action, plus the rejection paths; covers stale-path marking when an `Artefact[]` no longer lists a path that a draft references `apps/spec-navigator/src/state/__tests__/commentsReducer.test.ts`

### Selection anchoring

- [x] T030 Implement `captureSelection(source, start, end)` returning `{ snippet, contextBefore, contextAfter, anchorHash }` with `anchorHash` in the pinned format `<first20>\x1F<last20>\x1F<offset>`; `contextBefore` / `contextAfter` trimmed at word boundary where possible `apps/spec-navigator/src/format/selectionAnchor.ts`
- [x] T031 [test] `selectionAnchor.test.ts` — three canonical captures diffed byte-exact against a golden fixture; re-resolve against slightly-edited source still locates the intended passage (top match is correct); handles start-of-file and end-of-file edge cases (empty `contextBefore` / `contextAfter` only in those positions) `apps/spec-navigator/src/format/__tests__/selectionAnchor.test.ts`

### Feedback-comment renderer

- [x] T032 `renderFeedbackComment(submission: Submission): string` producing the trigger line + fenced `json spec-review-feedback-v1` block + human-readable sections per the rules in `contracts/pr-comment-body.example.md`, including the stale-head admonition when `originalHeadSha !== submittedAtHeadSha` `apps/spec-navigator/src/format/renderFeedbackComment.ts`
- [x] T033 [test] `renderFeedbackComment.test.ts` — golden markdown diffed byte-for-byte against `specs/191-spec-navigator/contracts/pr-comment-body.example.md` after normalising SHAs and timestamps; validates the embedded JSON against `spec-review-feedback-v1.schema.json` via zod in-test `apps/spec-navigator/src/format/__tests__/renderFeedbackComment.test.ts`

### Shared utilities

- [x] T034 [P] `classifyArtefact(path): ArtefactKind` — maps `specs/NNN-<slug>/<file>` paths to `'spec' | 'plan' | 'tasks' | 'research' | 'data-model' | 'quickstart' | 'contract' | 'evidence-image' | 'evidence-doc' | 'other'` `apps/spec-navigator/src/format/classifyArtefact.ts`
- [x] T035 [P][test] `classifyArtefact.test.ts` — one case per kind plus the fallback `'other'` `apps/spec-navigator/src/format/__tests__/classifyArtefact.test.ts`

**Parallel opportunity**: T024/T025 (auth pair), T034/T035 (classifier pair), and T031/T033 (golden fixture tests) can all run in parallel once T020 exists. T021–T023 (schemas → api) must be sequential.


## Phase 3: User Story 1 (P1) — Core review loop with stale-head detection

**Goal** (spec.md US1): A reviewer with a configured PAT opens `?pr=<n>`, sees the feature's artefact tree, reads the primary spec document, leaves at least a feature-level comment, and Submits — resulting in exactly one consolidated PR comment whose payload validates against `spec-review-feedback-v1.schema.json` and includes both `originalHeadSha` and `submittedAtHeadSha`.

**Independent test**: Playwright `submit.spec.ts` against the mock GitHub server completes the full loop and asserts the single POSTed comment body validates against the schema and contains both SHAs. Manual walkthrough (quickstart §Acceptance) also passes against a real throwaway PR.

### Scope resolution and initial load

- [x] T036 `useFeature(prNumber)` hook — calls `GET /pulls/:n`, narrows via zod, pins `head.sha` as `originalHeadSha`, computes `featureFolder` from the PR's changed files (first `specs/NNN-*/` prefix), lists the folder via `GET /contents/:path?ref=<sha>`, surfaces errors via the shared error type from `api.ts` `apps/spec-navigator/src/state/useFeature.ts`
- [x] T037 [P] `useComments(prNumber)` hook — wraps `commentsReducer` + `persistence`, restores on mount (quarantining on version mismatch), writes on every mutation `apps/spec-navigator/src/state/useComments.ts`

### Tree, default view, and rendering (markdown path only)

- [x] T038 `ArtifactTree` component — renders grouped-by-kind list of artefacts using `classifyArtefact`; clicking selects; keyboard-navigable; visually marks the currently-selected artefact and any artefact with drafts against it `apps/spec-navigator/src/components/ArtifactTree.tsx`
- [x] T039 `ArtifactView` skeleton — dispatches by `mimeType`; for markdown, renders via `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight`; memoised with `React.memo` and stable-reference props (Phase 6 completes the non-markdown branches) `apps/spec-navigator/src/components/ArtifactView.tsx`
- [x] T040 `MarkdownView` — thin wrapper exposing a stable `remark`/`rehype` plugin list; safe-by-default (no `dangerouslySetInnerHTML`); paragraph-level key discipline so re-render cost scales with changed content `apps/spec-navigator/src/components/MarkdownView.tsx`
- [x] T041 Default to `spec.md` on load (FR-005); fall back to the first markdown artefact if no `spec.md` exists `apps/spec-navigator/src/App.tsx` (extend layout shell)

### Feature-level commenting (minimum to close the submit loop)

- [x] T042 Feature-level "Comment on whole feature" button in the top bar, opens inline `CommentComposer` with level=`feature` `apps/spec-navigator/src/components/CommentComposer.tsx`
- [x] T043 [P] Error banner component for shared error surface (credential rejected, PR not found, network down, 422, rate limit, quota) — never renders the PAT, only the mapped error strings from `strings.ts` `apps/spec-navigator/src/components/ErrorBanner.tsx`

### Submit flow with force-push detection

- [x] T044 `SubmitButton` component — disabled when `comments.length === 0`; single-flight via `submitting` flag; before POST re-fetches `GET /pulls/:n` and compares `head.sha` with `DraftCommentSet.originalHeadSha`; if different, holds submission and opens `StaleHeadModal` `apps/spec-navigator/src/components/SubmitButton.tsx`
- [x] T045 `StaleHeadModal` — shows both short SHAs, explains the situation in reviewer-friendly language from `strings.ts`, offers "Submit anyway" (proceeds, builds `Submission` with `originalHeadSha` and `submittedAtHeadSha` both set) vs "Cancel" (aborts; drafts preserved) `apps/spec-navigator/src/components/StaleHeadModal.tsx`
- [x] T046 On successful POST, render a success panel with the link from `html_url`, then clear the draft store; a subsequent reload MUST yield an empty drawer (FR-022) `apps/spec-navigator/src/components/SubmitButton.tsx` (extend T044)

### Tests for US1

- [x] T047 [test] `useFeature.test.ts` — stubs `api.ts`; asserts feature-folder resolution from a multi-file PR; asserts empty-folder surface shows the "No feature folder found" banner per edge case `apps/spec-navigator/src/state/__tests__/useFeature.test.ts`
- [x] T048 [P][test] `SubmitButton.test.ts` — single-flight behaviour (two rapid clicks → one POST); disabled when empty; SHA-recheck triggers `StaleHeadModal` when head moves `apps/spec-navigator/src/components/__tests__/SubmitButton.test.ts`
- [x] T049 [test] `e2e/submit.spec.ts` — Playwright against the mock GitHub server: load → render spec.md → feature-level comment → submit → exactly one POST whose body renderFeedbackComment+parse yields a payload validating against `spec-review-feedback-v1.schema.json`; assert `originalHeadSha === submittedAtHeadSha` in the stable-HEAD case; drawer is empty after success; success link visible `apps/spec-navigator/e2e/submit.spec.ts`
- [x] T050 [test] `e2e/stale-head.spec.ts` — mock server returns a different `head.sha` on the second `GET /pulls/:n`; assert `StaleHeadModal` appears; clicking "Submit anyway" POSTs a body with `originalHeadSha !== submittedAtHeadSha`; clicking "Cancel" preserves drafts and does not POST `apps/spec-navigator/e2e/stale-head.spec.ts`

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/spec-navigator/run-playwright.mjs` to extract and configure. See `docs/project_notes/playwright-installation-research.md`.

**Parallel opportunity**: T037 / T043 / T048 are independent once the types exist; T038 ↔ T040 can be developed in parallel by two people once T036 is merged. T049 and T050 live in separate spec files and can run concurrently in CI.


## Phase 4: User Story 2 (P1) — Three-granularity commenting with context + anchor

**Goal** (spec.md US2): On top of the US1 loop, the reviewer can also create document-level and selection-level comments. Selection comments capture `snippet` + `contextBefore` + `contextAfter` + `anchorHash` and ship them in the submitted payload.

**Independent test**: Create one comment at each granularity; submit; deserialise the POSTed body's fenced block; assert the payload contains three comments whose `level` fields are `feature` / `document` / `selection`, the selection comment carries non-empty `snippet`, `contextBefore` (except at start-of-file), `contextAfter`, and an `anchorHash` matching the pinned format regex.

### Document-level commenting

- [x] T051 Document-level "Comment on this document" button in `ArtifactView`'s header; opens `CommentComposer` pre-populated with `level='document'` + current `path` `apps/spec-navigator/src/components/ArtifactView.tsx` (extend T039)
- [x] T052 [P] Extend `CommentComposer` to accept `level`, `path?`, and selection-context props; emits an `ADD_COMMENT` action through `useComments`; guards empty `body` `apps/spec-navigator/src/components/CommentComposer.tsx` (extend T042)

### Selection capture and composer wiring

- [x] T053 `SelectionAnchor` component — listens to `selectionchange` debounced at 150 ms on the artefact pane; when a non-whitespace selection exists, computes raw-source coordinates using the artefact's `content` string + the selection's DOM `Range`; renders a floating "Add comment on selection" chip positioned near the selection `apps/spec-navigator/src/components/SelectionAnchor.tsx`
- [x] T054 Wire the chip → `captureSelection` → `CommentComposer` with level=`selection`, path=current, and the captured `{ snippet, contextBefore, contextAfter, anchorHash }` pre-populated `apps/spec-navigator/src/components/SelectionAnchor.tsx` (extend T053)
- [x] T055 [P] Visible-selection marker overlay in the rendered pane so saved selection comments show a subtle highlight on their anchored passage while the reviewer is on that artefact (intentionally does NOT re-render the markdown — uses a position-absolute overlay keyed by `anchorHash`) `apps/spec-navigator/src/components/ArtifactView.tsx` (extend T039)

### Tag vocabulary and composer UX

- [x] T056 [P] Tag-select control inside `CommentComposer` exposing the 5 tags from `CommentTag` (`question`, `scope-concern`, `test-gap`, `nit`, `blocker`); "no tag" is a valid default `apps/spec-navigator/src/components/CommentComposer.tsx` (extend T052)
- [x] T057 [P] Mobile touch support — `selectionchange` already fires on long-press in modern Safari/Chrome; verify no bespoke touch handler is needed by adding a Playwright mobile-viewport sub-case in Phase 8 `apps/spec-navigator/src/components/SelectionAnchor.tsx` (validation-only, no code change unless the test fails)

### Tests for US2

- [x] T058 [test] `CommentComposer.test.ts` — renders with each level; tag picker shows all 5 values; empty body blocks save; save emits the expected action shape with the context fields intact `apps/spec-navigator/src/components/__tests__/CommentComposer.test.ts`
- [x] T059 [P][test] `SelectionAnchor.test.ts` — renders chip only when a non-empty selection exists; `Enter` on focused chip opens the composer; the captured record matches `captureSelection`'s output byte-for-byte `apps/spec-navigator/src/components/__tests__/SelectionAnchor.test.ts`
- [x] T060 [test] Extend `e2e/submit.spec.ts` (from T049) to add one document-level and one selection-level comment before Submit, then assert the resulting payload contains all three levels and the selection comment's `contextBefore` + `contextAfter` + `anchorHash` are non-empty `apps/spec-navigator/e2e/submit.spec.ts`

**Parallel opportunity**: T052/T056 both extend the composer but touch different regions; T055 extends `ArtifactView` but only the overlay layer; T058/T059 are independent test files.


## Phase 5: User Story 3 (P1) — Draft drawer, edit/delete, and reload persistence

**Goal** (spec.md US3): The reviewer can see every draft in one place grouped by target, edit or delete any of them, clear everything, and trust that reloading the tab preserves their work.

**Independent test**: Draft three comments, reload, assert all three still present with original text/target/tag; edit one + delete one; reload; assert the edits persisted and the deletion stuck; press "Clear all" → drawer empty + localStorage key gone; submit and reload → drawer empty (covers FR-022 again).

### Drawer UI and interactions

- [x] T061 `CommentDrawer` component — right-edge panel, collapsible, groups draft `Comment[]` by target: `feature` group first, then one group per distinct `path`; each entry shows id snippet, tag chip, body preview, and inline edit/delete affordances `apps/spec-navigator/src/components/CommentDrawer.tsx`
- [x] T062 Inline edit mode in the drawer — opens the same `CommentComposer` with the existing comment's values; saving emits `EDIT_COMMENT`; cancel reverts with no state change `apps/spec-navigator/src/components/CommentDrawer.tsx` (extend T061)
- [x] T063 [P] Delete action with a small "are you sure?" inline confirmation (no browser-native `confirm()` — it's a Playwright-hostile dialog) `apps/spec-navigator/src/components/CommentDrawer.tsx` (extend T061)
- [x] T064 [P] "Clear all" action in the drawer footer, with inline confirmation; dispatches `CLEAR_ALL`; persistence layer removes the per-PR key `apps/spec-navigator/src/components/CommentDrawer.tsx` (extend T061)
- [x] T065 [P] Stale-path badge — drafts whose `path` is not in the current `Artefact[]` render with a "stale" badge and block Submit until resolved (delete or edit-target — v1: delete only) `apps/spec-navigator/src/components/CommentDrawer.tsx` (extend T061)

### Persistence wiring for the lifecycle

- [x] T066 Hook `useComments` into `persistence`: on every reducer mutation write the full `DraftCommentSet`; on `SUBMIT_OK` clear the key; on mount load the key (quarantine on version mismatch; empty otherwise) `apps/spec-navigator/src/state/useComments.ts` (extend T037)
- [x] T067 [P] Quota-exceeded banner — when `persistence` raises the typed quota error, surface a non-blocking banner from `strings.ts`; keep in-memory state intact; allow Submit to proceed `apps/spec-navigator/src/components/ErrorBanner.tsx` (extend T043)

### Tests for US3

- [x] T068 [test] `CommentDrawer.test.ts` — renders groups correctly; edit round-trip; delete with confirmation; stale-path badge for a comment whose path is missing from the fixture's `Artefact[]` `apps/spec-navigator/src/components/__tests__/CommentDrawer.test.ts`
- [x] T069 [P][test] Extend `persistence.test.ts` (from T027) to cover the full lifecycle: write three comments, reload, assert all present; edit one, reload, assert edit persisted; clear, assert key removed; submit-clear, assert key removed `apps/spec-navigator/src/state/__tests__/persistence.test.ts`
- [x] T070 [test] `e2e/drawer.spec.ts` — Playwright: create three comments at different granularities, reload page, assert all present in drawer; edit one, delete one, reload, verify changes; click Clear all with confirm, drawer empty; submit, reload, drawer empty `apps/spec-navigator/e2e/drawer.spec.ts`

**Parallel opportunity**: T063/T064/T065 are three independent extensions to `CommentDrawer.tsx` — can be implemented by three people or three commits but must each be committed atomically. T067 touches a different component.


## Phase 6: User Story 4 (P2) — Full artefact rendering (structured files, images, cross-links, raw toggle)

**Goal** (spec.md US4): Every artefact kind renders faithfully — tables + task-lists + fenced-code in markdown; syntax-highlighted JSON/YAML for contracts; inline images for evidence; cross-artefact links stay inside the app; raw/rendered toggle works.

**Independent test**: `e2e/render.spec.ts` visits one artefact of every kind (markdown / JSON / YAML / PNG / cross-link target), asserts each renders correctly, clicks a cross-link and asserts the tree selection moves inside the app rather than opening a new tab, and toggles raw/rendered on a markdown artefact. Plus bench and XSS tests defend the rendering surface.

### Non-markdown views

- [x] T071 `CodeView` — renders JSON/YAML/other structured text via `highlight.js` (JSON / YAML / bash / python / diff / markdown grammars bundled); monospace, soft-wrap, readable at laptop width without horizontal scroll `apps/spec-navigator/src/components/CodeView.tsx`
- [x] T072 [P] `ImageView` — renders fetched `Blob` images at a max-width of 100% of the pane; "unusually large" notice for images over 5 MB; accessible `alt` text defaulting to the filename `apps/spec-navigator/src/components/ImageView.tsx`
- [x] T073 Wire `ArtifactView` to dispatch on `mimeType`: markdown → `MarkdownView`, JSON/YAML/text → `CodeView`, image → `ImageView`, anything else → "Cannot preview this file type" state `apps/spec-navigator/src/components/ArtifactView.tsx` (extend T039)

### Cross-artefact link interception

- [x] T074 Intercept clicks on `<a>` elements inside `MarkdownView` — normalise `href` via the `URL` constructor with a base derived from the current artefact's path; if the resolved path is inside `featureFolder`, `preventDefault` and route the tree selection to the matching artefact; otherwise let the browser open a new tab and decorate with a small "external" icon `apps/spec-navigator/src/components/MarkdownView.tsx` (extend T040)

### Raw/rendered toggle

- [x] T075 [P] Raw/rendered switch in the artefact header; when toggled, `ArtifactView` swaps the rendered body for a monospace plain-text view of the exact fetched `content` string; selection comments made in either mode map to the same raw-source coordinates `apps/spec-navigator/src/components/ArtifactView.tsx` (extend T039/T073)

### Tests for US4

- [x] T076 [test] `ArtifactView.test.ts` — renders markdown with tables / code / task-list checkboxes; renders JSON with syntax highlight; renders image from a Blob; cross-link click intercept fires; raw/rendered toggle swaps content without re-fetching `apps/spec-navigator/src/components/__tests__/ArtifactView.test.ts`
- [x] T077 [test] `xssAdversarial.test.ts` — feeds 10 standard XSS payloads (`<script>`, `<img onerror>`, `javascript:` href, `<iframe src=`, `<svg onload>`, `<math><mo>`, HTML-entity-obfuscated script, `<a href="data:">`, CSS `expression()`, embedded `<style>@import>`) through the markdown pipeline; asserts the rendered DOM contains zero `<script>` nodes and zero attributes matching `/^on/i` and zero `href`/`src` values starting with `javascript:` or `data:text/html` `apps/spec-navigator/src/__tests__/xssAdversarial.test.ts`
- [x] T078 [P][test] `markdownRender.bench.ts` — `vitest bench` over three real spec fixtures (50 KB / 150 KB / 300 KB captured into `__tests__/fixtures/`); asserts the 200 KB-equivalent render completes under 500 ms (soft-gate at 1000 ms in CI if jitter is observed, with actual times logged so regressions are visible) `apps/spec-navigator/src/components/__tests__/markdownRender.bench.ts`
- [x] T079 [P][test] `e2e/render.spec.ts` — Playwright: load a fixture PR with all artefact kinds, visit each in turn, assert each renders correctly; click a cross-link and assert tree selection moves without opening a new tab; toggle raw/rendered and assert content swap `apps/spec-navigator/e2e/render.spec.ts`

**Parallel opportunity**: T071 / T072 / T075 / T074 are four independent component bodies; T077 / T078 / T079 are three independent test files.


## Phase 7: User Story 5 (P2) — Credentials UX (Settings panel, PAT docs, clear, error mapping)

**Goal** (spec.md US5): A reviewer with no PAT configured lands on the Settings panel, reads the required scope on-screen, configures a PAT, uses the tool end-to-end, and can wipe the PAT with one click. Errors from GitHub (401/403/404/422/rate-limit) surface as clear messages that identify the credential as the cause without leaking the token.

**Independent test**: Open the app with no PAT → Settings panel visible by default with scope documented on-screen; attempt Submit with no PAT → error banner redirects to Settings; paste invalid PAT → 401 surfaces as credential-rejected banner with Settings link; paste valid PAT → full submit loop works; click Clear credential → `localStorage` key gone; next API call fails with "not authenticated" rather than reusing the cached value.

### Settings panel

- [x] T080 `SettingsPanel` — opens via the gear in the top bar; visible by default when no PAT is configured; input field for the PAT (masked by default, reveal toggle); on-screen documentation of the required fine-grained PAT scope (resource = `debrief/debrief-future`, permissions = `Contents: Read` + `Pull requests: Read/Write`), with a one-click copy of the GitHub PAT-creation URL; save and clear buttons; confirmation micro-copy when clear is clicked `apps/spec-navigator/src/components/SettingsPanel.tsx`
- [x] T081 [P] PAT probe — after save, fire a lightweight `GET /repos/debrief/debrief-future` to validate the token scope; on failure surface the scope-mismatch error; on success dismiss the Settings panel `apps/spec-navigator/src/components/SettingsPanel.tsx` (extend T080)

### Error mapping coverage

- [x] T082 Map every named error in `contracts/github-rest-narrow.md` (`401`, `403`, `404`, `422`, `429` rate-limit, network) to a reviewer-friendly string in `strings.ts` and an explicit "open Settings" action where the credential is the likely cause; asserts in `api.ts` that the PAT string never appears in `Error.message` `apps/spec-navigator/src/strings.ts` (extend T011) AND `apps/spec-navigator/src/github/api.ts` (extend T023)

### Tests for US5

- [x] T083 [test] `SettingsPanel.test.ts` — renders scope docs on-screen; save flow calls auth + probe; clear flow wipes storage and in-memory; reveal toggle works; PAT never rendered as text in any DOM node other than the input's value `apps/spec-navigator/src/components/__tests__/SettingsPanel.test.ts`
- [x] T084 [P][test] Extend `github/api.test.ts` (add alongside T023) — 401 → credential-rejected error; 404 → PR-not-found error; 429 → rate-limit error; 422 → server-validation surfaced; none of those Error messages contain the PAT string `apps/spec-navigator/src/github/__tests__/api.test.ts`
- [x] T085 [test] `e2e/auth.spec.ts` — Playwright: app loads with `localStorage` pre-cleared; Settings panel visible; invalid PAT → probe fails with scope banner; valid PAT → panel dismisses; clicking Clear → next POST fails with "not authenticated" `apps/spec-navigator/e2e/auth.spec.ts`

**Parallel opportunity**: T081 / T082 / T084 each touch different files; T083 and T085 are independent test files.


## Phase 8: Polish, cross-cutting coverage, and PR

**Goal**: Close the remaining cross-cutting commitments from the 19 review decisions, add the `/speckit.apply-feedback` slash command, capture every evidence artefact and media piece, wire everything into `speckit.pr`, and open the PR.

**Independent test**: `task verify` in the repo root is fully green (lint + typecheck + unit + playwright + bench + a11y + bundle + CSP + XSS); `specs/191-spec-navigator/evidence/` contains every file listed in the Evidence table above; `specs/191-spec-navigator/media/shipped-post.md` and `linkedin-shipped.md` exist; PR is open.

### Soft-gap tests

- [x] T086 [P][test] `softGaps.test.ts` — empty-folder response surfaces "No feature folder" banner (FR edge case); `QuotaExceededError` raises the quota banner while leaving in-memory state intact (FR-019/FR-021); POST 422 surfaces the server message without any PAT leakage (FR-034) `apps/spec-navigator/src/__tests__/softGaps.test.ts`

### Accessibility sweep

- [x] T087 [P][test] `e2e/a11y.spec.ts` — `@axe-core/playwright` sweep over the primary layout states (empty drawer, drawer with drafts, settings panel open, `StaleHeadModal` open) on desktop AND on a mobile viewport; asserts zero WCAG AA violations `apps/spec-navigator/e2e/a11y.spec.ts`

### `/speckit.apply-feedback` slash command

- [x] T088 New slash command that takes a PR number + comment id, fetches the comment, extracts the `json spec-review-feedback-v1` fenced block, validates it against `spec-review-feedback-v1.schema.json`, and walks each `Comment[]` entry — routing to the artefact and applying the reviewer's note via `Edit` / `AskUserQuestion` as the watcher would. Includes a top-of-file description, `handoffs`, and parse-failure handling that surfaces the raw body for manual triage `.claude/commands/speckit.apply-feedback.md`

### PR body link injection

- [x] T089 Update `speckit.pr.md` so the generated PR body includes a navigator link `https://debrief.github.io/debrief-future/spec-navigator/?pr=<num>` in the description (FR-035); guard against double-injection on reruns `.claude/commands/speckit.pr.md`

### Evidence collection

- [x] T090 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) — MUST include YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` `specs/191-spec-navigator/evidence/test-summary.md`
- [x] T091 [P] Write an end-to-end usage demonstration covering: URL → PAT setup → browse → three-granularity comments → Submit → PR-link → subsequent reload-is-empty `specs/191-spec-navigator/evidence/usage-example.md`
- [x] T092 [P] Capture landing screenshot (desktop) `specs/191-spec-navigator/evidence/screenshots/landing.png`
- [x] T093 [P] Capture drawer screenshot with multiple drafts at all three granularities `specs/191-spec-navigator/evidence/screenshots/drawer-open.png`
- [x] T094 [P] Capture `StaleHeadModal` screenshot (triggered via a force-pushed scratch branch) `specs/191-spec-navigator/evidence/screenshots/stale-head-modal.png`
- [x] T095 [P] Capture settings-panel screenshot (PAT input + scope docs visible) `specs/191-spec-navigator/evidence/screenshots/settings-panel.png`
- [x] T096 [P] Capture narrow-viewport (iPhone 14 class) screenshot `specs/191-spec-navigator/evidence/screenshots/mobile.png`
- [x] T097 [P] Capture interaction GIF (select → Add comment → save → drawer reflects) via Playwright `page.video()` then convert to GIF; under 5 s, under 2 MB `specs/191-spec-navigator/evidence/screenshots/interaction.gif`
- [x] T098 [P] Save a real submitted PR-comment body (with SHAs sanitised) as evidence for the renderer contract `specs/191-spec-navigator/evidence/pr-comment.md`
- [x] T099 [P] Capture the bundle-size check output (per-chunk gzipped sizes) from the CI run `specs/191-spec-navigator/evidence/bundle-size.txt`
- [x] T100 [P] Capture `vitest bench` output for 50 / 150 / 300 KB renders `specs/191-spec-navigator/evidence/bench-results.txt`
- [x] T101 [P] Capture the `@axe-core/playwright` zero-violation report `specs/191-spec-navigator/evidence/axe-report.json`
- [x] T102 [P] Capture `cspPresence.test.ts` output showing the verified directive allowlist `specs/191-spec-navigator/evidence/csp-verified.txt`

### Media content (shipped)

- [x] T103 Create shipped blog post via the Content Specialist agent (`.claude/agents/media/content.md`) — What We Built, Screenshots (include landing / drawer / stale-head / mobile + interaction GIF), Lessons Learned (honest notes on the PAT trade-off, the force-push decision, the rehype-highlight vs shiki call), What's Next `specs/191-spec-navigator/media/shipped-post.md`
- [x] T104 [P] Create LinkedIn shipped summary — 150–200 words, hook-first opening, link placeholder for the shipped-post URL `specs/191-spec-navigator/media/linkedin-shipped.md`

### Deploy smoke

- [x] T105 After merge to `main`, the `spec-navigator-publish.yml` workflow publishes `dist/` to `gh-pages` under `/spec-navigator/`; smoke-check the published URL by opening `?pr=<a-real-open-PR>` from a clean browser profile and walking through the acceptance scenarios in `quickstart.md` §Acceptance; if any step fails the feature is not ready to ship `https://debrief.github.io/debrief-future/spec-navigator/`

### PR creation

- [x] T106 Create PR and publish blog: run `/speckit.pr`

**Task T106 must run last.** It depends on every evidence and media task being complete. It creates the feature PR in `debrief/debrief-future` (with the Evidence table surfaced in the PR body) and the blog PR in `debrief/debrief.github.io` for the shipped post.

**Parallel opportunity**: T086 / T087 / T088 / T089 are four independent workstreams. The evidence tasks T091–T102 are almost all `[P]` — they run in parallel once the feature is functionally complete. T103 / T104 run in parallel once evidence is captured.


---

## Dependencies

**Phase ordering (hard dependencies)**:

```
Phase 1 Setup
   ↓
Phase 2 Foundation (types, schemas, reducer, renderer, anchor)
   ↓
Phase 3 US1 Core loop  ──────┐
   ↓                          │
Phase 4 US2 Commenting        │
   ↓                          │  (All P1 stories must be green before
Phase 5 US3 Drawer            │   the tool is usable end-to-end.)
   ↓                          │
Phase 6 US4 Rendering   ◀─────┘
   ↓
Phase 7 US5 Credentials
   ↓
Phase 8 Polish + PR
```

**Story-level dependencies**:

- **US1** depends on every Phase 2 module (types, api, auth, persistence, reducer, renderer, selectionAnchor, classifyArtefact).
- **US2** depends on US1 (needs the composer scaffold and the markdown-render path to select text against).
- **US3** depends on US2 (drawer surfaces the three-granularity drafts).
- **US4** depends on US1's `ArtifactView` skeleton; can start in parallel with US3 if two people are working, but the component tests and E2E need US2's selection-preserving overlay (T055).
- **US5** is a gate to US1 in practice (no PAT ⇒ no load) but is sequenced late because the *UX polish* is the main work; a minimal PAT-set path is already present inside US1's `auth.ts` + error banner.

**Polish depends on**:
- Every earlier phase green (evidence tasks capture real output).
- CI running the new workspace (T018) so the `test-summary.md` YAML values are real.
- `gh-pages` workflow (T017) so the deploy-smoke task (T105) has something to open.

**T106 `/speckit.pr` depends on** every T086–T105 being checked off — no exceptions.

**Within-phase parallelism** is flagged on each `[P]` task and summarised at the end of each phase.


---

## Implementation Strategy

### Incremental delivery

Each of Phases 3–7 delivers a user-visible capability. If the implementation has to pause partway, stopping after any completed phase leaves a tool that is honest about what it can do — not a half-wired UI.

- After **Phase 3**: a reviewer can load a PR, read the primary spec, leave a feature-level comment, and Submit. That alone is more useful than today's inline-review UI for most PRs.
- After **Phase 4**: three-granularity commenting is live. The tool's differentiating feature is now delivered.
- After **Phase 5**: drafts survive reloads and the drawer is trustworthy. Reviewers will actually rely on the tool for serious sessions.
- After **Phase 6**: every artefact kind renders correctly, so reviewers never fall back to the raw repo. Performance is benchmarked.
- After **Phase 7**: the credential UX is polished. The tool is ready for non-contributor reviewers.
- **Phase 8**: evidence + media + PR — the delivery surface.

### Suggested lanes if two contributors work in parallel

Once **Phase 2** is merged:

- **Lane A** picks up US1 (T036–T050) — the load + submit + stale-head loop.
- **Lane B** picks up US4 (T071–T079) — the non-markdown render paths, cross-link interception, XSS test, bench. Lane B's work depends only on the `ArtifactView` dispatch shape from T039; the two lanes can merge at the end of their phases without conflict.

### Testing posture

Every phase's tests MUST pass before the next phase is merged. The `before-pushing` chain (updated in T019) is:

```sh
pnpm --filter @debrief/spec-navigator lint
pnpm --filter @debrief/spec-navigator typecheck
pnpm --filter @debrief/spec-navigator test
node apps/spec-navigator/run-playwright.mjs
```

The bench task (T078) is allowed to soft-gate at 1000 ms in CI to absorb jitter but MUST record actual times so a regression is visible in the PR.

### Constitution posture reminders

- **No `any`** anywhere in new code (Article XV). Incoming GitHub REST payloads are narrowed via zod at `github/schemas.ts`; typed errors propagate from there.
- **Drafts never leave the device** except as the single POSTed comment (Article III). The CSP meta tag (T008) is the enforcement mechanism; the CSP presence test (T015) is the forcing function; the XSS adversarial test (T077) defends the rendering surface.
- **Specs before code** (Article VIII). All 19 review decisions are documented in `plan.md` / `research.md` / `data-model.md` / `contracts/` — those are the source of truth when a task description and reality disagree.

### Deferred — not in v1 scope

Dropped at review time: OAuth device-flow auth; unified gh-pages matrix workflow; shiki revisit. See `research.md` §§3, 4, 1 for why. Do not add these back inside this feature branch; they belong to separate future items if revived.

