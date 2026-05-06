---
description: "Task list for #237 — Active-Storyboard Selection Persistence"
---

# Tasks: Active-Storyboard Selection Persistence

**Input**: Design documents from `/specs/237-active-storyboard-persistence/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/active-storyboard-selection-store.ts, quickstart.md (all present)

**Tests**: This feature includes test tasks throughout — required by Articles VI / VII / XV and explicitly mapped in `quickstart.md` §Testing.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent slice. The acceptance-scenario → test-file mapping in `quickstart.md` is the source of truth for what each phase delivers.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. Used in PR descriptions, the feature blog post, and as the source of record for future regression checks.

**Evidence Directory**: `specs/237-active-storyboard-persistence/evidence/`
**Media Directory**: `specs/237-active-storyboard-persistence/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Aggregated pass/fail counts for the new Vitest unit suites + the new Playwright E2E spec, with the fixed YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) per the `.specify/templates/evidence/test-summary-template.md` template | After all tests pass (Polish phase) |
| `evidence/usage-example.md` | Two short code samples: (a) the host-side `selectionStore.get(itemPath) → ID` round-trip seen at plot-open; (b) a typescript snippet showing the `ActiveStoryboardSelectionStore` interface in use, mirroring the `quickstart.md` reading order | After the adapter is implemented |
| `evidence/screenshots/before-default-fallback.png` | Side-rail header screenshot of the panel landing on `getActiveStoryboardDefault()` (today's behaviour, still the first-ever-open behaviour after #237) | During the Playwright run that captures interaction.gif |
| `evidence/screenshots/after-restored-selection.png` | Side-rail header screenshot of the panel landing on the analyst's previously-pinned Storyboard after a page reload | Same Playwright run |
| `evidence/screenshots/interaction.gif` | < 5 s, < 2 MB GIF: open plot → pick a non-default Storyboard from the dropdown → reload page → panel still on the picked Storyboard. Captured via the same web-shell Playwright spec used for the E2E test | Polish phase |
| `evidence/webview-e2e-summary.md` | Pass / fail summary for `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts`, including the two scenarios (US1 happy path + US2 stale fallback) and a screenshot index | Polish phase |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener — Hook (before/after table) + What We're Building + How It Fits + Key Decisions | **Already created during `/speckit.plan`** ✓ |
| `media/shipped-post.md` | Feature post combining the cached opener with screenshots, By the Numbers, Lessons Learned, What's Next | Polish phase (Content Specialist) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with full evidence and the spec dir as the source of truth | Final task in Polish phase (via `/speckit.pr`) |
| Blog PR | Cross-repo PR in `debrief/debrief.github.io` publishing the feature post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: One pre-emptive infrastructure edit that unblocks Phase 2 / Phase 3 — without it, the moment the new web-shell adapter file is created in Phase 3 it will trigger the `no-restricted-globals` ESLint rule and break `task lint`.

- [ ] T001 Add `apps/web-shell/src/services/activeStoryboardSelectionStoreWebShell.ts` to the existing `localStorage` exception list in `shared/eslint-rules/no-direct-persistence-in-frontend.cjs` (the new entry sits alongside the existing `apps/web-shell/src/services/stacWriterIdb.ts` and `apps/web-shell/src/services/stacWriterCapability.ts` allowlist entries — see research.md §7) `shared/eslint-rules/no-direct-persistence-in-frontend.cjs`

**Checkpoint**: ESLint exception is in place. The exception is harmless on its own (it only matters once the adapter file exists), so `task lint` still passes here.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Ship the shared `ActiveStoryboardSelectionStore` interface, the `encodeMap` / `decodeMap` helpers, and the parameterised conformance test suite — every adapter and host-wiring task in Phases 3–5 imports from this code.

**⚠️ CRITICAL**: No user-story work can begin until Phase 2 is complete.

- [ ] T002 Create the typed interface and JSON-map helpers (`encodeMap(map): string` returning a stable string suitable for `@debrief/config` / `localStorage`; `decodeMap(raw): Record<ItemPath, StoryboardId>` enforcing data-model V-1 — non-string → empty map, malformed JSON → empty map, wrong-shape JSON → empty map; in all malformed cases emit one non-fatal log via the existing shared logger). Mirror the contract at `specs/237-active-storyboard-persistence/contracts/active-storyboard-selection-store.ts`; export the `ActiveStoryboardSelectionStore` interface, the `ItemPath` and `StoryboardId` brand types, and both helpers `shared/components/src/storyboard/activeStoryboardSelectionStore.ts`
- [ ] T003 [P][test] Write the parameterised conformance suite as an exported function `runActiveStoryboardSelectionStoreConformance(makeStore: () => ActiveStoryboardSelectionStore, harness: { corruptContainer(): void; simulateReadFailure(): void; simulateWriteFailure(): void; })` that asserts every numbered item in the contract's `_ConformanceContract` JSDoc (1 empty-read, 2 round-trip, 3 plot independence, 4 overwrite, 5 null-clears, 6 malformed-tolerance, 7 read-failure-tolerance, 8 write-failure-tolerance). Also include direct unit tests for `encodeMap` / `decodeMap` covering all V-1 malformed-input cases. The suite is consumed by both adapter test files in Phase 3 `shared/components/src/storyboard/__tests__/activeStoryboardSelectionStore.test.ts`
- [ ] T004 [P] Re-export `ActiveStoryboardSelectionStore`, `ItemPath`, `StoryboardId` from the storyboard barrel so both hosts can import via `@debrief/components` `shared/components/src/storyboard/index.ts`

**Checkpoint**: Interface, helpers, conformance suite, and barrel re-export are in place. Run `pnpm --filter @debrief/components test activeStoryboardSelectionStore` — the helper tests pass; the conformance suite is parameterised so it does not run standalone yet (it runs in Phase 3 against each real adapter). All Phase 3 work can now begin in parallel.

---

## Phase 3: User Story 1 — Reopened plot lands on the analyst's last-picked Storyboard (P1)

**Goal**: After an analyst overrides the active Storyboard via the side-rail header dropdown and then closes + reopens the plot, the panel reopens on that Storyboard — in either host. First-ever opens of plots the analyst has never switched away from continue to behave exactly as today (`getActiveStoryboardDefault()`).

**Independent Test**: Open a multi-storyboard fixture plot in the web-shell. Confirm the panel lands on the most-recently-modified Storyboard. Pick a different Storyboard via the dropdown. Reload the page. Verify the panel header still shows the picked Storyboard and the scene list reflects it. Repeat the close-reopen cycle a second time without further interaction; the picked Storyboard must still be selected.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium` binary and configures Playwright to use it. Do **not** route the user-visible test through openvscode-server / `xvfb-run`. Full details: `docs/project_notes/playwright-installation-research.md`.

This phase has two parallel tracks (VS Code wiring ‖ web-shell wiring) plus a final E2E. The two tracks share no files; they synchronise only at the Playwright spec.

### VS Code track — write-then-implement, sequenced

- [ ] T005 [P][test] [US1] Write VS Code adapter unit test that runs the Phase-2 conformance suite against a real `@debrief/config` fake (use a tmpdir-backed real config file via `@debrief/config`'s sync API, isolated per-test; reset between tests). Cover the 8 conformance assertions plus a VS-Code-specific case: when the underlying preference is set to a non-string by an unrelated code path, the next `get` returns `null` without throwing `apps/vscode/src/services/__tests__/activeStoryboardSelectionStoreVscode.test.ts`
- [ ] T006 [P] [US1] Implement the VS Code adapter — call `getPreference('activeStoryboardSelections', null)` / `setPreference('activeStoryboardSelections', encoded)` from `@debrief/config`, route reads through `decodeMap` and writes through `encodeMap`, catch any exception from the underlying lib and translate to the contract's silent-failure semantics (return `null` on read failure; swallow on write failure; one non-fatal log per failure mode per process lifetime) `apps/vscode/src/services/activeStoryboardSelectionStoreVscode.ts`
- [ ] T007 [P][test] [US1] Write a service-level happy-path test for `StoryboardPlaybackService` against an in-memory fake `ActiveStoryboardSelectionStore` (records calls, no real backend). Assertions: (a) on a fresh `onPlotOpened` with the store empty, `state.activeStoryboardId === getActiveStoryboardDefault(plot).properties.id` (preserves today's behaviour — SC-002); (b) after `setActiveStoryboard(documentUri, B)`, the store records `set(itemPath, B)`; (c) on a subsequent `onPlotOpened` for the same plot, `state.activeStoryboardId === B`; (d) the plot's `provenance` chain is byte-identical before and after the `setActiveStoryboard` write (FR-014). New file (no existing test for this service per research §2) `apps/vscode/src/services/__tests__/storyboardPlayback.persistence.test.ts`
- [ ] T008 [P] [US1] Wire persistence into `StoryboardPlaybackService`: (a) extend the constructor / DI signature to accept an `ActiveStoryboardSelectionStore` and an `itemPath` resolved from `EditSessionManager.resolveStoreContext(documentUri).itemPath`; (b) in `onPlotOpened` (around line 240–271), AFTER the existing `state.activeStoryboardId = active?.properties.id ?? null` (line 265), call `store.get(itemPath)` and if it returns a non-null Storyboard ID, overwrite `state.activeStoryboardId` (no V-2 validation in US1 — that lands in Phase 4); (c) in `setActiveStoryboard` (around line 360–374), AFTER the existing `state.activeStoryboardId = storyboardId` write (line 367), call `store.set(itemPath, storyboardId)`. Both calls are wrapped in try/catch as belt-and-braces (the adapter contract says it never throws, but the catch logs once if it ever does) `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T009 [P] [US1] Inject the `ActiveStoryboardSelectionStoreVscode` adapter and the per-plot `itemPath` at the construction site of `StoryboardPlaybackService` (search `apps/vscode/src/extension.ts` and the storyboard subscription wiring; the construction call is the same one that already injects `EditSessionManager`). The adapter is a singleton — instantiate once in the extension activator and pass it through `apps/vscode/src/extension.ts`

### Web-shell track — write-then-implement, sequenced

- [ ] T010 [P][test] [US1] Write the web-shell adapter unit test in a jsdom env that runs the Phase-2 conformance suite plus three browser-specific cases: (a) `localStorage.getItem` throwing `SecurityError` (e.g. private-mode certain browsers) → `get` returns `null`, no throw; (b) `localStorage.setItem` throwing `QuotaExceededError` → `set` returns normally, no throw; (c) `localStorage` containing a non-JSON string (manual corruption) → `decodeMap` falls back to empty map and the next `set` overwrites cleanly `apps/web-shell/src/services/__tests__/activeStoryboardSelectionStoreWebShell.test.ts`
- [ ] T011 [P] [US1] Implement the web-shell adapter — read/write `window.localStorage.getItem('debrief.activeStoryboardSelections')` / `setItem(...)`, route through `encodeMap` / `decodeMap`, catch `SecurityError` and `QuotaExceededError` (and any other exceptions) and translate to silent-failure semantics. The file imports `localStorage` only via the global; the Phase-1 ESLint exception entry is what allows this. Implements the shared `ActiveStoryboardSelectionStore` interface `apps/web-shell/src/services/activeStoryboardSelectionStoreWebShell.ts`
- [ ] T012 [P][test] [US1] Write an RTL component test for `StoryboardPanelMount` covering the happy path: (a) mount with an empty store — `activeStoryboardId` matches `getActiveStoryboardDefault(plot).properties.id` (US1#2 — preserves today's behaviour); (b) mount with a store seeded for `itemPath = P1` to Storyboard `B`, where `B` is in the plot — `activeStoryboardId` equals `B`; (c) on `onActiveStoryboardChange(C)`, `selectionStore.set(itemPath, C)` is called once before the next render; (d) on a single-Storyboard plot, the store's `get` is still allowed to return non-null without breaking the panel (Edge case from spec). Use a fake `ActiveStoryboardSelectionStore` injected via prop `apps/web-shell/src/__tests__/StoryboardPanelMount.persistence.test.tsx`
- [ ] T013 [P] [US1] Wire persistence into `StoryboardPanelMount`: (a) add `itemPath: string` and `selectionStore: ActiveStoryboardSelectionStore` props; (b) replace `const [activeOverrideId, setActiveOverrideId] = React.useState<string | null>(null)` (lines 189–191) with a `React.useState<string | null>` initialised by reading `selectionStore.get(itemPath)` once on first render, then a `useEffect` keyed on `(itemPath)` that re-reads the store when the plot changes (resets across plots — fixes the existing "override sticks across plot reloads" implicit bug noted in research §3); (c) in every `setActiveOverrideId(storyboardId)` call site (around lines 320–325 dropdown handler and line 361 post-create), follow with `selectionStore.set(itemPath, storyboardId)`; (d) keep the existing stale-override useEffect at lines 214–218 untouched — V-2 plot-membership validation lands in Phase 4 `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T014 [P] [US1] Construct the `ActiveStoryboardSelectionStoreWebShell` singleton at module init in `App.tsx` and thread `currentPlot.itemPath` plus the singleton into `<StoryboardPanelMount>` as the new `itemPath` and `selectionStore` props `apps/web-shell/src/App.tsx`

### E2E — synchronisation point

- [ ] T015 [test] [US1] Write the Playwright E2E for the happy-path workflow in the web-shell. Test: open a multi-storyboard fixture plot via the catalog picker (extend the existing `AnalysisPage` page-object — do NOT introduce a new page-object); read the default selection from `[data-testid="storyboard-active-name"]`; click the header dropdown; click a non-default Storyboard option; assert the active selection updates; reload the page (`page.reload()`); assert the dropdown still shows the chosen Storyboard and `[data-testid="storyboard-scene-row"]` rows belong to that Storyboard. Mirror the path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts` so the screenshots / GIF land directly under `specs/237-active-storyboard-persistence/evidence/screenshots/` `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts`
- [ ] T016 [US1] Run the Playwright E2E (`cd apps/web-shell && node run-playwright.mjs active-storyboard-persistence`). Confirm the happy-path scenario passes locally / in cloud. Capture the trace artefacts. The screenshot capture for the blog post is handled in Polish; this task is pass-confirmation only

**Parallel example for Phase 3** (two terminals / two agents):

```bash
# Terminal A — VS Code track
T005 → T006 → T007 → T008 → T009

# Terminal B — Web-shell track
T010 → T011 → T012 → T013 → T014

# Then both terminals join:
T015 → T016
```

**Checkpoint**: User Story 1 is fully functional and independently testable. The Playwright E2E proves the user-visible "open → switch → reload → still-switched" flow on the web-shell; the Vitest service test proves the same flow at the wiring level on the VS Code side. Tests for stale fallback (US2) and per-plot independence (US3) are not yet asserted — those land in Phase 4 and Phase 5.

---

## Phase 4: User Story 2 — Robust fallback when the remembered Storyboard is gone (P2)

**Goal**: When the persisted Storyboard ID is no longer present in the plot (deleted in another session, plot edited offline, etc.), the panel falls back to `getActiveStoryboardDefault()` silently — no banner, no toast, no modal — and the stale record self-heals on the next moment a fresh selection is established.

**Independent Test**: Pre-seed the store with a Storyboard ID NOT present in the fixture plot. Open the plot. Verify the panel shows the most-recently-modified surviving Storyboard (today's default rule) and no error UI is visible. Close and reopen; the persisted record now references the default Storyboard (or whatever the analyst overrode to).

This phase implements two additions on top of US1's wiring:

1. **V-2 plot-membership validation** — when `store.get(itemPath)` returns a non-null Storyboard ID, the host validates it is present in `plot.features` before using it. If not present, the host ignores the return value and falls back to `getActiveStoryboardDefault(plot)`.
2. **Self-heal write** — when the host falls back (because `get` returned `null` OR returned a stale ID), the host writes the chosen fallback Storyboard's ID to the store. This means the next reopen of the same plot finds a fresh, valid record without re-validating.

The two tracks (VS Code ‖ web-shell) run in parallel; the E2E adds one more scenario to the spec file from Phase 3.

- [ ] T017 [P][test] [US2] Extend the VS Code service-level test with three new assertions: (a) given a store seeded with Storyboard ID `STALE` that is NOT in the plot, `onPlotOpened` results in `state.activeStoryboardId === getActiveStoryboardDefault(plot).properties.id` (silent fallback — FR-006, SC-004); (b) the same fallback path causes a `store.set(itemPath, defaultId)` self-heal write before `onPlotOpened` returns (FR-007); (c) the fake store records no read or write that surfaces an exception to the caller, and the host emits no banner / toast / modal (verified by asserting no `vscode.window.showWarningMessage` or equivalent was called via spy) `apps/vscode/src/services/__tests__/storyboardPlayback.persistence.test.ts`
- [ ] T018 [P][test] [US2] Extend the web-shell RTL component test with: (a) mount with the store seeded to `STALE` (an ID not in the plot) — assert `activeStoryboardId === getActiveStoryboardDefault(plot).properties.id` and the fake store records `set(itemPath, defaultId)` once on mount (US2#1, US2#2); (b) mount with the store seeded but the plot containing zero Storyboards — assert the existing #235 empty-state UX renders unchanged and no persistence-specific element is in the DOM (US2#3 / Edge case); (c) DOM contains no `[data-testid="error-banner"]` (or whichever no-error selector the panel uses today) on the stale path `apps/web-shell/src/__tests__/StoryboardPanelMount.persistence.test.tsx`
- [ ] T019 [P] [US2] Add V-2 validation + self-heal write to `StoryboardPlaybackService.onPlotOpened`: after the US1 read, check `state.activeStoryboardId` is in `plot.features` (use the same iteration `getActiveStoryboardDefault` performs, or a small `findStoryboardById` helper); if it isn't, reset `state.activeStoryboardId` to `getActiveStoryboardDefault(plot)?.properties.id ?? null` and call `store.set(itemPath, state.activeStoryboardId)` to overwrite the stale record. The self-heal write is conditional: only fires when the resolved ID differs from what `store.get` returned (no redundant writes when the persisted value was already valid) `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T020 [P] [US2] Add V-2 validation + self-heal write to `StoryboardPanelMount`'s mount-time read effect: after `selectionStore.get(itemPath)`, validate the returned ID against `plot.features`; if absent, set `activeOverrideId` to `null` (so the existing fallback-via-`getActiveStoryboardDefault` path kicks in) and call `selectionStore.set(itemPath, getActiveStoryboardDefault(plot)?.properties.id ?? null)`. The conditional-write rule from T019 applies here too `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T021 [test] [US2] Add a second scenario to the Playwright spec file: pre-seed `localStorage["debrief.activeStoryboardSelections"]` via `page.addInitScript(...)` to map the fixture plot's `itemPath` to a Storyboard ID that does NOT exist in the fixture; load the plot; assert the dropdown shows the most-recently-modified surviving Storyboard's name; assert no error/banner element is visible; reload once more; assert `localStorage` now contains the default Storyboard's ID for that `itemPath` (self-heal verification) `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts`
- [ ] T022 [US2] Re-run the Playwright E2E suite to confirm both Phase-3 and Phase-4 scenarios pass (`cd apps/web-shell && node run-playwright.mjs active-storyboard-persistence`)

**Checkpoint**: User Story 2 is functional. Stale records resolve silently; the store self-heals. The panel UX from #235 is unchanged on the empty-state path. User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 — Independent persistence across plots (P3)

**Goal**: Each plot has its own pinned selection. Pinning Storyboard `B1` for plot `P1` does not affect plot `P2`'s pinned selection. Storyboards with the same name but different IDs (across plots) do not collide.

**Independent Test**: Pin `P1` to `B1` and `P2` to `B2`. In any open / close order, each plot reopens on its own pinned selection. Re-pin `P1` to `B1'`; `P2`'s record is unchanged.

US3 is structurally satisfied by the Phase-2 conformance suite — the adapter is keyed on `itemPath`, so per-plot independence is an invariant of the store, not behaviour to add. This phase consists of **one verification task** to ensure the conformance suite explicitly names the three US3 scenarios as test cases (rather than only covering them implicitly via the generic round-trip / overwrite assertions).

- [ ] T023 [test] [US3] Audit `activeStoryboardSelectionStore.test.ts` (the Phase-2 conformance suite from T003) and confirm three named test cases assert each US3 acceptance scenario: (a) `'US3#1 — set(p1, b1); set(p2, b2); get(p1) === b1; get(p2) === b2'`, (b) `'US3#2 — re-pinning p1 leaves p2 untouched'`, (c) `'US3#3 — same Storyboard names across plots do not collide (the store keys on (itemPath, storyboardId), not name)'`. If any of these is implicit / unnamed in T003, add it as a new `it(...)` block now. No production code changes in this phase `shared/components/src/storyboard/__tests__/activeStoryboardSelectionStore.test.ts`

**Checkpoint**: All three user stories are independently testable. The full feature is functional. The codebase is ready for evidence collection and PR creation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence, write the feature blog post, and open the PR. No code changes after this point unless review feedback warrants them.

### Pre-flight verification

- [ ] T024 Run the full pre-push CI pipeline (`task verify`) and confirm lint, typecheck, unit tests, and the new Playwright spec all pass. If any step fails, fix the underlying issue (do NOT skip hooks). This is the gate that guarantees Article VI / VI.4 / XV compliance before evidence capture

### Evidence Collection (REQUIRED)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium` binary. Full details: `docs/project_notes/playwright-installation-research.md`.

- [ ] T025 [P] Capture the test summary using the template at `.specify/templates/evidence/test-summary-template.md` — populate the YAML front matter (`feature: 237-active-storyboard-persistence`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and the body (totals plus the named scenarios from US1, US2, US3 — pulling counts from the most recent `task verify` run from T024) `specs/237-active-storyboard-persistence/evidence/test-summary.md`
- [ ] T026 [P] Create the usage example: a TypeScript snippet that imports `ActiveStoryboardSelectionStore` from `@debrief/components/storyboard`, shows a host-side mount-time read (`store.get(itemPath)`) and a dropdown-driven write (`store.set(itemPath, storyboardId)`), and a one-paragraph explanation of when each runs. Include a tiny reference to the user-facing flow ("close the plot, reopen it, the selection is restored — no UI change visible to the analyst") `specs/237-active-storyboard-persistence/evidence/usage-example.md`
- [ ] T027 [P] Run the web-shell Playwright spec with screenshot capture enabled (`cd apps/web-shell && node run-playwright.mjs active-storyboard-persistence`) and copy the produced screenshots into the feature evidence dir as `before-default-fallback.png` (the default-selection state from a fresh open) and `after-restored-selection.png` (the restored state after reload). Mirror the path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts` so the spec writes directly into the evidence dir `specs/237-active-storyboard-persistence/evidence/screenshots/`
- [ ] T028 [P] Capture the interaction GIF — record a < 5 s clip via Playwright's `recordVideo` showing: panel opens on default → analyst clicks dropdown → picks Storyboard B → page reloads → panel still on B. Convert to GIF with `ffmpeg` (target < 2 MB; common pattern: `ffmpeg -i recording.webm -filter_complex "[0:v] fps=12,scale=720:-1:flags=lanczos" -t 5 interaction.gif`). Save the GIF and discard the source `.webm` `specs/237-active-storyboard-persistence/evidence/screenshots/interaction.gif`
- [ ] T029 Document the web-shell E2E results — list the two Playwright scenarios (US1 happy path + US2 stale fallback), their pass/fail status, the screenshot index from T027 / T028, and a one-line traceability note for SC-001 / SC-004 / SC-005. Mirror the format used by other specs' `webview-e2e-summary.md` files in this repo `specs/237-active-storyboard-persistence/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T030 Spawn the Content Specialist (read `.claude/agents/media/content.md` first) and ask it to write the **Feature Post** for `media/shipped-post.md`. The agent MUST: (a) copy `## What We're Building`, `## How It Fits`, `## Key Decisions` **verbatim** from `evidence/opening-context.md`; (b) place the Hook (the before/after table from `opening-context.md`) at the very top with no `## Hook` heading; (c) write fresh `## Screenshots` (referencing T027 / T028 artefacts), `## By the Numbers` (from `evidence/test-summary.md`), `## Lessons Learned`, `## What's Next` sections; (d) populate front matter (`layout: future-post`, `title: "Building Active-Storyboard Selection Persistence"`, `track: [credibility]`, `author: Ian`, calculated `reading_time`, `excerpt` ≤ 150 chars, lowercase tags) `specs/237-active-storyboard-persistence/media/shipped-post.md`

### PR Creation

- [ ] T031 Create the PR and publish the blog post by running `/speckit.pr`. The command opens the feature PR in `debrief/debrief-future` (with the spec dir, evidence, and media all linked) and the cross-repo PR in `debrief/debrief.github.io` publishing `media/shipped-post.md`. Returns both PR URLs

**Task T031 must run last. It depends on every preceding task — every test passing, every evidence file written, and the feature post in place.**

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup, T001)** — no dependencies; can start immediately. Blocks Phase 3's web-shell adapter file (T011) — without the ESLint exception entry, that file's `localStorage` access fails `task lint`.
- **Phase 2 (Foundation, T002 → T003 ‖ T004)** — depends on Phase 1 completion. Blocks every adapter and host-wiring task in Phases 3–5 (they import the interface and the conformance suite).
- **Phase 3 (US1, T005–T016)** — depends on Phase 2 completion. The two host tracks (T005–T009 ‖ T010–T014) run in parallel; both must complete before T015 (the Playwright spec needs the web-shell wiring fully in place).
- **Phase 4 (US2, T017–T022)** — depends on Phase 3 completion. The two host tracks (T017 + T019 ‖ T018 + T020) run in parallel; T021 + T022 sync at the E2E.
- **Phase 5 (US3, T023)** — depends on Phase 2 (the conformance suite). Independent of Phases 3 and 4 in principle (the test it audits is at the adapter layer, not the host layer), but in practice runs after Phase 4 because the auditing task is cheap and the codebase is then known-green.
- **Phase 6 (Polish, T024–T031)** — depends on Phases 1–5. T024 gates evidence capture; T025–T029 run after T024; T030 reads the evidence dir; T031 runs last.

### Within-Phase Dependencies

**Phase 2** (`T002 → {T003, T004}`):
- T002 (interface + helpers) blocks both T003 (test imports the interface type) and T004 (re-export imports the interface).
- T003 ‖ T004 — different files, neither depends on the other.

**Phase 3** (two parallel tracks):
- VS Code track: `T005 → T006 → T007 → T008 → T009`. Strict TDD order — test first, then implementation, then service test, then service wiring, then injection at the construction site.
- Web-shell track: `T010 → T011 → T012 → T013 → T014`. Same TDD order.
- Both tracks independent: VS Code touches `apps/vscode/**`, web-shell touches `apps/web-shell/**`; the only shared code is in `shared/components/**` (already complete in Phase 2).
- Sync point: `{T009, T014} → T015 → T016`. The Playwright spec consumes the web-shell wiring; the run consumes the spec.

**Phase 4** (two parallel tracks again):
- VS Code: `T017 → T019`. Test first, then V-2 + self-heal in `storyboardPlayback.ts`.
- Web-shell: `T018 → T020`. Test first, then V-2 + self-heal in `StoryboardPanelMount.tsx`.
- Sync point: `{T019, T020} → T021 → T022`. Playwright spec extension consumes both V-2 implementations.

**Phase 6**:
- `T024 → {T025, T026, T027, T028}`. Pre-flight first; evidence captures run in parallel.
- `{T027, T028} → T029`. Web-shell E2E summary indexes the screenshot/GIF artefacts.
- `{T025, T026, T027, T028, T029} → T030`. Feature post reads from the evidence dir.
- `T030 → T031`. PR command requires `media/shipped-post.md` to exist.

### Parallel Opportunities

| Granularity | What can run in parallel |
|-------------|--------------------------|
| Phase 2 internal | T003 ‖ T004 (after T002) |
| Phase 3 cross-host | The five-task VS Code chain (T005 → T009) ‖ the five-task web-shell chain (T010 → T014). Mark each task `[P]` to show this. |
| Phase 4 cross-host | T017 + T019 (VS Code) ‖ T018 + T020 (web-shell) |
| Phase 6 evidence | T025 ‖ T026 ‖ T027 ‖ T028 (all write to different files under `evidence/`) |

### Critical Path

T001 → T002 → T003 → T013 → T014 → T015 → T016 → T020 → T021 → T022 → T024 → T029 → T030 → T031

(13 sequential steps; everything else parallelises off this path.)

### Independent Test Criteria — recap

- **US1 independent test**: Open a multi-storyboard plot, pick a non-default Storyboard, reload, verify the picked Storyboard is selected. Test file: `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` happy-path scenario (T015) + the VS Code service test (T007).
- **US2 independent test**: Pre-seed the store with a Storyboard ID not in the plot; open; verify the panel falls back silently to `getActiveStoryboardDefault()` and the stale entry self-heals on the next open. Test file: same Playwright spec (T021 stale-fallback scenario) + the V-2 + self-heal Vitest assertions (T017, T018).
- **US3 independent test**: Set distinct selections for two plots; flip between them; verify each retains its own. Test file: `shared/components/src/storyboard/__tests__/activeStoryboardSelectionStore.test.ts` US3-named conformance assertions (T023).

---

## Implementation Strategy

### Incremental Delivery

The PR is shippable at every checkpoint. Each phase is a complete, verifiable increment:

1. **After Phase 2** — the interface, helpers, and conformance suite exist; both hosts still behave exactly like today (no host wiring yet). The PR could merge here (as a no-op refactor preparing for #237's wiring) without changing user-visible behaviour.
2. **After Phase 3** — happy-path persistence works end-to-end. An analyst on either host can pick a non-default Storyboard, close the plot, reopen it, and find the same Storyboard selected. Stale records (Storyboard deleted in another session) would fail awkwardly here, so this is "merge-on-demo-day-only" rather than "merge-to-main".
3. **After Phase 4** — robustness in. Stale records resolve silently and self-heal. The PR is ready for main.
4. **After Phase 5** — multi-plot independence is explicitly tested (it was always implicitly correct).
5. **After Phase 6** — evidence captured, blog post written, PR opened.

### Recommended Order (Single Implementer)

The quickstart's suggested order, expanded with the task IDs:

1. T001 (1 task — ESLint exception, < 5 min).
2. T002 → T003 → T004 (Phase 2; ~30 min including writing the conformance suite).
3. T005 → T006 (VS Code adapter, ~30 min).
4. T010 → T011 (Web-shell adapter, ~30 min).
5. T007 → T008 → T009 (VS Code wiring, ~45 min including the `extension.ts` injection site).
6. T012 → T013 → T014 (Web-shell wiring, ~45 min).
7. T015 → T016 (Playwright happy path, ~30 min including fixture).
8. T017 → T019 ‖ T018 → T020 (V-2 + self-heal, ~30 min).
9. T021 → T022 (Stale-fallback E2E, ~20 min).
10. T023 (US3 audit, ~10 min).
11. T024 (Pre-flight, must pass before evidence).
12. T025 ‖ T026 ‖ T027 ‖ T028 (Evidence in parallel, ~30 min).
13. T029 → T030 (Summary + blog, ~30 min).
14. T031 (PR command).

**Total**: 31 tasks, single-implementer estimate ~5 hours of focused work plus review time.

### Parallel Team Strategy

With two implementers (one per host):

1. Both: T001 → T002 → T003 → T004 (Phase 2 jointly).
2. Implementer A (VS Code): T005 → T006 → T007 → T008 → T009.
3. Implementer B (Web-shell): T010 → T011 → T012 → T013 → T014.
4. Implementer B (still web-shell, since the spec lives in the web-shell tree): T015 → T016.
5. Both: T017 → T019 ‖ T018 → T020 (each implementer adds V-2 to their own host).
6. Implementer B: T021 → T022.
7. Either: T023, then Polish (T024 onwards).

### Risk Notes

- **Risk: forgetting to thread `itemPath` through `App.tsx` (T014)** — this is the single most likely "looks done in component tests but breaks at runtime" failure mode. The Playwright E2E (T015) catches it; do not skip the E2E.
- **Risk: the existing web-shell stale-override useEffect (lines 214–218) interacting badly with the new mount-time read (T013)** — the cleanest fix is to keep the existing useEffect untouched in Phase 3 and let it co-exist with the V-2 validation added in Phase 4 (T020). If this causes test flakiness in T012, refactor to consolidate the validation paths in T020 (not earlier).
- **Risk: `task lint` fails the moment T011 lands** — this is exactly what T001 prevents. If you skip Setup, you'll see this failure on T011. If it occurs unexpectedly, double-check `shared/eslint-rules/no-direct-persistence-in-frontend.cjs` lists the exact path of the new adapter file.
- **Risk: VS Code `extension.ts` construction site is non-obvious** — research §2 noted the lifecycle hook that constructs `StoryboardPlaybackService` was not visible in the surface scan. T009 includes "search `apps/vscode/src/extension.ts` and the storyboard subscription wiring"; budget ~10 minutes for this if it's not already obvious. The fallback if the construction site cannot be located in the time budget is to make the adapter lazily-instantiated inside the service itself, but this is a last resort — DI from the activator is preferred.

### What you do NOT need to do (recap from quickstart.md)

- Modify `getActiveStoryboardDefault`. It stays pure.
- Modify the shared `StoryboardPanel` React component. It stays prop-driven.
- Modify the LinkML schema or any generated type artefacts. None of those see this feature.
- Add a "pinned" / "clear pin" UI affordance. Spec Out-of-Scope.
- Add a provenance entry on selection change. Spec FR-014 — explicitly verified by T007 assertion (d).
- Add a feature flag. The behaviour is a strict superset of today (first-open with empty store === today's behaviour).
