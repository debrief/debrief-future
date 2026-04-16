# Data Model: Stakeholder Demo UI

**Feature**: 189-stakeholder-demo-ui
**Date**: 2026-04-14

The demo introduces **no new persisted schemas**. It consumes existing types from `@debrief/components` (merged via #188) and `debrief-schemas` (existing), and defines only local UI-state shapes.

## Imported Types (from `@debrief/components`)

These are stable contracts owned upstream; this document lists them for traceability only.

| Type | Source | Role in Demo |
|------|--------|--------------|
| `generateCql2(phrase, deps)` | `@debrief/components/nl-cql2` | Entry point from demo to library |
| `GenerationResult` | `@debrief/components/nl-cql2/types` | Return shape consumed by demo (cql2, lozenges, unrecognisedTerms, diagnostics, error) |
| `LozengeSeed` | `@debrief/components/nl-cql2/types` | Projected to `ChipDescriptor` for display |
| `GenerationError` | `@debrief/components/nl-cql2/types` | Surfaced via UI-state error branch |
| `createRecordedLLMClient(responses)` | `@debrief/components/nl-cql2/clients` | Wraps the fixture corpus for demo use |
| `filterByCql2Json(items, cql2)` | `@debrief/components/filter-engine` | Applies the filter to the catalog |
| `StacBrowserItem` | `@debrief/components/...` (or existing) | Catalog plot shape the demo iterates for card rendering |

## Imported Types (from sample catalog)

| Type | Source | Role in Demo |
|------|--------|--------------|
| STAC Item (with `debrief:platforms`) | `preview/workspace/samples/local-store/` | Source data for card rendering; joined with platform registry |
| Platform record (from `shared/data/platform-registry.yaml`) | #180 | Used to resolve `platform_id` → human-readable names for card badges |

## New Local Types (demo-only)

### `ChipDescriptor`

A view-model wrapping one `LozengeSeed` with display metadata.

```typescript
interface ChipDescriptor {
  id: string;              // stable key for React list rendering (derived from field+value)
  label: string;           // human-readable, e.g. "UK", "Type 23", "Exercise Dragonfire"
  filterType: FilterType;  // reused from filter-engine
  value: unknown;          // the raw seed value
  negated: boolean;
  colour: ChipColour;      // derived from filterType (see research.md §2)
}

type ChipColour =
  | 'nationality' | 'vessel' | 'exercise'
  | 'tag' | 'year' | 'domain';
```

**Derivation rules**:
- `colour` mapping:
  - `nationality` → `nationality`
  - `vessel_type` / `vessel_role` / `vessel_class` → `vessel`
  - `exercise` → `exercise`
  - `tags` / `feature_tags` → `tag`
  - `year` → `year`
  - `domain` → `domain`
- `label`: derived from `value` with a registry lookup for `nationality` codes (GB → "UK") and `vessel_type` codes (type23 → "Type 23 (Duke-class)").

### `UiState`

The reducer-shape for the demo's single-screen state machine.

```typescript
type UiState =
  | { kind: 'loading-fixtures' }
  | { kind: 'fixture-error'; message: string }
  | { kind: 'unfiltered'; allPlots: StacBrowserItem[] }
  | { kind: 'filtered';
      query: string;
      chips: ChipDescriptor[];
      filteredPlots: StacBrowserItem[];
      totalCount: number;
    }
  | { kind: 'zero-match';
      query: string;
      chips: ChipDescriptor[];
      totalCount: number;
    }
  | { kind: 'off-corpus';
      query: string;
      examplePhrases: string[];
      // any previous filter state is retained separately to render behind the banner
      lastGoodState: UiState | null;
    };
```

**Transitions**:
- Page load → `loading-fixtures` → (success) `unfiltered` / (fail) `fixture-error`
- Submit non-empty phrase in corpus with matches → `filtered`
- Submit non-empty phrase in corpus with zero hits → `zero-match`
- Submit non-empty phrase not in corpus → `off-corpus` (lastGoodState preserved)
- Submit empty phrase → `unfiltered`
- Click × on a chip → recompute CQL2 from remaining chips, re-evaluate → `filtered` / `unfiltered` / `zero-match`
- Click "Clear all" → `unfiltered`
- Click example in off-corpus banner → as if the query had been submitted normally

### `CardProjection`

A view-model for a single card, derived from `StacBrowserItem` + platform registry.

```typescript
interface CardProjection {
  id: string;
  title: string;
  year: number | string;
  description: string;        // truncated to ~200 chars at projection time
  nationalityBadges: string[]; // resolved country codes (e.g. "UK", "US")
  vesselBadges: string[];      // resolved vessel type names (e.g. "Type 23 (Duke-class)")
  tagBadges: string[];         // first 3 tags only
}
```

## State Flow (Happy Path)

```
[User types phrase + Enter]
          │
          ▼
generateCql2(phrase, { llmClient, enumBundle })
          │
   ┌──────┴──────┐
   │             │
(hit)        (miss)
   │             │
   ▼             ▼
filterByCql2Json    setState({ kind: 'off-corpus',
(items, cql2)        examplePhrases, lastGoodState })
   │
   ▼
setState({ kind: 'filtered' or 'zero-match',
           chips, filteredPlots, totalCount })
```

## Contracts (Summary)

- **Inbound** (what the demo needs from 188): `generateCql2`, `createRecordedLLMClient`, `GenerationResult` type, fixture corpus JSON file.
- **Inbound** (what the demo needs from #184/#181): sample catalog JSON with fully resolved `debrief:platforms`.
- **Inbound** (what the demo needs from #180): platform registry for human-readable display name resolution.
- **Outbound**: nothing — this is a leaf consumer.

No new contracts are defined by this item beyond the `ChipDescriptor` / `UiState` / `CardProjection` view models, which live entirely inside `apps/nl-demo/` and are not exported.
