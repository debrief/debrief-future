# Quickstart: Filter Bar Platform Chips

**Feature**: `186-filter-chips`
**Development branch**: `claude/filter-chips-speckit-TR8Bd`
**Applies to**: developers implementing, reviewing, or demoing this feature.

## What you'll end up with

A new "Platform" entry in the filter bar's add-filter menu, opening a compound editor that lets the analyst pick any subset of platform attributes (nationality, domain, vessel role, vessel type, vessel class). Confirming creates a single compound chip that filters plots using the existing `array_filter` CQL2 engine — matching only plots that contain a platform record satisfying *all* selected attributes.

## Prerequisites

- The repo is on branch `claude/filter-chips-speckit-TR8Bd` with a clean working tree.
- `pnpm install` has been run at the repo root.
- You are working in `shared/components/`.

## Run the Storybook (fastest way to see the chip)

```sh
pnpm --filter @debrief/components storybook
```

Open the URL printed by Storybook. Navigate to **FilterBar → FilterBar → With Platform Chip** once the story has been added (Phase 2 task T? in `tasks.md`). Existing FilterBar stories remain under the same path.

Until the story ships, you can visually dry-run the new chip by tweaking any existing FilterBar story's `initialFilterState` to include:

```ts
{
  items: [
    {
      kind: 'lozenge',
      shape: 'platform',
      id: 'demo',
      filterType: 'platform',
      attributes: { nationality: 'GB', domain: 'subsurface' },
    },
  ],
}
```

## Run the unit tests

```sh
pnpm --filter @debrief/components test
```

The test list for this feature is in `contracts/test-list.md` (40+ tests). All must be green before PR. The suite is configured to run `vitest`.

## Run the Storybook E2E tests

```sh
cd apps/web-shell && node run-playwright.mjs
```

(Per `CLAUDE.md` — this uses `@sparticuz/chromium` so it works in Claude Code cloud sessions.) The extended scenarios live in `shared/components/e2e/FilterBar.spec.ts` and `shared/components/e2e/SavedFilters.spec.ts`.

## Validate the full CI locally

```sh
task verify
# or, if task isn't installed:
uv run ruff check . && pnpm lint
uv run pyright && pnpm -r typecheck
uv run pytest && pnpm --filter '!@debrief/web-shell' test
cd apps/web-shell && node run-playwright.mjs && cd ../..
```

Only the `pnpm` steps touch this feature; Python suites exist to catch cross-package drift (there should be none).

## Demo script (for stakeholder walkthrough)

1. Open the Storybook (or the VS Code extension with a loaded catalog).
2. Confirm the filter bar is empty and the catalog shows all items.
3. Click the **+** button → select **Platform**.
4. In the popover editor, pick **Nationality = GB** and **Domain = Subsurface** → click Confirm.
5. The filter bar now shows a single chip labelled **"Platform: GB · Subsurface"**. The catalog shows only plots containing a British submarine (e.g., on the sample catalog this is a small subset).
6. Click the chip → the editor re-opens. Change **Domain** to **Surface** → Confirm. The catalog updates to British surface platforms.
7. Click the ≠ (negate) button on the chip. The chip shows **NOT** and the catalog inverts.
8. Click × on the chip. The chip disappears and the catalog returns to showing all items.

## Verifying the `array_filter` CQL2 emission

With the chip `{nationality: 'GB', domain: 'subsurface'}` active, the `onExpressionChange` callback fires with a `FilterExpression` whose `arrayFilters` contains one entry. The serialisation (via `filterExpressionToCql2Json`) matches the shape in `contracts/cql2-roundtrip.md`. The FilterBar storybook includes a "Show CQL2" debug panel (from #127); it should read (formatted):

```json
{
  "op": "array_filter",
  "args": [
    { "property": "debrief:platforms" },
    {
      "op": "and",
      "args": [
        { "op": "=", "args": [{ "property": "nationality" }, "GB"] },
        { "op": "=", "args": [{ "property": "domain" }, "subsurface"] }
      ]
    }
  ]
}
```

## Scope — what this feature does NOT touch

- Python services (none modified).
- LinkML schemas or the `@debrief/schemas` package (no regen needed).
- The `debrief-stac` save pipeline.
- The `array_filter` engine implementation (consumed as-is from #185).
- The VS Code extension's activation or panel wiring (the extension consumes the FilterBar through the existing React entry point, which continues to work because the `FilterBarProps` interface is unchanged).

## Troubleshooting

- **Platform chip renders but the filtered result set is unchanged.** Confirm `toFilterExpression` emits into `arrayFilters`. Inspect the engine's `filter` call — `matchArrayFilter` should be invoked. (`matchers.test.ts` covers the engine path; this feature only adds an emission path.)
- **Saved filter restore shows an error banner for an otherwise-OK filter.** Look at the partial-restore log for unsupported CQL2 shapes (see `contracts/cql2-roundtrip.md` — OR sub-predicates, nested ANDs, unsupported fields).
- **TypeScript errors in consumers that read `item.value` on a `LozengeItem`.** Expected — you must narrow by `item.shape === 'simple'` before accessing `.value`, or by `item.shape === 'platform'` before accessing `.attributes`.
