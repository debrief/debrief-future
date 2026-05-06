# Implementation Plan: Lazy-load Backlog Navigator mobile component tree

**Branch**: `247-lazy-mobile-bundle` (active-feature; session branch is `claude/speckit-specify-247-gOgp9`) | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/247-lazy-mobile-bundle/spec.md`

## Summary

Code-split the Backlog Navigator's mobile component subtree (`apps/backlog-navigator/src/components/mobile/*`) so the **desktop entry chunk no longer ships mobile-only modules**. The split is implemented with `React.lazy()` + `<Suspense>` at two call-sites — `App.tsx` (the main mobile layout: `CardList`, `MobileFilterBar`, `StickyPushBar`) and `editors/EditorOverlayProvider.tsx` (the on-demand mobile editors: `BottomSheetEditor`, `DescriptionEditorScreen`) — backed by an error boundary that surfaces a recovery message if the mobile chunk fails to load. A skeleton fallback (reusing the shimmer styling already shipped in `@debrief/components`'s `LogPanel/SkeletonLoader`) covers the cold-mobile-load gap. Critically, the existing bundle-size guard at `scripts/check-bundle-size.mjs` is updated to measure the **desktop entry chunk** (resolved via Vite's build manifest) rather than summing every JS file in `dist/assets/*` — without this change, the guard would mechanically still see the same total bytes after the split and the spec's intent (FR-007) would be defeated.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory per Constitution Article XV); React 18.x; Node 20.x (Vite 5 build host).
**Primary Dependencies**: React 18.x (`React.lazy`, `Suspense`, error boundaries), Vite 5.x (manifest emission + chunk splitting via dynamic imports), `vite-plugin-pwa` ^0.20.5 (already configured in `apps/backlog-navigator/vite.config.ts`; default `globPatterns` already covers `**/*.js` so the new chunk is precached automatically), `@debrief/components` (existing `SkeletonLoader` shimmer primitive at `shared/components/src/LogPanel/SkeletonLoader.tsx` is reused). **No new runtime or dev dependencies.**
**Storage**: N/A (build/runtime feature; no persistence touched).
**Testing**: Vitest (existing unit-test runner for `@debrief/backlog-navigator`); Playwright via `apps/backlog-navigator/run-playwright.mjs` (cold-load + chunk-failure + viewport-transition E2E); a new Vitest unit test for the bundle-budget guard's manifest-aware logic.
**Target Platform**: Browser (PWA) — desktop ≥1024px viewport (entry chunk only); mobile <1024px viewport (entry chunk + lazy mobile chunk). Service-worker cache covers both for offline reload after a prior online visit.
**Project Type**: Single SPA frontend under `apps/backlog-navigator/`. No backend changes.
**Performance Goals**:
- Desktop entry chunk: at least **15 KB gzipped reduction** vs. the pre-split baseline (SC-001), driven by removal of `@tanstack/react-virtual` (currently mobile-only via `CardList.tsx`) plus the seven mobile component modules from the entry chunk.
- Mobile cold load on slow-3G profile: skeleton fallback visible at first contentful paint; median skeleton-to-card-list under 2 s (SC-003).
- Desktop first contentful paint: no regression vs. pre-split (SC-004).
**Constraints**:
- The 1024px breakpoint must remain a single source of truth aligned with the existing `MOBILE_BREAKPOINT_MAX = 1023` constant (FR-008).
- Existing tests, Playwright suites, and Storybook stories must continue to pass without weakening assertions (FR-009).
- The PWA service worker must precache the new mobile chunk so prior-online users can open the app offline (FR-006).
- Bundle-budget guard contract: changes to `scripts/check-bundle-size.mjs` must keep its CLI behaviour stable for CI (exit 0 within budget, exit 1 on overrun, exit 2 on configuration error).
**Scale/Scope**: One SPA, two lazy-boundary call-sites, one new error boundary, one new skeleton component, one updated build-config flag (`build.manifest = true`), one updated guard script. Total surface ≈ 8 files touched + tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Verdict | Notes |
|---|---|---|---|
| **I. Defence-Grade Reliability** | I.1 Offline by default | ✅ Pass | Mobile chunk added to existing PWA precache automatically (vite-plugin-pwa `globPatterns: '**/*.js'` covers the new file). Verified in research R-3. |
| | I.3 No silent failures | ✅ Pass | New error boundary around the lazy boundary surfaces an explicit recovery message when chunk-fetch fails (FR-005). |
| | I.4 Reproducibility | ✅ Pass | Vite chunk hashing is deterministic for a given source tree; no run-to-run drift introduced. |
| **II. Schema Integrity** | All clauses | ✅ N/A | Feature does not touch any schema or generated type. |
| **III. Data Sovereignty** | All clauses | ✅ N/A | Feature does not transform or persist any user data. |
| **IV. Architectural Boundaries** | IV.1, IV.2 | ✅ N/A | No service↔frontend boundary affected; all changes are within the navigator frontend. |
| | IV.4 Persistence-host abstraction | ✅ N/A | Feature performs no persistence. |
| **V. Extensibility** | All clauses | ✅ N/A | No extension surface touched. |
| **VI. Testing** | VI.2 Unit tests for services; VI.3 Integration tests for workflows; VI.4 CI green | ✅ Pass | (a) New Vitest unit test for the manifest-aware bundle guard. (b) New Playwright workflow tests cover cold-load skeleton, chunk-failure recovery, and viewport-transition (Phase 1 plan below). (c) Existing test suites continue to import mobile components statically and remain green. |
| **VII. Test-Driven AI Collaboration** | VII.1 Tests before implementation | ✅ Pass | Test plan written into `tasks.md` ahead of implementation; bundle-budget delta verified post-build via the same guard script that gates CI. |
| **VIII. Documentation** | VIII.1 Specs before code; VIII.3 ADRs for significant choices | ✅ Pass | Spec written first (#247). The change to the budget script's contract (entry-chunk-only measurement) and the addition of a chunk-failure error boundary are noted in `research.md`; if either choice proves contentious at review time it can be promoted to an ADR, but neither rises to that bar today (both are localised to this feature's surface). |
| **IX. Dependencies** | IX.1 Minimal dependencies | ✅ Pass | **No new runtime or dev dependencies.** Reuses `React.lazy`/`Suspense` (already pulled in by React 18), Vite's built-in manifest emission, and the existing `SkeletonLoader` shimmer primitive. |
| **X. Security** | X.1 No secrets | ✅ N/A | No credentials touched. |
| **XI. Internationalisation** | XI.1 I18N from the start | ✅ Pass | The error-boundary recovery message and skeleton `aria-label` route through the existing `strings.ts` namespace alongside other navigator copy (no hard-coded English added outside of that file). |
| **XII. Community Engagement** | XII.2 Beta previews | ✅ Pass | Per-PR Heroku Review App preview applies as for any navigator change; no special treatment needed. |
| **XIII. Contribution Standards** | XIII.1 Atomic commits; XIII.3 CI must pass | ✅ Pass | Implementation plan permits a single coherent commit (or two: build-guard contract change, then split). CI gate enforced by the updated `check-bundle-size.mjs`. |
| **XIV. Pre-Release Freedom** | All clauses | ✅ N/A | No backwards-compat obligations relevant. |
| **XV. Strict Type Safety** | XV.1 Explicit types; XV.2 No `any`; XV.3 Strict mode | ✅ Pass | All new code typed end-to-end. The lazy-loader return shape is `Promise<{ default: ComponentType<P> }>` — fully typed by `React.lazy`. The error-boundary class component declares its props/state with explicit interfaces. The Vite manifest reader (in the guard script) types the manifest entries via a small Zod-validated schema (or hand-written `interface` + JSDoc, since the script is JS-only — see research R-1). |

**Initial Constitution Check verdict**: ✅ **Pass** — no violations to track in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/247-lazy-mobile-bundle/
├── plan.md               # This file
├── research.md           # Phase 0 — three research questions resolved
├── data-model.md         # Phase 1 — manifest entry + baseline file shapes
├── quickstart.md         # Phase 1 — local verification recipe
├── contracts/
│   └── bundle-budget-cli.md  # CLI contract for check-bundle-size.mjs
├── checklists/
│   └── requirements.md   # already created in /speckit.specify
├── evidence/
│   └── opening-context.md  # cached opener (Phase 2)
└── tasks.md              # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/backlog-navigator/
├── src/
│   ├── App.tsx                                  # MODIFY — lazy-import mobile trio + Suspense + error boundary
│   ├── editors/
│   │   └── EditorOverlayProvider.tsx            # MODIFY — lazy-import BottomSheetEditor, DescriptionEditorScreen; gate mount on isMobile
│   ├── components/
│   │   ├── mobile/                              # UNCHANGED source (now reached via dynamic import)
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── BottomSheetEditor.tsx
│   │   │   ├── CardList.tsx
│   │   │   ├── DescriptionEditorScreen.tsx
│   │   │   ├── ItemCard.tsx
│   │   │   ├── MobileFilterBar.tsx
│   │   │   └── StickyPushBar.tsx
│   │   └── lazy/                                # NEW directory
│   │       ├── MobileSkeleton.tsx               # NEW — skeleton card list using existing SkeletonLoader shimmer
│   │       └── ChunkErrorBoundary.tsx           # NEW — error boundary with recovery message + Reload action
│   ├── strings.ts                               # MODIFY — add chunk-error and skeleton-aria copy
│   └── __tests__/
│       ├── lazyBoundary.test.tsx                # NEW — vitest: Suspense fallback renders; resolves to real components
│       └── chunkErrorBoundary.test.tsx          # NEW — vitest: error boundary catches synthetic load failure
├── e2e/                                         # Playwright tests (existing dir)
│   └── tests/
│       └── lazy-mobile-chunk.spec.ts            # NEW — cold-load skeleton, chunk-blocking recovery, viewport transition
├── vite.config.ts                               # MODIFY — set build.manifest = true; verify default workbox globPatterns
└── package.json                                 # UNCHANGED (no new deps)

scripts/
├── check-bundle-size.mjs                        # MODIFY — read dist/.vite/manifest.json, measure entry chunk only; print all chunks for human review
├── bundle-baseline-244.json                     # MODIFY — re-baseline against the post-split entry chunk; bump notes
└── __tests__/                                   # NEW directory (if it doesn't exist) — small node test for the guard's manifest path
    └── check-bundle-size.test.mjs               # NEW — unit test for entry-chunk resolution + budget-overrun behaviour

shared/components/                               # UNCHANGED — SkeletonLoader reused as-is
```

