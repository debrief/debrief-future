# Implementation Plan: Backlog Navigator — Full Mobile Parity (PWA)

**Branch**: `claude/implement-speckit-244-KPwO3` (active feature: `244-navigator-mobile-pwa`) | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/244-navigator-mobile-pwa/spec.md`

## Summary

Extend the existing Backlog Navigator (`apps/backlog-navigator/`, shipped in
#242) so the same deployed React + Vite app works on phones and tablets
without splitting the codebase. The change is **layout-and-interaction only**
— the parser, GitHub-backed state model, and push pipeline are untouched.

Three layered deliverables:

1. **Responsive layout** — at `viewport-width < 1024px`, a virtualised card
   list replaces the desktop table; bottom-sheet editors replace inline cell
   editors; a full-screen Markdown editor replaces the inline `DescriptionCell`
   editor; a sticky bottom Push-Changes bar replaces the desktop top-bar Push
   button.
2. **PWA installability + offline shell** — Vite-emitted PWA manifest, a
   service worker that caches the app shell, and an "update available"
   re-load affordance.
3. **CI gates** — multi-viewport Playwright (Story 1 + Story 2 acceptance at
   `375x812`, `768x1024`, `1024x768`), a Lighthouse PWA gate (≥ 90), and a
   bundle-size budget guard (desktop gzipped JS payload ≤ +15% vs. pre-#244
   baseline).

This plan reuses the `BacklogItem` shape, the parser, the `state/`
reducer, the `github/` push module, and the Zod boundary validation
unchanged. The mobile-specific code lives **inside the same app**, not a
sibling package.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory per Article XV)
**Primary Dependencies**:
  - React 18.x, react-dom 18.x (existing)
  - Vite 5.x (existing — bundler + dev server)
  - `@tanstack/react-virtual` (already in monorepo workspace via #094) — **add as direct dep of `apps/backlog-navigator`** (currently consumed only via `shared/components`)
  - `vite-plugin-pwa` ^0.20.x (**new dev-dep** — see Article IX justification below) — emits manifest, registers a Workbox-based service worker, exposes the `vite/pwa-virtual` registration module
  - `react-markdown` ^9 + `remark-gfm` (existing) — reused unchanged for description rendering
  - `zod` ^3.22 (existing) — extended with one schema for the manifest output (see contracts/)
  - `@lhci/cli` (**new CI dev-dep**) — Lighthouse CI runner, invoked from a new `.github/workflows/backlog-navigator-lighthouse.yml`
**Storage**: Same as #242 — GitHub REST as remote, `localStorage` for the PAT envelope. **No new client storage** (deliberate per spec Assumption A-1: no offline edit queue → no IndexedDB / OPFS / similar).
**Testing**:
  - Vitest (existing) — unit tests for the new responsive hook, bottom-sheet gesture controller, and editor controllers
  - Playwright (existing — `apps/backlog-navigator/playwright.config.ts`) — extended with three viewport projects (`mobile-iphone`, `tablet-portrait`, `tablet-landscape`); reuses existing `browse / interaction` specs by parameterising viewport via Playwright project config
  - `@lhci/cli` CI gate against the deployed preview/build artifact
**Target Platform**: Modern evergreen browsers (Safari 17+ iOS, Chrome 120+ Android, desktop Chrome/Firefox/Safari/Edge); installable as a PWA on iOS 17+ and Android 12+. Node 20.x for build-time. Does **not** target legacy browsers below iOS 16 / Android 11 (matches #242's stance).
**Project Type**: Single SPA (no backend). The "service" is GitHub itself, accessed via REST.
**Performance Goals**:
  - Card list scroll ≥ 50 fps at `375x812` with 230+ rows (SC-001)
  - Cold-start home-screen → interactive < 3 s (SC-007)
  - Offline cold-start (app shell only) < 1.5 s (SC-007)
  - Lighthouse PWA score ≥ 90 (SC-006, FR-022)
**Constraints**:
  - **No sibling codebase** — single React app, single Vite build (FR-014)
  - **Byte-identical `BACKLOG.md` output** for any equivalent edit, mobile vs. desktop (FR-015, SC-009)
  - **Desktop bundle gzipped JS payload growth ≤ 15%** vs. pre-#244 baseline (FR-024, SC-010)
  - **Same conflict-detection** as desktop on push (FR-016)
  - **Strict TypeScript**, `any` forbidden (Article XV)
**Scale/Scope**:
  - ~230 rows in `BACKLOG.md` today; design for 1,000+ rows without virtualisation regressions
  - 5 user stories (P1×2, P2×2, P3×1) → ~24 functional requirements
  - Estimate: 1–2 dev-weeks (per BACKLOG.md row 244)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Compliance |
|---------|--------|------------|
| **I — Defence-Grade Reliability** | I.1 Offline-by-default | ✅ App shell loads offline (FR-018). Edits explicitly require network (Assumption A-1) — consistent with desktop behaviour and Article XIV pre-release latitude. |
| | I.2 No cloud dependencies in core | ✅ The "core" is the local React app. GitHub is the optional remote (same posture as #242). |
| | I.3 No silent failures | ✅ FR-019 (clear offline empty state), FR-020 (explicit update affordance), Story 4 push-failure handling. |
| | I.4 Reproducibility | ✅ Same parser → same `BACKLOG.md` output (SC-009). |
| **II — Schema Integrity** | All clauses | ✅ N/A — no schema changes; `BACKLOG.md` format unchanged. |
| **III — Data Sovereignty** | All clauses | ✅ No telemetry, no new external endpoints. PAT stays in `localStorage` as in #242. |
| **IV — Architectural Boundaries** | IV.1, IV.2, IV.3 | ✅ The backlog-navigator is a **standalone editor app**, not a Debrief frontend. The "service" it talks to is GitHub. No Debrief Python service surface is involved. |
| | IV.4 Persistence-host abstraction | ✅ N/A — this app has no Debrief writer abstraction; persistence is GitHub-only. The clause restricts Debrief frontends; backlog-navigator is editing project-meta files, not user analysis data. |
| **V — Extensibility** | All clauses | ✅ N/A — internal tool, no extension surface. |
| **VI — Testing** | All clauses | ✅ Multi-viewport Playwright + Vitest + Lighthouse PWA gate; CI MUST pass (FR-021, FR-022, FR-023). |
| **VII — Test-Driven AI Collaboration** | All clauses | ✅ Spec defines 24 testable FRs and 11 measurable SCs before any code is written. |
| **VIII — Documentation** | VIII.1 Specs before code | ✅ This plan exists. |
| | VIII.3 Architecture decisions recorded | ⚠️ One ADR-worthy decision: **vite-plugin-pwa adoption** as the project's first PWA tool. Plan to record as ADR-029 in `docs/project_notes/decisions.md` during implementation. |
| **IX — Dependencies** | IX.1 Minimal, vetted | ⚠️ Two new deps: `vite-plugin-pwa` (well-vetted; standard solution for Vite PWA — used by Vue, SvelteKit, Astro communities; alternative is hand-rolling Workbox plugin glue + manifest emission, which is significantly more code with worse maintenance). `@lhci/cli` is dev-only (Google's reference Lighthouse CI tool). `@tanstack/react-virtual` is already in the monorepo (added by #094) — moving it from indirect to direct dep is zero new surface. **Justified.** |
| | IX.2 Pinned versions | ✅ All adds will be pinned. |
| | IX.3 No vendor lock-in | ✅ vite-plugin-pwa wraps Workbox (Google open-source); `@lhci/cli` is open-source; both replaceable. No proprietary services. |
| **X — Security** | All clauses | ✅ No new secrets path. PWA service worker scope limited to the navigator origin. |
| **XI — Internationalisation** | All clauses | ✅ Strings remain English-only (consistent with #242 — internal tool). |
| **XII — Community Engagement** | All clauses | ✅ Public deploy, public spec, blog post planned. |
| **XIII — Contribution Standards** | All clauses | ✅ Standard PR flow. |
| **XIV — Pre-Release Freedom** | XIV.1 Breaking changes permitted | ✅ Pre-v4.0; breaking layout change to the desktop URL is a **non-breaking enhancement** (the desktop layout above 1024px is preserved exactly per FR-023). |
| **XV — Strict Type Safety** | All clauses | ✅ Existing TypeScript strict mode already applies; no `any` in new code. |

**Gate verdict**: PASS, with one ADR (PWA tooling) to record at implementation
time. No clauses violated. Two new dependencies justified above and tracked
in Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/244-navigator-mobile-pwa/
├── plan.md                    # This file
├── research.md                # Phase 0 — research notes (next)
├── data-model.md              # Phase 1 — UI state shapes (next)
├── quickstart.md              # Phase 1 — how to run the mobile path locally (next)
├── contracts/
│   ├── pwa-manifest.md        # Manifest field contract + icon set
│   └── service-worker.md      # Cache strategy, update protocol, offline behaviour
├── checklists/
│   └── requirements.md        # Spec-quality checklist (already done)
├── evidence/
│   └── opening-context.md     # Cached blog opener (next, Phase 2)
└── tasks.md                   # Will be created by /speckit.tasks
```

