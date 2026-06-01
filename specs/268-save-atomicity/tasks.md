# Tasks: Atomic (Transactional) Plot Save

**Feature**: 268-save-atomicity · **Branch**: `claude/eloquent-fermi-bzLml` (spec dir `268-save-atomicity`)
**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/](./contracts/)

TypeScript-only feature (no Python change). Work concentrates at the `@debrief/stac-writer` boundary and its two adaptors, with thin call-site edits in each host's save command and open path.

## Evidence Requirements

**Evidence Directory**: `specs/268-save-atomicity/evidence/`
**Media Directory**: `specs/268-save-atomicity/media/`

This is an **infrastructure / reliability** feature with **no new UI** (the only user-visible surface is a non-blocking recovery notice that reuses existing host notification APIs). Evidence is therefore test- and document-driven; the credibility artifact is the fault-injection matrix proving every interruption point resolves to a coherent plot.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest results across the new adaptor + host tests (uses test-summary template, YAML front matter) | After all tests pass |
| `evidence/usage-example.md` | Walkthrough: a save that fails mid-write leaves the plot intact; an interrupted save auto-recovers on open | After US1+US3 complete |
| `evidence/fault-injection-matrix.md` | Table mapping each injected failure point (stage / journal / apply, per host) → observed coherent outcome (SC-001/002/003/005) | After US1+US3 tests |
| `evidence/opening-context.md` | Cached blog opener (mermaid Hook) — **already created during /speckit.plan** | Done |
| `media/shipped-post.md` | Feature post: cached opener (verbatim first 3 sections) + ship-time evidence | Polish phase |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions) | During /speckit.plan (done) |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR #658 in debrief-future (already open on this branch) — updated with evidence | Final task |
| Blog PR | PR in debrief.github.io with shipped-post.md | Triggered by /speckit.pr |

## Phase 1: Setup

Documents the design decision and provides the shared fault-injection scaffolding the story phases reuse. No new package or build config.

- [x] T001 Record an ADR for the filesystem **save-journal / commit-marker** decision (stage → journal → apply → clear; reconcile rolls back before the journal, forward after) with the rejected alternatives from research.md `docs/project_notes/decisions.md`
- [x] T002 [P] Add a shared host-level fault-injection helper — a `StacWriter` wrapper that throws a `StacWriterError` on the Nth underlying write — for the saveSession/open integration tests `apps/vscode/tests/unit/helpers/saveFaultInjection.ts`

**Checkpoint**: design recorded; test scaffolding ready. (Adaptor-internal tests inject failures at the `node:fs` / IndexedDB seam inline — see their tasks.)


## Phase 2: Foundation (blocks all stories)

Extend the shared boundary contract. After this phase the monorepo type-checks with the new interface members stubbed everywhere; the two real adaptors get real implementations in the story phases.

**⚠️ No story can be implemented until this phase is complete** — both adaptors and both call sites depend on the interface and the `SaveJournal` shape.

- [x] T003 Add `commitPlotSave` + `reconcilePlotSave` method signatures and the `CommitPlotSaveInput`/`CommitPlotSaveResult`/`ReconcilePlotSaveInput`/`ReconcilePlotSaveResult` types to the `StacWriter` interface, matching `contracts/stac-writer-commit.ts` — `thumbnails` MUST be `Pick<WritePlotThumbnailPairInput, 'largePngBase64' | 'smallPngBase64'>` (Article IV.5, no re-listing) `shared/stac-writer/src/interface.ts`
- [x] T004 [P] Add the internal FS-only `SaveJournal` type (`version`, `stacItemPath`, `createdAtMs`, `renames[]`) and a typed `parseSaveJournal()` validator that narrows untyped JSON with no `any` (Article XV.5) `apps/vscode/src/services/saveJournal.ts`
- [x] T005 Add stub implementations of `commitPlotSave`/`reconcilePlotSave` (throwing "not yet implemented") to every non-adaptor `StacWriter` test double / mock so the workspace type-checks; find them with a search for `satisfies StacWriter` / `: StacWriter` — NONE found (all test doubles use `Partial<StacWriter>` or the `saveFaultInjection` Proxy, which auto-covers new methods)
- [x] T006 [P][test] Type-contract test asserting `CommitPlotSaveInput.thumbnails` stays structurally derived from `WritePlotThumbnailPairInput` (compile-time `Pick` guard) so the boundary type cannot silently drift `shared/stac-writer/src/__tests__/commitPlotSave.types.test.ts`

**Checkpoint**: interface extended, `SaveJournal` typed, workspace green (`pnpm -r typecheck`).


## Phase 3: User Story 1 — A failed save never corrupts my plot (P1)

**Goal**: `commitPlotSave` commits the whole save unit atomically on both hosts, so a failure at any write step leaves the plot observable as exactly one coherent version (FR-001/002/003/004/010).

