# Implementation Plan: Atomic (Transactional) Plot Save

**Branch**: `268-save-atomicity` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/268-save-atomicity/spec.md`

## Summary

Make a plot save all-or-nothing. Today a save is several independent writes —
`features.geojson` (a raw, non-atomic `fs.writeFileSync` that bypasses the
writer boundary), the STAC `item.json`, and thumbnail PNGs — and success is
reported before they all land, so a failure or interruption can leave a
half-updated, internally-inconsistent plot.

The approach adds **one host-agnostic boundary operation** — `commitPlotSave` —
that commits the whole save unit atomically, plus `reconcilePlotSave`, called
before the read on open, to heal an interrupted save. The desktop (filesystem)
adaptor implements atomicity with a **write-ahead intent journal** as the
commit point (stage temps → write journal → apply renames → clear; reconcile
rolls back before the journal exists, forward after). The browser (IndexedDB)
adaptor implements it with **one multi-store transaction** (atomic for free).
Enforcing this at the shared boundary (Article IV.4) means neither host can
regress it and the feature-collection write moves onto the boundary (FR-004).

## Technical Context

**Language/Version**: TypeScript 5.x (strict; Article XV). No Python change.
**Primary Dependencies**: `@debrief/stac-writer` (interface + core), `node:fs`/`node:crypto` (fs adaptor — existing), `idb` (web-shell adaptor — existing), `@debrief/schemas` (`FeatureCollection`, `StacItem`), VS Code Extension API (`window.showWarningMessage`). **No new runtime dependencies.**
**Storage**: VS Code → local filesystem STAC catalog (`item.json`, `features.geojson`, thumbnail PNGs). Web-shell → IndexedDB stores `items` / `payloads` / `assets` / `meta` (per-origin).
**Testing**: Vitest unit/integration (fault injection via mock-throw-on-Nth-write + `fake-indexeddb`); one web-shell Playwright happy-path smoke. No new test framework.
**Target Platform**: VS Code extension host (Node) + web-shell (browser).
**Project Type**: web (TS monorepo — shared library + two frontends).
**Performance Goals**: A normal save within 10% of current duration (SC-004) — staging adds one temp-write for `features.geojson` (thumbnails already staged) + a small journal write + renames; negligible for typical plots.
**Constraints**: Offline by default; no observable partial state (FR-001); atomicity not power-loss durability (Clarifications Q3); reconcile must precede the read on open.
**Scale/Scope**: Single-plot save flow, both hosts. Out of scope: multi-plot/batch save, concurrency control, browser thumbnail writing.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 (below).*

| Article | Gate | Status |
|---------|------|--------|
| **I. Defence-grade reliability** | No silent failures; offline; reproducible | ✅ **Directly serves I.3** — converts a silent partial-save into explicit success/failure (FR-005/006). Offline-only. |
| **II. Schema integrity** | Derived schemas, adherence tests | ✅ **No schema change** — reuses `FeatureCollection`/`StacItem`. LinkML untouched; adherence tests unaffected. |
| **III. Data sovereignty / provenance** | Provenance preserved, source retained | ✅ Commit path must not drop existing `item.json` provenance; source assets untouched. Verified in tests. |
| **IV. Architectural boundaries** | Frontends never persist; writer is the boundary | ✅ **Major alignment** — the new ops live on the shared `StacWriter`; the feature-collection write moves off raw `fs` onto the boundary (IV.2/IV.4); each host implements once. |
| **V. Extensibility** | Fail-safe loading | ✅ A failed save cannot corrupt the plot or crash core. |
| **VI/VII. Testing** | Tests gate merges; tests-first | ✅ Fault-injection acceptance tests written before/with implementation; contracts C1–C5 are the executable "done". |
| **VIII. Documentation** | Specs before code; ADRs for significant choices | ⚠️ **Add an ADR** for the journal/commit-marker decision (tracked as a task). Spec + plan present. |
| **IX. Dependencies** | Minimal, pinned | ✅ **No new dependencies.** |
| **XV. Strict types** | No `any`; strict; types derived | ✅ Strict TS; `CommitPlotSaveInput.thumbnails` is `Pick<>`; `SaveJournal` validated on read (XV.5). |

**Result**: PASS. No violations → Complexity Tracking is empty. One follow-up (ADR) tracked as a task, not a gate failure.

## Project Structure

### Documentation (this feature)

```text
specs/268-save-atomicity/
├── plan.md              # This file
├── research.md          # Phase 0 — commit-mechanism decision + grounding
├── data-model.md        # Phase 1 — boundary DTOs + SaveJournal record
├── quickstart.md        # Phase 1 — how to verify
├── contracts/
│   ├── stac-writer-commit.ts   # Type contract for the interface additions
│   └── save-flow.md            # Save + reconcile-on-open behavioural contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit.specify)
└── tasks.md             # /speckit.tasks output (NOT created here)
```

### Source Code (repository root)

```text
shared/stac-writer/src/
├── interface.ts                 # +commitPlotSave, +reconcilePlotSave on StacWriter;
│                                #  +CommitPlotSaveInput/Result, +ReconcilePlotSave*
└── (errors.ts unchanged — reuse StacWriterError)

