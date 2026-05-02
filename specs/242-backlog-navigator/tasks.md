# Tasks: Backlog Navigator

**Input**: Design documents from `/specs/242-backlog-navigator/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Articles VI + VII) and the plan's Constitution Check both treat Vitest unit tests + Playwright E2E + axe a11y as required gates. Test tasks are interleaved per phase rather than batched.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Phase 2 (Foundation) includes the schema refactor of `BACKLOG.md` itself, since Stories 1–3 all read the post-refactor format.

---

## Evidence Requirements

**Evidence Directory**: `specs/242-backlog-navigator/evidence/`
**Media Directory**: `specs/242-backlog-navigator/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright totals + axe a11y results | After all tests pass |
| `evidence/usage-example.md` | Reviewer flow: load → filter → stage 3 edits → push dialog → dry-run confirm | After Story 2 + dry-run mode complete |
| `evidence/screenshots/browse-light.png` | Items table at default zoom, light theme | After Story 1 ships |
| `evidence/screenshots/browse-dark.png` | Same view, dark theme | After Story 1 ships |
| `evidence/screenshots/group-by-epic.png` | Group-by-Epic view with `done/total` counts and progress bars | After Story 1 ships |
| `evidence/screenshots/edit-controls.png` | Three context-sensitive editors open simultaneously (status dropdown + score picker + epic picker) | After Story 2 ships |
| `evidence/screenshots/push-dialog.png` | Push Changes dialog with structured summary + raw-diff toggle expanded | After Story 2 ships |
| `evidence/screenshots/dry-run-banner.png` | Dry-run / preview-mode banner indicator | After dry-run mode ships |
| `evidence/screenshots/interaction.gif` | Stage 3 edits → open Push dialog → confirm in dry-run (≤5s, ≤2MB) | After Story 2 + dry-run E2E captures it |
| `evidence/refactor-before-after.md` | Before/after of one `BACKLOG.md` Items row + Epics-table normalisation | After Phase 2 refactor commit |
| `evidence/backfill-misses.txt` | List of item IDs that fell back to the sentinel `Created` date | After running `scripts/backfill-backlog-dates.py` |
| `evidence/preview-url.txt` | The per-PR GitHub Pages URL produced by the preview workflow | After preview workflow merges |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook, What We're Building, How It Fits, Key Decisions) | **Already captured during `/speckit.plan`** |
| `media/shipped-post.md` | Feature post combining the cached opener with ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + screenshots + interaction GIF | Final task in Polish phase (`/speckit.pr`) |
| Blog PR | PR in `debrief.github.io` with the published feature post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Scaffold `apps/backlog-navigator/` so `pnpm install` + `pnpm --filter @debrief/backlog-navigator dev` produces a "hello world" SPA. Mirrors `apps/spec-navigator/` structure exactly.

- [x] T001 Scaffold workspace package metadata `apps/backlog-navigator/package.json`
- [x] T002 [P] Configure TypeScript strict-mode compiler `apps/backlog-navigator/tsconfig.json`
- [x] T003 [P] Configure Node-side TypeScript `apps/backlog-navigator/tsconfig.node.json`
- [x] T004 [P] Configure Vite with multi-base support `apps/backlog-navigator/vite.config.ts`
- [x] T005 [P] Configure Vitest + jsdom `apps/backlog-navigator/vitest.config.ts`
- [x] T006 [P] Configure Playwright (headless Chromium) `apps/backlog-navigator/playwright.config.ts`
- [x] T007 [P] Add cloud-friendly Playwright entrypoint copied from spec-navigator `apps/backlog-navigator/run-playwright.mjs`
- [x] T008 [P] Add ESLint config (extends repo root) `apps/backlog-navigator/.eslintrc.cjs`
- [x] T009 Add HTML entrypoint `apps/backlog-navigator/index.html`
- [x] T010 [P] Add app-root README mirroring spec-navigator's `apps/backlog-navigator/README.md`
- [x] T011 Add minimal main entrypoint that mounts an empty App `apps/backlog-navigator/src/main.tsx`
- [x] T012 Add empty App shell stub `apps/backlog-navigator/src/App.tsx`
- [x] T013 Wire app into the repo root `pnpm-workspace.yaml` (already includes `apps/*`; verify the new package resolves) `pnpm-workspace.yaml`
- [x] T014 Wire app into root CI as a build + test step (mirrors spec-nav-build / spec-nav-pw) `.github/workflows/ci.yml`

**Parallel opportunity**: T002–T010 can all run in parallel after T001 lands.

---

## Phase 2: Foundation (BLOCKS all user stories)

**Goal**: Land the `BACKLOG.md` schema refactor (additive columns + Epics normalisation), the typed parser/serialiser with byte-for-byte round-trip CI gate, the GitHub auth + read-only API client, and the user-facing strings module. Stories 1–3 cannot start until this phase lands because they all read post-refactor `BACKLOG.md`.