**Independent test**: Drive a save while injecting a failure at each distinct write step (feature collection, item metadata, each thumbnail). After every injected failure, read the item back and assert it loads as exactly one coherent version, with features and metadata/thumbnails agreeing; a pre-commit failure leaves the previous version byte-identical.

### Tests (write first — Article VII)

- [ ] T007 [P][test] FS `commitPlotSave` atomicity tests — against a real temp dir (`fs.mkdtempSync`), inject a failure at each phase (stage / journal-write / apply-rename); assert: pre-commit failure → originals byte-identical + no stray `.tmp`; success → features.geojson + item.json (with thumbnail asset entries) + both PNGs all reflect the new state; covers contract C1/C2 `apps/vscode/tests/unit/stacWriterFs.commitPlotSave.test.ts`
- [ ] T008 [P][test] IDB `commitPlotSave` atomicity tests — with `fake-indexeddb`, spy on `db.transaction` to assert exactly **one** transaction per save; abort it and assert the store is byte-identical to before; success commits item record + geojson payload together; covers contract C4 `apps/web-shell/src/services/__tests__/stacWriterIdb.commitPlotSave.test.ts`

### Implementation

- [ ] T009 Implement `commitPlotSave` in the FS adaptor: build the updated `item.json` (existing thumbnail-asset logic + ensure the features asset entry), stage every artefact as `<name>.<token>.tmp` via the existing `atomicWriteSync` temp step, atomically write the `SaveJournal` (the commit point), apply the `temp → final` renames, delete the journal; on any pre-journal failure delete the temps and throw (originals untouched) `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T010 Implement `commitPlotSave` in the IDB adaptor: open one `readwrite` transaction over `items` + `payloads` + `assets` + `meta`, enqueue the item record + geojson payload (+ any binary assets), `await tx.done`; route the bundled-plot edit case through the already-atomic `patchItem` logic inside the same transaction (resolves research open-item #1) `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T011 Route the VS Code save through `commitPlotSave`: replace the raw `storeFeatureCollection` (`fs.writeFileSync`) and the separate `storeThumbnails` call with a single `await writer.commitPlotSave({ ctx, stacItemPath, featureCollection, thumbnails? })`; thumbnail **capture** failure stays non-fatal (omit `thumbnails`). This moves the feature-collection write onto the boundary (FR-004 / Article IV.2) `apps/vscode/src/commands/saveSession.ts`
- [ ] T012 Route the web-shell save through `commitPlotSave`: replace the sequential `writeItem()` + `writeAsset()` pair with one `commitPlotSave(...)` `apps/web-shell/src/mocks/stacService.ts`
- [ ] T013 [P] Align `captureScene`'s feature-collection write onto the atomic boundary — have `defaultWriteFeatureCollection` delegate to `commitPlotSave` (thumbnails omitted), or record in the ADR why scene-capture is deferred (resolves research open-item #2) `apps/vscode/src/commands/captureScene.ts`

### Story integration test

- [ ] T014 [P][test] saveSession integration — inject a writer failure (reuse `saveFaultInjection` + the `ReadOnlyFilesystemError` sim); assert the previously-persisted plot still opens unchanged and no partial is observable `apps/vscode/tests/unit/saveSession.commit.test.ts`

**Checkpoint**: a save is all-or-nothing on both hosts; catchable failures never corrupt the plot. US1 independently testable.


## Phase 4: User Story 2 — Honest reporting and a safe retry (P2)

**Goal**: Success is reported only after the whole save commits; on failure the analyst sees a clear failure, the unsaved-changes indicator stays set, and the previous version is intact (FR-005/006).

**Independent test**: Inject a failure during a save and assert (a) a failure is surfaced, (b) the dirty indicator remains set, (c) no success message appears, (d) the previous plot still opens. On a clean save, assert success fires exactly once, after commit.

**Depends on**: Phase 3 (the save now routes through `commitPlotSave`, which resolves/rejects honestly).

### Tests (write first)

- [ ] T015 [P][test] saveSession reporting-order tests — assert `markClean()` and the "Plot saved" message fire **only after** `commitPlotSave` resolves, and that a rejected commit leaves the dirty flag set, surfaces a failure message, and shows no success message; covers contract C3 (SC-003) `apps/vscode/tests/unit/saveSession.reporting.test.ts`

### Implementation

- [ ] T016 Move `markClean()` and the "Plot saved" `showInformationMessage` to **after** the `commitPlotSave` `await` resolves; in the catch path surface a clear failure (`showErrorMessage`) and leave the dirty state untouched so the analyst can retry `apps/vscode/src/commands/saveSession.ts`
- [ ] T017 Mirror honest reporting in the web-shell save-result handler — only mark the tab saved / clear the dirty marker when `commitPlotSave` resolves; on rejection surface the existing failure toast and keep the tab dirty `apps/web-shell/src/App.tsx`

