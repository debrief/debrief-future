# Quickstart: VS Code Map Wrapper Refactoring

**Feature**: 048-refactor-vscode-map-wrapper
**Date**: 2026-02-04

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- VS Code with Extension Development extension
- Repository cloned and dependencies installed

## Development Setup

```bash
# Install dependencies
pnpm install

# Build shared components (required first)
cd shared/components
pnpm build

# Start VS Code extension in development mode
cd apps/vscode
pnpm dev
```

## Implementation Steps

### Step 1: Create New Wrapper File

Create `apps/vscode/src/webview/web/mapView.tsx`:

```typescript
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { MapView } from '@debrief/components';
import type { DebriefFeature, DisplayMode } from '@debrief/components';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../messages';

// VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): PersistedState | undefined;
  setState(state: PersistedState): void;
};

interface PersistedState {
  center?: [number, number];
  zoom?: number;
}

const vscode = acquireVsCodeApi();

function MapViewApp(): React.ReactElement {
  // State from extension messages
  const [features, setFeatures] = useState<DebriefFeature[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<number | undefined>();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  // Persisted state
  const [initialCenter, setInitialCenter] = useState<[number, number] | undefined>();
  const [initialZoom, setInitialZoom] = useState<number | undefined>();

  // Restore state on mount
  useEffect(() => {
    const saved = vscode.getState();
    if (saved?.center) setInitialCenter(saved.center);
    if (saved?.zoom) setInitialZoom(saved.zoom);
  }, []);

  // Message handler
  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'loadPlot':
          // Transform and set features
          break;
        case 'setSelection':
          setSelectedIds(new Set(msg.featureIds));
          break;
        case 'setCurrentTime':
          setCurrentTime(msg.time);
          break;
        // ... handle other messages
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Callbacks
  const handleSelect = useCallback((id: string) => {
    vscode.postMessage({
      type: 'selectionChanged',
      selection: { trackIds: [id], locationIds: [], contextType: 'single-track' }
    });
  }, []);

  return (
    <MapView
      features={features}
      selectedIds={selectedIds}
      currentTime={currentTime}
      displayMode={displayMode}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      onSelect={handleSelect}
    />
  );
}

// Mount
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<MapViewApp />);
}
vscode.postMessage({ type: 'webviewReady' });
```

### Step 2: Create HTML Entry Point

Create `apps/vscode/src/webview/web/mapView.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="...">
  <title>Debrief Map</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./mapView.tsx"></script>
</body>
</html>
```

### Step 3: Update Build Configuration

In `apps/vscode/esbuild.config.js`, add the new entry point:

```javascript
entryPoints: [
  'src/webview/web/map.ts',      // Keep for now
  'src/webview/web/mapView.tsx', // New wrapper
  // ...
]
```

### Step 4: Add Feature Flag

In `apps/vscode/src/webview/mapPanel.ts`, add flag to switch between implementations:

```typescript
const USE_REACT_MAP = process.env.USE_REACT_MAP === 'true';

// In getWebviewContent():
const scriptPath = USE_REACT_MAP ? 'mapView.js' : 'map.js';
```

### Step 5: Test in Parallel

```bash
# Run with old implementation
pnpm dev

# Run with new implementation
USE_REACT_MAP=true pnpm dev
```

## Verification Checklist

- [ ] Map renders tracks correctly
- [ ] Map renders reference locations
- [ ] Selection works (click track → selection changes)
- [ ] Temporal rendering works (time controller → track position)
- [ ] State persists (close/reopen panel → same view)
- [ ] Drag-and-drop REP files works
- [ ] Keyboard shortcuts (Ctrl+Z/Y) work
- [ ] Result layers render correctly
- [ ] Layer visibility toggle works
- [ ] Track color changes work
- [ ] Export PNG works
- [ ] Performance acceptable (similar frame rate)

## Troubleshooting

### MapView not rendering

1. Check console for errors
2. Verify `@debrief/components` is built: `cd shared/components && pnpm build`
3. Check CSP allows react-leaflet resources

### Messages not received

1. Add console.log in message handler
2. Verify message types match exactly
3. Check postMessage is called from extension

### Styles missing

1. Ensure leaflet CSS is imported
2. Check MapView.css is bundled
3. Verify CSS variables are set for theming

## Reference Implementation

See `apps/vscode/src/webview/web/timeController.tsx` for the canonical thin wrapper pattern.

## Related Files

- Shared component: `shared/components/src/MapView/MapView.tsx`
- Tests: `shared/components/src/MapView/MapView.test.tsx`
- Stories: `shared/components/src/MapView/MapView.stories.tsx`
- Message protocol: `apps/vscode/src/webview/messages.ts`
