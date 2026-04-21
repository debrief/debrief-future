# Phase 0 Research: Schema-Rooted DisplayMode and PlaybackState Enums

**Feature**: 205-displaymode-playbackstate-linkml
**Date**: 2026-04-21
**Input**: [plan.md](./plan.md) — resolve mechanism questions before Phase 1 design artefacts.

## Scope of research

The spec and plan frame five concrete unknowns that must be resolved before committing to the LinkML edit and the generator post-processor change:

1. How do we make `TemporalSlice.playbackState` and `TemporalSlice.displayMode` emit a narrow, schema-rooted TypeScript type instead of the current `string`, without breaking component callers that write `'playing'` / `'paused'` / `'trail'` as string literals?
2. Is renaming the `DisplayModeEnum` permissible values from `normal|snailTrail` to `full|trail` in LinkML sufficient to propagate through `gen-pydantic`, `gen-typescript`, and `gen-json-schema` without additional changes, and are there any installed-base artefacts (fixtures, golden JSON, persisted session-state) that would need value migration?
3. What is the full inventory of TS consumer sites that must change, and what is the smallest unit of edit per file (import-only rename vs structural widen vs translator deletion)?
4. For the component-side three-state widening (`stopped ≡ paused`), what is the safest mechanical edit — widen every consumer surface, or keep internal narrowing and document it — and which is consistent with Article XV (strict type safety)?
5. What is the atomic-PR sequencing (edit, regen, post-processor, consumer migration, tests, ADR) that keeps every `task verify` step green at every intermediate commit if the PR is squash-merged, given a reviewer might bisect within it?

Item 2 also absorbs the "no installed-base session-state JSON" verification called for by Spec Assumption §3.

## 1. TypeScript emission path for enum-ranged slots on TemporalSlice

### Decision
Extend `shared/schemas/scripts/generate.py` post-processor with **one new rule** that:

1. Injects two template-literal type declarations immediately after their respective `enum` blocks in the generated `shared/schemas/src/generated/typescript/types.ts`:
   ```ts
   export type PlaybackState = `${PlaybackStateEnum}`;
   export type DisplayMode = `${DisplayModeEnum}`;
   ```
2. Narrows the two `TemporalSlice` field emissions from `string` to the newly introduced template-literal type:
   ```ts
   // before
   playbackState: string,
   displayMode: string,
   // after
   playbackState: PlaybackState,
   displayMode: DisplayMode,
   ```

### Rationale
- **Established precedent in the repo.** Feature 201 / FR-014 solved the identical problem for `PositionStyle.symbol` (enum-ranged slot emitting as `string`) via `PointShape = \`${PointShapeEnum}\`` at `generate.py:439-476`. The comment block on that post-processor rule is explicit: "gen-typescript emits `string` for enum-ranged attributes; without this narrowing, callers cannot catch `{ symbol: 'star' }` at compile time." The same reasoning applies here; reusing the pattern keeps the post-processor mechanism singular and auditable.
- **String-literal ergonomics preserved.** With the template-literal union approach, component callers can continue writing `setDisplayMode('trail')` and `{ playbackState: 'playing' }` without enum-member references (`PlaybackStateEnum.playing`). This matters because ~25 call sites already use string-literal form; switching to member-reference form would be a significant churn tax unrelated to the consolidation goal.
- **TypeScript enum + template-literal interoperate correctly.** `${X}` on a string enum yields a literal-union of each member's string value. Assignability goes both ways — `PlaybackStateEnum.playing` is assignable to `PlaybackState`, and `'playing' as const` is assignable to `PlaybackState`. This is the behaviour Feature 201 relied on and has been live in this repo since #201 shipped.
- **Pydantic side needs no equivalent pattern.** Pydantic already emits `playbackState: PlaybackStateEnum` / `displayMode: DisplayModeEnum` in `shared/schemas/src/generated/python/debrief_schemas/__init__.py` (verified via grep). The post-processor need only handle the TS-side gap.
- **No impact on JSON Schema output.** JSON Schema uses enum-value listings directly; the TS post-processor is TS-only.