**Checkpoint**: "Plot saved" is trustworthy; a failed save is honest and retryable on both hosts. US2 independently testable.


## Phase 5: User Story 3 — Coherent plot after an interrupted save (P3)

**Goal**: An uncatchable interruption (crash / OOM / power loss) is healed on next open — `reconcilePlotSave` runs before the read, auto-restoring the last good version (pre-commit) or completing the new one (post-commit), with a non-blocking notice when it acts (FR-007/008, Clarifications Q2/Q3).

**Independent test**: Seed the on-disk/on-store state in each mid-save condition (temps but no journal; journal present with renames pending; clean), open the plot, and assert it resolves to a single coherent state and that any recovery is reported non-blockingly and leaves no `.tmp`/journal behind.

**Depends on**: Phase 2 (`SaveJournal` shape) and Phase 3 (FS commit writes the journal `reconcile` consumes).

### Tests (write first)

- [ ] T018 [P][test] FS `reconcilePlotSave` tests — seed each leftover condition in a temp dir: temps + no journal → `rolled-back` (originals kept, temps gone); journal + pending renames → `rolled-forward` (new version, journal gone); clean → `clean` no-op; assert idempotency (second call is `clean`) and that nothing partial is ever read; covers contracts C3/C5 (SC-002) `apps/vscode/tests/unit/stacWriterFs.reconcile.test.ts`
- [ ] T019 [P][test] IDB `reconcilePlotSave` tests — clean store → `{ recovered:false, outcome:'clean' }`, mutates nothing; optional orphan-overlay prune path `apps/web-shell/src/services/__tests__/stacWriterIdb.reconcile.test.ts`

### Implementation

- [ ] T020 Implement `reconcilePlotSave` in the FS adaptor: inspect the item dir for a `SaveJournal` and/or stray `.tmp` files; no journal → delete temps, keep originals (`rolled-back`); journal present → re-apply pending `temp → final` renames idempotently then delete the journal (`rolled-forward`); clean → no-op; return `{ recovered, outcome }` `apps/vscode/src/services/stacWriterFs.ts`
- [ ] T021 Implement `reconcilePlotSave` in the IDB adaptor: return `clean` (IndexedDB never exposes partial transaction state); optionally prune an orphaned overlay-only record and report `rolled-back` `apps/web-shell/src/services/stacWriterIdb.ts`
- [ ] T022 Wire reconcile into the VS Code open path **before** `loadPlotData` (`openPlot.ts:155`); when `recovered`, show a non-modal `vscode.window.showWarningMessage('Recovered an interrupted save — opened the last good version of this plot.')` `apps/vscode/src/commands/openPlot.ts`
- [ ] T023 Wire reconcile into the web-shell open path **before** the `catalogReadView` read; on `recovered`, surface the existing non-blocking toast `apps/web-shell/src/services/catalogReadView.ts`

### Story integration test

- [ ] T024 [test] Open-path integration — seed an "interrupted save" fixture (staged temps + journal), open the plot, assert it hydrates coherently and the recovery notice fired once `apps/vscode/tests/unit/openPlot.reconcile.test.ts`

**Checkpoint**: every interruption point resolves to a coherent plot on reopen, with a quiet notice. US3 independently testable. All three stories complete.


## Phase 6: Polish & Cross-Cutting Concerns

**Depends on**: Phases 3–5 complete.

### Verification

- [ ] T025 Run the full gate (`task verify` = ruff + pyright + ESLint + tsc + pytest + vitest); all green before evidence capture. Confirm SC-004 informally (a normal save still feels instant) and confirm no Article IV ESLint regression
- [ ] T026 [test] Web-shell happy-path E2E smoke — edit a plot, **Save**, reopen, assert it loads coherently with the new state (regression guard for FR-011; no fault injection — that lives in unit/integration) `apps/web-shell/playwright/tests/save-atomicity.spec.ts`

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip T026. The project bundles Linux Chromium via `@sparticuz/chromium`; the CDN download 403 is expected and worked around. Run `cd apps/web-shell && node run-playwright.mjs save-atomicity`. Details: `docs/project_notes/playwright-installation-research.md`.

### Evidence Collection

