# Implementation Plan: Active-Storyboard Selection Persistence

**Branch**: `237-active-storyboard-persistence` (work being delivered on `claude/speckit-specify-237-HIO9k`)
**Date**: 2026-05-06
**Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/237-active-storyboard-persistence/spec.md`

## Summary

Persist the analyst's active-Storyboard pick per plot, so closing and
reopening a plot restores the selection instead of falling back to
`getActiveStoryboardDefault()`. The change is **host-side only**:

- Each host owns a thin `ActiveStoryboardSelectionStore` adapter behind
  a shared TypeScript interface in `@debrief/components`. VS Code's
  adapter wraps `@debrief/config` (Node, XDG-backed). Web-shell's
  adapter wraps `localStorage` (per-origin, per-browser-install) with
  one targeted ESLint-rule exception (mirroring the
  `stacWriterIdb` / `stacWriterCapability` pattern from #236).
- The store keys by the existing `itemPath` (STAC `item.json` path)
  that both hosts already thread to identify the open plot. A single
  preference / `localStorage` entry holds a JSON-string-encoded
  `{ [itemPath: string]: storyboardId }` map, so the
  scalar-only `PreferenceValue` constraint in `@debrief/config` is not
  violated and no schema change is required.
- The shared `StoryboardPanel` React component is **untouched**.
  Persistence is wired entirely in the host mount layers
  (`apps/vscode/src/services/storyboardPlayback.ts` and
  `apps/web-shell/src/StoryboardPanelMount.tsx`): each host reads the
  store on plot open to seed the active selection, and writes on
  every dropdown override.
- Read failures fall back to `getActiveStoryboardDefault()` (today's
  behaviour). Write failures degrade to session-only state. Stale
  selections (Storyboard deleted in another session) self-heal on the
  next override or fallback. The plot file itself is never touched —
  zero schema impact, zero provenance impact, zero impact on plots
  produced by hosts that haven't adopted this feature.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory per Article XV) for both hosts and the shared interface; Python 3.11 only insofar as the Python-side `debrief-config` is the current canonical store for desktop preferences (no Python code is added or modified in this feature).
**Primary Dependencies**: `@debrief/components` (existing — `StoryboardPanel`, `getActiveStoryboardDefault`); `@debrief/config` TypeScript package (existing — `getPreference` / `setPreference` against `~/.config/debrief/config.json`, used by VS Code only); browser `localStorage` for the web-shell adapter. **No new runtime dependencies.**
**Storage**: VS Code → `~/.config/debrief/config.json` (XDG-equivalent on macOS/Windows) via `@debrief/config`. Web-shell → browser `localStorage`, per-origin, per-browser-install. Neither host writes to the plot file. The two stores do not sync (per FR-008 — cross-host sync is not a requirement).
**Testing**: Vitest unit tests for each adapter (mocking `@debrief/config` / `localStorage`); React-Testing-Library tests for the `StoryboardPanelMount` host component covering the load-on-mount and write-on-change behaviours; one Playwright E2E (`apps/web-shell/playwright/tests/`) covering the user-visible "open → switch → reload → still-switched" scenario, mirroring the existing storyboard E2E patterns.
**Target Platform**: VS Code extension host (Node) and web-shell browser PWA (modern Chromium-class browsers, per existing project baseline). The feature must function offline — `@debrief/config` and `localStorage` are local stores, no network involved.
**Project Type**: Web application — the existing monorepo split (VS Code extension + web-shell + shared components).
**Performance Goals**: Adapter read on plot-open MUST complete within the same render cycle as a normal plot open (no flash of "loading" or "Storyboard not found" content per SC-004). A single `getPreference` / `localStorage.getItem` call is well below this budget; no new performance work required.
**Constraints**: Plot files MUST remain byte-identical to today (SC-003). No new ESLint exceptions outside the new web-shell adapter file. No `any`. The shared `StoryboardPanel` interface MUST NOT change (the persistence wiring is host-private).
**Scale/Scope**: A typical analyst keeps O(10) plots in active rotation; the JSON-encoded map fits comfortably in a single preference value (well under 64 KB). Two host mount layers, one shared interface, two adapter modules, three tests files plus one Playwright spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Compliance |
|---------|-----------|
| I. Defence-Grade Reliability | ✅ Offline by default — both stores are local. No network. No silent failures: read/write errors fall back to today's ephemeral behaviour and at most write a single non-fatal log entry (FR-012). Reproducibility unaffected — the plot file is unchanged. |
| II. Schema Integrity | ✅ **No schema change**. The LinkML Storyboard schema is not modified. `StoryboardFeature` gains no `is_active` slot (option (a) is explicitly out of scope). Plot files stay byte-identical (SC-003). |
| III. Data Sovereignty | ✅ Active-Storyboard selection is per-user UI state, NOT a plot edit. Per FR-014 it does NOT enter the plot's `provenance` chain (so plot diffs stay noise-free, audit logs remain truthful, and one user's UI history never leaks into a shared plot). Source files preserved; data stays local; no telemetry. |
| IV. Architectural Boundaries | ⚠️ See Complexity Tracking. The web-shell adapter touches `localStorage` directly, which currently triggers `no-direct-persistence-in-frontend`. Justified by treating the new adapter as the per-host write boundary for user-state — same pattern as #236 (`stacWriterIdb` / `stacWriterCapability`), and codified through the same ESLint-exception mechanism. |
| V. Extensibility | ✅ N/A — feature is internal plumbing; no extension surface affected. |
| VI. Testing | ✅ Each adapter has unit tests; both host mount layers gain component-level tests; one Playwright E2E covers the user-visible workflow. |
| VII. Test-Driven AI Collaboration | ✅ Acceptance scenarios in spec.md US1/US2/US3 are the executable spec; this plan ties each scenario to a specific test file and assertion (see quickstart.md §Testing). |
| VIII. Documentation | ✅ Spec.md exists; plan, research, data-model, contracts, quickstart produced by this command. The single existing line in `specs/235-storyboard-capture-ux/research.md` §8 ("Active-Storyboard selection is session-scoped, not persisted") will be cross-referenced from this spec; #235 is a sibling spec, not amended. |
| IX. Dependencies | ✅ **Zero new runtime dependencies.** `@debrief/components`, `@debrief/config`, browser `localStorage`, Vitest, Playwright — all already in use. |
| X. Security | ✅ No secrets stored. Storyboard IDs and item paths are not classified data. `localStorage` is per-origin; no cross-site exposure. |
| XI. Internationalisation | ✅ N/A — feature surfaces no new user-facing strings. |
| XII. Community Engagement | ✅ Public PR, public review, includes a feature blog post (Phase 2 cached opener). |
| XIII. Contribution Standards | ✅ Atomic commits, PR review, CI enforcement. |
| XIV. Pre-Release Freedom | ✅ Pre-v4.0.0; this is a behaviour change with a documented user-visible upgrade path (silent restore on plot open). |
| XV. Strict Type Safety | ✅ Adapter interface explicitly typed (see `contracts/active-storyboard-selection-store.ts`). All new code in TypeScript strict mode. No `any`. The boundary points (parsing JSON from `localStorage` / `@debrief/config`) validate before use. |

**Result**: PASS, with one Article-IV justification recorded in Complexity Tracking. No ERROR conditions.

## Project Structure

### Documentation (this feature)

```text
specs/237-active-storyboard-persistence/
├── plan.md              # This file
├── spec.md              # Feature specification (already written)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── active-storyboard-selection-store.ts   # Phase 1 output (typed interface)
├── checklists/
│   └── requirements.md  # Already written by /speckit.specify
├── evidence/
│   └── opening-context.md  # Phase 2 output (cached blog opener)
└── tasks.md             # Created by /speckit.tasks (NOT created here)
```

### Source Code (repository root)

```text
shared/components/src/storyboard/
├── activeStoryboardSelectionStore.ts          # NEW — typed interface + key-encoding
│                                                helpers; no impl, no React. Re-exported
│                                                via shared/components/src/storyboard/index.ts.
└── __tests__/
    └── activeStoryboardSelectionStore.test.ts # NEW — unit tests for key-encoding /
                                                JSON-map serialisation helpers.