### Alternatives considered
- **Use the bare TS `enum` as the field type (`playbackState: PlaybackStateEnum`).** Rejected: forces all ~25 call sites to either import `PlaybackStateEnum` and write `PlaybackStateEnum.playing` (verbose) or keep string literals and cast (`'playing' as PlaybackStateEnum`), which re-introduces `as` casts at migration sites — a direct Article XV regression.
- **Emit `playbackState: 'stopped' | 'playing' | 'paused'` as a raw string-literal union in the post-processor.** Rejected: duplicates the enum member list in two places (the `enum` block and the union), creating a new drift vector — exactly what this feature exists to eliminate.
- **Upgrade the LinkML generator to emit enum-typed fields natively.** Rejected: scope creep. The existing repo has multiple post-processor rules (`PointShape`, `GeoJSONFeature`/`RawGeoJSONFeature`, coordinate tuple fixes) that already compensate for gen-typescript limitations. Adding a generator-level upgrade is a multi-feature discussion that belongs in a dedicated item, not in this consolidation.
- **Keep `string` emission and rely on component code's existing discriminated unions.** Rejected: this is the status-quo problem — losing narrowing at the `TemporalSlice` read point is how the drift got in. Spec FR-007 explicitly demands enum-typed fields post-change.

### Risk & mitigation
- **Risk**: If the LinkML source adds a third enum-ranged attribute to a slot on a class the post-processor doesn't know about, the new rule silently skips narrowing. **Mitigation**: the post-processor rule raises `RuntimeError` when its sentinel tokens (`"playbackState: string,"`, `"displayMode: string,"`) are not found — same defensive pattern as the existing `RawGeoJSONFeature` rule at `generate.py:517-523`. A future third attribute becomes a loud failure at generate time.
- **Risk**: Template-literal emission order depends on the enum being declared before the field reference. Both enums are declared at lines 393–411 of the generated file and `TemporalSlice` is at line 1795 — declaration order is safe.

### Review note (6A): keep the three post-processor blocks inline; no helper function

Post-review the question was raised whether the new PlaybackState + DisplayMode rules plus the existing PointShape block constitute enough duplication to warrant a helper `_narrow_enum_slot(content, enum_name, alias_name, slot_narrowings)`. Decision: **no**. Each block has subtle quirks (PointShape narrows two distinct class.field sites; PlaybackState/DisplayMode narrow one each on TemporalSlice and need per-enum-description text) that would bloat the helper's parameter list. The inline-block convention is the established pattern in `generate.py` (see the GeoJSONFeature tagging rule at `generate.py:477-484`, the RawGeoJSONFeature four-field rule at `generate.py:486-524`, and the PointShape + symbol-narrow pair at `generate.py:439-475`). Three blocks × ~25 lines is acceptable duplication at this scale; a helper becomes interesting at ≥ 5 sites.

## 2. LinkML rename propagation & installed-base check

### Decision
Edit `shared/schemas/src/linkml/session-state.yaml` lines 34–40 to rename `DisplayModeEnum` permissible values:

```yaml
# before (current)
DisplayModeEnum:
  description: Track visualization display mode
  permissible_values:
    normal:
      description: Standard track display
    snailTrail:
      description: Trail showing recent positions

# after
DisplayModeEnum:
  description: Track visualization display mode.
    `full` renders the entire track regardless of current time;
    `trail` renders a snail-trail from track start up to current time.
  permissible_values:
    full:
      description: Render the entire track regardless of current time
    trail:
      description: Render a snail-trail from track start up to current time
```

Extend the `PlaybackStateEnum` description with a short, UI-agnostic ADR reference (FR-003 / review 7A — Article IV separation of services from UI). The schema description MUST NOT name UI elements; the full rendering rule (with buttons, playhead, etc.) lives in the ADR body.

```yaml
PlaybackStateEnum:
  description: >-
    Current state of time playback. Component consumers treat `stopped`
    as equivalent to `paused`. See ADR-NN in docs/project_notes/decisions.md.
  permissible_values:
    stopped:
      description: Playback is stopped
    playing:
      description: Playback is running
    paused:
      description: Playback is paused
```

