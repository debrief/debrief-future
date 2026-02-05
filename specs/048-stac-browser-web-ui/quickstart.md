# Quickstart: STAC Browser Web UI

**Feature**: 048-stac-browser-web-ui
**Date**: 2026-02-04

## Prerequisites

- Node.js 18+
- pnpm 8+
- Repository cloned with dependencies installed (`pnpm install`)

## Setup

### 1. Create the web-shell app directory

```bash
mkdir -p apps/web-shell/src/mocks
mkdir -p apps/web-shell/playwright/tests
```

### 2. Initialize package.json

```bash
cd apps/web-shell
cat > package.json << 'EOF'
{
  "name": "@debrief/web-shell",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "dependencies": {
    "@debrief/components": "workspace:*",
    "@debrief/session-state": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
EOF
```

### 3. Add to pnpm workspace

Edit `pnpm-workspace.yaml` at repository root:

```yaml
packages:
  - 'shared/*'
  - 'services/*'
  - 'apps/*'        # This line already includes apps/web-shell
```

### 4. Install dependencies

```bash
cd ../..  # back to repo root
pnpm install
```

### 5. Configure Vite

Create `apps/web-shell/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
    },
  },
});
```

### 6. Configure TypeScript

Create `apps/web-shell/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@test-data/*": ["../vscode/test-data/*"]
    },
    "baseUrl": "."
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `apps/web-shell/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 7. Create HTML entry point

Create `apps/web-shell/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Debrief Web Shell</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Development

### Start dev server

```bash
cd apps/web-shell
pnpm dev
```

Opens at http://localhost:5173

### Run Playwright tests

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui
```

### Build for production

```bash
pnpm build
pnpm preview
```

## File Structure After Setup

```
apps/web-shell/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   └── mocks/
│       ├── stacService.ts
│       └── calcService.ts
└── playwright/
    ├── playwright.config.ts
    └── tests/
        └── *.spec.ts
```

## Verification Checklist

- [ ] `pnpm dev` starts without errors
- [ ] Welcome page shows catalog items
- [ ] Double-clicking item opens analysis view
- [ ] Map renders tracks
- [ ] Selection syncs between map and feature list
- [ ] Time slider updates track rendering
- [ ] Tools show correct active/inactive state
- [ ] `pnpm test` passes all Playwright tests

## Troubleshooting

### Path alias not resolving

Ensure both `vite.config.ts` and `tsconfig.json` have matching alias configuration.

### Components not found

Run `pnpm install` from repository root to ensure workspace dependencies are linked.

### Playwright tests timeout

Increase timeout in `playwright.config.ts`:

```typescript
export default defineConfig({
  timeout: 30000,  // 30 seconds
});
```

### Fixture data not loading

Verify the path alias resolves correctly:

```typescript
// In any file, this should work:
import catalog from '@test-data/local-store/catalog.json';
console.log(catalog);
```
