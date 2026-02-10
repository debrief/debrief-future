# Quickstart: STAC File Tree Component

**Feature**: 077-stac-file-tree
**Date**: 2026-02-10

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Workspace dependencies installed (`pnpm install` from repo root)

## Quick Start

### 1. Install memfs (dev dependency)

```bash
cd shared/components
pnpm add -D memfs@^4
```

### 2. Create the component

Create the component directory structure:

```
shared/components/src/StacFileTree/
├── StacFileTree.tsx          # Main component
├── StacFileTree.css          # Styles (BEM + CSS custom properties)
├── StacFileTree.stories.tsx  # Storybook stories
├── StacFileTree.test.tsx     # Unit tests
├── types.ts                  # TypeScript interfaces
├── useTreeState.ts           # Tree expand/collapse/cache hook
├── highlightUtils.ts         # Highlight set computation
├── fixtures.ts               # memfs fixture data for stories/tests
└── index.ts                  # Barrel export
```

### 3. Export from component library

Add to `shared/components/src/index.ts`:

```typescript
export { StacFileTree } from './StacFileTree';
export type { StacFileTreeProps, FilesystemAdapter, TreeNodeType } from './StacFileTree';
```

Add to `shared/components/package.json` exports:

```json
"./StacFileTree": {
  "import": "./dist/StacFileTree/index.js",
  "require": "./dist/StacFileTree/index.cjs",
  "types": "./dist/StacFileTree/index.d.ts"
}
```

### 4. Run Storybook

```bash
pnpm storybook
```

Navigate to the StacFileTree stories to verify all four variants render correctly.

### 5. Run tests

```bash
cd shared/components
pnpm test -- StacFileTree
```

### 6. Integrate in web-shell

In `apps/web-shell/src/App.tsx`, add StacFileTree above ActivityPanel in the analysis view's left sidebar.

## Key Files to Modify

| File | Change |
|------|--------|
| `shared/components/src/StacFileTree/` | New component directory (all files) |
| `shared/components/src/index.ts` | Add StacFileTree export |
| `shared/components/package.json` | Add memfs devDependency, add export entry |
| `apps/web-shell/src/App.tsx` | Integrate StacFileTree in sidebar |
| `apps/web-shell/package.json` | Add memfs dependency (runtime, for demo) |

## Development Workflow

1. **Start Storybook** for component development:
   ```bash
   pnpm storybook
   ```

2. **Run tests in watch mode** while developing:
   ```bash
   cd shared/components && pnpm test:watch
   ```

3. **Build the component library** to verify exports:
   ```bash
   cd shared/components && pnpm build
   ```

4. **Test in web-shell** after integration:
   ```bash
   cd apps/web-shell && pnpm dev
   ```

## Fixture Data

The Storybook stories use memfs volumes pre-populated with STAC catalog structures:

```typescript
// fixtures.ts - creates a realistic STAC store in memfs
import { Volume } from 'memfs';

export function createPopulatedStore(): Volume {
  const vol = Volume.fromJSON({
    '/store/catalog.json': JSON.stringify({ type: 'Catalog', id: 'root', ... }),
    '/store/exercise-alpha/catalog.json': JSON.stringify({ type: 'Catalog', id: 'exercise-alpha', ... }),
    '/store/exercise-alpha/track-001/item.json': JSON.stringify({ type: 'Feature', id: 'track-001', ... }),
    '/store/exercise-alpha/track-001/data.geojson': '{ "type": "FeatureCollection", ... }',
    '/store/exercise-alpha/track-001/assets/source.rep': '...',
    '/store/exercise-alpha/track-001/assets/plot-snap-2026-02-09T14-30-00.geojson': '...',
  });
  return vol;
}
```