**Structure Decision**: Single SPA frontend (option 2 / "Web application" in the plan template's vocabulary, but the navigator has no backend, so the structure collapses to a single `apps/backlog-navigator/` tree plus repo-root `scripts/`). The lazy boundary lives entirely inside `apps/backlog-navigator/src/`; the only repo-root change is the build-guard contract and its baseline JSON.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `MobileSkeleton` | (no Storybook story planned) | n/a | Cold-load skeleton seen on narrow-viewport visits before the mobile chunk arrives |

**Inclusion Criteria Applied**:
- [ ] New visual component — *technically yes (the skeleton), but it is a transient placeholder, not a featured surface*
- [ ] Significant visual change — *no; users see no new permanent UI*
- [ ] Interactive demo adds narrative value — *no; the only "interaction" is waiting for a chunk to load*

**Bundleability Verified**:
- [ ] Stories exist in Storybook — *no, and not warranted*
- [x] Components render standalone (no app context required) — `MobileSkeleton` has no context dependency
- [x] Reasonable bundle size expected (< 500KB) — trivially small (~30 LoC)

**Storybook Link**: N/A

**None bundled — infrastructure / build-time feature.** The user-visible artefact (the skeleton) is best demonstrated in the blog post via a single screenshot from the Playwright run rather than an interactive Storybook embed. Decision recorded for the content specialist downstream.

## Storybook E2E Testing

**None — no new Storybook story.** The skeleton component is too narrow in scope to justify a story; its appearance is verified end-to-end via the Playwright workflow tests below (which is the canonical evidence path for this kind of transient UI per project conventions).

## Web-Shell E2E Testing

> Note: this feature is in the standalone Backlog Navigator SPA, not the web-shell. The equivalent Playwright path is `apps/backlog-navigator/e2e/`, configured by `apps/backlog-navigator/playwright.config.ts` and runnable via `node apps/backlog-navigator/run-playwright.mjs` (which uses `@sparticuz/chromium` for cloud/CI). The structure of the table below mirrors the web-shell guidance.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Cold-load on mobile viewport shows skeleton, then card list | App, MobileSkeleton, CardList, MobileFilterBar | `[data-testid="mobile-skeleton"]`, `[data-testid="card-list"]`, `[data-testid="mobile-filter-bar"]` | Throttle to slow-3G, navigate to root with viewport `width=375`, assert skeleton visible at first paint, assert card list replaces skeleton |
| Cold-load on desktop viewport never requests mobile chunk | App, ItemsTable, FilterBar | `[data-testid="items-table"]`, `[data-testid="filter-bar"]` | Navigate with viewport `width=1280`, capture network log, assert no request for any chunk whose path matches `mobile-*.js` |
| Chunk-fetch failure shows recovery banner with reload action | App, ChunkErrorBoundary | `[data-testid="chunk-error"]`, `[data-testid="chunk-error-reload"]` | Block the mobile chunk URL via `page.route(...)`, navigate on viewport `width=375`, assert recovery banner with reload button visible and clickable |
| Viewport resize across breakpoint lazy-loads mobile chunk | App, MobileSkeleton, CardList | `[data-testid="mobile-skeleton"]`, `[data-testid="card-list"]` | Start at `width=1280`, resize to `width=600`, assert skeleton appears, then card list |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the Backlog Navigator SPA preview (Vite preview server)
- [x] Page objects reused or extended in `apps/backlog-navigator/e2e/` (no new POM file required — the existing `BacklogPage` covers these selectors with minimal additions)
- [x] Screenshots written **directly** into `specs/247-lazy-mobile-bundle/evidence/screenshots/` from the spec file (skeleton screenshot for the blog post)

**Test File Location**: `apps/backlog-navigator/e2e/tests/lazy-mobile-chunk.spec.ts`

**Run Commands**:
- Cloud: `cd apps/backlog-navigator && node run-playwright.mjs lazy-mobile-chunk` (auto-provisions `@sparticuz/chromium`)
- Local: `pnpm --filter @debrief/backlog-navigator test:e2e lazy-mobile-chunk`

## Complexity Tracking

> No constitutional violations to justify. This section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