apps/vscode/src/services/
├── storyboardPlayback.ts                      # MODIFIED — onPlotOpened reads the store
│                                                and seeds state.activeStoryboardId
│                                                BEFORE the default fallback;
│                                                setActiveStoryboard writes the store.
├── activeStoryboardSelectionStoreVscode.ts    # NEW — Node adapter wrapping
│                                                @debrief/config getPreference /
│                                                setPreference; implements the shared
│                                                interface.
└── __tests__/
    └── activeStoryboardSelectionStoreVscode.test.ts # NEW — Vitest unit tests
                                                       (mocks @debrief/config).

apps/web-shell/src/
├── App.tsx                                    # MODIFIED — pass currentPlot.itemPath
│                                                as a prop to StoryboardPanelMount.
├── StoryboardPanelMount.tsx                   # MODIFIED — accept itemPath prop;
│                                                replace useState<null> with a
│                                                load-from-store hook; write to store
│                                                in onActiveStoryboardChange.
└── services/
    ├── activeStoryboardSelectionStoreWebShell.ts # NEW — localStorage adapter;
                                                    listed in the ESLint
                                                    no-restricted-globals exception
                                                    overrides for `localStorage`.
    └── __tests__/
        └── activeStoryboardSelectionStoreWebShell.test.ts # NEW — Vitest unit
                                                             tests (mocks localStorage).

apps/web-shell/playwright/tests/
└── active-storyboard-persistence.spec.ts      # NEW — single E2E covering
                                                US1 happy path + US2 stale fallback.

