# Legacy / Deprecated / Fallback Code Assessment

**Date**: 2026-04-17
**Scope**: Entire monorepo (excluding `.claude/worktrees/`, `pnpm-lock.yaml`, `uv.lock`, generated schemas, and spec contract files)
**Context**: Pre-1.0 rebuild — no backwards-compatibility burden.

## Summary

A targeted audit of `@deprecated`, `legacy`, `Deprecated:`, `backward compat`, and `fallback` markers across
Python and TypeScript source. Most flagged sites fall into four categories:

1. **True legacy shims** that can be deleted because the "new" branch is always taken — **removed**.
2. **Optional-field defaults** that are part of the component contract, not migration debris — kept.
3. **`Legacy Debrief` / REP-format references** that interface with the intentional Java v3 predecessor — kept.
4. **Graceful-degradation `fallback` patterns** (e.g. computed-style defaults, display placeholders) — kept.

No feature-flag gates or `if (false)` branches were found.

## High-confidence removals (actioned)

| Location | What it was | Why safe to remove |
|---|---|---|
| `apps/loader/src/main/service-paths.ts:65-71` | `getServicePath()` — `@deprecated` wrapper around `getServiceCommand()` | Only referenced in `apps/loader/docs/bundling.md`; no production callers. |
| `shared/components/src/FeatureList/FeatureList.tsx:23-27` + `147-149` | `onSelect?: (id: string) => void` — `@deprecated` single-select callback | Only consumers left are stories and self-tests; all production callers (`ActivityPanel`) already use `onSelectionChange`. Associated "Legacy callback" branch at line 147-152 collapses to the modern path. |
| `services/session-state/src/log/entryBuilder.ts:123-132` | `extractParametersFromOutputFeatures()` — `@deprecated` wrapper | Only referenced in its own unit tests. Functionality available via `extractFromOutputFeatures(...).parameters`. |
| `services/session-state/src/log/timeline.ts:21-60` + `98` | `normaliseEntry()` camelCase → snake_case converter | ADR-010 (decisions.md:293) explicitly mandates removal — "TypeScript reads snake_case directly from the generated types". Wire format is snake_case everywhere. Converter self-tests are removed with it. |
| `services/calc/debrief_calc/models.py:86-100` | `Provenance` and `SourceRef` Pydantic models — explicitly "Deprecated: Use LogEntry" | Only referenced by `debrief_calc.provenance.create_provenance` / `attach_provenance` (also deprecated) and their self-tests. No tool or runtime path uses them — modern tools emit `LogEntry` via `create_log_entry()`. |
| `services/calc/debrief_calc/provenance.py:143-191` | `create_provenance()` / `attach_provenance()` — explicitly "Deprecated" | Only consumers are their own self-tests. Replaced by `create_log_entry()` / `attach_log_entry()` (both present and used throughout codebase). |
| `services/calc/debrief_calc/__init__.py:24,26,44-45` | `Provenance` / `SourceRef` re-exports | Remove exports for removed symbols. |
| `services/calc/tests/test_provenance.py` classes `TestCreateProvenance` / `TestAttachProvenance` (`TestCreateProvenance` ≈ lines 253-287) | Self-tests of deprecated functions | Removed with their subjects. |
| `services/calc/tests/test_models.py` `TestProvenance` class (lines 68-86) | Self-tests of deprecated `Provenance` model | Removed with its subject. |
| `services/session-state/tests/unit/log/entryBuilder.test.ts` `describe('extractParametersFromOutputFeatures')` block | Self-tests of deprecated export | Removed with its subject. |
| `services/session-state/tests/unit/log/timeline.test.ts` `describe('normaliseEntry')` block | Self-tests of removed converter | Removed with its subject. |
| `apps/vscode/src/views/timeRangeView.ts:62-65, 227-230, 243-246, 255-258, 312-331` | Three "legacy" webview callback slots (`_onTimeChangeCallback`, `_onPlaybackStateChangeCallback`, `_onDisplayModeChangeCallback`) and the `onTimeChange` / `onPlaybackStateChange` / `onDisplayModeChange` public registration methods | Zero external callers (`SessionManager` now drives all state); the methods were never wired. Commands and session-state updates remain in place. |
| `services/io/src/debrief_io/types.py:20-25` | `Feature = DebriefFeature` alias kept "for backward compatibility" | No importer of `Feature` from `debrief_io.types` exists in the tree; only `FilePath` is imported. |

## Items intentionally kept

### `Legacy Debrief` (Java v3 predecessor) — INTENTIONAL
- `.claude/commands/tool.discover*` — scans Java source for migrate-able tools. Intentional.
- `services/io/**/*rep*.py` and `shared/components/**/rep*` — REP file format support inherited from Legacy Debrief. Intentional.
- `samples/` trees labelled "legacy" — canonical fixtures, don't remove.

### Real optional-field defaults (not migration debris)
- `shared/components/src/panels/PanelContext.tsx:23` — `artifactType?` default `'dataset'`: a live component contract for result-tab rendering.
- `shared/components/src/CascadingMenu/SearchableCascadingMenu.tsx` — `searchable` defaults to off; this is a feature toggle, not legacy.
- `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx` — `onHighlight` optional: deliberate API to support both single- and double-click modes (#174).
- `shared/components/src/LogPanel/LogEntry.tsx:282` — "render the front face (backwards compatible)": really just the behaviour when `onEditClick` isn't provided; this is the unflipped-card path, not legacy.

### Graceful-degradation fallbacks (not migration debris)
- `services/session-state/src/log/replayEngine.ts:166-169` — `'0.0.0'` placeholder semantics are documented and used by both writer and reader; removing this would break MCP-annotated entries that legitimately lack a real version.
- `services/session-state/src/persistence/load.ts:95, 184-192` — `coerceEpoch()` supports the documented session-file schema versioning contract (`isFutureVersion` gate above). Leaving in place until/unless the `{ epoch, iso }` form is gone from all samples.
- `apps/web-shell/src/services/toolService.ts:187` + `services/calc/debrief_calc/provenance.py:137` — "legacy single-object format" for `properties.provenance`: this path is reached at runtime when features in the wild still carry the pre-array shape; not safe to drop without a data migration.
- `services/session-state/src/log/entryBuilder.ts:79, 221-227` — `PythonProvenanceFallback` is a *forward* fallback when MCP annotations are missing, not a legacy shim.
- `shared/config-ts/tests/preferences.test.ts:50-51`, `services/config/tests/test_preferences.py:17-18` — test a user-supplied default value named `"fallback"`; not related to legacy code.
- All `fallback` variables in rendering/theme code (`ChartRenderer/transformer/theme.ts`, `FormatMenu/stylePropertyMap.ts`, etc.) — graceful defaults for missing data.

### Backward-compatible fixture data
- `shared/schemas/tests/ts/test_sensor_roundtrip.test.ts` — schema roundtrip tests explicitly cover "sensors-01" back-compat matrix. Kept per CONSTITUTION schema-test mandate.
- `services/stac/tests/test_collection.py::TestBackwardsCompatibilityUS2` — user-story coverage for catalog promotion. Kept.

## Not touched this pass (follow-up candidates)

These could be removed but require broader coordination or data migration:

- The array-wrap path for `properties.provenance` in `provenance.py`/`toolService.ts` (legacy single-object → array). Needs a one-shot migration of sample catalogs.
- `coerceEpoch({ epoch, iso })` in session-state load.ts. Needs confirmation that no committed session files use the struct form.
- The `choices`-vs-`param_type` duality documented in `specs/091-...` is in the schema, so requires a schema-regeneration pass.
