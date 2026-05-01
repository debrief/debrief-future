# Implementation Plan: Web-shell STAC write path (IndexedDB-only)

**Branch**: `236-web-shell-stac-writes` | **Date**: 2026-05-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/236-web-shell-stac-writes/spec.md`

> **Note** — this plan supersedes the earlier draft that proposed a Vite middleware POST/PUT/PATCH/DELETE write path. After review (Q1=A, Q2=A, Q3=A), the web-shell remains a pure static site and persistence moves entirely into IndexedDB. See `research.md` R-001 for the rationale.

## Summary

Replace `apps/web-shell/src/services/webSceneThumbnailAdapter.ts`'s session-only in-memory thumbnail store and `apps/web-shell/src/mocks/stacService.ts`'s read-only catalog mock with **browser-native IndexedDB persistence**. Define a new `StacWriter` TypeScript interface in `shared/stac-writer/` (browser-safe, no Node imports). Both hosts implement it: VS Code's adaptor wraps existing Node-fs code from `sceneThumbnailService.ts` and the write sections of `stacService.ts`; the web-shell's adaptor is a new IndexedDB-backed implementation. Bundled catalog items are read-only demo content; user writes layer on top as IndexedDB overlays. New items live entirely in IndexedDB. The web-shell stays a pure static site — deployable to GitHub Pages — with **zero Vite middleware changes** for writes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode mandatory per Article XV; no new languages)
**Primary Dependencies**: `idb` (small, well-typed Promise-based wrapper around IndexedDB — proposed new runtime dependency, single source, used by hundreds of projects, last-written 2025); `BroadcastChannel` (browser stdlib, no dep); existing `node:fs/promises` and `node:crypto` for VS Code adaptor; existing `@debrief/components` (`FilesystemAdapter` typed surface — read-only, untouched); existing `@debrief/session-state` (`saveSession` — untouched). **No server-side dependencies added; no new Vite plugins.**
**Storage**: Two backends behind one interface. VS Code: filesystem at `STAC_STORE_PATH` (existing — `preview/workspace/samples/local-store/` in dev, `apps/vscode/test-data/local-store/` in CI). Web-shell: per-origin IndexedDB database `debrief-stac-writer-v1` with object stores `items`, `assets`, `payloads`, `meta`. Bundled static catalog continues to be served read-only by the existing `/stac-store/` GET handler.
**Testing**: vitest (unit + parametrised cross-adaptor suite — same scenarios run against both backends); `fake-indexeddb` (vitest dep, ~30 KB, well-maintained) drives the web-shell adaptor in unit tests; Playwright via `@sparticuz/chromium` for the static-build capture-and-reload promise.
**Target Platform**: Browsers with IndexedDB v3 support (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ — all current LTS lines). Node.js 20.x (VS Code extension host).
**Project Type**: Web (existing monorepo: `apps/web-shell/` static frontend, `apps/vscode/` extension host, `services/` thick services, `shared/` browser-safe packages).
**Performance Goals**: Storyboard capture (write 800×600 PNG + 200×150 PNG + item-record patch) ≤ 200 ms p95 in the browser on dev hardware (IndexedDB transactions are typically < 50 ms for blobs of this size); metadata patch (no asset write) ≤ 50 ms p95; catalog read with overlay merge ≤ 100 ms p95 at the ≈ 74-item bundled scale.
**Constraints**: Static-site deployable (no server in the loop); offline-only (Article I.1); no silent failures (Article I.3) — every error path returns a structured response; bundled items immutable (FR-007); overlay-wins on bundle drift (FR-009); single-IndexedDB-transaction atomicity for compound operations (FR-016).
**Scale/Scope**: Bundled catalog ≈ 74 items (current sample corpus). User-side IndexedDB capacity: hundreds of items, low-thousands of assets, total under typical browser per-origin quota (50% of free disk on Firefox; ≈ 80% on Chrome). Typical capture session: 5–15 scenes per Storyboard, ≤ 3 Storyboards open per plot.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---|---|---|
| **I. Defence-Grade Reliability** | ✅ Pass | Pure browser-side persistence. No network. Errors structured (FR-017), no silent paths. Capability check (FR-021) catches IndexedDB-unavailable up-front. |
| **II. Schema Integrity** | ✅ Pass | No new master schemas. Writer treats item records as opaque-with-known-keys; existing LinkML-derived types unchanged. |
| **III. Data Sovereignty** | ✅ Pass | Provenance log carried through `patchItem` is preserved. Source assets never modified — bundled items are read-only by FR-007; IndexedDB writes never touch bundled bytes. Data stays local — IndexedDB is per-origin per-device, no telemetry. |
| **IV. Architectural Boundaries** | ⚠️ **Amendment in flight** (FR-024) | The strict reading of IV.2 ("frontends never persist") is incompatible with browser-native persistence. Article IV.4 amendment formalises that browsers may persist *behind the unified writer abstraction* — the abstraction is the persistence boundary, not the host. Constitution patch is part of this PR. |
| **V. Extensibility** | ✅ Pass | One interface, two adaptors. Future host (mobile, OPFS, server-backed) is a new adaptor, not a refactor. Broken adaptor in one host cannot crash the other. |
| **VI. Testing** | ✅ Pass | Plan mandates parametrised cross-adaptor unit suite (Phase 1.5), plus dedicated Playwright capture-and-reload against the static build. |
| **VII. TDD-AI** | ✅ Pass | Spec acceptance scenarios map to vitest + Playwright assertions; checklist gated. |
| **VIII. Documentation** | ✅ Pass | Constitution amendment + ADR for the interface extraction (planned). |
| **IX. Dependencies** | ⚠️ **Justified addition** | Adds `idb` (≈ 5 KB minified gzipped) and `fake-indexeddb` (test-only). Both pinned. Justification: writing IndexedDB cleanly without `idb` adds ≈ 200 LOC of Promise-around-event boilerplate per operation; `idb` is the de-facto standard wrapper (Jake Archibald, Google, last commit < 6 months); `fake-indexeddb` is the only mature in-memory IndexedDB for tests. Both meet Article IX.1's "minimal, vetted" bar. |
| **X. Security** | ✅ Pass | Same-origin only by browser policy. No auth, no secrets, no cross-origin reads/writes. |
| **XI. I18N** | N/A | Two new user-facing strings (Session-only badge variants and storage-quota error). Both routed through the existing i18n surface. |
| **XII. Community** | ✅ Pass | Static deployment to GitHub Pages — every PR's preview app gets persistent captures. Beta-preview surface remains. |
| **XIII. Contribution** | ✅ Pass | Single PR, atomic commits per the strangler-fig migration in research.md R-005. |
| **XIV. Pre-Release Freedom** | ✅ Pass | Breaking change to writer interface is permitted. |
| **XV. Strict Type Safety** | ✅ Pass | Interface uses no `any`. Boundary types narrow at the IndexedDB callback boundary (untyped event → typed Promise via `idb`). VS Code adaptor preserves existing strict typing. |

**Verdict**: PASS conditional on Article IV amendment landing in this PR (FR-024) and the `idb` + `fake-indexeddb` additions surviving Article IX scrutiny (research.md R-006).

## Project Structure

### Documentation (this feature)

```text
specs/236-web-shell-stac-writes/
├── plan.md              # This file
├── research.md          # Phase 0 — design decisions
├── data-model.md        # Phase 1 — interface types + IndexedDB schema
├── quickstart.md        # Phase 1 — dev workflow
├── contracts/
│   ├── stac-writer.ts        # TS interface (single source of truth)
│   └── indexeddb-schema.md   # IndexedDB schema for the web-shell adaptor
├── checklists/
│   └── requirements.md  # Quality checklist
└── evidence/
    └── opening-context.md    # Phase 2 — cached blog opener