# ESLint configuration — single targeted edit
apps/web-shell/eslint.config.js (or root .eslintrc) # MODIFIED — add
                                                       activeStoryboardSelectionStoreWebShell.ts
                                                       to the existing localStorage
                                                       exception list (alongside
                                                       stacWriterIdb.ts,
                                                       stacWriterCapability.ts).
```

**Structure Decision**: The split mirrors the writer-abstraction pattern
proven by #236 (STAC writes): a typed interface lives in
`@debrief/components` (the only place both hosts already share TS
code), and each host implements its own adapter against its native
backend. This (a) keeps the shared `StoryboardPanel` component free
of host-specific persistence assumptions, (b) lets ESLint enforce the
"no direct persistence outside the adapter" rule machine-wide via a
single targeted exception, and (c) produces a single point of edit for
each host's storyboard wiring (`storyboardPlayback.ts` for VS Code,
`StoryboardPanelMount.tsx` for web-shell) instead of scattering reads
and writes across the host code.

## Media Components

None — backend/infrastructure feature. The user-visible UI from #235
(side-rail header dropdown) is byte-for-byte unchanged. No new
component, no new visual state, no new Storybook story is added by
this feature. Article-XII community engagement is honoured via the
feature blog post (Phase 2 cached opener) and the standard preview-app
deployment, neither of which require a Storybook bundle.

## Storybook E2E Testing

None — no interactive UI components added. The existing
`StoryboardPanel.stories.tsx` and `StoryboardPlayback.stories.tsx`
remain authoritative for the panel's visual behaviour, and they
continue to receive `activeStoryboardId` as a prop, identical to
today.

## Web-Shell E2E Testing

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `@sparticuz/chromium` covers Linux Chromium for cloud + CI. Local desktop uses `pnpm exec playwright install chromium`. See `docs/project_notes/playwright-installation-research.md`.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Active-Storyboard selection persists across plot reload | Catalog picker → MapView → Storyboard side rail (header dropdown + scene list) | `[data-testid="catalog-item-row"]`, `[data-testid="storyboard-active-name"]`, `[data-testid="storyboard-dropdown"]`, `[data-testid="storyboard-option"]`, `[data-testid="storyboard-scene-row"]` | Open plot (≥2 storyboards); read default selection; pick a non-default storyboard from dropdown; reload page; assert dropdown still on the picked storyboard and scene list reflects it |
| Stale-selection fallback (US2 — optional, gated on test fixture availability) | Same as above, with localStorage seeded to a Storyboard ID not in the fixture plot | Same selectors | Pre-seed `localStorage` with a stale selection ID via `page.addInitScript`; load the plot; assert the panel shows `getActiveStoryboardDefault()`'s pick and renders without an error banner |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for the storyboard side-rail selectors (reuse `AnalysisPage` rather than introducing a new page object)
- [x] Screenshots and/or interaction GIF written **directly** into `specs/237-active-storyboard-persistence/evidence/screenshots/` from the spec file (mirroring `apps/web-shell/playwright/tests/properties-screenshots.spec.ts` path-resolution pattern)

**Test File Location**: `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs active-storyboard-persistence`
- Local: `pnpm --filter @debrief/web-shell test active-storyboard-persistence`

**Optional — chrome-level VS Code Webview tests**:
None for this feature. The VS Code path is exercised by Vitest component tests against `storyboardPlayback.ts` plus its existing service-level tests; the user-visible "reopen-on-pinned" behaviour is symmetric with the web-shell E2E and a parallel openvscode-server run would add cost without coverage value.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Web-shell adapter touches `localStorage` directly, requiring an exception entry in the existing `no-restricted-globals` ESLint config (alongside `stacWriterIdb.ts` and `stacWriterCapability.ts`) | The web-shell has no ambient access to `@debrief/config` (which is Node-only today). The feature spec explicitly accepts per-host persistence (FR-008) and rejects cross-host sync infrastructure as out-of-scope (Out of Scope §). `localStorage` is the smallest adequate local store for a per-origin browser PWA: it satisfies SC-001 (selection survives reload), SC-005 (per-origin = per-user), and SC-006 (graceful failure when storage is full or disabled). | (a) Mounting `@debrief/config` into the browser would require a Vite-middleware HTTP adaptor to a Node-side config service — that adds a server dependency to the web-shell's static-deploy story (Heroku review apps, future PWA distribution). Out of proportion to the value. (b) Introducing IndexedDB matches the stac-writer choice but is heavier than needed for a single per-plot string and adds Promise-based async I/O where `localStorage`'s sync API matches the panel-mount lifecycle exactly. (c) Skipping the adapter and inlining `localStorage` calls into `StoryboardPanelMount` would scatter the persistence concern and weaken Article-IV.4 — the adapter file is the per-host write boundary. The ESLint exception is a single targeted entry, not a blanket carve-out, and the file is named to match the existing pattern (`*Store*` / `*Adapter*`), making review trivial. |