### Source Code (repository root)

The mobile parity work lives **entirely within `apps/backlog-navigator/`** —
no new top-level package, no sibling app. New files marked `(+)`; modified
files marked `(M)`. No files deleted.

```text
apps/backlog-navigator/
├── index.html                  # (M) add manifest <link> + theme-color meta + viewport tag (already correct)
├── package.json                # (M) add @tanstack/react-virtual + vite-plugin-pwa
├── vite.config.ts              # (M) wire VitePWA plugin (registerType: 'prompt'; workbox config)
├── public/
│   ├── icon-192.png            # (+) PWA icon (192×192, maskable)
│   ├── icon-512.png            # (+) PWA icon (512×512, maskable)
│   └── apple-touch-icon.png    # (+) iOS install icon
├── src/
│   ├── App.tsx                 # (M) branch on layoutMode → render <ItemsTable> or <CardList>; mount sticky push bar on mobile
│   ├── main.tsx                # (M) registerSW() from virtual:pwa-register; surface update prompt
│   ├── hooks/
│   │   └── useLayoutMode.ts    # (+) matchMedia('(min-width: 1024px)') hook → 'desktop' | 'mobile'
│   ├── pwa/
│   │   ├── registerSW.ts       # (+) thin wrapper around virtual:pwa-register; emits update events
│   │   └── UpdatePrompt.tsx    # (+) renders the "update available" affordance
│   ├── components/
│   │   ├── (existing desktop components — UNCHANGED)
│   │   ├── mobile/
│   │   │   ├── CardList.tsx                  # (+) virtualised card list (uses @tanstack/react-virtual)
│   │   │   ├── ItemCard.tsx                  # (+) one row → one card
│   │   │   ├── BottomSheet.tsx               # (+) sheet container with hand-rolled drag-down gesture
│   │   │   ├── BottomSheetEditor.tsx         # (+) wraps an editor with sheet header/save/cancel
│   │   │   ├── DescriptionEditorScreen.tsx   # (+) full-screen Markdown editor
│   │   │   ├── StickyPushBar.tsx             # (+) bottom-fixed push bar with safe-area-inset padding
│   │   │   ├── MobileFilterBar.tsx           # (+) phase dropdown + include-completed checkbox in mobile chrome
│   │   │   └── __tests__/
│   │   │       ├── BottomSheet.test.tsx      # (+) gesture unit tests
│   │   │       └── CardList.test.tsx         # (+) virtualisation + filter behaviour
│   │   └── editors/
│   │       └── (existing editor components reused inside <BottomSheetEditor> — UNCHANGED)
│   ├── styles/
│   │   ├── (existing global styles — UNCHANGED)
│   │   └── mobile.css                         # (+) mobile-only rules (cards, sheet, sticky bar, safe-area)
│   ├── parser/                  # UNCHANGED
│   ├── state/                   # UNCHANGED
│   ├── github/                  # UNCHANGED
│   ├── format/                  # UNCHANGED
│   └── types.ts                 # (M) add MobileLayoutMode, BottomSheetState, DescriptionEditorState, ServiceWorkerUpdateState
├── e2e/
│   ├── (existing specs — UNCHANGED specs themselves; viewport assertion sites parameterised)
│   ├── mobile/
│   │   ├── browse.mobile.spec.ts             # (+) Story 1 acceptance at 3 viewports
│   │   └── interaction.mobile.spec.ts        # (+) Story 2 acceptance at 3 viewports
│   └── helpers/
│       └── viewports.ts                       # (+) the three target viewports as exported constants
├── playwright.config.ts        # (M) add three Playwright projects: mobile-iphone, tablet-portrait, tablet-landscape
└── .lighthouserc.json          # (+) Lighthouse CI config (PWA category ≥ 90)

.github/workflows/
└── backlog-navigator-lighthouse.yml   # (+) builds the app, serves preview, runs @lhci/cli, fails on PWA < 90

scripts/
└── check-bundle-size.mjs       # (+) reads dist/assets/*.js, gzips, fails if total > pre-244 baseline × 1.15
                                #     baseline number stored at scripts/bundle-baseline-244.json
```