The `ADR-NN` placeholder is replaced at implementation time with the two-digit ADR number assigned during commit (next available appears to be `ADR-022` given #204 shipped as `ADR-021`). The `See ADR-NN in docs/project_notes/decisions.md` form is the cross-reference convention introduced by this feature (FR-032 / review D3), validated at lint time by `scripts/check-adr-refs.sh`.

### Rationale
- **Component UI vocabulary wins for DisplayMode.** The user-facing `DisplayModeToggle` buttons read "Full" / "Trail" (verified in `shared/components/src/TimeController/DisplayModeToggle.tsx:37-51`). Aligning the enum identifiers with the visible label eliminates an impedance-mismatch that today is papered over by 7+ translation ternaries. The idea doc's authored decision (`docs/ideas/205-displaymode-playbackstate-linkml.md`, Proposed Solution §1) specifies `full|trail` explicitly.
- **PlaybackState vocabulary is already canonical.** LinkML already has `stopped|playing|paused`; session-state uses the same values; only components had the narrower two-value copy. No LinkML value edit needed for this enum.
- **LinkML description is the docstring source for generated code.** LinkML's `description` field is propagated through `gen-pydantic` to the generated `Enum` class docstring and through `gen-typescript` to the `/** ... */` JSDoc block preceding the enum declaration. Embedding the `stopped ≡ paused` rule in the description makes the rule discoverable from an IDE hover on the enum member — Article VIII (Documentation) with no extra documentation round-trip.
- **No installed-base JSON fixtures carry legacy `"displayMode"` values.** A full-tree search (`grep -rE '"displayMode"' --include='*.json' .` excluding `node_modules` and `dist`) returned zero matches at the time of writing. The `DEFAULT_TEMPORAL_SLICE` default in `services/session-state/src/types/temporal.ts:149` writes `'normal'` at runtime but nothing persists that value to disk within the repo. There is no installed base of Debrief v4 users outside the repo (pre-release, per Article XIV), so no migration path is owed.

### Alternatives considered
- **Keep LinkML values `normal|snailTrail` and adapt components to use them.** Rejected: the idea doc explicitly proposed `full|trail`, and aligning with the user-visible label (`DisplayModeToggle` button text) is the shorter path to eliminating the translation ternaries without touching the presentation layer's vocabulary.
- **Rename to `full|trail` in a follow-up PR after first landing the consolidation with `normal|snailTrail` as the canonical.** Rejected: splitting the rename from the consolidation doubles the migration count (every consumer changes vocabulary twice) and introduces a transient state where the hand-typed `DisplayMode` is deleted but the LinkML vocabulary still doesn't match the UI labels. Single atomic PR is strictly cheaper.
- **Add a compatibility alias in LinkML (accept both `normal` and `full`).** Rejected: compatibility aliases on a pre-v4.0.0 release violate Article XIV's intent to move fast, and the zero-installed-base verification above removes the only reason to consider them.

### Follow-up check during implementation
- After regenerating, grep for any remaining `'normal'`, `'snailTrail'` string literals in `apps/`, `shared/`, and `services/` (excluding generated artefacts and `node_modules`). Expect zero matches — any match is a missed migration site.

## 3. Consumer inventory

### Decision
**Four hand-typed declarations are deleted, 8 translator sites are deleted, and ~30 TypeScript files receive an import-path rename or small-scope edit. Zero Python consumers need source edits** (Pydantic regeneration handles everything on the Python side).

### Rationale
The inventory was assembled from three grep sweeps over the post-spec tree (excluding `node_modules` and `dist/`):

```sh
# Hand-typed declarations
grep -rnE '^(export\s+)?type\s+(DisplayMode|PlaybackState)\b' apps/ shared/ services/
# Translator patterns
grep -rnE "=== 'snailTrail'|=== 'normal'|=== 'trail'|=== 'full' " apps/ shared/
# All consumer references (for the import-rename inventory)
grep -rlE 'DisplayMode|PlaybackState' apps/ shared/ services/ --include='*.ts' --include='*.tsx'
```

Results:

**(a) Four hand-typed declarations to delete** (FR-010 – FR-015):
- `shared/components/src/utils/types.ts:80` — `export type DisplayMode = 'full' | 'trail'`
- `shared/components/src/TimeController/types.ts:17` — `export type PlaybackState = 'playing' | 'paused'`
- `services/session-state/src/types/temporal.ts:105` — `export type PlaybackState = 'stopped' | 'playing' | 'paused'`
- `services/session-state/src/types/temporal.ts:110` — `export type DisplayMode = 'normal' | 'snailTrail'`

**(b) Eight translator sites to delete** (FR-018 – FR-021):
- `apps/vscode/src/views/activityPanelView.ts:210, 252, 434, 467` — four DisplayMode ternaries (three one-way, one reverse)
- `apps/vscode/src/views/timeRangeView.ts:253` — one reverse DisplayMode ternary
- `apps/vscode/src/webview/mapPanel.ts:688, 704, 873` — three DisplayMode ternaries (one-way)
- `apps/web-shell/src/App.tsx:96-100` — `toComponentMode` + `toStoreMode` helpers with divergence comment (covers lines 98, 100; ternary count total: 7 ternaries + 2 helpers = 9 translation code sites, but 8 independent call sites because mapPanel uses the same pattern thrice)

**(c) One IPC message shape to retype** (FR-022):
- `apps/vscode/src/views/activityPanelView.ts:47-49` — `TemporalDisplayModeMessage.payload.mode` from `'full' | 'trail'` to `DisplayMode` (generated).

**(d) One default-value change** (FR-013, SC-011):
- `services/session-state/src/types/temporal.ts:149` — `displayMode: 'normal'` → `displayMode: 'full'`.

**(e) Import-rename-only files** (FR-017 omnibus):
The migration-only set comprises files that reference `DisplayMode` or `PlaybackState` but need no structural edit other than an `import` statement swap to `@debrief/schemas`:

- `apps/vscode/src/commands/index.ts`
- `apps/vscode/src/webview/messages.ts`
- `apps/vscode/src/webview/web/mapView.tsx` (also uses string-literal `'full'`)
- `apps/vscode/src/webview/web/activityPanel.tsx`
- `apps/vscode/src/webview/web/timeController.tsx`
- `apps/web-shell/playwright/components/TimeController.ts`
- `apps/web-shell/playwright/tests/time-controller.spec.ts`
- `apps/web-shell/playwright/tests/undo-redo-split.spec.ts`
- `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- `shared/components/src/MapView/{MapView,TemporalTrackLayer,useTemporalTrack,SensorBearingLayer,sensor-utils,ExerciseAlpha.stories,PositionStyling.stories,SensorRendering.stories,TemporalTrack.stories}.tsx|.ts` (10 files)
- `shared/components/src/TimeController/{TimeController,TimeController.test,TimeController.stories,useTimePlayback,useTimePlayback.test,DisplayModeToggle}.tsx|.ts` (6 files — DisplayModeToggle is import-rename-only because the internal string-literal vocabulary already matches)
- `shared/components/src/index.ts` (barrel)
- `services/session-state/src/store/slices/temporal.ts`
- `services/session-state/tests/unit/slices/temporal.test.ts`
- `services/session-state/tests/unit/dirty.test.ts`
- `services/session-state/tests/unit/persistence.test.ts`
- `services/session-state/tests/unit/undo.test.ts`

**(f) One component surface widening** (FR-016):
- `shared/components/src/ActivityPanel/types.ts:94` — prop `playbackState?: 'playing' | 'paused'` widens to `playbackState?: PlaybackState`.

### Alternatives considered
- **Keep one package-local alias (e.g. re-export `DisplayMode` from `@debrief/utils`) and migrate consumers to it instead of `@debrief/schemas` directly.** Rejected: the feature is about removing drift vectors; introducing a new re-export location with its own lifecycle reintroduces the same class of problem. `@debrief/components` and `@debrief/session-state` re-export through their own barrels for ergonomic in-package consumption (FR-010 / FR-011 / FR-013) — but the **source** of the type is `@debrief/schemas` everywhere, and that is the rule the ADR records.
- **Break the migration into two PRs (schema/regen first, consumer sweep second).** Rejected: the post-processor's `RuntimeError` sentinel means the repo does not compile cleanly at the "schema-regen-only" intermediate state; an atomic PR is the only shape that satisfies Article VI.4 ("CI MUST pass" at merge). Per Spec SC-009 the PR is reviewed atomically.

## 4. Component-side three-state widening strategy

### Decision
**Widen every public surface that accepts `PlaybackState`** (`ActivityPanel/types.ts:94`, `TimeController/types.ts:51, 103`, `TimeController/PlaybackControls.tsx` props, `TimeController/TimeController.tsx` callbacks) **to the full three-value `PlaybackState` template-literal union**; **keep the internal `useState` in `useTimePlayback.ts` at two values (`'playing'`, `'paused'`) with a one-line doc comment explaining the narrowing is safe because the hook never receives `'stopped'` from its own setters**; and **treat `stopped` as identical to `paused` in every component-side branch** (FR-023 – FR-025).

### Rationale
- **Symmetry with Article XV.** Widening the surface is the type-safe move — any caller handing a `TemporalSlice.playbackState` into a prop should not need to pre-narrow. The props post-change accept the full union; callers never cast.
- **Internal state remains two-valued because the hook owns its state.** `useTimePlayback` writes `'playing'` and `'paused'` into its own state; it never receives `'stopped'` from outside. Widening the internal state adds zero capability and complicates the type of the setter callback. Spec FR-024 permits this explicitly with a doc-comment requirement.
- **`stopped ≡ paused` preserves current behaviour.** Today the VS Code host view translates `'stopped'` (from session-state) into a two-state form before passing to components. After the migration, the component layer receives `'stopped'` directly; the existing `playbackState !== 'playing'` gate at `useTimePlayback.ts:91` already treats anything-not-playing as non-animating, so `'stopped'` falls into the paused-rendering branch automatically. The PlaybackControls `isPlaying = playbackState === 'playing'` derivation at line 24 likewise treats `stopped` correctly today. No existing logic needs a rewrite; we only elevate the rule to an explicit FR (FR-023) and add a new Storybook variant as a regression guard (SC-006).

### Alternatives considered
- **Widen the internal `useState<PlaybackState>` to three values.** Rejected: adds no capability (hook never receives external `'stopped'` assignments) and bloats the type of every setter and reducer in the hook.
- **Introduce a `ComponentPlaybackState` two-value subset type in `@debrief/components`.** Rejected: re-introduces a drift vector — exactly the pattern this feature exists to delete. The hook's internal state is private and does not need a published type.
- **Add an explicit `'stopped'` branch in `PlaybackControls` that renders a distinct "stopped" button state.** Rejected: user-visible behaviour change. Out of scope; FR-023 mandates `stopped ≡ paused` in the current design.

## 5. Atomic-PR sequencing

### Decision
Commit order within the single atomic PR (squash-merged; intermediate commit order matters only for bisect-friendliness, not for CI gates). Updated after review to include decisions 1A/2A/3A/8A/9A/10A/11B/D1/D2/D3.

1. **LinkML edit** — rename `DisplayModeEnum` values + update both enum descriptions (short UI-agnostic ADR reference per 7A) in `session-state.yaml`.
2. **Generator post-processor edit** — extend `shared/schemas/scripts/generate.py` with the TemporalSlice enum-slot narrowing rule (§1 of this doc).
3. **Regenerate artefacts** — run `make generate` (or equivalent `uv run python shared/schemas/scripts/generate.py all`). Commit the regenerated Pydantic `__init__.py`, TypeScript `types.ts`, and JSON Schema together. Verify `PlaybackStateEnum` / `DisplayModeEnum` members are correct and that `TemporalSlice.playbackState: PlaybackState` / `.displayMode: DisplayMode` appear in the TS output.
4. **Schema-adherence fixtures and tests** — add per-enum-value valid fixtures (5) and invalid fixtures (≥ 2); extend `test_golden.py`, `test_roundtrip.py`, `test_schema_compare.py` (FR-008). Add new `test_regen_idempotent.py` (FR-030 / review 11B).
5. **Session-state migration** — delete the two hand-typed declarations in `services/session-state/src/types/temporal.ts`; import from `@debrief/schemas`; flip `DEFAULT_TEMPORAL_SLICE.displayMode` from `'normal'` to `'full'`; remove the "discriminated union literals for type safety" comment. Update the three named test-assertion sites (`persistence.test.ts:207`, `temporal.test.ts:44`, `temporal.test.ts:146` — review 8A).
6. **Load-boundary validation (review 1A + D2)** — add runtime validation to `services/session-state/src/persistence/load.ts` for `temporal.displayMode` and `temporal.playbackState`; replace the two `as never` casts at lines 117 and 123 with typed setter calls; commit in step with the extended `persistence.test.ts` cases (review 9A / FR-028) that assert legacy-value rejection and canonical-value acceptance.
7. **Component package migration** — delete the two hand-typed declarations in `shared/components/src/utils/types.ts` and `shared/components/src/TimeController/types.ts`; widen `ActivityPanel/types.ts` prop; retype `TimeController/types.ts` exports (using the corrected §1B import recipe per review 5A); update the `shared/components/src/index.ts` barrel. Verify Storybook stories compile.
8. **Add `stopped`-state Storybook variant + new `PlaybackControls.test.tsx`** — new story in `TimeController.stories.tsx` per SC-006 regression guard; new test file covering all 3 PlaybackState values with aria-label, icon glyph, and onClick assertions (review 10A / FR-029).
9. **VS Code extension migration (widened scope per review 2A + 3A + 4A)** — delete the 8 DisplayMode translator sites in `activityPanelView.ts` / `timeRangeView.ts` / `mapPanel.ts`. RETYPE five IPC shapes (`TemporalDisplayModeMessage`, `PlaybackStateChangeMessage`, `DisplayModeChangeMessage`, `SetDisplayModeMessage`, and the four callback/method-type declarations in `timeRangeView.ts`). DELETE the silent `'playing' | 'paused'` narrowing translator at `timeRangeView.ts:241`. Update imports across `commands/`, `webview/`, `webview/web/`.
10. **Web-shell migration** — delete `toComponentMode` / `toStoreMode` + their comment; pass session-state values directly. Update Playwright assertion literals (`'snailTrail'` → `'trail'`, `'normal'` → `'full'`).
11. **Guard scripts + Taskfile wiring (review D1 + D3)** — create `scripts/check-no-hand-typed-temporal-enums.sh` and `scripts/check-adr-refs.sh`; add both to `task lint` via `Taskfile.yml` alongside the existing `check-no-geojson-feature.sh`. Verify both exit 0 against the post-change tree.
12. **ADR entry (review 7A)** — append to `docs/project_notes/decisions.md` as `## ADR-NN: Schema-Rooted DisplayMode and PlaybackState — 2026-04-21`. Body contains the UI-element-level rendering detail that FR-003 moves out of the LinkML description. Confirm the `check-adr-refs.sh` script resolves the reference from `session-state.yaml` cleanly.
13. **Verify** — run `task verify` (lint + typecheck + unit + Playwright). Confirm zero `'snailTrail'` / `'normal'` literals remain outside `docs/` / ADR text and generated artefacts (there are none expected). Capture evidence under `specs/205-displaymode-playbackstate-linkml/evidence/`.

### Rationale
- **Schema change first** ensures the generated enum members are present before any consumer tries to import the new vocabulary.
- **Post-processor update before regeneration** is required for the regen step's output to be correct on the first pass (otherwise the `TemporalSlice` fields are `string`-typed and a subsequent commit has to patch `types.ts` in place).
- **Tests and fixtures before consumer migration** locks in the regression contract before the mechanical sweep begins.
- **Session-state before components** is arbitrary in either direction because their type surfaces are independent post-rename, but session-state is the more constrained package (fewer files, fewer call sites) and landing it first surfaces any default-value regressions early.
- **VS Code extension last among TS consumers** is deliberate because its test suite is the most expensive to run (Playwright E2E), so any churn in the earlier steps that forces a re-run is minimised.

### Alternatives considered
- **Revert-safe per-consumer commits.** Rejected: Article XIII.1 ("Atomic commits — one logical change per commit") refers to logical changes at the PR level, not a per-file granularity. Splitting the migration across many revert-safe commits multiplies review burden without adding value.
- **Leave the existing `'normal'`/`'snailTrail'` enum members for one release cycle as deprecated aliases.** Rejected: Article XIV (Pre-Release Freedom) explicitly permits breaking enum renames pre-v4.0.0, and there is no installed base to protect.

## 6. Load-boundary validation mechanism (review 1A + D2)

### Decision
`services/session-state/src/persistence/load.ts` acquires a small runtime-validation helper that checks inbound `temporal.displayMode` and `temporal.playbackState` (when present) against the generated enum's permissible-value set. Values not in the set cause `loadSessionState` to return a `LoadResult` with `success: false` and an `error` string that names the offending field and observed value — **matching the existing return-based error convention at `load.ts:49, 56, 267`** (R2-1A: the module's `LoadResult` interface at `load.ts:15-22` is the established contract; the validation MUST NOT introduce a throwing `SessionLoadError` class). Two `as never` casts at lines 117 (`setStepSize(temporal.stepSize as never)`) and 123 (`setDisplayMode(temporal.displayMode as never)`) are replaced with typed setter calls once validation has narrowed the runtime value. Other `as`-style coercions in the same file (parse-boundary narrowing for `currentTime`, `TimeRange`, `featureCollectionUri`, `Coordinate` etc.) are out of scope — their narrowing semantics are tied to legacy-payload compatibility with SCHEMA_VERSION 1.0.0, and any change there needs its own design pass.

