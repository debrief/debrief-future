# Usage Example — Properties Panel (#192)

Walk-through of all seven user stories end-to-end against the web-shell. Every screenshot referenced lives under `evidence/screenshots/`.

---

## US-1 — Edit a single feature's metadata

1. Open a plot from the catalog list and switch to the Activity tab.
2. Click an OWNSHIP track in the Layers panel (single click).
3. The **Properties** section's mode dispatcher transitions to **feature mode** (`data-mode="feature"`); the header reads the feature's display name.
4. The form renders rows for the seven editable slots (`display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`, `tags`).
5. Add a tag `intercept` via the array editor; press Enter — the chip appears, the staging buffer goes dirty (`isDirty() === true`).
6. The override-vs-auto-derived chip (`data-testid="properties-chip-override"`) renders next to any of the six per-platform slots when an explicit value is set.

> **Screenshot:** `properties-feature-vscode.png` (vscode theme), `properties-feature-light.png` (light), `properties-feature-dark.png` (dark).

---

## US-2 — Annotate a single track point

1. With the feature still selected, single-click any rendered position marker on the track.
2. The dispatcher transitions to **sub-feature mode** (`data-mode="subfeature"`); the header reads `<track> — Point N`, `data-path="positions/N"` is set on the container.
3. The form renders **three** inputs: `label`, `tags`, `note`. None of them is auto-derived; all are analyst-typed.
4. Type a label `intercept`, add tag `recurring-fix`, type a note — click outside the input to commit each via the staging hook.
5. A subsequent click on a *different* position marker swaps the form to that vertex's address. The previous vertex's stage survives.

> **Screenshot:** `properties-subfeature-track-vscode.png`.

---

## US-3 — Selection-driven mode swap preserves staged edits

1. Cycle: no selection → feature → vertex → multi-select → no selection.
2. At every transition the corresponding mode container's `data-testid` is the only one visible; the staging buffer is **not** cleared (FR-009).
3. Re-select an earlier feature → the form re-mounts with the staged value visible (US-3 AS-3 hydration). Re-select an earlier vertex → the staged label/tags/note re-appear.

> **Screenshots:** `workflow-mode-swap-{1-plot,2-feature,3-subfeature,4-multi}.png` (4-frame sequence; cloud environment has no ffmpeg so a GIF is not produced — frames render side-by-side in the PR description).

---

## US-4 — Multi-feature selection (modifier-click on map or Layers panel)

1. Click feature A → feature mode.
2. Ctrl/Cmd-click feature B → multi-select summary mode (`data-mode="multi"`, header reads "2 features selected").
3. Slots common to both render their shared value; slots that differ render `(differs)` (`data-testid="multiselect-differs-<slot>"`).
4. All inputs `aria-disabled="true"`; the bulk-edit affordance is intentionally absent (FR-011).
5. Ctrl/Cmd-click feature A again to toggle it off — only feature B remains; `primary` tracks the last-remaining feature.

> **Screenshot:** `properties-multiselect-vscode.png`.

---

## US-5 — Read-only plot detection (storage capability + post-write error)

1. **Pre-flight**: open a plot whose backing storage reports `CapabilityReport.persistent === false`. The plot slice's `isReadOnly` transitions to `true` via the host's `openPlot` wiring (in VS Code: `commands/openPlot.ts`; in the web-shell: `handlePlotSelect`).
2. The `readOnlyBanner` appears above the form in every mode with the reason string. Every input is `disabled` + `aria-disabled="true"`. The Save action is hidden.
3. **Post-write**: open a writable plot, stage an edit, then chmod 0444 the backing file. Trigger Save → `saveSession()` returns a `ReadOnlyFilesystemError`/`EACCES`/`EPERM` → the catch block dispatches `setReadOnly(true, …)` → the banner appears with the permission-derived reason. The staging buffer **is preserved** (FR-020, US-5 AS-3).

> **Screenshots:** `properties-readonly-vscode.png` (banner alone), `workflow-readonly.png` (banner + disabled form in the live web-shell).

---

## US-6 — Override → auto-derived revert

1. Single-select a feature whose `vessel_role` carries an explicit override (the chip reads "override").
2. The revert affordance (`data-testid="revert-vessel_role"`) renders next to the input. Its tooltip shows "Restore the registry value: `<auto-derived>`".
3. Click revert → the input shows the auto-derived value; the chip switches back to "auto-derived" presentation; the staging buffer records `revertedFields.add('vessel_role')`.
4. Save → on success the saved feature.properties has the `vessel_role` slot **absent** (sparse, not `null`); the provenance entry carries `{ path: 'vessel_role', op: 'revert' }`.
5. The "Undo revert" affordance re-appears before save — clicking it removes the slot from `revertedFields` and the original override re-displays.
6. For platforms unknown to the registry (no auto-derived value), the revert control renders **disabled** with the tooltip "No auto-derived value available for this platform" (FR-024).

> **Screenshot:** `workflow-revert-1-before.png` + `workflow-revert-2-after.png` (2-frame sequence; see US-3 note on GIF fallback).

---

## US-7 — Vertex editing for annotation geometries

1. Click a Polygon ring vertex → sub-feature mode with header "Ring R, Vertex V", `data-path="rings/R/vertices/V"`.
2. Click a LineString vertex → header "Vertex V", `data-path="vertices/V"`.
3. Click a MultiPoint vertex → same as LineString.
4. Click a Point's single vertex → header "Vertex", `data-path="vertex/0"`.
5. The form body is identical across geometries (FR-026). The staged entries flush to the parent feature's `vertex_metadata` array, keyed by `path`. Empty entries (`label`, `tags`, `note` all absent) are pruned at flush time (FR-010). An empty array omits the slot entirely.
6. Cross-geometry stress (`SC-012`): the round-trip suite edits 52 vertices across all four geometries in one Playwright run and asserts every entry restores byte-for-byte after save.

> **Screenshot:** `properties-subfeature-polygon-vscode.png` (cross-geometry hero).

---

## What's intentionally absent (out-of-scope, will land later)

- **Vertex remapping under geometry mutation** — the spec defers this entirely. The current sparse-path keying means that if a feature's geometry shrinks under us, a `vertex_metadata` entry whose path no longer resolves will be skipped by the resolver (it returns `stale`, the dispatcher routes to plot mode).
- **Bulk multi-select editing** — the summary mode is unconditionally read-only in v1.
- **Auto-save** — every edit stays in the staging buffer until the analyst triggers Save; auto-save would consult `isReadOnly` before writing.

---

## Reproducing the workflows in CI

The seven Playwright specs each pass in cloud Chromium (`@sparticuz/chromium`). Run any of:

```sh
cd apps/web-shell && node run-playwright.mjs properties-feature-edit
cd apps/web-shell && node run-playwright.mjs properties-subfeature-edit
cd apps/web-shell && node run-playwright.mjs properties-mode-swap
cd apps/web-shell && node run-playwright.mjs properties-multi-select
cd apps/web-shell && node run-playwright.mjs properties-read-only
cd apps/web-shell && node run-playwright.mjs properties-revert
cd apps/web-shell && node run-playwright.mjs properties-annotation-vertex
```

For the Storybook screenshots:

```sh
cd shared/components && node run-playwright.mjs PropertiesForm
```
