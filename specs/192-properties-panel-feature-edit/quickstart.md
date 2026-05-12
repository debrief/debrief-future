# Quickstart — Properties Panel Feature & Sub-feature Editing

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-05-12

This is the five-minute "is the feature working?" check. Run it after
`/speckit.implement` finishes, before opening the PR.

Pre-requisites:

- Repo at the implementation branch.
- `pnpm install`, `uv sync` complete.
- Sample plot containing at least one track with ≥ 50 positions
  (the bundled `preview/workspace/samples/local-store/` catalog has
  one — open the first item).

---

## 1. Edit a single feature's metadata

1. Start the web-shell: `pnpm --filter @debrief/web-shell dev`.
2. Open the sample plot.
3. Open the Properties panel (4th section of `ActivityPanel`).
4. Click one track on the map.
5. **Expect** the panel header to change to the track's display name
   and the form to show editable fields (tags, per-platform overrides
   from #181, etc.).
6. Add a tag (`acceptance-test`) and change the vessel role override.
7. Click Save (or the `saveSession` keybinding).
8. **Expect** the dirty indicator to clear and a NarrativeLog entry
   stamped `properties-panel@<version>` to appear listing the edited
   field paths.
9. Reload the plot. Re-select the same track.
10. **Expect** the tag and role override to be restored.

Acceptance reference: US-1 AS-1, AS-2, FR-004, FR-005, FR-013, SC-001.

---

## 2. Annotate a single track point

1. With the same plot open, click any point along a track (the dot,
   not the line).
2. **Expect** the panel header to change to "<track name> — point N"
   and the form to show the new fields: `label`, `tags`, `note`.
3. Set `label = "intercept"`, add tag `foxtrot`, type a one-sentence
   note.
4. Click Save.
5. **Expect** the dirty indicator to clear and a provenance entry whose
   `inputs[]` includes paths starting with `position_metadata[N]/`.
6. Reload, re-click the same point.
7. **Expect** the form to be pre-populated with the saved values.
8. Open the saved STAC item JSON; **expect** the parent track's
   `properties.position_metadata` to contain exactly one entry with
   `index = N`.

Acceptance reference: US-2 AS-1, AS-2, AS-3, FR-007, FR-009, FR-010, SC-002, SC-005.

---

## 3. Selection-driven mode swap preserves staged edits

1. With the plot open and no selection, **expect** the panel to show
   the plot-editor mode (#447 behaviour) — header is the plot title.
2. Select track A. Add a tag — **don't save**.
3. Select a point on track A. **Expect** the sub-feature mode to
   render with empty point fields.
4. Type a label — **don't save**.
5. Select track B. **Expect** the feature mode to render for B,
   no tag in the input.
6. Select track A again. **Expect** the tag added in step 2 still
   present in the form.
7. Select the point you edited in step 4. **Expect** the label still
   present.
8. Save. Reload. Re-select. **Expect** both edits restored.

Acceptance reference: US-3 AS-1, AS-3, FR-001, FR-002, FR-006, FR-009.

---

## 4. Multi-select shows a read-only summary

1. Hold the modifier key and click two tracks.
2. **Expect** the panel header to read "2 features selected".
3. **Expect** every input to be disabled.
4. **Expect** any field whose value differs across the two tracks to
   render `(differs)`; common fields render their shared value.

Acceptance reference: US-3 AS-2, FR-011.

---

## 5. Plot-editor mode unchanged

1. Click empty space to clear the selection.
2. **Expect** the panel to revert to the plot-editor mode from #447
   with the same fields, the same Save behaviour, and the same
   provenance shape — no regression.

Acceptance reference: US-3 AS-1, FR-012, SC-008.

---

## 6. Verify provenance and round-trip from the command line

```sh
# Inspect the saved item — it should now carry position_metadata
jq '.features[] | select(.id == "<track-id>") | .properties.position_metadata' \
  preview/workspace/samples/local-store/items/<plot-id>.json

# Inspect the narrative log — every save should have a properties-panel@ entry
jq '.features[] | select(.id == "<track-id>") | .properties.provenance' \
  preview/workspace/samples/local-store/items/<plot-id>.json | tail -20
```

**Expect** one provenance entry per save with
`tool = "debrief.propertiesPanel"`, `method = "properties-panel@<version>"`,
and `inputs[]` listing the edited field paths (sub-feature paths
prefixed with `position_metadata[N]/`).

Acceptance reference: FR-013, SC-004, R-006.

---

## 7. Run the gates

```sh
task verify
cd apps/web-shell && node run-playwright.mjs properties-feature-edit
cd apps/web-shell && node run-playwright.mjs properties-subfeature-edit
cd apps/web-shell && node run-playwright.mjs properties-mode-swap
```

All four MUST pass before opening the PR.