```

### Source Code (repository root)

```text
shared/stac-writer/                            # NEW — browser-safe types + interface
├── package.json                               # @debrief/stac-writer (no Node imports)
├── tsconfig.json
├── src/
│   ├── index.ts                               # Public surface
│   ├── interface.ts                           # StacWriter interface + operation I/O types
│   ├── errors.ts                              # StacWriterError taxonomy
│   └── overlay.ts                             # Pure functions: mergeOverlay, dropBundledOnly
└── tests/                                     # Type-only contract tests (no runtime)

apps/web-shell/                                # MODIFIED — IndexedDB adaptor + capability check
├── src/
│   ├── services/
│   │   ├── stacWriterIdb.ts                   # NEW — IndexedDB implementation of StacWriter
│   │   ├── stacWriterCapability.ts            # NEW — capability probe (`navigator.storage`, `indexedDB`)
│   │   ├── webSceneThumbnailAdapter.ts        # MODIFIED — capture path delegates to stacWriterIdb; "Session-only" badge gated on capability report
│   │   └── catalogReadView.ts                 # NEW — merge bundled catalog + IndexedDB overlay/items into a single read view
│   ├── mocks/
│   │   └── stacService.ts                     # MODIFIED — patch and getPlotData routes through stacWriterIdb + catalogReadView
│   └── App.tsx                                # MODIFIED — wire the BroadcastChannel listener for cross-tab updates
├── playwright/tests/
│   └── stac-writes.spec.ts                    # NEW — capture + reload + new-item + GeoJSON-overwrite + capability-failure
└── package.json                               # MODIFIED — add `idb`, `fake-indexeddb` (test only)

