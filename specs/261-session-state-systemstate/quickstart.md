# Quickstart: Verify the SystemState migration end-to-end

**Feature**: `261-session-state-systemstate`
**Audience**: a maintainer (or AI agent) trying to verify the feature works after implementation.

This walk-through covers the three user-visible behaviours (Stories 1, 2, 3) plus the architectural payoff (Story 5: sidecar shrinkage) by hand. CI covers the same paths via the cross-host parity matrix (R-006); this doc is for ad-hoc validation, demos, and bug investigation.

Assumes the feature has been implemented and `pnpm install && task verify` passes.

---

## Setup

```sh
# Start the web-shell preview (terminal 1)
cd apps/web-shell
pnpm dev   # serves at http://localhost:5173

# Open VS Code with the extension under development (terminal 2)
# (from repo root)
code apps/vscode
# Then F5 in VS Code → "Run Extension Development Host"

# Pick a sample plot to work with
ls preview/workspace/samples/local-store/
# Choose any *.plot.geojson — for this walkthrough we'll use "sample-2024-jan.plot.geojson"
```

---

## Story 1 — Spatial round-trip (the headline behaviour)

**Goal**: prove that a colleague's bbox/zoom/center on machine A is honoured when the plot is opened on machine B with NO sidecar transferred.

```sh
# Step 1 — Open the plot in web-shell (the "host A" half)
# Browser: http://localhost:5173/?plot=sample-2024-jan.plot.geojson
# Pan and zoom the map to a recognisable view — say, the English Channel zoomed in to ~level 8.

# Step 2 — Save the plot via the host's Save command.
# (Web-shell: the IndexedDB-backed plot is updated. VS Code: file is overwritten on disk.)

# Step 3 — Inspect the saved plot file (it lives under preview/workspace/samples/local-store/).
cat preview/workspace/samples/local-store/sample-2024-jan.plot.geojson | jq '.features[] | select(.properties.kind == "SYSTEM" and .properties.state_type == "spatial")'
# Should print exactly ONE Feature like:
# {
#   "type": "Feature",
#   "id": "sys-spatial-01HZ…",
#   "geometry": null,
#   "properties": {
#     "kind": "SYSTEM",
#     "state_type": "spatial",
#     "bbox": [-3.5, 50.0, 2.5, 51.5],
#     "zoom": 8,
#     "center": [-0.5, 50.75],
#     "provenance": [
#       { "agent": "...", "action": "created", "host": "web-shell", "timestamp": "...", "version": "..." }
#     ]
#   }
# }

# Step 4 — Simulate "machine B with no sidecar". Delete the sidecar.
rm preview/workspace/samples/local-store/sample-2024-jan.debrief-session

# Step 5 — Open the plot in VS Code (the "host B" half).
# Map should open at bbox=[-3.5, 50.0, 2.5, 51.5], zoom=8, center=[-0.5, 50.75]
# — i.e. the same view, NOT the default global view.

# ✓ Pass criteria: bbox / zoom / center match what was saved in step 2.
```

If the map opens at the default global view in step 5: the helper isn't reading the spatial SystemState feature, OR the SystemState feature wasn't written in step 2. Run the round-trip test suite to localise.

---

## Story 2 — Temporal round-trip (including `current_time`)

```sh
# Step 1 — Open the same plot in web-shell (sidecar restored — re-run the save in Story 1 step 2).
# Use the time controller to:
#   - Set the analytical window to 2024-01-03T00:00Z ↔ 2024-01-05T00:00Z
#   - Scrub the playhead to 2024-01-04T15:30Z

# Step 2 — Save.

# Step 3 — Inspect.
cat preview/workspace/samples/local-store/sample-2024-jan.plot.geojson | jq '.features[] | select(.properties.kind == "SYSTEM" and .properties.state_type == "temporal")'
# Should print exactly ONE Feature with start_time, end_time, current_time matching the values set in step 1.

# Step 4 — Delete sidecar, open in VS Code.
rm preview/workspace/samples/local-store/sample-2024-jan.debrief-session
# In VS Code: time slider should show window [2024-01-03 → 2024-01-05] and playhead at 2024-01-04 15:30.

# ✓ Pass: all three values match.
# ✗ Specifically: if current_time is missing or wrong but start/end are right, the LinkML rules block isn't
#   firing OR the helper's TEMPORAL_MIGRATION_SCOPE doesn't include the currentTime → current_time entry.
```

**Edge case to spot-check**: scrubbing the playhead **without** saving should NOT mark the plot dirty (FR-017). After step 3, with the plot file open, drag the playhead to a different position — the VS Code "save" indicator must NOT light up. Close without saving; the plot file is unchanged.

---

## Story 3 — Selection round-trip

