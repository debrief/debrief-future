# T005 — schema deletion safety

Captured 2026-05-28. Gates the Phase 2 schema deletions.

## `SystemStateProperties.bbox` / `.zoom` / `.center` — ZERO runtime consumers ✅

`grep` over `apps services shared` (`*.ts`/`*.tsx`, excluding `node_modules`) for SystemState-scoped
`bbox`/`zoom`/`center` references returns **nothing**.

The only superficially-matching hits are unrelated:
- `apps/vscode/src/webview/mapPanel.ts:883` — `spatial.viewport?.zoom` reads `ViewportPolygon.zoom`
  (the viewport's own zoom — **kept**), not `SystemStateProperties.zoom`.
- `shared/components/src/StacBrowser/useBrowserFilter.ts` — `item.bbox` is the **STAC item** bbox, unrelated.

➡️ Safe to remove `bbox`/`zoom`/`center` from `SystemStateProperties` (Article XIV.1, FR-002).

## Generated `SessionFile` / `SessionState` / slice classes — NO runtime importer ✅

`grep` for imports of the generated `SessionFile` / `TemporalSlice` / `SpatialSlice` / `FeaturesSlice` /
`DocumentSlice` / `ResultsSlice` / `BrowserFilterSlice` from `@debrief/schemas` returns only **comments**
in `services/session-state/src/types/*.ts` (e.g. `* Schema equivalent: @debrief/schemas#FeaturesSlice`,
`* Not migrated: ...`). The TS store uses hand-authored interfaces in `services/session-state/src/types/`,
never the generated slice classes.

➡️ Safe to delete `SessionFile`/`SessionState` from `session-state.yaml` (T011) and the slice classes,
   provided no Pydantic-side adherence test imports them (verified: no `test_*` imports them as runtime types;
   they are only schema-generation artefacts).

## Value-type consolidation targets (FR-002a) — currently in `session-state.yaml`
`ViewportPolygon`, `TimeStep` + `TimeUnitEnum`, `DisplayModeEnum`, `PlaybackStateEnum`, `TimeInstant`,
`TimeRange`, `TimeFilter`. Plus duplicate `DisplayModeEnum` in `storyboard.yaml` and duplicate `Coordinate`
in `session-state.yaml`. All move to / dedup into `common.yaml`. Generated symbol names unchanged
(master `debrief.yaml` already imports every cluster) — codegen invariant per linkml-delta §2.