- [ ] T027 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct`); body notes the SC-004 save-duration observation `specs/268-save-atomicity/evidence/test-summary.md`
- [ ] T028 Create the usage demonstration — a save that fails mid-write leaving the plot intact, and an interrupted save auto-recovering on open (code/test excerpts + expected behaviour) `specs/268-save-atomicity/evidence/usage-example.md`
- [ ] T029 [P] Capture the fault-injection matrix — a table of each injected failure point (stage / journal / apply × VS Code fs and web-shell idb) → observed coherent outcome, citing the tests that prove it (SC-001/002/003/005) `specs/268-save-atomicity/evidence/fault-injection-matrix.md`

### Media Content

- [ ] T030 Create the feature blog post via the Content Specialist agent — copy `What We're Building` / `How It Fits` / `Key Decisions` **verbatim** from `evidence/opening-context.md`, lift the mermaid Hook to the top, and write `By the Numbers` (from test-summary), `Lessons Learned`, `What's Next` from evidence; track `[credibility]` `specs/268-save-atomicity/media/shipped-post.md`

### PR Creation

- [ ] T031 Create PR and publish blog: run `/speckit.pr` (updates the existing feature PR #658 with evidence and opens the debrief.github.io blog PR)

**Task T031 must run last** — it depends on every evidence and media task above being complete.


## Dependencies

**Phase order**: Setup (1) → Foundation (2) → US1 (3) → US2 (4) → US3 (5) → Polish (6).

**Hard dependencies**:
- **Foundation (T003–T006) blocks everything** — the interface members and `SaveJournal` type must exist (with stubs, T005) before any adaptor or call-site edit compiles.
- **US2 (P2) depends on US1 (P1)** — honest reporting (T015–T017) wraps the `commitPlotSave` call that US1 introduces.
- **US3 (P3) depends on US1 (P1)** — the FS `reconcilePlotSave` (T020) consumes the `SaveJournal` that FS `commitPlotSave` (T009) writes; they must share one journal format (defined in T004).
- **Within each story: tests precede implementation** (Article VII) — T007/T008 before T009–T013; T015 before T016/T017; T018/T019 before T020–T023.
- **Polish (Phase 6) depends on US1–US3**; **T031 (`/speckit.pr`) is last** and depends on all evidence + media tasks.

**Story completion order**: US1 → US2 → US3 (priority order, which is also the natural build order: engine → honest reporting → recovery). Each story is independently testable at its checkpoint; US1 alone already delivers the core "a failed save never corrupts" guarantee for catchable failures.

**Parallel opportunities**:
- Setup: T002 ‖ T001.
- Foundation: T004 ‖ T006 (T003 first; T005 after T003).
- US1 tests: T007 (fs) ‖ T008 (idb). US1 impl: T009 (fs) ‖ T010 (idb) — different files; the two call-site routings T011/T013 (vscode, different files) ‖ T012 (web-shell). T014 ‖ once T011 lands.
- US3 tests: T018 (fs) ‖ T019 (idb). US3 impl: T020 (fs) ‖ T021 (idb); T022 (vscode open) ‖ T023 (web-shell open).
- Polish: T029 ‖ T027/T028 (after tests pass).
- **Not parallel**: T011 and T016 both edit `saveSession.ts` (US1 routing then US2 reporting-order) — sequential. T009 and T020 both edit `stacWriterFs.ts` — sequential. T010 and T021 both edit `stacWriterIdb.ts` — sequential.


## Implementation Strategy

**MVP = Foundation + US1.** Extending the boundary (Phase 2) and delivering `commitPlotSave` on both hosts (Phase 3) is the smallest shippable increment that closes the core defect: a save becomes all-or-nothing and the feature-collection write moves onto the boundary. It is independently testable and independently valuable — stop here and the headline corruption risk for *catchable* failures is gone.

**Then layer US2, then US3.** US2 (honest reporting) is a thin, high-trust follow-up on top of US1 — small edits in the two host save handlers. US3 (reconcile-on-open) adds resilience to *uncatchable* interruptions; it is the rarer-but-nastier case (P3) and builds on the journal US1 already writes.

**Test-first throughout.** The fault-injection acceptance tests *are* the definition of done (contracts C1–C5 ⇄ SC-001..005). Write each story's tests before its implementation; a story's checkpoint is "its tests are green and it is independently demonstrable."

**Boundary discipline.** All persistence stays behind `StacWriter` (Article IV.4); the only frontend changes are *orchestration* (which writer call, when to report success, when to reconcile) — no frontend touches `fs`/IndexedDB directly. Keep `CommitPlotSaveInput.thumbnails` structurally derived (T006 guards this) so the save unit can't silently drop fields as the thumbnail input grows (Article IV.5 / ADR-033).

**Durability target is deliberate.** Do not add fsync/durability machinery (Clarifications Q3) — the guarantee is atomicity/coherence; the existing best-effort temp→rename and IndexedDB transaction suffice. This keeps US3 simple: reconcile only ever has to choose *which coherent version*, never repair a torn one.

**Incremental delivery checkpoints**: after Phase 2 (workspace green, interface extended) → after Phase 3 (MVP: atomic save, both hosts) → after Phase 4 (trustworthy success/failure) → after Phase 5 (crash-resilient) → after Phase 6 (evidence + blog + PR).