```sh
# Step 1 — Open the plot in web-shell. Click two features in the FeatureList (Cmd/Ctrl-click for multi).
# Note the IDs — let's say `feat-001` and `feat-007`.

# Step 2 — Save.

# Step 3 — Inspect.
cat preview/workspace/samples/local-store/sample-2024-jan.plot.geojson | jq '.features[] | select(.properties.kind == "SYSTEM" and .properties.state_type == "selection")'
# Should show selected_ids: ["feat-001", "feat-007"].

# Step 4 — Delete sidecar, open in VS Code.
rm preview/workspace/samples/local-store/sample-2024-jan.debrief-session
# In VS Code FeatureList: feat-001 and feat-007 are pre-selected.

# ✓ Pass: same two features pre-selected.
```

---

## Story 5 — Sidecar shrinkage (the architectural payoff)

```sh
# Step 1 — Inspect the sidecar produced by Stories 1–3 above.
cat preview/workspace/samples/local-store/sample-2024-jan.debrief-session | jq .
# Should be a JSON with:
#   - version: "1.2.0"           (bumped — R-004)
#   - migration_lineage: { schema_version_at_write: "1.2.0", migrated_variants: ["temporal","spatial","selection"] }
#   - temporal.timeRange:        ABSENT   (was migrated to plot)
#   - temporal.currentTime:      ABSENT   (was migrated to plot)
#   - temporal.timeFilter:       PRESENT  (per-user, stays)
#   - temporal.playbackState:    PRESENT  (per-user, stays)
#   - spatial.viewport:          ABSENT   (was migrated to plot)
#   - spatial.viewportLocked:    PRESENT  (per-user, stays)
#   - features.selection:        ABSENT   (was migrated to plot)
#   - features.hiddenFeatureIds: PRESENT  (per-user, stays)

# ✓ Pass: every "Migrate" row in contracts/slice-mappings.md is absent from this sidecar; every
#   "Stay in sidecar" row is still present.
```

---

## Cross-host parity (Story 4) — VS Code writes, web-shell reads

```sh
# Step 1 — In VS Code (no sidecar present), open the plot. Drag the map somewhere new. Save.
# This causes VS Code to write the spatial SystemState feature into the plot. (Pre-this-feature: VS Code
# wrote nothing into the FeatureCollection beyond geographic features.)

# Step 2 — Inspect.
cat preview/workspace/samples/local-store/sample-2024-jan.plot.geojson | jq '.features[] | select(.properties.kind == "SYSTEM" and .properties.state_type == "spatial") | .properties.provenance[-1].host'
# Should print: "vscode"

# Step 3 — Open in web-shell (different browser session — clear localStorage to be sure).
# Map opens at the bbox VS Code saved. ✓ Pass.
```

The same drill works for all four variants × both directions = 8 ad-hoc tests. The full 16-cell matrix lives in the Playwright + Mocha suites.

---

## Negative test — strict on import

Demonstrates Article XIV.4 / R-009.

```sh
# Step 1 — Hand-corrupt the spatial SystemState feature.
jq '(.features[] | select(.properties.state_type == "spatial").properties.bbox) = "not an array"' \
  preview/workspace/samples/local-store/sample-2024-jan.plot.geojson \
  > /tmp/broken.plot.geojson

# Step 2 — Try to open /tmp/broken.plot.geojson in either host.
# Expected: load fails with an error citing the spatial SystemState feature's ID and the bbox issue.
# NOT expected: silent fallback to default bbox.
```

---

## What to do if any step fails

| Symptom | Likely root cause | First place to look |
|---|---|---|
| SystemState feature is absent in step 3 | Save path isn't writing it | `services/session-state/src/persistence/save.ts` — check it calls `writeSystemStateIntoFeatureCollection` |
| SystemState feature exists but wrong values | Mapping table mismatch | `services/session-state/src/system-state/mapping.ts` — compare against `contracts/slice-mappings.md` |
| Sidecar still contains migrated keys | `prepareSidecarForSave` not wired in | `services/session-state/src/persistence/save.ts` |
| Map opens at default view despite SystemState feature being present | Load isn't reading SystemState before sidecar | `services/session-state/src/persistence/load.ts` — order of operations |
| Strict-on-import test silently passes | Validator not strict enough | `services/session-state/src/system-state/validate.ts` — check Zod schema is `.strict()` |
| #237's storyboard-pin test breaks | Helper consolidation broke active_storyboard semantics | `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` against the new helper |

---

## Done criteria checklist

- [ ] Story 1 round-trip passes both directions (VS Code↔web-shell).
- [ ] Story 2 round-trip passes including `current_time`.
- [ ] Story 3 round-trip passes for `selected_ids`.
- [ ] Story 4 — every variant produced by every host is read correctly by every host (16/16 in CI).
- [ ] Story 5 — sidecar shrinkage is observable by inspection.
- [ ] Negative-test plot fails to load with structured error (Article XIV.4).
- [ ] Schema fixtures for all four variants land before runtime PR merges (SC-006, SC-008).
- [ ] `apps/web-shell/src/services/activeStoryboardPersistence.ts` is deleted; its tests are either deleted or repointed at the shared helper (R-007).
- [ ] No `any` introduced (run `pnpm lint && pnpm -r typecheck`).
- [ ] `task verify` is green (lint + typecheck + unit + Playwright E2E).
