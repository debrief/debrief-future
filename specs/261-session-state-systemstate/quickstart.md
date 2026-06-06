# Quickstart: Verify the sidecar is gone and state lives in features.geojson

**Feature**: `261-session-state-systemstate` | **Phase**: 1

A walkthrough to confirm the headline outcomes (SC-001 → SC-008) once implementation lands. Read top-to-bottom; each step maps to a success criterion.

## Prerequisites

```sh
pnpm install && uv sync                 # deps
cd shared/schemas && uv run python scripts/generate.py && cd ../..   # regenerate bindings
```

## 1. Schema + fixtures (SC-005, SC-006, SC-008)

```sh
# Adherence: every valid fixture parses; every invalid one is rejected.
uv run pytest shared/schemas/tests -k system_state

# Generated TS carries the new shape, drops the old.
grep -n "current_time\|filter_start_time\|viewport\|rotation\|selected_primary" \
  shared/schemas/src/generated/typescript/types.ts        # present
grep -n "bbox\|center" shared/schemas/src/generated/typescript/types.ts | grep -i system   # absent
grep -n "visible" shared/schemas/src/generated/typescript/types.ts     # on BaseFeatureProperties children
```

Expected: all four variants have valid + invalid fixtures; a `visible:false` feature fixture validates; `bbox`/`zoom`/`center` are gone from `SystemStateProperties`.

## 2. Shared helper unit tests (SC-007)

```sh
pnpm --filter @debrief/session-state test -- system-state
```

Expected green: read returns `{}` for an FC with no SYSTEM features; round-trips each variant; throws `SystemStateLoadError` for every `kind`; `write` does not mutate input and writes no `provenance` on `state.*`; epoch↔ISO and `FeatureSelection`→`selected_ids`/`selected_primary` conversions are bit-exact (within tolerance).

## 3. The two-file invariant (SC-002) — VS Code

1. Open a plot in the extension. Pan/zoom to a recognisable area; scope a time window; scrub the playhead; select two features; hide one.
2. Run the explicit **Save** (even though only view-state changed — FR-020).
3. Inspect the item directory:

```sh
ls <store>/<catalog>/<item>/
# Expect EXACTLY:  item.json   features.geojson   (+ thumbnail assets)
# Expect ABSENT:   item.debrief-session
```

4. Inspect `features.geojson`:

```sh
jq '.features[] | select(.properties.kind=="SYSTEM") | .id' features.geojson
# "state.spatial"  "state.temporal"  "state.selection"  ["state.activestoryboard"]
jq '[.features[] | select(.properties.visible==false) | .id]' features.geojson
# the one hidden feature's id
```

## 4. Self-describing round-trip (SC-001, SC-002a, SC-004) — cross-host

1. Copy ONLY `features.geojson` to a second machine / fresh web-shell session (no `item.json`, no sidecar).
2. Open it.
3. Verify the map opens at the saved viewport; the time controller shows the saved window + playhead; the same two features are selected; the same feature is hidden.
4. Reverse direction (web-shell → VS Code) and confirm parity (SC-003).

```sh
cd apps/web-shell && node run-playwright.mjs system-state-roundtrip
```

## 5. Exploration never marks dirty (FR-019) — VS Code

1. Open a plot. Pan, zoom, scrub, select — do **not** make a content edit.
2. Close the plot.
3. Expect **no** "unsaved changes" prompt. (Then re-open: the view is whatever was last *explicitly saved*, not the unsaved exploration — that's the contract.)
4. Now make a content edit (e.g. capture a scene). Close → the save prompt appears (FR-021).

## 6. Strict-on-import (SC-006) — both hosts

Hand-craft three broken `features.geojson` files and open each:
- a `state.temporal` with `current_time` outside `[start_time,end_time]` → load fails: `SystemStateLoadError(kind='cross-field-invariant')`, message names `state.temporal`.
- two features both `state_type:"spatial"` → `kind='multiple-features-with-same-state-type'`.
- a SYSTEM feature with `state_type:"nonsense"` → `kind='unknown-state-type'`.

Expect a clear user-facing error each time — never a silent default or clamp.

## 7. active_storyboard regression (SC-003)

```sh
cd apps/web-shell && node run-playwright.mjs active-storyboard-persistence
```

Expected: #237's existing spec passes unchanged against the consolidated shared helper; `apps/web-shell/src/services/activeStoryboardPersistence.ts` no longer exists.

## 8. Full gate

```sh
task verify      # lint + typecheck + unit + Playwright E2E + knip
```

Expected green. `grep -rn "debrief-session" apps services --include=*.ts | grep -v generated` returns no runtime read/write code (SC-002).
