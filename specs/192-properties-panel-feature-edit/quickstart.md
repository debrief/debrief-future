# Quickstart — Properties Panel Feature & Sub-feature Editing (refreshed)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-05-12 (refresh)

Ten-minute "is the feature working?" check across all seven user stories.
Run after `/speckit.implement` completes, before opening the PR.

Pre-requisites:

- Repo on branch `claude/start-speckit-192-SXMBK` (or local-equivalent).
- `pnpm install`, `uv sync` complete.
- The bundled sample plot in `preview/workspace/samples/local-store/`
  contains at least one track AND one drawn annotation (polygon or
  line) with > 1 vertex.

---

## 1. Edit a single feature's metadata (US-1)

1. `pnpm --filter @debrief/web-shell dev`.
2. Open the sample plot.
3. Click one track on the map.
4. Properties panel header switches to the track name; form populated
   with editable fields (tags, per-platform overrides).
5. Add a tag (`acceptance-test`). Save.
6. Dirty indicator clears; NarrativeLog shows a `properties-panel@<version>`
   entry listing the edited path.
7. Reload, re-select the same track — tag is restored.

Acceptance ref: US-1 AS-1/AS-2, FR-004/005, SC-001.

---

## 2. Revert an override back to its auto-derived value (US-6)

1. With the same track selected, edit `vessel_role` to a value that
   differs from the registry resolution.
2. Save. A "Revert" affordance appears beside the field.
3. Click Revert. The field reverts to the auto-derived value; dirty
   indicator returns; the field's visual treatment switches back to
   "auto-derived".
4. Save. Inspect the saved item — the `vessel_role` slot is absent.

Acceptance ref: US-6 AS-1/AS-2/AS-3, FR-023/024, SC-011.

---

## 3. Annotate a single track point (US-2)

1. Click any point along a track.
2. Header reads "<track name> — `positions/N`".
3. Set `label = "intercept"`, add tag `foxtrot`, type a note.
4. Save. Provenance entry lists `vertex_metadata[positions/N]/...`.
5. Reload, re-click same point — restored.

Acceptance ref: US-2 AS-1/AS-2/AS-3, FR-007/008/009/010, SC-002, SC-005.

---

## 4. Annotate a single annotation vertex (US-7, Polygon)

1. Click a single vertex of a drawn polygon (the corner dot, not the
   fill).
2. Header reads "<polygon name> — `rings/0/vertices/N`".
3. Same field set: `label`, `tags`, `note`. Fill and save.
4. Provenance entry uses the polygon vertex path prefix.
5. Reload, re-click same vertex — restored.
6. Repeat once with a LineString feature (header reads `vertices/N`) to
   confirm cross-geometry parity.

Acceptance ref: US-7 AS-1/AS-2/AS-4, FR-025/026/027, SC-012.

---

## 5. Multi-feature selection via map and Layers panel (US-4)

1. Plain-click track A — panel shows feature-editor mode for A.
2. Hold Ctrl/Cmd and click track B — panel shows multi-select summary
   mode, header "2 features selected".
3. Repeat using Ctrl/Cmd-click in the Layers panel rows; result is
   identical.
4. Plain-click track C — selection collapses to C; feature-editor mode
   for C.

Acceptance ref: US-4 AS-1/AS-2/AS-3/AS-4, FR-021/022, SC-010.

---

## 6. Selection-driven mode swap preserves staged edits (US-3)

1. Edit a tag on A — don't save.
2. Click a point on A — sub-feature mode; staged tag still in buffer
   (verify via dev-tools or wait until step 7).
3. Type a label on the point — don't save.
4. Select B — feature-editor mode for B; no tag in the input.
5. Re-select A — staged tag still present.
6. Re-select the same point on A — staged label still present.
7. Save. Reload. Re-select. Both edits restored from disk.

Acceptance ref: US-3 AS-1/AS-2/AS-3, FR-006/009.

---

## 7. Read-only plot disables every editing path (US-5)

1. Mark a sample plot read-only: `chmod 0444 <plot-item-path>` (or use
   the read-only fixture if shipped).
2. Open the plot.
3. The read-only banner appears immediately (pre-flight from
   `CapabilityReport.persistent`); every panel mode renders with
   `aria-disabled="true"` inputs; the Save action is unavailable.
4. Attempt to type — input rejects.
5. Re-open the writable copy — banner disappears; editing resumes.
6. To exercise post-write escalation: open a writable plot, stage an
   edit, then `chmod 0444` it before saving. Save fails; banner
   appears; **staged edits remain in the buffer** (verify by reverting
   permissions and saving again — the same edits flush).

Acceptance ref: US-5 AS-1/AS-2/AS-3, FR-015/018/019/020, SC-009.

---

## 8. Plot-editor mode unchanged (regression)

1. Click empty space to clear selection.
2. Panel reverts to plot-editor mode from #447 — same fields, same
   Save behaviour, same provenance shape.

Acceptance ref: US-3 AS-1, FR-012, SC-008.

---

## 9. Verify provenance and round-trip from the command line

```sh
# Inspect a saved item — confirm vertex_metadata exists on the feature(s) you edited
jq '.features[].properties.vertex_metadata' \
  preview/workspace/samples/local-store/items/<plot-id>.json

# Inspect provenance — one properties-panel@ entry per affected feature per save
jq '.features[].properties.provenance' \
  preview/workspace/samples/local-store/items/<plot-id>.json | tail -40
```

Confirm:

- `tool === 'debrief.propertiesPanel'`
- `method` matches `^properties-panel@`
- `inputs[]` lists edited paths (vertex paths prefixed with
  `vertex_metadata[<path>]/`)
- Reverted slots are absent from `feature.properties` AND appear in
  `inputs[]` with `op: 'revert'`

Acceptance ref: FR-013, SC-004, R-006, R-011.

---

## 10. Run the gates

```sh
task verify
cd apps/web-shell && node run-playwright.mjs properties-feature-edit
cd apps/web-shell && node run-playwright.mjs properties-subfeature-edit
cd apps/web-shell && node run-playwright.mjs properties-mode-swap
cd apps/web-shell && node run-playwright.mjs properties-multi-select
cd apps/web-shell && node run-playwright.mjs properties-read-only
cd apps/web-shell && node run-playwright.mjs properties-revert
cd apps/web-shell && node run-playwright.mjs properties-annotation-vertex
```

All eight commands MUST pass before opening the PR.
