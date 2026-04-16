---
description: "Task breakdown for 189-stakeholder-demo-ui"
---

# Tasks: Stakeholder Demo UI for NL Catalog Search

**Input**: Design documents from `/specs/189-stakeholder-demo-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and non-optional. The spec mandates a Playwright smoke test as part of SC-007 (`task verify` passes including end-to-end coverage of at least one prototype phrase). Vitest unit tests cover the pure helpers (chip colour resolution, card projection, display-name lookup).

**Organisation**: Tasks are grouped by user story. US1 is load-bearing — US2 (off-corpus banner) and US3 (card polish) layer on top of US1's wired flow.

---

## Evidence Requirements

**Evidence Directory**: `specs/189-stakeholder-demo-ui/evidence/`
**Media Directory**: `specs/189-stakeholder-demo-ui/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest + Playwright results across US1/US2/US3 acceptance scenarios; YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` | After Phase 6 tests green |
| `evidence/usage-example.md` | Walk-through: open the demo, type "UK submarines", see chips + 18 cards, click × on nationality chip, see broader result | After US1 complete |
| `evidence/screenshots/state-unfiltered.png` | Initial page state — all 72 plots, empty chip bar, focused query input | After US1 complete |
| `evidence/screenshots/state-filtered.png` | "UK submarines" active — chips visible, 18-of-72 count, filtered grid | After US1 complete |
| `evidence/screenshots/state-zero-match.png` | A query producing zero hits — empty-state message visible | After US1 complete |
| `evidence/screenshots/state-off-corpus.png` | Off-corpus banner visible with at least 3 example phrases | After US2 complete |
| `evidence/screenshots/interaction.gif` | < 5s GIF showing chip removal + grid expansion (captured via Playwright `page.video()` then converted) | After US1+US2 complete |
| `evidence/sample-generation-result.json` | Serialised `GenerationResult` for "UK submarines", showing cql2 + lozenges + diagnostics | After US1 complete |
| `evidence/e2e-trace.zip` | Playwright trace of the smoke test run | After US1 Playwright test green |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog post | Already produced during `/speckit.plan` (or to be authored alongside Phase 1) |
| `media/linkedin-planning.md` | LinkedIn planning summary | Same as above |
| `media/shipped-post.md` | Shipped blog post | Phase 6 |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | Phase 6 |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + media | Final task (T034) |
| Blog PR | PR in `debrief.github.io` publishing shipped-post.md | Triggered by `/speckit.pr` |

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3 or — for cross-cutting)
- File paths are absolute within the repo.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403) but the bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

---

## Phase 1: Setup

**Purpose**: Scaffolding that blocks nothing else but must exist before implementation.

- [ ] T001 Create the new app directory tree `apps/nl-demo/`
- [ ] T002 Create the data + scripts + e2e + __tests__ subdirectories `apps/nl-demo/data/`
- [ ] T003 Add `apps/nl-demo` to the pnpm workspace if not already covered by glob `pnpm-workspace.yaml`
- [ ] T004 Create the demo's `package.json` with name `@debrief/nl-demo`, scripts for `serve` (`pnpm dlx serve .`), `sync-data` (runs the copy script), `test` (vitest), and `test:e2e` (Playwright); declare workspace dependency on `@debrief/components` `apps/nl-demo/package.json`
- [ ] T005 Write the data-sync script that copies `preview/workspace/samples/local-store/` (catalog.json + items) and the 188 fixture corpus (`responses.json`) into `apps/nl-demo/data/`; idempotent and re-runnable `apps/nl-demo/scripts/sync-data.mjs`
- [ ] T006 Add a stub `README.md` documenting `pnpm sync-data` + `pnpm serve` + URL `apps/nl-demo/README.md`

---

## Phase 2: Foundational — page shell + library wiring

**Purpose**: Stand up the HTML page, CDN imports, base layout, and the `@debrief/components` consumer wrapper. These block every user story because every story needs the page to load and the library to be callable.

**⚠️ CRITICAL**: No user-story work can begin until Phase 2 is complete.

- [ ] T007 Create `index.html` with React + ReactDOM + Babel-standalone CDN script tags (versions pinned per research.md §1) and a single root `<div id="app"></div>` `apps/nl-demo/index.html`
- [ ] T008 Create the base stylesheet with chip-colour CSS custom properties (per research.md §2), card-grid layout, query-bar layout, banner styling, and card styling `apps/nl-demo/styles.css`
- [ ] T009 Create the demo entry script (JSX, Babel-transformed in browser) that imports `generateCql2`, `createRecordedLLMClient`, `filterByCql2Json` from the workspace `@debrief/components` ESM build, and mounts a placeholder root component `apps/nl-demo/demo.jsx`
- [ ] T010 Implement the fixture-corpus loader: `fetch('./data/responses.json')` → JSON parse → set state to `loading-fixtures` / `fixture-error` / `unfiltered` per `UiState` (data-model.md) `apps/nl-demo/demo.jsx`
- [ ] T011 Implement the catalog loader: `fetch('./data/catalog.json')` then iterate items, parse, build the `StacBrowserItem[]` array consumed by the card grid; surface `fixture-error` state if any fetch fails (per FR-015) `apps/nl-demo/demo.jsx`
- [ ] T012 Implement the platform-registry loader: read `shared/data/platform-registry.json` (the static JSON output from #187/#181 build pipeline) and expose a resolver function `resolveDisplayName(field, code) -> string` for nationality and vessel-type lookups `apps/nl-demo/demo.jsx`
- [ ] T013 Implement the wrapper around `generateCql2`: build `GenerateDeps = { llmClient: createRecordedLLMClient(responses), enumBundle }`, expose `runQuery(phrase): Promise<GenerationResult>` `apps/nl-demo/demo.jsx`
- [ ] T014 Wire Playwright config (extends `apps/web-shell/run-playwright.mjs` pattern); spawn `pnpm dlx serve` from the test setup hook `apps/nl-demo/playwright.config.ts`

**Checkpoint**: Page loads with the unfiltered card grid visible. No interactivity yet beyond initial render. `pnpm sync-data && pnpm serve` works locally.

---

## Phase 3: User Story 1 — Analyst phrase produces filtered results (Priority: P1)

**Goal**: A stakeholder types "UK submarines", presses Enter, sees nationality + domain chips appear, sees the card grid reduce to 18 plots, and the count read "18 of 72". Removing a chip broadens the filter and updates the count.

**Independent Test**: `pnpm --filter @debrief/nl-demo test:e2e` — Playwright drives the demo through "UK submarines", asserts chip set, count, and card-grid contents. Then clicks × on the nationality chip and asserts the count rises.

### Components

- [ ] T015 [US1] Implement `<QueryBar />`: full-width input, placeholder "Try: UK submarines", Enter triggers `onSubmit(phrase)`; ignores submissions while in `loading-fixtures` or `fixture-error` (per FR-015) `apps/nl-demo/demo.jsx`
- [ ] T016 [US1] Implement `<ChipBar />`: renders one `<Chip />` per `ChipDescriptor` from current state, plus a "Clear all" control (FR-014) when at least one chip is active `apps/nl-demo/demo.jsx`
- [ ] T017 [US1] Implement `<Chip />`: colour-coded background per `chip.colour`, label text, × remove affordance, callback to parent on click `apps/nl-demo/demo.jsx`
- [ ] T018 [US1] Implement `<ResultsCount />`: shows "N of M plots" when filtered, "M plots" when unfiltered (FR-007) `apps/nl-demo/demo.jsx`
- [ ] T019 [US1] Implement `<CardGrid />`: CSS auto-fill grid (min 280px columns), renders one `<Card />` per filtered plot `apps/nl-demo/demo.jsx`
- [ ] T020 [US1] Implement `<Card />` (basic): title, year, truncated description (~200 chars), one nationality badge, one vessel-type badge, up to 3 tag badges (per FR-011) — display refinement deferred to US3 `apps/nl-demo/demo.jsx`
- [ ] T021 [US1] Implement `<EmptyState />`: shown when `kind === 'zero-match'`; displays "No plots match. Try rephrasing — for example, 'UK submarines'." plus a "Clear all" button (per FR-010) `apps/nl-demo/demo.jsx`

### Helpers (pure functions, unit-testable)

- [ ] T022 [US1] Implement chip-colour lookup `colourFor(filterType: FilterType): ChipColour` per data-model.md derivation rules `apps/nl-demo/lib/colour.mjs`
- [ ] T023 [US1] Implement card projection `projectCard(item, registry): CardProjection` per data-model.md `apps/nl-demo/lib/projection.mjs`
- [ ] T024 [US1] Implement chip-set → CQL2 recomputation helper `cql2FromChips(chips): Cql2Json | null` (used when removing a chip without re-running the LLM) `apps/nl-demo/lib/recompute.mjs`

### Wiring

- [ ] T025 [US1] Wire query-submission flow: `QueryBar` Enter → `runQuery(phrase)` → on success build `ChipDescriptor[]` from `result.lozenges` + run `filterByCql2Json` → set state to `filtered` (or `zero-match` on empty result) `apps/nl-demo/demo.jsx`
- [ ] T026 [US1] Wire chip-removal flow: × click → drop that chip → recompute CQL2 via `cql2FromChips` → re-evaluate via `filterByCql2Json` → set new `filtered` / `unfiltered` state (per FR-006) `apps/nl-demo/demo.jsx`
- [ ] T027 [US1] Wire "Clear all" flow: clears chips and returns to `unfiltered` (per FR-014); also handles the empty-submission case (FR-013) `apps/nl-demo/demo.jsx`
- [ ] T028 [US1] Add stale-state guard for rapid re-submissions (Edge Case from spec) — track an in-flight token, ignore stale results `apps/nl-demo/demo.jsx`

### Tests (US1)

- [ ] T029 [P][test] [US1] Vitest unit tests for `colourFor` (every FilterType maps to a valid ChipColour) `apps/nl-demo/__tests__/colour.test.mjs`
- [ ] T030 [P][test] [US1] Vitest unit tests for `projectCard` (badge ordering, truncation, registry resolution) `apps/nl-demo/__tests__/projection.test.mjs`
- [ ] T031 [P][test] [US1] Vitest unit tests for `cql2FromChips` (round-trip a `LozengeSeed[]` through chips and back to CQL2; assert `filterByCql2Json` returns the same items as the original LLM-produced CQL2) `apps/nl-demo/__tests__/recompute.test.mjs`
- [ ] T032 [test] [US1] Playwright smoke test: load page, wait for unfiltered state, type "UK submarines", press Enter, assert nationality + domain chips, assert count "18 of 72", assert 18 cards rendered. Then click × on nationality chip, assert count rises and chip is gone. `apps/nl-demo/e2e/smoke.spec.ts`

**Checkpoint**: US1 green. `task verify` passes. The core demo flow works end-to-end against the hand-authored fixture corpus.

---

## Phase 4: User Story 2 — Off-corpus phrase returns helpful guidance (Priority: P2)

**Goal**: Typing a phrase not in the fixture corpus surfaces a friendly banner with at least 3 clickable example phrases. Clicking an example resubmits as if the user typed it.

**Independent Test**: Playwright drives "purple elephants", asserts the off-corpus banner appears with ≥3 example links, clicks one, asserts the normal US1 flow runs.

- [ ] T033 [US2] Implement `<OffCorpusBanner />`: friendly message + 3 example phrases as buttons + a dismiss control; receives `examplePhrases` from props `apps/nl-demo/demo.jsx`
- [ ] T034 [US2] Implement example-phrase extraction: at fixture load time, take the first 3 canonicalised phrases from the corpus and store as `examplePhrases` (per research.md §5) `apps/nl-demo/demo.jsx`
- [ ] T035 [US2] Wire off-corpus detection: catch the recorded-client miss (188 throws on miss per its FR-011/T024) → set state to `off-corpus` with `lastGoodState` preserved per data-model.md `apps/nl-demo/demo.jsx`
- [ ] T036 [US2] Wire example-click → populate query bar + dismiss banner + resubmit (FR-009) `apps/nl-demo/demo.jsx`
- [ ] T037 [test] [US2] Playwright test: load page, type a deliberately off-corpus phrase, press Enter, assert banner with 3+ example phrase buttons, click first example, assert query bar populated and US1 flow runs `apps/nl-demo/e2e/smoke.spec.ts`

**Checkpoint**: US2 green. Off-corpus phrases recover gracefully without showing a stack trace or 404.

---

## Phase 5: User Story 3 — Card detail polish (Priority: P3)

**Goal**: Every plot card shows enough metadata at a glance — title, year, description, nationality badge, vessel-type badge (with human-readable name), up to 3 tag badges — that a stakeholder can judge match relevance without opening anything.

**Independent Test**: Visual inspection of cards under "Type 23 frigates" — every visible card shows a GB nationality badge and a "Type 23 (Duke-class)" vessel badge.

- [ ] T038 [US3] Refine `<Card />`: wire `projectCard` output, ensure nationality badges render as styled pills with country code (e.g. "UK"), vessel badges with full registry-resolved name (e.g. "Type 23 (Duke-class)"), tag badges with subtle styling capped at 3 (per FR-011) `apps/nl-demo/demo.jsx`
- [ ] T039 [US3] Polish description truncation: respect word boundaries (no truncating mid-word), append ellipsis cleanly `apps/nl-demo/lib/projection.mjs`
- [ ] T040 [US3] Add visual emphasis to badges that match an active chip dimension (per US3 acceptance — "the link between chip and card is obvious") `apps/nl-demo/demo.jsx`
- [ ] T041 [P][test] [US3] Vitest tests covering the description-truncation word-boundary behaviour and the ellipsis append `apps/nl-demo/__tests__/projection.test.mjs`

**Checkpoint**: US3 green. Cards now read as polished and the chip→card connection is visually obvious.

---

## Phase 6: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T042 Capture test results using the template at `.specify/templates/evidence/test-summary-template.md`; include YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and list every new/modified test file with the scenarios verified `specs/189-stakeholder-demo-ui/evidence/test-summary.md`
- [ ] T043 [P] Write a stakeholder-style usage walkthrough: load page → type "UK submarines" → see filtered cards → click × → see broader result. Include screenshots inline. `specs/189-stakeholder-demo-ui/evidence/usage-example.md`
- [ ] T044 [P] Capture screenshot of the unfiltered state (initial load, all 72 plots) `specs/189-stakeholder-demo-ui/evidence/screenshots/state-unfiltered.png`
- [ ] T045 [P] Capture screenshot of the filtered state ("UK submarines" — chips visible, count, 18 cards) `specs/189-stakeholder-demo-ui/evidence/screenshots/state-filtered.png`
- [ ] T046 [P] Capture screenshot of the zero-match empty state `specs/189-stakeholder-demo-ui/evidence/screenshots/state-zero-match.png`
- [ ] T047 [P] Capture screenshot of the off-corpus banner state `specs/189-stakeholder-demo-ui/evidence/screenshots/state-off-corpus.png`
- [ ] T048 Capture interaction GIF of chip-removal flow (< 5s, < 2MB) by recording Playwright `page.video()` during a tailored test run, then converting MP4 → GIF `specs/189-stakeholder-demo-ui/evidence/screenshots/interaction.gif`
- [ ] T049 [P] Export the `GenerationResult` for "UK submarines" as JSON for inspection `specs/189-stakeholder-demo-ui/evidence/sample-generation-result.json`
- [ ] T050 [P] Save Playwright trace of the smoke-test run `specs/189-stakeholder-demo-ui/evidence/e2e-trace.zip`

### Media Content

- [ ] T051 Spawn Content Specialist (`.claude/agents/media/content.md`) to author the shipped blog post: What We Built (the demo), Screenshots (state-unfiltered + state-filtered + state-off-corpus), Lessons Learned (no-build-step constraints, recorded-transport pattern), What's Next (#190 Live LLM Transport unlocks open-ended queries) `specs/189-stakeholder-demo-ui/media/shipped-post.md`
- [ ] T052 [P] Draft the LinkedIn shipped summary (150–200 words, hook focused on "stakeholders can now drive a NL search demo offline") `specs/189-stakeholder-demo-ui/media/linkedin-shipped.md`

### PR Creation

- [ ] T053 Create PR and publish blog: run `/speckit.pr`

**Task T053 must run last. It depends on every evidence artefact, both media files, and all prior tests being green.**

---

## Dependencies

```
Phase 1 (Setup) ──► Phase 2 (Foundational: page shell + library wiring) ──► Phase 3 (US1) ──┬──► Phase 4 (US2)
                                                                                            │
                                                                                            └──► Phase 5 (US3)
                                                                                            │
                                                                                            └──► Phase 6 (Polish)