### Rationale
- **Article I.3 silent-failure closure.** The `as never` cast silently accepts any value and coerces it into a typed setter; a persisted `"displayMode": "snailTrail"` would enter the store as a value neither `DisplayModeToggle` nor any component knows how to render. Runtime validation converts this from a silent render bug into a clear load error the user can act on.
- **Article XV strict-type-safety closure (for these two sites).** `as never` is a bypass cast; removing it at the point where validation has just proven the value's type is the clean path.
- **Minimal diff.** The validation helper is ~15 lines of code: a predicate that checks membership in `Object.values(Enum)` and, on failure, lets the caller short-circuit `loadSessionState` by returning the canonical `LoadResult` shape (`{ success: false, error: ... }`). No new dependency; reuses the generated enum's own `Object.values` iteration. No new error class; the existing `LoadResult.error: string` field carries the diagnostic.
- **Test coverage via FR-028 (review 9A).** Two test cases in `persistence.test.ts` exercise the two code paths.

### Alternatives considered
- **Re-use Pydantic-generated JSON Schema at the TS load boundary.** Rejected: introduces a JSON-Schema validator dependency to session-state (Article IX "minimal dependencies") and is overkill for a 5-value enum check.
- **Silently coerce legacy values via a legacy-to-canonical mapping.** Rejected: identical in spirit to the translation ternaries this feature exists to delete; Article XIV pre-release-freedom permits breaking reads of legacy persisted state with a clear error.
- **Move the validation into `@debrief/schemas` as a reusable `validatePlaybackState()` helper.** Rejected: premature abstraction. If a second consumer needs the same check, extract then. For now the helper lives inline in `load.ts` with the two setters it guards.