**Structure Decision**: Single SPA, mobile-specific UI components grouped
under `src/components/mobile/`. The desktop-vs-mobile branch happens **once**
in `App.tsx` based on `useLayoutMode()`; below that branch, both trees see
the same `state/` reducer, the same `parser/` output, and call the same
`github/` push function. There is no parallel state model, no parallel
parser, no parallel router.

## Media Components

This feature ships UI work, but the new components are **app-specific** to
`apps/backlog-navigator/` — they are not shared library components and have
no Storybook stories (the navigator does not run Storybook; #242 chose plain
Vite + Vitest, no Storybook integration).

**None — feature-app components, not shared library.**

The blog post will use **multi-viewport Playwright screenshots** (and one
optional GIF) captured by the new `e2e/mobile/*.spec.ts` files, written
into `specs/244-navigator-mobile-pwa/evidence/screenshots/`.

**Inclusion Criteria Applied**:
- [ ] New visual component (✗ — not in shared library)
- [ ] Significant visual change (✓ — but not in a Storybook-published surface)
- [ ] Interactive demo adds narrative value (✓ — but better served by a recorded GIF than a story bundle)

**Bundleability Verified**:
- [ ] Stories exist in Storybook (✗ — none for backlog-navigator)
- [ ] Components render standalone (n/a)
- [ ] Reasonable bundle size expected (n/a)

