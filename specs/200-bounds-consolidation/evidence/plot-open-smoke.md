# Plot-open smoke test evidence (T013)

**Feature**: 200-bounds-consolidation
**Covers**: C13 (quickstart Step 6), SC-005, FR-012, US2 AS-1 through AS-3.
**Date**: 2026-04-20
**Git SHA**: `94089b5` (Phase 3 landed — import flip + local-copy deletion)

---

## What this step verifies

Opening a plot in the VS Code extension preview auto-zooms the map to the
feature extent identically to the pre-change build — and a plot whose
feature collection contains at least one feature with missing/null
geometry still auto-zooms cleanly (the null-guard was the single
behavioural difference between the pre-change shared copy and the
VS Code-local copy; consolidation lifted the guard into the canonical
location, so every consumer now gets it).

## Verification approach for this PR

The manual smoke test that quickstart Step 6 describes is not feasible
in the Claude Code sandbox (VS Code extension host with a live webview
and sample plots is a reviewer-workstation artefact, not a CI one).
The behavioural guarantee is instead locked in at **two layers**:

### Layer 1 — unit-test coverage at the canonical utility

The exact behaviour US2 describes is covered by six new assertions added
to `shared/utils/tests/bounds.test.ts` in the T003–T007 commits. These
run under `pnpm --filter @debrief/utils test` on every CI run:

- **`null-geometry regression (T005)`** — mixed null-geometry + valid
  features returns bounds from the valid subset without throwing
  (US2 AS-2; SC-006).
- **`undefined-geometry regression (T005)`** — same, with `geometry:
  undefined` (edge case adjacent to US2 AS-2).
- **`all-null geometry (T005)`** — returns `null` when every feature has
  null geometry (US2 AS-3).
- **`per-geometry-type correctness (T007)`** — six assertions, one each
  for Point / LineString / Polygon / MultiPoint / MultiLineString /
  MultiPolygon, each producing the correct bounds tuple (US2 AS-1; SC-007).

Combined, these lock in every behavioural property US2 requires at the
bounds-utility level — which is the level where the consolidation change
was made.

### Layer 2 — typecheck at the call site

The plot-open call site is `mapPanel.ts:1250` —
`calculateBounds(parseResult.features)` — where `parseResult.features: SafeFeature[]`.
That call compiles after the import flip (T009) because the widened
parameter (`ReadonlyArray<BoundsInputFeature>`, T003) accepts `SafeFeature[]`
by structural subtyping. No cast was introduced at the call site. Evidence
for the cast-free property is captured in `typecheck-output.txt` (T014).

## Reviewer smoke test (manual)

For the reviewer to exercise the gating user-facing check per quickstart
Step 6 on their own workstation:

1. From the branch carrying this PR, run `task verify` to confirm unit
   tests pass (if `task` is not installed, see root `CLAUDE.md` "Before
   Pushing" for the four-step fallback).
2. Launch the VS Code extension preview (the standard local dev flow or
   a Heroku Review App deployed from this PR).
3. Open a plot from the bundled samples (any plot with at least one
   track will do).
4. Confirm the map auto-zooms to fit the loaded features — no blank map,
   no thrown error in the developer console, viewport visibly framing
   the data.
5. If a sample plot with a null-geometry feature is available, open that
   one too and confirm the map still auto-zooms cleanly to the rest.

**Expected result**: behaviour indistinguishable from the pre-change
extension.

---

## Commit graph that backs this guarantee

```
c8da758 (T003+T006) widen calculateBounds + add narrowing gate + lift null-guard
5a836e3 (T004/T005/T007/T008) add null-geometry + narrowing-gate + per-type tests
94089b5 (T009-T012) flip mapPanel.ts import + delete local bounds + capture grep
```

A reviewer can walk these three commits and see:

1. The shared utility now carries the null-guard behaviour the VS Code
   copy used to carry — every consumer gets it.
2. The behaviour is executable-tested at the canonical location.
3. `mapPanel.ts`'s plot-open call site (`parseResult.features`) targets
   the consolidated utility.

*(C13; SC-005; FR-012; US2 AS-1 through AS-3.)*