### 2a. Branded types, enums, strings

- [x] T015 Add branded primitive types and column/status/complexity enums `apps/backlog-navigator/src/types.ts`
- [x] T016 [P] Add narrowing helpers (`asItemId`, `asEpicId`, `asIsoDate`, `asSha`) with throw-on-malformed semantics `apps/backlog-navigator/src/types.ts`
- [x] T017 [P] Add user-facing strings module (i18n-ready, mirrors spec-navigator's `strings.ts`) `apps/backlog-navigator/src/strings.ts`
- [x] T018 [P][test] Unit tests for narrowing helpers (golden values + malformed-input cases) `apps/backlog-navigator/src/types.test.ts`

### 2b. Markdown-table parser/serialiser

- [x] T019 [test] Write parser unit tests against fixtures including: well-formed item rows, well-formed epic rows, escaped pipes, completed-strikethrough rows, malformed rows producing `ParseWarning` `apps/backlog-navigator/src/parser/__tests__/parseBacklog.test.ts`
- [x] T020 [P][test] Write serialiser unit tests asserting byte-for-byte round-trip stability on each fixture `apps/backlog-navigator/src/parser/__tests__/serializeBacklog.test.ts`
- [x] T021 [P][test] Add fixture files mirroring real BACKLOG.md row shapes `apps/backlog-navigator/src/parser/__tests__/fixtures/`
- [x] T022 Implement `parseBacklog(text) → BacklogDocument` per `contracts/backlog-md-format.md` `apps/backlog-navigator/src/parser/parseBacklog.ts`
- [x] T023 Implement `serializeBacklog(doc) → string` with strikethrough-on-`complete` enforcement and pipe-escape preservation `apps/backlog-navigator/src/parser/serializeBacklog.ts`
- [x] T024 [test] Add round-trip CI gate that runs against the live `BACKLOG.md` (loaded from repo root) `apps/backlog-navigator/src/parser/__tests__/liveBacklog.roundtrip.test.ts`

### 2c. BACKLOG.md schema refactor (one-shot)

- [x] T025 Implement Python backfill script using `git log --reverse --diff-filter=A -G '^\| NNN '` per `research.md §3` `scripts/backfill-backlog-dates.py`
- [x] T026 [P] Add unit tests for the backfill script's git-history-walking helpers (use a small synthetic git repo fixture) `scripts/test_backfill_backlog_dates.py`
- [x] T027 Run `scripts/backfill-backlog-dates.py` against the working tree; record `evidence/backfill-misses.txt` for the sentinel-fallback IDs
- [x] T028 Manually edit the Items table header + separator to add `Epic | Created | Updated` columns `BACKLOG.md`
- [x] T029 Backfill `Epic` column from existing `[[E##]` prose tags (one-shot mechanical pass) `BACKLOG.md`
- [x] T030 Normalise Epics table: rename row `024` to its `E##` form; remove strikethrough from completed Epic rows; ensure Status column reflects completion `BACKLOG.md`
- [x] T031 Remove the comma-separated `#NNN` Items column from the Epics table (item count will be derived by the navigator) `BACKLOG.md`
- [x] T032 Update agent definitions and templates that touch `BACKLOG.md` so they stamp the new `Created`/`Updated`/`Epic` columns on insert/edit (`opportunity-scout`, `backlog-prioritizer`, `the-ideas-guy`, `/idea`, `/interview`, `/speckit.start`) `.claude/agents/` + `.specify/templates/`

### 2d. GitHub auth + read-only client

- [x] T033 [P] Implement PAT get/set/clear (mirrors `apps/spec-navigator/src/github/auth.ts`, with `backlog-navigator:` namespace) `apps/backlog-navigator/src/github/auth.ts`
- [x] T034 [P][test] Unit tests for PAT redaction discipline (no PAT in thrown error strings; never logged) `apps/backlog-navigator/src/github/__tests__/auth.test.ts`
- [x] T035 [P] Add Zod schemas for GitHub REST responses per `contracts/github-api.md` (Contents, Pulls, Refs) `apps/backlog-navigator/src/github/schemas.ts`
- [x] T036 Implement `readBacklogMd(ref)` (Contents API) returning `{ text, sha }` `apps/backlog-navigator/src/github/api.ts`
- [x] T037 [test] Unit tests for `readBacklogMd` covering 401/403/404/rate-limit branches with mocked `fetch` `apps/backlog-navigator/src/github/__tests__/api.test.ts`

### 2e. State store skeleton

- [x] T038 Implement React-context store skeleton (baseline `BacklogDocument` only, no edits yet) `apps/backlog-navigator/src/state/store.ts`
- [x] T039 [P] Implement `localStorage` persistence helper with size-cap warning at 1MB `apps/backlog-navigator/src/state/persistence.ts`
- [x] T040 [P][test] Unit tests for persistence helper (read/write/clear/version migration stub) `apps/backlog-navigator/src/state/__tests__/persistence.test.ts`

**Parallel opportunity**: 2a (T015–T018), 2d (T033–T037), and 2e (T038–T040) can run in parallel once the `[P]`-marked tasks within each block start. 2b (parser) gates on its tests being written first; 2c (refactor) MUST run sequentially (T028 → T029 → T030 → T031 in that order).

---

## Phase 3: User Story 1 — Browse, filter, and group the live backlog (P1)

**Goal**: A reviewer can load the navigator, see every item from `BACKLOG.md` rendered as an interactive table, sort by ID/Total/Updated/Created, apply structured + free-text filters, group by Epic with `done/total` per epic, and expand/collapse Description cells (per-row chevron + column-header toggle).

**Independent Test** (matches spec Story 1 acceptance scenarios 1–5): With the post-refactor `BACKLOG.md` loaded, exercise sort + filter + group-by + expand/collapse with no auth, no edits, no GitHub write path. Pass when (a) sort cycles through all four keys both directions, (b) free-text filter matches text inside collapsed Descriptions, (c) group-by-Epic counts equal a manual count, (d) expand-all toggle and per-row chevron both work, (e) Markdown links inside Descriptions are clickable.

### 3a. App shell + read flow

- [x] T041 Wire `App.tsx` to fetch `BACKLOG.md` on mount (live mode default), parse, and populate the store `apps/backlog-navigator/src/App.tsx`
- [x] T042 [P] Add a top-level loading + error banner `apps/backlog-navigator/src/components/StatusBanner.tsx`
- [x] T043 [P][test] Unit tests for App's load/parse/error paths with mocked GitHub client `apps/backlog-navigator/src/__tests__/App.test.tsx`

### 3b. Items table + sort + filter

- [x] T044 [P] Implement `ItemsTable.tsx` with semantic `<table>` markup, sortable column headers, and accessible labelling `apps/backlog-navigator/src/components/ItemsTable.tsx`
- [x] T045 [P] Implement `SortControls.tsx` (column-header toggle component for ID / Total / Updated / Created) `apps/backlog-navigator/src/components/SortControls.tsx`
- [x] T046 [P] Implement `FilterBar.tsx` with structured filters (Status / Category / Epic / Complexity) + free-text input `apps/backlog-navigator/src/components/FilterBar.tsx`
- [x] T047 Add view-state slice to the store (sort key, sort direction, structured filters, free-text filter, group-by toggle) `apps/backlog-navigator/src/state/store.ts`
- [x] T048 Implement derived `useFilteredSortedItems` selector with `useMemo` over the store `apps/backlog-navigator/src/state/selectors.ts`
- [x] T049 [test] Unit tests for selector (sort direction toggling, multi-filter intersection, free-text matching collapsed Description) `apps/backlog-navigator/src/state/__tests__/selectors.test.ts`

### 3c. Description cell expand/collapse

- [x] T050 [P] Implement `DescriptionCell.tsx` rendering Markdown via `react-markdown` + `remark-gfm`, truncated by default `apps/backlog-navigator/src/components/DescriptionCell.tsx`
- [x] T051 Add per-row expand/collapse + column-header expand-all toggle wired to view-state slice `apps/backlog-navigator/src/components/DescriptionCell.tsx`
- [x] T052 Auto-expand cells when the free-text filter matches inside their collapsed contents (FR-013) `apps/backlog-navigator/src/components/DescriptionCell.tsx`
- [x] T053 [P][test] Unit tests for truncation, expand/collapse state, auto-expand on filter match `apps/backlog-navigator/src/components/__tests__/DescriptionCell.test.tsx`

### 3d. Group-by-Epic view

- [x] T054 [P] Implement `EpicGroupHeader.tsx` showing title, status, and `done/total` count with a progress bar `apps/backlog-navigator/src/components/EpicGroupHeader.tsx`
- [x] T055 Add `useEpicProgress` selector that joins items on `Epic` column and counts `status === 'complete'` `apps/backlog-navigator/src/state/selectors.ts`
- [x] T056 Add group-by toggle to `ItemsTable.tsx` (renders flat or grouped) `apps/backlog-navigator/src/components/ItemsTable.tsx`
- [x] T057 Treat items with no `Epic` as an "(unassigned)" group `apps/backlog-navigator/src/state/selectors.ts`
- [x] T058 [test] Unit tests for `useEpicProgress` covering: zero-item epic, all-complete epic, partial epic, items without Epic `apps/backlog-navigator/src/state/__tests__/epicProgress.test.ts`

### 3e. Story 1 E2E

- [x] T059 [test] Playwright E2E: Story 1 acceptance scenarios 1–5 (sort, filter, group-by, expand-all, Markdown link rendering) using a fixture-loaded BACKLOG.md `apps/backlog-navigator/e2e/browse.spec.ts`
- [x] T060 [P][test] axe-core accessibility assertions on the default browse view `apps/backlog-navigator/e2e/a11y.spec.ts`

**Parallel opportunity**: 3b, 3c, 3d component-creation tasks (`[P]`) can be developed concurrently after T041 lands. Tests interleave per block.

**Story 1 checkpoint**: At end of Phase 3, the navigator renders the full backlog and supports browse+filter+group with no editing surface yet exposed.

---

## Phase 4: User Story 2 — Stage edits and push as a single PR (P2)

**Goal**: A reviewer can edit any cell with a context-sensitive control, accumulate pending edits in `localStorage` with per-edit undo, see a "N pending edits" footer, click **Push Changes** to open a dialog with structured summary + raw-diff toggle + editable PR title/body, and confirm. In real-write mode, a single commit lands on a fresh branch and a PR opens against `main`. In dry-run mode, the dialog renders identically and confirmation is a no-op (FR-029..031). Stale-base detection (FR-025) refuses pushes whose baseline SHA has moved.

**Independent Test** (matches spec Story 2 acceptance scenarios 1–8): With a `repo`-scoped PAT, exercise (a) PAT prompt on first edit, (b) reload-and-pending-edits-survive, (c) Push Changes dialog content, (d) real-write commit + PR opens with single-row diff, (e) strikethrough applied/removed on Status flip to/from `complete`, (f) ID-collision blocks push, (g) network-failure preserves staging, (h) dry-run round-trip produces no GitHub side-effects and preserves staging.

### 4a. Pending-edits store

- [x] T061 Implement `PendingEdit` shape per `data-model.md` with `item-cell` / `item-id-rename` / `epic-cell` variants `apps/backlog-navigator/src/state/pendingEdits.ts`
- [x] T062 Add `applyPendingEdits(baseline, pending) → BacklogDocument` projection helper (no in-place mutation) `apps/backlog-navigator/src/state/pendingEdits.ts`
- [x] T063 Add `stageEdit` / `undoEdit` / `clearStaging` store actions with `id-rename`-aware re-checks `apps/backlog-navigator/src/state/store.ts`
- [x] T064 Wire `localStorage` persistence (envelope `:pending-edits:v1` per `contracts/localstorage-schema.md`) `apps/backlog-navigator/src/state/persistence.ts`
- [x] T065 [test] Unit tests for staging: round-trip persistence, per-edit undo restores prior value, id-rename rewrites later edits, collision detection at projection time `apps/backlog-navigator/src/state/__tests__/pendingEdits.test.ts`

### 4b. Context-sensitive editors

- [x] T066 [P] `StatusDropdown.tsx` (workflow values, excludes `parked`/`rejected`) `apps/backlog-navigator/src/components/editors/StatusDropdown.tsx`
- [x] T067 [P] `ScorePicker.tsx` (1/3/5 + sentinel `-`) `apps/backlog-navigator/src/components/editors/ScorePicker.tsx`
- [x] T068 [P] `ComplexityDropdown.tsx` (Low/Medium/High) `apps/backlog-navigator/src/components/editors/ComplexityDropdown.tsx`
- [x] T069 [P] `EpicPicker.tsx` (populated from Epics table + "(none)") `apps/backlog-navigator/src/components/editors/EpicPicker.tsx`
- [x] T070 [P] `CategoryComboBox.tsx` (existing-values dropdown + free-text fallback) `apps/backlog-navigator/src/components/editors/CategoryComboBox.tsx`
- [x] T071 [P] `DateInput.tsx` (native `<input type="date">` wrapper, locale-aware) `apps/backlog-navigator/src/components/editors/DateInput.tsx`
- [x] T072 [P] `DescriptionTextarea.tsx` (multi-line Markdown editor with live preview) `apps/backlog-navigator/src/components/editors/DescriptionTextarea.tsx`
- [x] T073 [P] `IdInput.tsx` (numeric input + collision warning surfaced inline) `apps/backlog-navigator/src/components/editors/IdInput.tsx`
- [x] T074 Wire editors into `ItemRow.tsx` cell click → context-sensitive control dispatch `apps/backlog-navigator/src/components/ItemRow.tsx`
- [x] T075 Add modified-cell + modified-row visual treatments + per-edit undo affordance `apps/backlog-navigator/src/components/ItemRow.tsx`
- [x] T076 Auto-stamp `Updated` (today's date) on every staged edit applied to an item `apps/backlog-navigator/src/state/pendingEdits.ts`
- [x] T077 Strikethrough toggling on `Status === 'complete'` enforced at serialise time (already in T023; verify here with an integration test) `apps/backlog-navigator/src/parser/__tests__/strikethrough.test.ts`
- [x] T078 [P][test] Unit tests for each editor (controlled-component contract, accessibility labels, escape-to-cancel) `apps/backlog-navigator/src/components/editors/__tests__/`

### 4c. Pending footer + diff/summary

- [x] T079 [P] `PendingFooter.tsx` showing `{N} pending edits` + Push Changes button + Discard All affordance `apps/backlog-navigator/src/components/PendingFooter.tsx`
- [x] T080 [P] Implement `format/summary.ts` — walks `PendingEdit[]` and produces `EditSummary` with byKind counts `apps/backlog-navigator/src/format/summary.ts`
- [x] T081 [P] Implement `format/diff.ts` — synthesises unified diff via `jsdiff` between serialised baseline and serialised candidate `apps/backlog-navigator/src/format/diff.ts`
- [x] T082 [P][test] Unit tests for `summary.ts` (each edit-kind contributes to its tally; multi-edit summaries sort deterministically) `apps/backlog-navigator/src/format/__tests__/summary.test.ts`
- [x] T083 [P][test] Unit tests for `diff.ts` (single-cell edit produces minimal hunk; status flip to complete includes strikethrough wrapping) `apps/backlog-navigator/src/format/__tests__/diff.test.ts`

### 4d. Push dialog + real-write path

- [x] T084 `PushDialog.tsx` — modal with editable PR title/body, structured summary, raw-diff toggle, confirm + cancel `apps/backlog-navigator/src/components/PushDialog.tsx`
- [x] T085 [P] Auto-generate sensible default PR title from the summary (e.g. `Backlog: 3 status changes, 1 epic reassignment`) `apps/backlog-navigator/src/format/defaults.ts`
- [x] T086 Add write methods to GitHub client: `getRefSha`, `createBranch`, `commitFile`, `openPullRequest` per `contracts/github-api.md` endpoints #3–#6 `apps/backlog-navigator/src/github/api.ts`
- [x] T087 Implement live-mode push sequence (read main → create branch → commit BACKLOG.md with baselineSha → open PR → clear staging) `apps/backlog-navigator/src/state/push.ts`
- [x] T088 Stale-base detection: 409 from the commit endpoint surfaces the FR-025 banner + preserves staging `apps/backlog-navigator/src/state/push.ts`
- [x] T089 ID-collision blocking: pre-flight check on `applyPendingEdits` projection; refuse push if any ID is duplicated `apps/backlog-navigator/src/state/push.ts`
- [x] T090 PAT-scope detection: detect missing `repo` scope (403 + parse) before any write attempt and surface upgrade prompt (FR-028) `apps/backlog-navigator/src/github/api.ts`
- [x] T091 [test] Mocked-API unit tests for push happy path + stale-base 409 + collision-block + scope-missing `apps/backlog-navigator/src/state/__tests__/push.test.ts`

### 4e. Dry-run mode

- [x] T092 Add deployment-config detection: read `import.meta.env.VITE_BACKLOG_NAV_DRY_RUN` + URL `?dryRun=1` override → `mode: 'dry-run'` `apps/backlog-navigator/src/state/deploymentMode.ts`
- [x] T093 [P] `DryRunBanner.tsx` — persistent banner indicating "Preview deployment — Push Changes will not commit" `apps/backlog-navigator/src/components/DryRunBanner.tsx`
- [x] T094 In `PushDialog.tsx`, relabel the confirm control ("Preview submission" vs. "Open PR") and bypass GitHub API calls in dry-run mode (FR-029) `apps/backlog-navigator/src/components/PushDialog.tsx`
- [x] T095 Preserve staging across dry-run confirm (FR-031); show a transient success banner instead `apps/backlog-navigator/src/state/push.ts`
- [x] T096 [test] Dry-run unit test: confirm fires no `fetch` calls, leaves staging intact, surfaces correct banner `apps/backlog-navigator/src/state/__tests__/dryRun.test.ts`

### 4f. Story 2 E2E

- [ ] T097 [test] Playwright E2E: Story 2 acceptance scenarios 1–7 (PAT prompt, reload survival, dialog content, write round-trip with mocked GitHub, strikethrough toggle, ID collision block, network-failure preservation) `apps/backlog-navigator/e2e/edit.spec.ts`
- [ ] T098 [test] Playwright E2E: Story 2 acceptance scenario 8 (dry-run round-trip — confirm fires no API calls, banner indicates preview, staging preserved) — capture `interaction.gif` from this run for evidence `apps/backlog-navigator/e2e/push-dryrun.spec.ts`
- [ ] T099 [P][test] axe-core a11y assertions on the Push dialog `apps/backlog-navigator/e2e/a11y.spec.ts`

**Story 2 checkpoint**: Editing surface is fully wired with dry-run mode operational, real-write path implemented and behind the env flag, and the Push dialog is the verification surface for both modes.

---

## Phase 5: User Story 3 — Edit a backlog change inside an in-flight PR (P3)

**Goal**: Loading the navigator at `?pr=NNN` causes it to read `BACKLOG.md` from that PR's head branch, indicate PR mode in the UI, and on Push Changes commit onto the PR's head branch (no new branch, no new PR).

**Independent Test** (matches spec Story 3 acceptance scenarios 1–3): With an open PR that touches `BACKLOG.md`, load `?pr=NNN`, stage two edits, push, verify a new commit lands on the PR's head branch with no second PR created.

- [x] T100 Add URL query-string parser to detect `?pr=NNN` and validate as a positive integer `apps/backlog-navigator/src/state/urlMode.ts`
- [x] T101 Add `getPullRequest(number)` to GitHub client (Pulls API endpoint #2 per `contracts/github-api.md`) `apps/backlog-navigator/src/github/api.ts`
- [x] T102 Cache the PR response (`head.ref`, `head.sha`, `state`, `title`, `html_url`) in store for the session `apps/backlog-navigator/src/state/store.ts`
- [x] T103 Switch baseline source: in PR mode, fetch `BACKLOG.md` from `head.ref` rather than `main` `apps/backlog-navigator/src/state/store.ts`
- [x] T104 Switch push target: in PR mode, commit onto `head.ref` directly (skip create-branch + open-PR steps) `apps/backlog-navigator/src/state/push.ts`
- [x] T105 [P] `PRModeBanner.tsx` — chip showing "Editing PR #NNN — head branch `<name>`" + link to PR on github.com `apps/backlog-navigator/src/components/PRModeBanner.tsx`
- [x] T106 Adapt `PushDialog.tsx` confirm-control label to "Add commit to existing PR" in PR mode `apps/backlog-navigator/src/components/PushDialog.tsx`
- [x] T107 Surface "PR has no BACKLOG.md changes yet" banner when `?pr=NNN` targets a PR that doesn't currently touch BACKLOG.md (acceptance scenario 3) `apps/backlog-navigator/src/components/PRModeBanner.tsx`
- [x] T108 Handle `state === 'closed'` PRs: surface a "PR closed; switching to read-only" banner and disable editors `apps/backlog-navigator/src/components/PRModeBanner.tsx`
- [x] T109 [test] Unit tests for URL-mode parsing and PR-mode store transitions `apps/backlog-navigator/src/state/__tests__/urlMode.test.ts`
- [x] T110 [test] Playwright E2E: Story 3 acceptance scenarios 1–3 with mocked GitHub Pulls API `apps/backlog-navigator/e2e/pr-mode.spec.ts`

**Story 3 checkpoint**: PR-mode deep links work end-to-end; the navigator can refine in-flight backlog edits without proliferating PRs.

---

## Phase 6: Preview Deployment Workflows

**Goal**: Per-PR GitHub Pages preview deployment so every PR touching the navigator's source (or `BACKLOG.md`) surfaces a live URL where reviewers can exercise the navigator against that PR's `BACKLOG.md`. Mirrors the existing `spec-navigator-*.yml` workflow trio. Dry-run mode is the default for preview deployments; `main`-publish is the only build that ships real-write capability.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright tasks in this phase because you think browsers can't be installed. The project uses `@sparticuz/chromium` to extract a Linux Chromium binary via npm. Run `node apps/backlog-navigator/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T111 Add `VITE_BACKLOG_NAV_DRY_RUN` env-var support to Vite config; surface via `import.meta.env` `apps/backlog-navigator/vite.config.ts`
- [x] T112 [P] Author per-PR preview workflow (mirror of `spec-navigator-preview.yml`) — builds with `--base=/debrief-future/backlog-navigator-preview/<slug>/` and `VITE_BACKLOG_NAV_DRY_RUN=true`, publishes to `gh-pages` `.github/workflows/backlog-navigator-preview.yml`
- [x] T113 [P] Author sticky PR-comment workflow (mirror of `spec-navigator-comment.yml`) with marker `<!-- backlog-navigator-comment -->` `.github/workflows/backlog-navigator-comment.yml`
- [x] T114 [P] Author main-branch publish workflow (mirror of `spec-navigator-publish.yml`) — builds without dry-run flag, publishes to `/backlog-navigator/` on `gh-pages` `.github/workflows/backlog-navigator-publish.yml`
- [x] T115 Trigger workflows on changes to `apps/backlog-navigator/**`, `BACKLOG.md`, and `.github/workflows/backlog-navigator-*.yml`; document the trigger paths in each workflow file `.github/workflows/backlog-navigator-preview.yml`
- [ ] T116 Configure preview build to load `BACKLOG.md` from the PR's working tree rather than via the GitHub Contents API in dry-run mode (so reviewers see the in-PR version) `apps/backlog-navigator/src/github/api.ts`

**Phase 6 checkpoint**: Pushing a commit on this branch produces a live preview URL in the PR's sticky comment, where the navigator runs against the in-PR `BACKLOG.md` with dry-run mode active.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Capture the evidence required by the Quality Rubric (UI Component → screenshots in light/dark + interaction GIF; plus feature-specific schema-refactor before/after), polish the user-facing strings file, write the feature blog post, and create the PR via `/speckit.pr`.

### Evidence Collection

- [x] T117 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) — Vitest unit + Playwright E2E + axe a11y totals with YAML front matter `specs/242-backlog-navigator/evidence/test-summary.md`
- [x] T118 Create usage demonstration walking through reviewer flow: load → filter → stage 3 edits → push dialog → dry-run confirm `specs/242-backlog-navigator/evidence/usage-example.md`
- [ ] T119 [P] Capture browse view screenshot — light theme `specs/242-backlog-navigator/evidence/screenshots/browse-light.png`
- [ ] T120 [P] Capture browse view screenshot — dark theme `specs/242-backlog-navigator/evidence/screenshots/browse-dark.png`
- [ ] T121 [P] Capture group-by-Epic view screenshot showing `done/total` counts and progress bars `specs/242-backlog-navigator/evidence/screenshots/group-by-epic.png`
- [ ] T122 [P] Capture three context-sensitive editors open simultaneously `specs/242-backlog-navigator/evidence/screenshots/edit-controls.png`
- [ ] T123 [P] Capture Push Changes dialog with structured summary + raw-diff toggle expanded `specs/242-backlog-navigator/evidence/screenshots/push-dialog.png`
- [ ] T124 [P] Capture dry-run banner indicator `specs/242-backlog-navigator/evidence/screenshots/dry-run-banner.png`
- [ ] T125 [P] Capture interaction GIF — stage 3 edits → open Push dialog → confirm in dry-run (≤5s, ≤2MB), produced from the `push-dryrun.spec.ts` E2E run `specs/242-backlog-navigator/evidence/screenshots/interaction.gif`
- [x] T126 [P] Document the `BACKLOG.md` schema refactor: before/after diff of one Items row + Epics-table normalisation, plus a count of `Created`-backfill hits vs. sentinel-fallbacks `specs/242-backlog-navigator/evidence/refactor-before-after.md`
- [x] T127 [P] Verify `evidence/backfill-misses.txt` from T027 lives at the documented path and is referenced from the refactor evidence note `specs/242-backlog-navigator/evidence/backfill-misses.txt`
- [ ] T128 [P] Capture per-PR preview URL after the preview workflow's first run lands `specs/242-backlog-navigator/evidence/preview-url.txt`

### Polish

- [ ] T129 [P] Audit `src/strings.ts` for completeness: every user-visible string in JSX comes from this module, no inline literals (Article XI / Constitution Check) `apps/backlog-navigator/src/strings.ts`
- [ ] T130 [P] Update `CHANGELOG.md` with a 2-line summary of the new app + schema refactor `CHANGELOG.md`
- [ ] T131 [P] Run `task verify` end-to-end and resolve any lint/typecheck/test failures before evidence capture finalises

### Media Content

- [x] T132 Spawn the Content Specialist via Task tool (`.claude/agents/media/content.md`) to produce the feature post: copy the cached opener verbatim as the first three sections (`## Hook`, `## What We're Building`, `## How It Fits`), then write `## Key Decisions` + `## Screenshots` (with paths from T119–T125) + `## By the Numbers` (from T117 totals + T126 refactor counts) + `## Lessons Learned` + `## What's Next` `specs/242-backlog-navigator/media/shipped-post.md`

### PR Creation

- [ ] T133 Create PR and publish blog: run `/speckit.pr`

**Task T133 must run last. It depends on every preceding task being complete (evidence captured, screenshots in place, blog post finalised, CI green).**

---

## Dependencies

### Phase ordering (hard gates)

- **Phase 1 (Setup)** → blocks all subsequent phases. The package must exist before any code lands inside it.
- **Phase 2 (Foundation)** → blocks Phases 3, 4, 5. Story phases all read post-refactor `BACKLOG.md` via the typed parser.
- **Phase 3 (Story 1)** → blocks Phase 4 (you cannot edit a row you cannot see; the editing UX builds on `ItemsTable`/`ItemRow`).
- **Phase 4 (Story 2)** → blocks Phase 5 (PR mode is a re-targeting of Story 2's push path, not an independent surface).
- **Phase 6 (Preview Workflows)** → can land in parallel with Phase 4/5 once Phase 1's app shell builds cleanly. The preview workflow does not depend on the editing surface being complete; it just needs a buildable app.
- **Phase 7 (Polish)** → blocks PR creation. Every evidence and media task gates `T133 /speckit.pr`.

### Within-phase dependencies

- **Phase 2c (refactor)** is sequential: T028 → T029 → T030 → T031 must run in order against `BACKLOG.md`. T032 (agent stamping update) depends on the refactored format existing.
- **Phase 2b (parser)**: T019/T020 (tests) before T022/T023 (impl) per Article VII (tests-before-implementation). T024 (live round-trip) gates after T022 + T023 land.
- **Phase 4a (staging)** → blocks 4b (editors that emit pending edits) → blocks 4c (footer/diff/summary that consume pending edits) → blocks 4d (push that submits them) → blocks 4e (dry-run mode that bypasses 4d's API calls).
- **T077** (strikethrough integration test) depends on T023 (serialiser) and T076 (Updated stamping) both landing.
- **T087** (live-mode push) depends on T086 (write methods on GitHub client) and T064 (persistence envelope landing edits).
- **T097/T098/T110** (E2E specs) depend on every component they exercise.
- **T125** (interaction GIF) depends on T098 (push-dryrun E2E) producing the source recording.

### Cross-cutting

- The PAT-prompt UX (T033/T037) must work before T097 (Story 2 E2E) runs against any auth-required path.
- Stale-base detection (T088) requires both the read-baseline-sha path (T036 returns `sha`) and the write-with-sha path (T086's `commitFile`).

---

## Implementation Strategy

### Phasing into PRs

Per the user's directive ("the initial PR may require quite a few iterations"), the **initial PR** ships an MVP that is fully testable on its preview deployment without exercising the GitHub write path. A follow-up PR (or two) lights up real-write and PR-mode. This shape is enabled by dry-run being a real product capability (FR-029..031) — preview deployments default to dry-run, so the initial PR's preview URL exercises the entire reviewer flow up to (and including) the Push dialog without ever calling the Contents API for writes.

**Initial PR (recommended cut)** — Phases 1, 2, 3, 4a–c, 4e, 4f-dryrun-only, 6:
- Setup + Foundation (everything in Phase 2 including the `BACKLOG.md` schema refactor commit)
- Story 1 complete (browse / filter / group)
- Story 2 partial: editors + staging + footer + dialog rendering + dry-run mode
- Preview workflows live, with `VITE_BACKLOG_NAV_DRY_RUN=true` baked into the preview build
- Story 2 E2E covers dry-run round-trip but skips real-write

**Follow-up PR #1** — Phases 4d, 4f-real-write:
- Real-write push sequence (T086–T091)
- Story 2 E2E real-write coverage (T097)
- `main`-publish workflow ships without the dry-run flag

**Follow-up PR #2** — Phase 5 (PR-mode):
- `?pr=NNN` deep-link support
- PR-mode E2E

This phasing is a recommendation, not a hard rule. A single mega-PR is also acceptable if the iteration cycles in Phase 4d/5 turn out smaller than expected. `/speckit.implement` decides at execution time.

### Evidence capture timing

Most screenshots (T119–T124) come from a Playwright run during `/speckit.implement`. The interaction GIF (T125) is a side-effect of the dry-run E2E (T098) — wire `recordVideo: { dir: 'evidence-recordings/' }` in `playwright.config.ts` for that one spec, then convert the resulting webm to GIF as a Polish-phase task. Schema-refactor before/after (T126) is a one-shot capture from the Phase 2c commit's diff — write it before the working tree drifts further.

### Test discipline

Tests-before-implementation is enforced at the granular level in Phase 2b (parser) and Phase 4a–d (state + push). Component tests (Phases 3b–d, 4b) interleave: write the test stub for a component before fleshing the component out. Playwright E2E specs land at the end of each phase as a cross-cutting verification gate.

### Parallelisation

Phases 1, 2a, 2d, 2e contain the densest `[P]`-marked tasks (independent files, no shared state). Phase 4b's eight editor components are all `[P]` — eight engineers (or eight parallel agents) could implement them concurrently. Phase 7's evidence capture (T119–T128) is almost entirely `[P]`. The serialiser (T023) is the densest sequential bottleneck — it gates the parser's round-trip CI gate (T024), which in turn gates T097 / T098 / T110.

### Constitution discipline (continuous)

Every commit MUST pass: ESLint (Article XV `any` ban via lint rule), `tsc --noEmit` (Article XV strict mode), Vitest unit tests (Article VI), and the parser's live-BACKLOG.md round-trip CI gate (Article XV's "schema types are canonical" extended to the markdown-table contract). PR review (Article XIII) is the human gate. Per-PR preview deployments (Article XII) are produced by Phase 6's workflows and surfaced via the sticky comment.