apps/vscode/src/services/
├── stacWriterFs.ts                            # NEW — Node-fs implementation of StacWriter (extracted from sceneThumbnailService + stacService write methods)
├── sceneThumbnailService.ts                   # MODIFIED — body delegates to stacWriterFs; export shape unchanged for callers
└── stacService.ts                             # MODIFIED — updateItemMetadataSync body delegates to stacWriterFs.patchItem; mtime conflict + provenance handling preserved

CONSTITUTION.md                                # MODIFIED — Article IV.4 amended with persistence-host carve-out
.specify/memory/constitution.md                # MODIFIED — synced

docs/project_notes/decisions.md                # MODIFIED — new ADR recording the interface extraction + IndexedDB choice

shared/components/                             # MODIFIED — only if the read view's overlay-merge needs a CatalogOverviewItem flag for "is bundled" provenance (TBD in Phase 1)
```

**Structure Decision**: Web monorepo with the new browser-safe interface in `shared/stac-writer/` and a host-specific implementation file in each `apps/<host>/src/services/`. The interface lives in `shared/` because it must be browser-safe (web-shell imports it), and the implementations live in their respective hosts because each is backend-specific (Node fs vs IndexedDB). This factoring matches Article IV.4 (the new amendment): the interface is the persistence boundary, the host adaptors are implementation detail.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|

**None — backend/infrastructure feature.** This work changes a persistence layer; the visible effect ("captures persist", "Session-only badge disappears") is observable on existing components (`StoryboardPanel`, `PropertiesPanel`, drawing toolbar) without introducing any new visual element. The Session-only-with-IndexedDB-unavailable banner is a one-line variant of the existing badge — not worth a Storybook story. No bundle for the blog post — the post will lean on a before/after mermaid architecture diagram and a reload-survival GIF.

## Storybook E2E Testing

**None — no interactive UI components.** Existing `shared/components/e2e/StoryboardPanel.spec.ts` will continue to use the session-only fixture; the new persistence behaviour is verified via web-shell Playwright (next section), which is the correct surface for full-workflow E2E.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Capture scene → reload → scene survives | `StoryboardPanel`, `MapView` | `[data-testid="storyboard-capture-button"]`, `[data-testid="storyboard-scene-list"] [data-testid^="scene-"]`, `[data-testid="storyboard-session-only-badge"]` | open plot, capture scene, hard-reload, assert scene + thumbnail present, assert badge absent |
| Edit metadata → reload → edit survives | `PropertiesPanel` | `[data-testid="properties-panel-description"]`, `[data-testid="properties-panel-save"]` | open bundled item, edit description, save, hard-reload, assert overlay applied |
| New item → reload → item present | `StacFileTree`, drawing toolbar | drawing tool selectors, `[data-testid="catalog-item-list"]` | draw track, save with name, hard-reload, assert new item visible alongside bundled |
| IndexedDB unavailable → badge stays | `StoryboardPanel` | as above | stub `indexedDB` to `undefined` via `addInitScript`, assert badge visible + structured error on capture |
| Cross-tab sync | `StoryboardPanel` × 2 | as above | open same plot in two tabs, capture in tab A, assert tab B's panel updates within 1s via BroadcastChannel |

**Testing Strategy**:
- [x] Workflow runs end-to-end against the **static build** (`pnpm --filter @debrief/web-shell build` + `vite preview`), proving SC-006: the persistence promise survives without any Vite middleware in the loop.
- [x] Each test seeds against a clean IndexedDB by deleting the database in `beforeEach` (via `indexedDB.deleteDatabase`).
- [x] Reload-survival is the load-bearing assertion — every test that captures or edits MUST hard-reload before its assertions.
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for new selectors (reuse `AnalysisPage` / `CatalogPage` rather than duplicating).

**Test File Location**: `apps/web-shell/playwright/tests/stac-writes.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs stac-writes`
- Local: `pnpm --filter @debrief/web-shell test stac-writes`

## Phase 0: Outline & Research

**Output**: `research.md` covers six design decisions:

1. **Why IndexedDB instead of Vite middleware writes** — pivot rationale, the static-deployment constraint, and what changes vs. the earlier draft plan.
2. **Where to host the writer interface and adaptors** — `shared/stac-writer/` for the interface, per-host service files for the adaptors. Decision: matches Article IV.4 boundary.
3. **IndexedDB schema design** — four object stores (`items`, `assets`, `payloads`, `meta`), keying scheme, transaction shape for compound ops.
4. **Bundled-catalog overlay merge semantics** — shallow merge, overlay-wins-silently, no tombstones. Locked by Q1/Q2 decisions.
5. **Cross-tab coordination** — `BroadcastChannel` for "item changed" notifications; best-effort, no leases. Decision: sufficient for Phase 1.
6. **Article IV constitutional amendment wording (revised)** — final text of the IV.4 amendment, accounting for the IndexedDB pivot.

Plus the third-party-dependency justification:
7. **`idb` and `fake-indexeddb`** — why the additions clear Article IX, why they're cheaper than hand-rolling.

## Phase 1: Design & Contracts

**Outputs**: `data-model.md`, `contracts/stac-writer.ts`, `contracts/indexeddb-schema.md`, `quickstart.md`.

- **`data-model.md`** — Interface I/O types (`PatchItemInput`, `WriteItemInput`, `WriteAssetInput`, `WriteSceneThumbnailPairInput`, `DeleteItemInput`, `DeleteAssetInput`, `CapabilityReport`); the `StacWriterError` taxonomy with discriminated `kind`; the IndexedDB schema (four object stores); the `mergeOverlay` semantics (pure function on item records).
- **`contracts/stac-writer.ts`** — TypeScript interface for the writer. Single source of truth for operation signatures. Browser-safe (no Node imports).
- **`contracts/indexeddb-schema.md`** — Object stores, key paths, indexes, version migration policy.
- **`quickstart.md`** — Developer-facing recipe for capturing a scene in the static-built web-shell, watching it persist in IndexedDB, reloading, observing it survive — plus the smoke commands a contributor runs to verify both adaptors locally.

**Re-evaluation of Constitution Check post-design**: Article IV amendment text in research.md R-006 reviewed against the new module structure. No new violations surface; the writer interface is pure types, both adaptors are host-local, bundled items are not modified.

## Phase 1.5: Media Components Assessment

Already populated above — **None — backend/infrastructure feature.** The blog post will lean on a before/after diagram (mermaid Hook), not a Storybook bundle.

## Phase 2: Opening Context Capture

Cached opener written by the Content Specialist agent and saved to `evidence/opening-context.md`. Hook form: **mermaid diagram** (architecture before/after — the cleanest single-image way to convey "two hosts now route through one interface, with backend-appropriate persistence each").

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Article IV.2 carve-out (becomes IV.4) | Browser-only persistence is by definition frontend-side. Without the amendment, the strict reading of IV.2 forbids the entire feature. The amendment formalises that the *writer abstraction* is the persistence boundary, not the host — re-anchoring IV.2 around interface design rather than process boundary. | Without the amendment, the feature can't ship. Maintaining the strict reading would force a Node-side write path, which contradicts the explicit constraint that the web-shell remains a static site. |
| New `idb` and `fake-indexeddb` runtime dependencies (Article IX) | `idb` saves ≈ 200 LOC of event-callback boilerplate per operation; without it, the IndexedDB code would be substantially larger and slower to review. `fake-indexeddb` is the only mature in-memory IndexedDB stub — without it, unit tests would need to drive a real browser, breaking the parametrised cross-adaptor suite. | Hand-rolling Promise-around-event wrappers would add code without value; running unit tests against a real browser would break the parametrised suite that's the heart of the test strategy. Both deps are well-maintained, last-touched within 6 months, MIT-licensed, sub-10KB minified. |
| New `shared/stac-writer/` package (≈ 1 of 8 budget) | Two hosts need the same interface, type definitions, and overlay-merge logic. Without a shared package, either both hosts duplicate the types (DRY violation) or one host imports from the other (forbidden cross-app coupling). | Inlining types in `shared/components/` would mis-classify a domain-specific module as a UI-component module. Inlining in either app would force the other app to cross workspace boundaries. |
