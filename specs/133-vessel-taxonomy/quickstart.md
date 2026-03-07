# Quickstart: Vessel Taxonomy and Hierarchical Filtering

## Prerequisites

- Node.js 18+, pnpm installed
- Repository cloned and dependencies installed (`pnpm install`)

## Key Files

| File | Purpose |
|------|---------|
| `shared/schemas/fixtures/stac-browser/vessel-taxonomy.json` | Taxonomy data (4 levels, 20+ leaf types) |
| `shared/components/src/CascadingMenu/CascadingMenu.tsx` | Base hierarchical menu component |
| `shared/components/src/CascadingMenu/SearchableCascadingMenu.tsx` | **NEW** — Search wrapper |
| `shared/components/src/CascadingMenu/filterCascadingItems.ts` | **NEW** — Tree filtering utility |
| `shared/components/src/FilterBar/taxonomyAdapter.ts` | Taxonomy → CascadingMenuItem adapter |
| `shared/components/src/FilterBar/labelResolver.ts` | **NEW** — Label lookup utility |
| `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts` | **NEW** — Per-node count hook |
| `shared/components/src/FilterBar/ValueEditor.tsx` | Vessel class editor (uses SearchableCascadingMenu) |
| `shared/components/src/FilterBar/Lozenge.tsx` | Lozenge display (uses label resolver) |

## Development

```bash
# Run Storybook to see the taxonomy dropdown in action
cd shared/components && pnpm storybook

# Run tests
cd shared/components && pnpm test

# Type-check
cd shared/components && pnpm typecheck
```

## Adding a New Vessel Type

1. Edit `shared/schemas/fixtures/stac-browser/vessel-taxonomy.json`
2. Add new node under the appropriate parent:
   ```json
   "type31": { "label": "Type 31 Frigate" }
   ```
3. No code changes required — the taxonomy is loaded dynamically

## Testing

```bash
# Unit tests for new modules
pnpm --filter @debrief/components test -- --grep "labelResolver"
pnpm --filter @debrief/components test -- --grep "useTaxonomyMatchCounts"
pnpm --filter @debrief/components test -- --grep "filterCascadingItems"
pnpm --filter @debrief/components test -- --grep "SearchableCascadingMenu"
```