## 7. Extended IPC retype inventory (review 2A + 3A + 4A)

### Decision
In addition to the single `TemporalDisplayModeMessage` shape originally identified by the spec, the following hand-typed IPC and callback declarations are retyped or deleted:

**IPC message shapes** (5 sites):
- `apps/vscode/src/views/activityPanelView.ts:47-49` — `TemporalDisplayModeMessage.payload.mode: 'full' | 'trail'` → `DisplayMode`.
- `apps/vscode/src/views/timeRangeView.ts:28-31` — `PlaybackStateChangeMessage.state: ...` → `PlaybackState`.
- `apps/vscode/src/views/timeRangeView.ts:33-36` — `DisplayModeChangeMessage.mode: ...` → `DisplayMode`.
- `apps/vscode/src/webview/messages.ts:123-127` — `SetDisplayModeMessage.displayMode: 'full' | 'trail'` → `DisplayMode`. **This is the canonical host → webview setter contract** consumed by all three `mapPanel.ts` translator sites, the `timeController.tsx` webview setter, and the `activityPanelView.ts` setter invocation — retyping it is a prerequisite for the FR-018 / FR-020 translator deletions landing cleanly.

**Callback + method-signature declarations** (4 sites):
- `apps/vscode/src/views/timeRangeView.ts:64-65` — private callback fields `_onPlaybackStateChangeCallback?: (state: 'playing' | 'paused') => void` / `_onDisplayModeChangeCallback?: (mode: 'full' | 'trail') => void` → widened to `PlaybackState` / `DisplayMode`.
- `apps/vscode/src/views/timeRangeView.ts:322, 329` — public methods `onPlaybackStateChange(callback: (state: 'playing' | 'paused') => void): void` / `onDisplayModeChange(callback: (mode: 'full' | 'trail') => void): void` → widened similarly.

