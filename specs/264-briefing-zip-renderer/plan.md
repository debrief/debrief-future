# Implementation Plan: Air-Gapped Briefing Zip — Storyboard Renderer (SPA)

**Branch**: `claude/start-spec-264-57xbA` (PR #639) | **Spec dir**: `264-briefing-zip-renderer` | **Date**: 2026-05-19
**Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/264-briefing-zip-renderer/spec.md`

## Summary

Ship a one-Storyboard briefing as a single `.zip` file that any modern
desktop browser can open from `file://` with no install, no server, and
no network. The zip contains a bundled Vite + React SPA at
`apps/briefing-renderer/`, a scoped `features.geojson` and `item.json`
inlined into `index.html`, the Scene-thumbnail assets, and a pre-fetched
basemap tile cache. A new VS Code command on each Storyboard's overflow
menu — `debrief.storyboard.exportAsBriefingZip` — assembles the zip via
JSZip and writes it to a user-chosen path. The SPA composes the existing
`StoryboardPlaybackService` (hoisted from `apps/vscode/` to
`shared/components/`) with browser-side port adapters so playback is
indistinguishable from the authoring environment.

**Implementation is blocked on #263 merging** — the briefing SPA must
play back time-range Scenes correctly, and the shared engine that
handles that case is #263's deliverable. Specification + plan can land
in parallel with #263; the first implementation task does not start
until #263 is on `main`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, per Article XV) — same in
the export command (VS Code Node-side) and the SPA (browser).
**Primary Dependencies**:
- `react` 18.x + `react-dom` 18.x (SPA UI)
- `react-leaflet` 4.2 + `leaflet` 1.9.x (map + tile rendering — same
  stack used by the authoring `MapView`)
- `zustand` ^5.0.0 (SPA-local playback store)
- `@debrief/components` (`StoryboardPlaybackService` hoisted here; `MapView`)
- `@debrief/schemas` (StoryboardFeature, SceneFeature, PlotFeatureCollection,
  StacItem — boundary types derived via `Pick`/alias per Article IV.5)
- `jszip` ^3.10.x (**new** dep — see research.md R3 + Article IX
  justification below)
- `vite` 5.x + `@vitejs/plugin-react` (SPA build; same as backlog/spec-navigator)
- `vscode` ^1.85.0 (Extension API — existing)

**Storage**:
- **Export side**: writes one `.zip` file to a user-chosen path via
  `vscode.workspace.fs.writeFile`. Source plot is **not** modified
  (FR-005).
- **Recipient side**: reads from the unzipped directory via relative
  paths. Inlined JSON via `document.getElementById(…).textContent`.
  Binary assets via `<img>` / Leaflet `TileLayer`. **Never** issues
  `fetch()` / XHR / WebSocket at runtime (FR-015).

**Testing**:
- Vitest (unit + integration) for the export pipeline
  (`scopeStoryboard`, `buildItemJson`, `computeTileCoverage`,
  `exportStoryboardAsBriefingZip`).
- Vitest (unit) for the SPA's inline-data loader and adapters.
- Playwright (E2E) for the SPA — **including a `file://`-origin spec**
  that opens an actual exported zip and verifies playback + zero
  external requests. Runs via `apps/briefing-renderer/run-playwright.mjs`
  using `@sparticuz/chromium` (cloud-compatible, see project CLAUDE.md).

**Target Platform**:
- **Export host**: VS Code Extension Host (Node 20) under macOS,
  Linux, and Windows.
- **Recipient host**: current Chrome, Firefox, Edge, Safari on
  desktop OSes. Mobile browsers best-effort.

**Project Type**: `web` — adds one new SPA (`apps/briefing-renderer/`).
The SPA is a sibling to `apps/backlog-navigator/` and
`apps/spec-navigator/` and follows the same Vite layout.

**Performance Goals**:
- Export completes in **< 30 s** for a typical Storyboard (10–30 Scenes,
  ~500–2 000 tiles). Tile fetch is the dominant cost; the SPA build is
  pre-baked.
- SPA cold-load on first `index.html` open in **< 3 s** to first frame
  on a modern desktop (no asset > 500 KB after gzip).
- Playback frame rate matches the parent `StoryboardPlaybackService`
  — no specific FPS target above "no perceptible drop vs. authoring".

**Constraints**:
- `file://`-origin loadable in current Chrome, Firefox, Edge, Safari
  (R1 / R6).
- **Zero external network requests at runtime** (FR-015 + SC-002,
  verified by `briefing-zip-network-isolation.spec.ts`).
- All relative paths inside the zip (FR-013).
- Zip size dominated by tiles + thumbnails — typical 5–20 MB; outliers
  (large-area Storyboards) capped at ~50 MB by the integer-zoom-only
  policy (R2).

**Scale/Scope**:
- One new SPA app (`apps/briefing-renderer/`, ~1 500 LOC TS + tests).
- One new VS Code command + helper service
  (`apps/vscode/src/services/briefingZipExport/`, ~600 LOC TS + tests).
- One mechanical refactor: hoist `storyboardPlayback.ts` from
  `apps/vscode/src/services/` to `shared/components/src/storyboard/playback/`
  (no logic change; ~3 imports updated).
- One new dependency (`jszip`) in the VS Code extension.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-evaluated after Phase 1
design (see § Re-check below).*

| Article | Clause | Compliance | Notes |
|---------|--------|-----------|-------|
| **I. Defence-Grade Reliability** | I.1 Offline by default | ✓ | The feature *is* the offline mechanism. SPA has no network code path (FR-015 + Playwright isolation test). |
| | I.2 No cloud dependencies in core | ✓ | No cloud in the runtime path. Tile fetch at export uses the user-configured OSM-compatible source (analyst's own network). |
| | I.3 No silent failures | ✓ | Empty/error states explicit (FR-030, FR-031). Atomic zip write — file exists complete or not at all. |
| | I.4 Reproducibility | ✓ | Same plot + same Storyboard ID + same tile source → same zip contents (tile bytes deterministic given URL; FeatureCollection scoping deterministic). |
| **II. Schema Integrity** | II.1 Single source of truth | ✓ | Boundary types derived via `Pick`/alias from `@debrief/schemas` (Article IV.5 enforced; see data-model § 7). No re-listed fields. |
| | II.2 Schema tests mandatory | ✓ | The briefing payload is a strict subset of `PlotFeatureCollection`; schema adherence is inherited transitively. Per-Scene boundary validation gates SPA load (data-model § 8). |
| | II.3 Schema versioning | N/A | No new schemas. |
| **III. Data Sovereignty** | III.1 Provenance always | ✓ | `item.json` carries source plot title + time bounds + `exportedAt` timestamp. FeatureCollection is a byte-faithful subset; nothing rewritten. |
| | III.2 Source preservation | ✓ | Source plot is never modified (FR-005). Thumbnails copied byte-for-byte from `<item>/scene-thumbnails/`. |
| | III.3 Audit trail immutable | ✓ | The briefing zip is a write-once artefact; reproducing it requires a fresh export. |
| | III.4 Data stays local by default | ✓ | The whole briefing flow is local. Only network involvement is the analyst-initiated tile fetch at export. |
| | III.5 Export-friendly | ✓ | The briefing zip IS the export. GeoJSON + STAC item.json are standards. |
| **IV. Architectural Boundaries** | IV.1 Services never touch UI | ✓ | `StoryboardPlaybackService` (hoisted to `shared/components/`) returns data and issues port calls. SPA adapters do rendering. |
| | IV.2 Frontends never persist | ✓* | The export writes a user-chosen file at a user-chosen path — functionally a "Save As" / export, not an app-state write. The plot is not mutated. *Caveat written below.* |
| | IV.3 Services have zero MCP dependency | ✓ | No MCP layer touched. |
| | IV.4 Persistence-host abstraction | ✓ | The briefing zip is a one-shot export artefact, not application state. Article IV.4 governs app-state writes (sidecar / FC / STAC assets); briefing-zip export is outside that scope (matches existing CSV-export pattern from #178). |
| | IV.5 Boundary types are derived, not rewritten | ✓ | `BriefingFeatureCollection = PlotFeatureCollection`; `BriefingItemJson = Pick<StacItem, …>`. Exhaustiveness guards in place (data-model § 7). |
| **V. Extensibility** | V.1 Fail-safe loading | ✓ | The briefing SPA is independent of the VS Code extension; a broken extension cannot affect a recipient's playback. |
| | V.2 Schema compliance | ✓ | All consumed types are schema-rooted. |
| | V.3 No vendor lock-in | ✓ | Tile source is configurable; JSZip is open-source MIT. |
| **VI. Testing** | VI.1 Schema tests gate all merges | ✓ | Inherited. |
| | VI.2 Services require unit tests | ✓ | `scopeStoryboard`, `buildItemJson`, `computeTileCoverage` all have dedicated test files (contracts/export-command.md § Test obligations). |
| | VI.3 Integration tests for workflows | ✓ | End-to-end Playwright spec `briefing-zip-end-to-end.spec.ts` exercises export → unzip → open → play. |
| | VI.4 CI MUST pass | ✓ | Standard CI applies. |
| **VII. Test-Driven AI Collaboration** | All clauses | ✓ | Acceptance scenarios + contracts + Playwright specs define "done" before implementation. |
| **VIII. Documentation** | VIII.1 Specs before code | ✓ | Spec landed (commit `d61e0ca`) before implementation begins. |
| | VIII.2 User-facing docs required | ⚠ | Recipient-facing README inside the zip (`README.txt` next to `index.html`) is in scope and called out as task `T-DOCS` in tasks.md (TBD). |
| | VIII.3 ADRs | ⚠ | One ADR worth recording: "briefing renderer ships as a standalone `file://`-loadable SPA, not as a printable PDF or screen recording" — `docs/project_notes/decisions.md` entry to be added during implementation. |
| | VIII.4 Changelog maintained | ✓ | Standard. |
| **IX. Dependencies** | IX.1 Minimal, vetted dependencies | ✓ | One new dep: `jszip` ^3.10.x. Justified in research.md R3 + Article IX.1 (hand-rolling zip-format encoding is a poor use of effort and a security risk surface). MIT-licensed, widely used, no native binaries, ships TS types. |
| | IX.2 Pinned versions | ✓ | Standard `package.json` pin. |
| | IX.3 No vendor lock-in | ✓ | Tile source pluggable; JSZip open source. |
| **X. Security** | X.1 No secrets in code | ✓ | None. |
| | X.2 Classification awareness | ✓ | The runtime path is `file://`-only — no implicit network or cloud assumption. |
| **XI. Internationalisation** | XI.1 I18N from the start | ✓ | SPA strings are externalisable (one strings module). |
| | XI.2 Locale-aware formatting | ✓ | Dates rendered via `Intl.DateTimeFormat`. |
| **XII. Community Engagement** | XII.2 Beta previews | ✓ | Heroku Review App + PR preview path applies. |
| **XIII. Contribution Standards** | All clauses | ✓ | Standard. |
| **XV. Strict Type Safety** | XV.1–XV.6 | ✓ | All new code TypeScript strict, no `any`. Boundary validation narrows inline-loaded JSON to typed models (XV.5). CI enforces (existing `tsc --noEmit` + ESLint gate). |

### Caveat on IV.2 (frontends never persist)

The export command writes a file to disk. This is **not** "persisting
application state" — it is a one-shot artefact export, equivalent to
the existing CSV export of tabular results (`apps/vscode/src/commands/`
already has precedent here, introduced in #178). The plot, sidecar,
session-state, and STAC assets — i.e. the things Article IV.4
governs — are read but not written. The writer abstraction is not in
scope for export operations.

If a future reader of the constitution interprets IV.2/IV.4 to cover
all disk writes including exports, this feature would conflict; the
existing CSV-export precedent demonstrates the current reading is
that artefact exports are out of scope. No tracker entry required;
flagged here for transparency.

### Gate decision

**All gates pass.** No Complexity Tracking entry needed.

## Project Structure

### Documentation (this feature)

```text
specs/264-briefing-zip-renderer/
├── plan.md              # This file
├── research.md          # Phase 0 — 8 design decisions resolved
├── data-model.md        # Phase 1 — on-disk artefact contracts + SPA state
├── quickstart.md        # Phase 1 — developer/reviewer flow
├── contracts/
│   ├── export-command.md       # debrief.storyboard.exportAsBriefingZip
│   ├── spa-loading.md          # SPA boot + playback + display modes
│   └── tile-coverage.md        # pure tile-coverage algorithm
├── checklists/
│   └── requirements.md  # Spec quality (all items pass)
├── evidence/
│   └── opening-context.md      # cached opener for the feature post (Phase 2)
├── spec.md              # User-facing spec (already in)
└── tasks.md             # Generated by /speckit.tasks (not yet present)
```

### Source Code (repository root)

```text
apps/briefing-renderer/                          # NEW — Vite + React SPA
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html                                   # template; SPA + inlined data slots
├── playwright.config.ts
├── run-playwright.mjs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store.ts                                 # local Zustand
│   ├── loaders/
│   │   └── inlineDataLoader.ts
│   ├── adapters/
│   │   ├── BrowserMapAdapter.ts                 # MapPanel port impl
│   │   ├── LocalSessionStoreAdapter.ts          # SessionStoreApi port impl
│   │   ├── BrowserPanelViewAdapter.ts           # PanelView port impl
│   │   └── BrowserTimeRangeViewAdapter.ts       # TimeRangeView port impl
│   ├── components/
│   │   ├── MinimalChrome.tsx
│   │   ├── PresentChrome.tsx
│   │   ├── ModeToggle.tsx
│   │   ├── TransportBar.tsx
│   │   └── TimeSlider.tsx
│   └── fixtures/
│       └── dev-fixture.ts                       # local-dev only
└── playwright/
    └── tests/
        ├── briefing-zip-file-protocol.spec.ts
        ├── briefing-zip-network-isolation.spec.ts
        ├── briefing-zip-playback.spec.ts
        ├── briefing-zip-mode-toggle.spec.ts
        └── briefing-zip-end-to-end.spec.ts

apps/vscode/
├── package.json                                 # add jszip dep + register command/menu
├── src/
│   ├── commands/
│   │   └── exportStoryboardAsBriefingZip.ts     # NEW command handler
│   └── services/
│       └── briefingZipExport/                   # NEW — pure helpers
│           ├── index.ts                         # exportBriefingZip() orchestrator
│           ├── scopeStoryboard.ts
│           ├── buildItemJson.ts
│           ├── computeTileCoverage.ts
│           ├── fetchTiles.ts                    # uses VS Code's HTTPS client
│           ├── injectInlineData.ts
│           ├── zipAssembler.ts
│           ├── scopeStoryboard.test.ts
│           ├── buildItemJson.test.ts
│           ├── computeTileCoverage.test.ts
│           ├── injectInlineData.test.ts
│           └── export.integration.test.ts
└── resources/
    └── briefing-renderer-static/                # NEW — copied from apps/briefing-renderer/dist
        ├── index.html
        ├── assets/                              # hashed JS/CSS/fonts
        └── tiles/
            └── placeholder.png

shared/components/
└── src/
    └── storyboard/
        └── playback/                            # NEW — hoisted from apps/vscode/src/services/
            ├── service.ts                       # StoryboardPlaybackService
            ├── ports.ts                         # MapPanel, SessionStoreApi, PanelView, TimeRangeView
            └── index.ts
```

**Structure Decision**: standalone SPA at `apps/briefing-renderer/`
(matching the `apps/backlog-navigator/` / `apps/spec-navigator/`
pattern); export logic in pure helper modules under
`apps/vscode/src/services/briefingZipExport/`; one mechanical hoist
of the existing playback service into `shared/components/`.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `TransportBar` | `apps/briefing-renderer/src/components/TransportBar.stories.tsx` (new) | `briefing-transport.js` | Demonstrates the Minimal-mode transport surface (play, pause, prev/next Scene). |
| `ModeToggle` | `apps/briefing-renderer/src/components/ModeToggle.stories.tsx` (new) | `briefing-mode-toggle.js` | Demonstrates the Present ↔ Minimal hover-revealed toggle. |

**Inclusion Criteria Applied**:
- [x] New visual component (TransportBar, ModeToggle, MinimalChrome, PresentChrome — all new)
- [x] Significant visual change (the briefing-renderer SPA is a new visual surface)
- [x] Interactive demo adds narrative value (Storybook lets a reader try the toggle without unzipping anything)

**Bundleability Verified**:
- [x] Stories will be added in the implementation phase (no existing dep on app context)
- [x] Components render standalone (use injected props, not app-wide context)
- [x] Reasonable bundle size expected — TransportBar + ModeToggle together < 50 KB

**Storybook Link** (post-implementation): `https://debrief.github.io/debrief-future/storybook/?path=/story/briefing-renderer-transportbar--minimal`

## Storybook E2E Testing

> Playwright runs in cloud sessions via bundled Chromium — these tests
> will execute on the briefing-renderer's own Playwright runner, not
> the shared-components Storybook runner.

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `TransportBar.stories.tsx` | Rendering in all theme variants; play/pause click; next/prev click; keyboard shortcuts | light, dark, vscode | click play, click next, press Space, press → |
| `ModeToggle.stories.tsx` | Toggle visibility on hover (Present); `P` key toggles | light, dark, vscode | mouse-move into top-right, press P, click toggle |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-label on transport buttons)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/BriefingTransportBar.spec.ts`
(uses the existing shared-components Storybook runner)

## Web-Shell E2E Testing

**None — no extension workflow changes routed through the web-shell.**

The "Export Storyboard as briefing zip…" command runs entirely inside
the VS Code extension host; it is invoked from the Storyboard panel,
which already has coverage in `storyboard-capture.spec.ts`. The
briefing zip's own playback is exercised by the dedicated
`apps/briefing-renderer/playwright/` suite (above). Adding a web-shell
spec that drives the command would duplicate that coverage without
adding signal — the export path's value is in the resulting zip, which
the briefing-renderer suite consumes directly.

If a future regression in the Storyboard overflow menu surfaces, the
existing storyboard-capture spec catches it.

## Complexity Tracking

**No entries** — all constitution gates pass; no violations need
justification. The single new dependency (`jszip`) is documented in
the Constitution Check § IX.1 row and in research.md R3.

## Phase 0 — Outline & Research

**Complete.** See [`research.md`](./research.md) for the eight design
decisions (R1–R8). All NEEDS-CLARIFICATION markers from the spec are
resolved; no unknowns remain.

Summary of decisions:

| # | Topic | Decision |
|---|-------|----------|
| R1 | `file://` loading strategy | Inlined `<script type="application/json">` for data; relative `<img>` / Leaflet `TileLayer` for binary assets. |
| R2 | Basemap tile coverage | Per-Scene captured zoom + interpolation-path coverage for time-range Scenes; +1 tile padding; `tiles/{z}/{x}/{y}.png` layout. |
| R3 | ZIP library | `jszip` ^3.10.x (new dep). |
| R4 | Playback engine | Hoist `StoryboardPlaybackService` to `shared/components/`; SPA supplies four port adapters. |
| R5 | Storyboard scoping | Closure of `storyboard_id`-matched Scenes + `visible_feature_ids` union. |
| R6 | Browser compat | Chrome, Firefox, Edge, Safari current; mobile best-effort. |
| R7 | SPA build & distribution | Vite static build → committed-bundle resource in the VS Code extension → copied into each export's zip. |
| R8 | Scene thumbnail bundling | Copy from `<item>/scene-thumbnails/` byte-for-byte; rewrite `item.json` `assets` map to point at the in-zip relative path. |

## Phase 1 — Design & Contracts

**Complete.** Artefacts:

- [`data-model.md`](./data-model.md) — on-disk artefact contracts (zip
  layout, `features.geojson`, `item.json`, inlined JSON blocks),
  SPA in-memory state, boundary-type guards (Article IV.5),
  validation gates at the briefing boundary.
- [`contracts/export-command.md`](./contracts/export-command.md) — full
  behaviour contract for `debrief.storyboard.exportAsBriefingZip`
  (inputs, output, step order, error behaviour, idempotency, test
  obligations, constitution-check notes).
- [`contracts/spa-loading.md`](./contracts/spa-loading.md) — SPA boot
  sequence, network-isolation contract, public component surface,
  display-mode behaviour, playback contract inherited from #217 / #258
  / #263, error / empty / loading states, replay behaviour.
- [`contracts/tile-coverage.md`](./contracts/tile-coverage.md) — pure
  function `computeTileCoverage` with algorithm, invariants, and full
  test obligations.
- [`quickstart.md`](./quickstart.md) — end-to-end developer flow,
  Playwright + Vitest commands, evidence-capture targets, reviewer
  smoke-test checklist.

### Agent context update

Run after Phase 1 to register new tech: `react-leaflet` (already in
the agent context, not new), `jszip` (new), `apps/briefing-renderer/`
(new app). Executed as part of this plan's `/speckit.plan` flow —
see § Post-design constitution re-check.

## Phase 1.5 — Media Components Assessment

See Media Components section above. Two Storybook stories planned
(TransportBar, ModeToggle). Confirmed by inclusion criteria. No
existing stories to extend.

## Phase 2 — Opening Context Capture

Cached opener for the eventual feature post lives at
[`evidence/opening-context.md`](./evidence/opening-context.md)
(written by the Content Specialist as the final step of `/speckit.plan`).

## Post-design Constitution Re-check

After Phase 1 design completed, re-verify each gate:

| Gate | Status post-design |
|------|--------------------|
| I.1 Offline by default | ✓ — design enforces via FR-015 + Playwright network-isolation spec. |
| I.3 No silent failures | ✓ — SPA error/empty states explicit; export aborts atomically on failure. |
| II.1 Single source of truth | ✓ — `BriefingFeatureCollection` is an alias of `PlotFeatureCollection`; `BriefingItemJson` is `Pick<StacItem, …>` with exhaustiveness guard. |
| IV.1 Services never touch UI | ✓ — hoisted `StoryboardPlaybackService` is host-agnostic by construction. |
| IV.4 Persistence-host abstraction | ✓ — feature does not write app state; briefing zip is a one-shot export artefact (precedent: #178 CSV export). |
| IV.5 Boundary types derived | ✓ — all boundary types derived, never rewritten. Exhaustiveness guard documented in data-model § 7. |
| IX.1 Minimal vetted dependencies | ✓ — one new dep (`jszip`), justified. |
| XV Strict type safety | ✓ — boundary validation narrows untyped JSON to typed models. |

**All gates remain green.** Implementation can proceed once #263 lands.

## Open follow-ups for `/speckit.tasks`

These belong in `tasks.md` (generated by the next command) but are
captured here for traceability:

1. **T-HOIST**: hoist `apps/vscode/src/services/storyboardPlayback.ts` →
   `shared/components/src/storyboard/playback/`. Update 3 imports.
   Net-zero logic change. Verifiable by existing tests still passing.
2. **T-SPA-SHELL**: scaffold `apps/briefing-renderer/` (package.json,
   vite.config.ts, tsconfig, run-playwright.mjs, index.html template,
   main.tsx, App.tsx, store.ts). Boots to "empty briefing" placeholder.
3. **T-ADAPTERS**: implement the four browser port adapters
   (BrowserMap, LocalSessionStore, BrowserPanelView, BrowserTimeRangeView).
4. **T-LOADER**: implement `inlineDataLoader` with boundary validation.
5. **T-CHROME**: implement Minimal + Present chrome (TransportBar,
   TimeSlider, ModeToggle, MinimalChrome, PresentChrome) + Storybook
   stories.
6. **T-EXPORT-PURE**: implement `scopeStoryboard`, `buildItemJson`,
   `computeTileCoverage`, `injectInlineData`, `zipAssembler` (pure
   helpers; full Vitest coverage).
7. **T-EXPORT-COMMAND**: implement `exportStoryboardAsBriefingZip`
   handler; register in `package.json` `contributes.commands` +
   `contributes.menus` (overflow menu).
8. **T-EXPORT-INTEGRATION**: integration test exercising the full
   export pipeline against a fixture plot.
9. **T-RESOURCE-SYNC**: wire the VS Code extension build to copy
   `apps/briefing-renderer/dist/` into
   `apps/vscode/resources/briefing-renderer-static/`.
10. **T-PLAYWRIGHT-LOAD**: SPA loads from `file://` and renders Scene 0.
11. **T-PLAYWRIGHT-NETISO**: zero external requests across load →
    play → toggle → replay.
12. **T-PLAYWRIGHT-PLAYBACK**: instant + time-range Scene playback
    matches expected trajectory.
13. **T-PLAYWRIGHT-MODES**: 10 consecutive mode toggles preserve state.
14. **T-PLAYWRIGHT-E2E**: end-to-end test exercising export → unzip →
    open → play.
15. **T-DOCS**: in-zip `README.txt` for the recipient; ADR for the
    "standalone SPA over PDF/screencast" decision.

`/speckit.tasks` will expand these into the formal task list with
dependencies, evidence-collection steps, and the PR-creation phase.
