---
feature: "268-save-atomicity"
captured_at: "2026-06-01T20:48:00Z"
git_sha: "040e9c5"
tests_passed: 32
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Atomic (Transactional) Plot Save

The credibility artifact for this reliability feature is the **fault-injection
matrix** (`fault-injection-matrix.md`): every distinct interruption point of a
save, on both hosts, is driven to failure and the plot is asserted to resolve to
exactly one coherent version. The compile-time `Pick`-derivation guard
(mutation-verified) keeps the boundary save-unit type from silently dropping
fields.

## Results (feature-specific tests)

| Metric | Value |
|--------|-------|
| Total new tests (#268) | 32 |
| Passed | 32 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | not separately measured |

Of the 32: 31 Vitest unit/integration + 1 web-shell Playwright smoke. One
additional **compile-time** guard (`commitPlotSave.types.test.ts`) is enforced
by `tsc --noEmit` (the CI typecheck gate), not by a runtime runner.

## Test Breakdown

### Boundary contract (shared/stac-writer)

| Test | Status |
|------|--------|
| `commitPlotSave.types.test.ts` — `thumbnails` stays `Pick<WritePlotThumbnailPairInput,…>`; `featureCollection` reuses `RawGeoJSONFeatureCollection` (compile-time, mutation-verified) | Pass |

### FS adaptor — commit (apps/vscode, contract C1/C2)

| Test | Status |
|------|--------|
| success without thumbnails writes only `features.geojson`, no leftovers | Pass |
| success with thumbnails commits FC + both PNGs + `item.json` asset entries | Pass |
| stage failure → rolled back: originals byte-identical, no temps, no journal | Pass |
| journal-write failure → rolled back: originals intact, no temps, no journal | Pass |
| apply-phase failure leaves the journal for roll-forward on open | Pass |

### FS adaptor — reconcile (apps/vscode, contract C3/C5)

| Test | Status |
|------|--------|
| clean store → `{ recovered:false, outcome:'clean' }`, mutates nothing | Pass |
| stray temps, no journal → rolled-back (last-good kept, temps removed) | Pass |
| journal + pending renames → rolled-forward (new version, journal gone) | Pass |
| roll-forward idempotent when some renames already applied | Pass |
| second reconcile after roll-forward is a clean no-op | Pass |
| malformed journal → safe roll-back, leftovers cleared | Pass |

### IDB adaptor — commit + reconcile (apps/web-shell, contract C4/C5)

| Test | Status |
|------|--------|
| commits item record + geojson payload together (create case) | Pass |
| a save uses exactly ONE readwrite transaction touching `items` + `payloads` | Pass |
| aborting the commit transaction leaves the store byte-identical | Pass |
| rejects a non-FeatureCollection payload before any write | Pass |
| reconcile: empty store → clean | Pass |
| reconcile: no-op against a committed plot (mutates nothing) | Pass |
| reconcile: idempotent (repeat calls stay clean) | Pass |

### Host call sites — saveSession + openPlot (apps/vscode)

| Test | Status |
|------|--------|
| save routes FC + thumbnails through `commitPlotSave` | Pass |
| save still commits FC when no thumbnails captured | Pass |
| commit failure → `showErrorMessage`, dirty NOT cleared | Pass |
| thumbnail-capture failure is non-blocking, still commits FC-only | Pass |
| reporting order: `markClean` + "Plot saved" fire strictly AFTER commit resolves | Pass |
| reporting: rejected commit shows failure, keeps dirty, NO success (SC-003) | Pass |
| reporting: no success shown until a slow commit settles | Pass |
| integration: a rejected commit leaves both files byte-identical, dirty kept | Pass |
| integration: a clean save through the same path commits the new version | Pass |
| open-path: rolls a committed-but-unapplied save forward + notifies once | Pass |
| open-path: restores last-good when interrupted before the commit point | Pass |
| open-path: clean plot opens silently (no notice, no mutation) | Pass |
| open-path: no-op when no writer factory is provided | Pass |

### E2E smoke (apps/web-shell, Playwright)

| Test | Status |
|------|--------|
| a plot loads coherently and reopening yields the same coherent state (FR-011) | Pass |

## Key Scenarios Verified

- **No partial after a catchable failure (SC-001).** Injecting a failure at the
  stage and journal-write phases (the pre-commit points where rollback is
  guaranteed) leaves `features.geojson` + `item.json` byte-identical and no
  stray `.tmp`/journal — the previous version is openable and unchanged.
- **Coherent after an uncatchable interruption (SC-002).** Seeding each
  mid-save leftover condition and reconciling yields exactly one coherent
  version: pre-commit → last-good, post-commit → new version, with no `.tmp`/
  journal remaining; idempotent on repeat.
- **Honest success reporting (SC-003).** `markClean` + "Plot saved" fire only
  after `commitPlotSave` resolves; a rejected commit shows a failure, keeps the
  plot dirty, and shows no success message.
- **Same guarantee on both backends (SC-005).** The IndexedDB host commits
  item + payload in exactly one transaction; aborting it rolls both back to a
  byte-identical store.

## Full-suite regression context (same SHA)

| Suite | Result |
|-------|--------|
| `@debrief/stac-writer` vitest | 22 passed |
| `debrief-vscode` vitest | 841 passed, 1 skipped (pre-existing, unrelated) |
| `@debrief/web-shell` vitest | 135 passed |
| `pnpm -r typecheck` + `apps/vscode tsc --noEmit` | clean |
| ESLint (all packages) | 0 errors |
| ruff / pyright | clean (no Python changes) |
| pytest | 2161 passed, 2 skipped, 1 xfailed (1 timing-flaky perf budget passes on re-run) |

## Known Issues

- The pre-existing vscode skipped test is unrelated to #268.
- `shared/schemas` `test_10k_feature_collection_validates_within_budget` is a
  timing-sensitive performance budget (0.5s) that occasionally exceeds on a busy
  cloud VM and passes on re-run — not a #268 regression (no Python changed).

## Environment

- Runner: vitest (unit/integration) + Playwright (E2E, `@sparticuz/chromium`)
- Branch: `claude/eloquent-fermi-bzLml` (spec `268-save-atomicity`)
- Date: 2026-06-01