**Silent-narrowing translator deletion** (1 site):
- `apps/vscode/src/views/timeRangeView.ts:241` — `state.setPlaybackState(message.state === 'playing' ? 'playing' : 'paused')` → `state.setPlaybackState(message.state)`. After FR-022 retypes the inbound message to `PlaybackState`, the ternary is both unnecessary and harmful (it silently collapsed `'stopped'` to `'paused'`).

### Rationale
- **Article I.3** — the ternary at line 241 is a value-changing translator; Article I.3 forbids silent failures, and "silently collapse `stopped` to `paused` at the state boundary" is exactly that.
- **Completeness** — retyping only `TemporalDisplayModeMessage` (as the spec originally required) would leave 4+ hand-typed IPC surfaces with narrow string-literal unions, exactly the drift shape this feature exists to eliminate. Widening all 5 IPC + 4 callback sites makes the migration one-shot complete.
- **No wire-format change** — all nine retypes are pure declaration-type widenings. The JSON messages on the wire carry the same string values they did before (`'full'`, `'trail'`, `'playing'`, `'paused'`, `'stopped'`). No protocol bump needed.

### Alternatives considered
- **Leave timeRangeView callback types narrowed** — rejected: they are public methods; leaving them narrowed means any caller passing the result of session-state's `TemporalSlice.playbackState` (now typed `PlaybackState`) hits a compile error. Widening at the callback site is the clean resolution.
- **Retype only `SetDisplayModeMessage`** — rejected: `SetDisplayModeMessage` is the prerequisite but isn't sufficient; the message shapes + callbacks in `timeRangeView.ts` carry their own narrow types independent of the setter contract.

