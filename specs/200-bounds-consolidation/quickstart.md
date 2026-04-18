# Quickstart: Verify the bounds consolidation refactor

**Feature**: `200-bounds-consolidation`
**Date**: 2026-04-18
**Audience**: reviewer or implementer checking that the refactor landed correctly. Takes ~3 minutes.

## Prerequisites

- Working checkout of `debrief-future` on the `200-bounds-consolidation` branch (or a commit after this feature has merged to `main`).
- pnpm + uv installed per `CLAUDE.md § Before Pushing`.
- (Optional) `task` installed for the one-command verify path.

## Smoke checks (30 seconds)

Confirm the deletions and the import swap happened:

```sh
# Should print nothing — the vscode-local bounds files are gone
ls apps/vscode/src/utils/bounds.ts      2>&1 | grep -v 'No such file' || true
ls apps/vscode/tests/unit/bounds.test.ts 2>&1 | grep -v 'No such file' || true

# Should print exactly the shared canonical path
grep -r "export function calculateBounds" shared/ apps/ --include='*.ts'
grep -r "export function mergeBounds"     shared/ apps/ --include='*.ts'

# mapPanel.ts should import from @debrief/utils now
grep -n "calculateBounds\|mergeBounds" apps/vscode/src/webview/mapPanel.ts
```

Expected:

- Two "no such file" results (or no output at all from the deletion checks).
- `export function calculateBounds` → exactly one match: `shared/utils/src/bounds.ts`.
- `export function mergeBounds` → exactly one match: `shared/utils/src/bounds.ts`.
  - A second `calculateBounds` hit in `shared/components/src/utils/bounds.ts` is expected — that is a distinct `DebriefFeature`-typed implementation, deliberately out of scope (see `research.md` Decision 4).
- `mapPanel.ts` import shows `from '@debrief/utils'` — not `from '../utils/bounds'`.

## Unit-test check (30 seconds)

Runs only the bounds test file:

```sh
pnpm --filter @debrief/utils test -- bounds
```

Expected output includes at least:

- `✓ should calculate bounds for a single Point feature`
- `✓ should calculate bounds for a LineString feature`
- `✓ should calculate bounds for multiple features`
- `✓ should return null for empty features array`
- `✓ should handle Polygon geometry`
- `✓ should skip features with geometry: null`         *(new)*
- `✓ should skip features with geometry: undefined`    *(new)*
- `✓ should return null when all features have null geometry`  *(new)*
- All `mergeBounds`, `boundsToLeaflet`, `isValidBounds` cases passing (unchanged).

## Full CI gate (2–3 minutes)

Run the same gate CI runs before allowing merge:

```sh
# Preferred
task verify

# Or, if task is not installed, the four-step fallback from CLAUDE.md:
uv run ruff check . && pnpm lint
uv run pyright && pnpm -r typecheck
uv run pytest && pnpm --filter '!@debrief/web-shell' test
cd apps/web-shell && node run-playwright.mjs && cd ../..
pnpm --filter @debrief/spec-navigator build \
  && cd apps/spec-navigator && node run-playwright.mjs && cd ../..
```

Expected: all green. A red in `apps/vscode`'s typecheck almost certainly means the widened parameter type in `shared/utils/src/bounds.ts` is narrower than claimed in `research.md` Decision 1 — revisit the parameter signature.

## Manual smoke (optional, 1 minute)

Open the VS Code extension against the sample data:

1. Launch the dev VS Code extension or a review-app code-server (see `CLAUDE.md § Demo Environment`).
2. Open any plot from the local sample STAC catalog.
3. Confirm the map panel renders, the viewport fits to the plot's bounds, and no exception appears in the webview console or extension host log.
4. Open the dev tools and inspect the sources tab — `@debrief/utils` should be the source of the `calculateBounds` function (not `apps/vscode/src/utils/bounds`).

If the sample catalog contains a plot with null-geometry features (or if one can be authored — e.g., a `FeatureCollection` with a metadata-only feature lacking `geometry`), open that plot too. The zoom-to-bounds should fit to the geometry-bearing features only, with no exception.

## Rollback plan

This refactor is a mechanical consolidation with an additive test suite. Rollback is `git revert <merge-commit>` and requires no data migration, no schema rollback, and no release-note carve-out. The change is Pre-Release (Constitution Article XIV) and has no backward-compatibility obligation.
