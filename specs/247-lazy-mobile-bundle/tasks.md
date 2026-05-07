# Tasks: Lazy-load Backlog Navigator mobile component tree

**Input**: Design documents from `/specs/247-lazy-mobile-bundle/`
**Prerequisites**: spec.md ✓, plan.md ✓, research.md ✓, data-model.md ✓, contracts/bundle-budget-cli.md ✓, evidence/opening-context.md ✓

**Tests**: Yes — both unit tests (Vitest) and Playwright E2E are required by plan.md and spec FR-009.

**Organization**: Tasks follow plan.md's Project Structure. The bundle-guard contract change (Phase 1) lands first because it must be in place before re-baselining. The split itself (Phase 2) follows. Polish + evidence + PR live in Phase 3.

---

## Phase 1 — Bundle-guard contract change (lands first)

- [ ] T101 Enable Vite manifest emission in `apps/backlog-navigator/vite.config.ts` (set `build.manifest = true` inside the `build` block).
- [ ] T102 Rewrite `scripts/check-bundle-size.mjs` to read `apps/backlog-navigator/dist/.vite/manifest.json`, identify the single `isEntry: true` chunk, gzip-measure it alone against the baseline, and print all chunks with `(entry)` / `(lazy)` annotations. Preserve exit codes (0/1/2). See `contracts/bundle-budget-cli.md`.
- [ ] T103 [test] Create `scripts/__tests__/check-bundle-size.test.mjs` covering the six contract cases (within-budget, over-budget, no entry, multi-entry, missing manifest, lazy chunks listed) using fixture manifests under `scripts/__tests__/fixtures/manifests/`.

## Phase 2 — Lazy boundaries

- [ ] T201 Create `apps/backlog-navigator/src/components/lazy/MobileSkeleton.tsx` (skeleton card list reusing `@debrief/components`'s `SkeletonLoader` shimmer).
- [ ] T202 Create `apps/backlog-navigator/src/components/lazy/ChunkErrorBoundary.tsx` (class-component error boundary with `isChunkLoadError` predicate and Reload button per `data-model.md` Entity 3).
- [ ] T203 Add `lazy` namespace to `apps/backlog-navigator/src/strings.ts` with `chunkErrorTitle`, `chunkErrorMessage`, `chunkErrorReload`, `skeletonAriaLabel`.
- [ ] T204 Convert mobile imports in `apps/backlog-navigator/src/App.tsx` to `React.lazy` (`CardList`, `MobileFilterBar`, `StickyPushBar`) and wrap the `isMobile` render branch in `<ChunkErrorBoundary><Suspense fallback={<MobileSkeleton/>}>…</Suspense></ChunkErrorBoundary>`.
- [ ] T205 Convert mobile editor imports in `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx` to `React.lazy` (`BottomSheetEditor`, `DescriptionEditorScreen`) and gate their mount on `isMobile`, wrapped in `<Suspense fallback={null}>`.
- [ ] T206 [test] Create `apps/backlog-navigator/src/__tests__/lazyBoundary.test.tsx` — assert Suspense fallback (`MobileSkeleton`) renders synchronously and resolves to the real components.
- [ ] T207 [test] Create `apps/backlog-navigator/src/__tests__/chunkErrorBoundary.test.tsx` — assert the boundary catches a `ChunkLoadError` and renders the recovery panel; non-chunk errors re-throw.

## Phase 3 — Verification, re-baseline, evidence, PR

- [ ] T301 [test] Create `apps/backlog-navigator/e2e/mobile/lazy-mobile-chunk.mobile.spec.ts` covering the four scenarios in plan.md (cold mobile shows skeleton then card list; cold desktop never requests mobile chunk; chunk-fetch failure shows recovery banner; viewport resize lazy-loads chunk). Use `mockGithubBacklogFetch` for backlog data; capture skeleton screenshot to `specs/247-lazy-mobile-bundle/evidence/screenshots/`.
- [ ] T302 Build navigator (`pnpm --filter @debrief/backlog-navigator build`), inspect `dist/.vite/manifest.json` to confirm a separate mobile chunk exists, and confirm the entry chunk does not contain `BottomSheetEditor`/`DescriptionEditorScreen`/`MobileFilterBar`/`StickyPushBar`/`CardList` identifiers (see quickstart §3).
- [ ] T303 Re-baseline `scripts/bundle-baseline-244.json`: replace `baseline_bytes`, `baseline_files`, `commit_sha`, `captured_at`, and append a note referencing #247 explaining the entry-chunk-only contract.
- [ ] T304 Run `task verify` (lint + typecheck + tests). All steps must pass.
- [ ] T305 Run Playwright suite via `cd apps/backlog-navigator && node run-playwright.mjs lazy-mobile-chunk` and capture the skeleton screenshot to `specs/247-lazy-mobile-bundle/evidence/screenshots/`.
- [ ] T306 Capture evidence: `specs/247-lazy-mobile-bundle/evidence/test-summary.md` (using `.specify/templates/evidence/test-summary-template.md`), `evidence/usage-example.md` (cold-mobile-load + bundle-guard transcript), `evidence/bundle-measurements.md` (pre/post entry-chunk gzipped numbers, drop %).
- [ ] T307 Create feature blog post in `specs/247-lazy-mobile-bundle/media/shipped-post.md` via the Content Specialist agent, reusing the verbatim opener from `evidence/opening-context.md`.
- [ ] T308 Commit work in two coherent commits — (a) bundle-guard contract change + new test fixtures, (b) lazy split + tests + evidence + post — and push to the branch.
- [ ] T309 Create PR + publish blog: run /speckit.pr

---

## Dependencies

- T101 must precede T102/T103 and T303 (manifest must exist before guard can read it; baseline must reflect post-split entry chunk).
- T201/T202/T203 are siblings (parallelisable) but must precede T204/T205.
- T204/T205 are tightly related (the split is incomplete without both); land them in one commit.
- T301 depends on T204+T205 (Playwright needs the lazy boundary live in dev preview).
- T302/T303 depend on a successful build (T204+T205).
- T304/T305 depend on every code change above.
- T306 depends on T304/T305 outputs.
- T307 depends on T306 (post needs the measurement numbers + screenshot).
- T308/T309 depend on everything else.

## Parallel opportunities

- T201, T202, T203 [P]
- T206, T207 [P] once Phase 2 components exist
- T103 [P] alongside T101/T102 once the script API is settled

## Evidence Requirements (per Quality Rubric)

This is an **Infrastructure** + **UI Component** hybrid feature.

- **test-summary.md** — REQUIRED, with YAML front matter
- **usage-example.md** — REQUIRED (CLI guard transcript + cold-mobile-load description)
- **bundle-measurements.md** — REQUIRED (SC-001/SC-002 evidence — pre/post entry-chunk gzipped sizes, headroom restored)
- **screenshots/cold-mobile-skeleton.png** — REQUIRED (the user-visible skeleton, captured by Playwright)
- **screenshots/recovery-banner.png** — RECOMMENDED (chunk-fetch failure UX)