## Summary of decisions

| # | Topic | Decision | FR / SC link |
|---|-------|----------|--------------|
| 1 | TS emission narrowing | Extend `generate.py` post-processor with template-literal `PlaybackState` / `DisplayMode` narrowing, matching Feature 201 / FR-014 precedent | FR-007, SC-004 |
| 2 | LinkML rename | `DisplayModeEnum` values become `full`/`trail`; `PlaybackStateEnum` unchanged; descriptions short + ADR-ref only (review 7A) | FR-002, FR-003, SC-003 |
| 3 | Consumer inventory | 4 declarations deleted, 8 DisplayMode translators deleted, 1 PlaybackState silent-narrowing deleted (review 3A), 5 IPC shapes + 4 callback types retyped (review 2A + 4A), ~30 files import-renamed, 1 default flipped | FR-010–FR-022a, SC-001, SC-002 |
| 4 | 3-state widening | Widen every public surface to `PlaybackState`; keep `useTimePlayback` internal state at 2 values with doc comment; `stopped ≡ paused` | FR-016, FR-023–FR-025 |
| 5 | PR sequencing | Single atomic PR; 13 steps covering schema → generator → regen → fixtures → session-state → load-boundary → components → stories+test → extension → web-shell → guards → ADR → verify | SC-009, SC-010 |
| 6 | Load-boundary validation | Runtime validation at `persistence/load.ts`; replace `as never` at lines 117 + 123 with typed setters (review 1A + D2) | FR-023a, FR-023b, SC-012 |
| 7 | Extended IPC retype inventory | 5 IPC shapes + 4 callback types widened; silent narrowing at timeRangeView.ts:241 deleted (review 2A + 3A + 4A) | FR-022, FR-022a |
| 8 | Test-coverage additions | New PlaybackControls.test.tsx (3-state); extended persistence.test.ts (legacy rejection); new test_regen_idempotent.py | FR-028, FR-029, FR-030, SC-013, SC-014, SC-015 |
| 9 | Drift + ADR guards | Two new bash scripts wired into `task lint`; follows #214 `check-no-geojson-feature.sh` precedent | FR-031, FR-032, SC-013, SC-016 |

All topics are resolved. Phase 1 design artefacts (`data-model.md`, `contracts/linkml-enums.md`, `quickstart.md`) are updated to reflect these expanded decisions.