apps/vscode/src/
├── services/stacWriterFs.ts     # Implement commitPlotSave (stage→journal→apply→clear)
│                                #  + reconcilePlotSave (roll back/forward); reuse atomicWriteSync
├── commands/saveSession.ts      # Call commitPlotSave; move markClean/"Plot saved" AFTER commit
└── commands/openPlot.ts         # Call reconcilePlotSave BEFORE loadPlotData; notify if recovered

apps/web-shell/src/
├── services/stacWriterIdb.ts    # Implement commitPlotSave (one multi-store txn) + reconcilePlotSave (clean/prune)
├── mocks/stacService.ts         # Save path: replace writeItem+writeAsset pair with commitPlotSave
└── (App.tsx / catalogReadView.ts) # Reconcile before read; surface non-blocking notice

docs/project_notes/decisions.md  # +ADR: FS save journal / commit-marker

tests:
apps/vscode/tests/unit/          # stacWriterFs.commitPlotSave.test.ts, reconcile, saveSession (extend)
apps/web-shell/src/services/__tests__/  # stacWriterIdb.commitPlotSave.test.ts (fake-indexeddb)
shared/stac-writer/              # interface/contract type tests
apps/web-shell/playwright/tests/ # save-atomicity.spec.ts (happy-path smoke)
```

**Structure Decision**: Existing monorepo layout — the change is concentrated
at the `@debrief/stac-writer` boundary (interface) and its two adaptors, with
thin call-site edits in each host's save command and open path. No new packages.

## Media Components

None - backend/infrastructure feature. The only user-visible surface is a
non-blocking notification on save failure / interrupted-save recovery, which
reuses existing host notification APIs; there is no new or changed visual
component and no Storybook story to bundle.

## Storybook E2E Testing

None - no interactive UI components.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Save plot then reopen → coherent | MapView, save affordance, plot load | `.leaflet-container`, save control, `[data-testid]` on the plot view | edit a plot, Save, reopen, assert it loads coherently with the new state |

**Testing Strategy**:
- [x] Happy-path save → reopen runs end-to-end in the web-shell (regression guard for FR-011)
- [x] Fault-injection guarantees (SC-001/002/003/005) are covered by **unit/integration** tests, not E2E (injecting a mid-write crash is reliable only at the adaptor seam)
- [ ] Screenshot not required (no visual change); the smoke asserts behaviour, not pixels

**Test File Location**: `apps/web-shell/playwright/tests/save-atomicity.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs save-atomicity`
- Local: `pnpm --filter @debrief/web-shell test save-atomicity`

## Complexity Tracking

No constitution violations — section intentionally empty.