Within Phase 3:
  T015 (QueryBar) ──► T025 (submit-flow wiring)
  T016 (ChipBar) + T017 (Chip) ──► T026 (chip-removal wiring) + T027 (Clear-all wiring)
  T019 (CardGrid) + T020 (Card) ──► T025
  T022/T023/T024 (helpers) ──► T025/T026
  T029/T030/T031 (vitest) can run in parallel after their respective helpers land.
  T032 (Playwright) requires the entire wiring (T025–T028) green.

Within Phase 4: T033 → T035 → T036; T034 is independent and can run in parallel with T033.
Within Phase 5: T038 ──► T040; T039 + T041 are independent.
Polish: T043–T050 can run in parallel after Phase 5 ends. T051 ──► T052 (same media agent session).
        T053 depends on everything above.
```

## Parallel execution examples

- **Phase 3 helpers**: T022, T023, T024 live in three separate files and can be authored in parallel.
- **Phase 3 tests**: T029, T030, T031 test the three helper modules independently — run in parallel once their respective helpers exist.
- **Phase 6 evidence capture**: T044, T045, T046, T047, T049, T050 each produce distinct files; capture them in one Playwright session and save artefacts in parallel.

## Implementation strategy

Deliver in three landings:

1. **Foundational page shell** (Phases 1–2). Static HTML loads, library imports work, catalog/fixtures fetch and parse, page renders the unfiltered grid. Small, reviewable; demoable as "see all 72 plots".
2. **US1 increment** (Phase 3). Full query → chips → filtered grid + chip-removal + clear-all + Playwright smoke green. This is the core acceptance gate for the spec.
3. **Polish + downstream unlocks** (Phases 4–6). Off-corpus banner, card detail polish, evidence, media, PR.

Each phase ends green with `task verify` passing before the next begins.

## Independent test criteria

- **US1**: `pnpm --filter @debrief/nl-demo test:e2e --grep "core flow"` reports green; smoke test asserts chips + count + card-grid for "UK submarines" and chip-removal recovery.
- **US2**: `pnpm --filter @debrief/nl-demo test:e2e --grep "off-corpus"` reports green; off-corpus phrase produces a banner with example-phrase buttons; clicking one runs the normal flow.
- **US3**: Manual visual inspection (or a Playwright screenshot diff) of "Type 23 frigates" shows every card with a GB nationality badge and a "Type 23 (Duke-class)" vessel badge; tag badges capped at 3.