**Storybook Link**: n/a

## Storybook E2E Testing

**None — no shared-component changes.** The feature's components live in
`apps/backlog-navigator/src/components/mobile/`, not `shared/components/`,
and the navigator does not consume Storybook.

## Web-Shell E2E Testing

**None — no extension workflow changes.** This feature does not touch
`apps/web-shell/` or the VS Code extension.

## Backlog-Navigator E2E Testing *(this feature's bespoke E2E entry — replaces the Storybook/Web-Shell tables above)*

The backlog-navigator has its own Playwright config and test suite. Mobile
parity is exercised via that suite, extended with three viewport projects.

| Workflow | Spec File | Viewports | Key Selectors |
|----------|-----------|-----------|----------------|
| Browse + filter (Story 1) | `e2e/mobile/browse.mobile.spec.ts` | `375x812`, `768x1024`, `1024x768` | `[data-testid=card-list]`, `[data-testid=item-card-{id}]`, `[data-testid=phase-filter]`, `[data-testid=include-completed-toggle]` |
| Edit row (Story 2) | `e2e/mobile/interaction.mobile.spec.ts` | `375x812`, `768x1024`, `1024x768` | `[data-testid=status-chip]`, `[data-testid=bottom-sheet]`, `[data-testid=description-editor-screen]`, `[data-testid=sticky-push-bar]` |
| Lighthouse PWA gate | (separate workflow — not Playwright) | mobile profile | n/a |
| Existing desktop browse/interaction/a11y/realWrite/prMode | (UNCHANGED — `≥ 1024px`) | `1280x720` (existing default) | (UNCHANGED) |

**Testing Strategy**:
- [x] Mobile workflows run end-to-end at all three target viewports (multi-project Playwright config).
- [x] Page-object pattern: a thin `pages/MobileNavigator.ts` wraps the new selectors; reused across both new specs.
- [x] Screenshots written **directly** into `specs/244-navigator-mobile-pwa/evidence/screenshots/` from the spec files.
- [x] One short GIF (≤ 5 s, ≤ 2 MB) captured via `recordVideo` showing the bottom-sheet status edit at `375x812`.
- [x] Existing desktop suite (#242 + #243) passes unchanged at `≥ 1024px` (FR-023 / SC-008).

**Run Commands**:
- Cloud: `cd apps/backlog-navigator && node run-playwright.mjs mobile/`
- Local: `pnpm --filter @debrief/backlog-navigator test:e2e mobile/`

**Lighthouse**: `pnpm --filter @debrief/backlog-navigator build && pnpm --filter @debrief/backlog-navigator preview &` then `pnpm dlx @lhci/cli autorun --config .lighthouserc.json` from the app dir. CI runs both via the new workflow file.

**Bundle-size guard**: `node scripts/check-bundle-size.mjs` after `vite build`; fails the build if gzipped JS > baseline × 1.15.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dep: `vite-plugin-pwa` | Generates the manifest file from a typed config, registers a Workbox-backed service worker, exposes a `virtual:pwa-register` module that emits update events. Replaces ~200 lines of hand-rolled Workbox glue + manifest emitter + version-detection wiring. | **Hand-rolled SW + hand-emitted manifest** — rejected because the surface area (precaching, runtime caching for GitHub responses, update-detection lifecycle) is exactly what Workbox solves. Article IX requires "minimal, vetted dependencies" — Workbox is Google-maintained and ships at most browsers; vite-plugin-pwa is the standard wrapper for Vite. Recording the choice as ADR-029 at implementation time. |
| New dev-dep: `@lhci/cli` | Provides the Lighthouse PWA score CI gate (FR-022, SC-006). | **Manual Lighthouse runs** — rejected because Article VI requires CI gates ("CI MUST pass"). A manual-only check is not a gate. `@lhci/cli` is the official Google tool. |
| Direct dep promotion: `@tanstack/react-virtual` | Already a transitive dep via `shared/components` (#094). The mobile card list needs it directly. | **Hand-roll virtualisation** — rejected because @tanstack/react-virtual is already in the monorepo (zero new surface), the algorithm is non-trivial (sticky headers + variable heights + scroll restoration), and the project already pays the bundle cost via #094. |
