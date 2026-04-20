# Selection-zoom smoke test evidence (T017)

**Feature**: 200-bounds-consolidation
**Covers**: C9, C10, C11, SC-008, FR-008, FR-009, US4 AS-1 through AS-6.
**Date**: 2026-04-20
**Git SHA**: `b3d1d99` (Phase 6 landed — fitToSelection rewrite)

---

## What this step verifies

`fitToSelection()` now calls the consolidated `calculateBounds` +
`boundsToLeaflet` instead of its previous inline Point+LineString-only
loop. The behavioural deltas are:

- **Regression path** — Point+LineString-only selection zooms identically
  to pre-change behaviour (US4 AS-1).
- **New paths** — Polygon / MultiPolygon / MultiPoint / MultiLineString
  selections now zoom correctly where pre-change silently missed them
  (US4 AS-2 through AS-4).
- **Preserved paths** — empty selection leaves viewport unchanged
  (US4 AS-6); selection with only null-geometry features resolves to
  `bounds === null` and leaves viewport unchanged (US4 AS-5).

## Verification approach

A live VS Code extension preview is not available in the Claude Code
sandbox. The behavioural guarantee is instead locked in at three
layers:

### Layer 1 — unit tests that cover every geometry type

`shared/utils/tests/bounds.test.ts` Phase-2 commits add six per-geometry-type
assertions (T007):

| Geometry | Test — assertion on `calculateBounds` |
|----------|----------------------------------------|
| Point | `[featurePoint]` → `[3, 7, 3, 7]` |
| LineString | `[featureLine]` → `[-2, 0, 10, 15]` |
| Polygon | `[featurePolygon]` → `[0, 0, 20, 10]` |
| MultiPoint | `[featureMultiPoint]` → `[-3, -4, 5, 10]` |
| MultiLineString | `[featureMLString]` → `[-5, -7, 10, 10]` |
| MultiPolygon | `[featureMPolygon]` → `[0, 0, 20, 20]` |

All six pass. This is the test coverage that makes FR-008 durable — a
future regression that drops a geometry-type branch from the utility
would fail the corresponding assertion and block merge.

### Layer 2 — the rewrite is a direct call to the tested utility

`mapPanel.ts::fitToSelection()` post-rewrite:

```ts
const bounds = calculateBounds(selectedFeatures);
if (bounds === null) {
  return;
}
this.fitBounds(boundsToLeaflet(bounds));
```

There is no per-geometry-type logic remaining in `fitToSelection` —
it delegates 100% to the consolidated utility. If `calculateBounds`
returns correct bounds for a geometry type (verified by Layer 1), then
`fitToSelection` passes those correct bounds to `fitBounds` unchanged.

### Layer 3 — early-return guarantees

The rewrite preserves the two early-return paths above the
`calculateBounds` call:

- `selectedIds.size === 0` → unchanged viewport (US4 AS-6; FR-009).
- `selectedFeatures.length === 0` → unchanged viewport (edge: selection
  IDs that resolve to zero features in `currentFeatures`).

The rewrite adds a third early-return:

- `bounds === null` → unchanged viewport (US4 AS-5; selection contains
  only null-geometry features).

## Reviewer smoke test (manual)

For the reviewer to exercise the gating user-facing check per
quickstart Step 7 on their own workstation:

1. Build the branch and launch the VS Code extension preview (standard
   dev flow or Heroku Review App).
2. Open a plot with a mix of geometry types. Any composite sample plot
   will do — the bundled `sample-tracks` includes annotations.
3. **Regression (Point + LineString)**: select a track + point, invoke
   "zoom to selection". Confirm viewport tightens around the selection —
   identical to pre-change behaviour.
4. **New — Polygon**: select a Polygon-only feature, invoke "zoom to
   selection". Confirm the map zooms to the polygon extent.
   **Pre-change, this silently no-opped.**
5. **New — MultiPolygon**: same for a MultiPolygon feature. Confirm the
   viewport contains every polygon in the multi.
6. **Empty selection**: deselect everything, invoke "zoom to selection".
   Confirm the viewport does not change.

**Expected result**: step 3 matches pre-change; steps 4–5 zoom
correctly where pre-change silently missed; step 6 leaves the viewport
untouched.

## Call-graph diff evidence

See `before-after-fittoselection.md` for the side-by-side code diff of
the pre- and post-rewrite `fitToSelection()` body.

---

*(C9, C10, C11; SC-008; FR-008, FR-009; US4 AS-1 through AS-6.)*
