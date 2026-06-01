---
feature: "271-scene-overlap-warning"
captured_at: "2026-05-31T17:29:19Z"
git_sha: "060c0f3"
tests_passed: 28
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Overlap Warning for Time-Range Scenes

## Results

| Metric | Value |
|--------|-------|
| Feature tests | 28 |
| Passed | 28 |
| Failed | 0 |
| Skipped | 0 |
| Full component suite | 2318 passed / 4 skipped (no regressions) |
| VS Code panel suite | 24 passed |
| Web-shell unit suite | 124 passed |

The 28 figure counts the tests written for this feature; they run inside the
broader suites listed above, all of which stay green.

## Test Breakdown

### Detection helper — `src/storyboard/__tests__/overlap.test.ts` (16)

| Test | Status |
|------|--------|
| C1.1 mutual symmetric overlap | Pass |
| C1.2 non-overlapping absent | Pass |
| C1.3 touching endpoints not overlapping | Pass |
| C1.4 instant Scenes excluded (even inside a range) | Pass |
| C1.5 A overlaps B and C (disjoint) | Pass |
| C1.6 chain A-B, B-C, A-C disjoint | Pass |
| C1.7 identical windows | Pass |
| C1.8 zero-length inside vs touching | Pass |
| C1.9 cross-Storyboard isolation | Pass |
| C1.10 dismissedPairs suppresses both sides | Pass |
| C1.10b dismissing one pair leaves another live overlap | Pass |
| C1.11 empty / single / instant-only | Pass |
| C1.12 pure & deterministic, plot untouched | Pass |
| re-warn after prune (FR-009) | Pass |
| overlapPairKey order-independent | Pass |
| overlapPairKey distinct pairs | Pass |

### Badge component — `OverlapBadge.test.tsx` (4)

| Test | Status |
|------|--------|
| C2.2 names single partner (text + aria) | Pass |
| C2.2 names every partner (multi) | Pass |
| C2.3 data-testid + data-scene-id | Pass |
| C2.4 Dismiss fires onDismiss, stops row propagation | Pass |

### VS Code host — `tests/unit/storyboardPanelView.test.ts` (4 new)

| Test | Status |
|------|--------|
| populates mutual overlapsWith; clean/instant/touching rows none | Pass |
| no cross-Storyboard comparison | Pass |
| scene-overlap-dismiss clears both rows, no data change | Pass |
| re-warns dismissed pair after resolve + re-overlap (prune, FR-009) | Pass |

### Storybook E2E — `e2e/StoryboardOverlap.spec.ts` (4)

| Test | Status |
|------|--------|
| both overlapping rows warn naming partner; clean rows clean (light) | Pass |
| renders in dark theme | Pass |
| renders in vscode theme | Pass |
| Dismiss clears the warning on both rows | Pass |

## Key Scenarios Verified

- **Strict-overlap semantics** — touching endpoints (`A.end === B.start`) produce no warning, so well-formed sequential Storyboards stay clean; only true interior overlap warns (FR-002, SC-002).
- **Instant Scenes never participate** — an instant Scene's timestamp inside a range raises nothing (FR-006).
- **Single-Storyboard scope** — overlapping Scenes in different Storyboards are never compared (FR-007).
- **Cross-host parity** — both the VS Code panel view and the web-shell mount drive the same shared `detectSceneOverlaps`; the badge renders identically in all three theme variants (FR-011).
- **Dismiss + re-warn** — dismissing clears both rows without touching Scene data; a pair that resolves and re-overlaps warns afresh because the stale dismissal key is pruned (FR-008/FR-009).

## Evidence Artefacts

- `screenshots/overlap-light.png`, `overlap-dark.png`, `overlap-vscode.png` — the warned panel in all three themes.
- `screenshots/overlap-after-dismiss.png` — the "after" frame of the dismiss interaction (paired with `overlap-light.png` as the "before"; a static pair stands in for an interaction GIF as `ffmpeg` is unavailable in this environment).

## Known Issues

None.
</content>
