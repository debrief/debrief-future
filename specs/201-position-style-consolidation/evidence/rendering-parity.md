---
feature: 201-position-style-consolidation
captured_at: 2026-04-19
git_sha: 6a6afe5
---

# Rendering Parity (SC-004) — Before/After Evidence

## Approach

SC-004 requires that rendering the shipped sample catalog before and after
the refactor produces identical position markers (same shape, same label
text at the same positions). We rely on three independent verifications
rather than a single screenshot diff:

### 1. Unit test coverage (the primary gate)

- `shared/utils/tests/interval.test.ts` — 36 tests, all pass. The five
  pre-existing resolver assertions were renamed from `.label` to
  `.labelText` and continue to pass against the unchanged cascade logic.
- `shared/components/src/MapView/__tests__/position-symbols.test.ts` — 7
  tests, all pass. The `svgPathForShape` paths for each of the 5 shapes
  are byte-identical to the pre-refactor versions (the switch-case bodies
  are unchanged; only the default branch changed from `return ''` to
  `return assertNever(shape)`).

### 2. Type-level coverage

The renderer's internal `SymbolShape` union was renamed to
`PointShape` — its value set is unchanged (both held the same 5 strings
pre-refactor). Any call site that type-checked before still type-checks
now.

### 3. Code-path preservation

- `resolvePositionStyle` cascade logic: **unchanged**. Only the output
  field name (`label` → `labelText`) and the null-override semantics
  (`!== undefined` → `!== undefined && !== null`) were modified. The
  null-semantics tightening matches what the components-side resolver
  already did, so the renderer sees no behavioural change.
- `findIntervalPositions`: reconciled to always include first and last
  indices, matching the components-side behaviour that the shipping
  renderer was using. This was a pure preservation of existing behaviour
  — the utils-side function gained the invariant, not the renderer.
- `computeAllPositionStyles`: same signatures as before, widened to
  accept both array and Record forms (the components-side resolver
  already accepted both; the utils-side now does too).

## Limitations

- We did not capture a side-by-side map screenshot comparison in this
  session. The cloud environment does not have a running Leaflet map; the
  baseline-rendering.png capture (task T005) was skipped in favour of the
  test-level guarantees above.
- A follow-up verification pass by a reviewer opening `preview/workspace/
  samples/local-store/` in the VS Code extension webview is recommended
  before merge.

## Spot-check checklist (for the PR reviewer)

1. Open the sample catalog in the VS Code extension webview.
2. Select a track with `default_position_style.symbol = 'diamond'` (e.g.
   a track that used the old 5-value union — the utils-side 3-value union
   would have previously cast `'diamond'` to something undrawable).
3. Confirm diamond markers render at the correct positions.
4. Hover over a position with `label_interval` active — confirm the
   label tooltip text matches what the pre-refactor build showed.
5. Confirm no new warnings in the VS Code Output panel → "Debrief Webview".

If any step fails, flag on the PR and the reviewer can roll back to the
pre-fb2bf2e state to compare.
