# Usage Example: Registering a Custom Panel

This example shows how to add a new panel type to the PanelWorkspace.

## 1. Create the Panel Component

```tsx
// shared/components/src/panels/MyCustomPanel.tsx
import type { PanelProps } from '../PanelWorkspace/panelRegistry';
import { usePanelContext } from './PanelContext';

export function MyCustomPanel(_props: PanelProps) {
  const ctx = usePanelContext();

  return (
    <div style={{ height: '100%', padding: 16 }}>
      <h3>My Custom Panel</h3>
      <p>This panel has access to application state via PanelContext.</p>
    </div>
  );
}
```

## 2. Register the Panel Type

```tsx
import { createDefaultRegistry } from '@debrief/components';

const registry = createDefaultRegistry();

// Add a custom panel type
registry.register({
  type: 'my-custom',
  title: 'My Panel',
  component: MyCustomPanel,
  icon: 'symbol-misc',
  minWidth: 200,
  minHeight: 150,
});
```

## 3. Use PanelWorkspace with the Registry

```tsx
<PanelWorkspace
  registry={registry}
  contextWrapper={contextWrapper}
  className="my-workspace"
/>
```

## 4. Add the Panel to a Layout Config

```tsx
import type { LayoutConfig } from 'golden-layout';

const layout: LayoutConfig = {
  root: {
    type: 'row',
    content: [
      {
        type: 'stack',
        content: [
          {
            type: 'component',
            componentType: 'my-custom',
            title: 'My Panel',
          },
        ],
      },
    ],
  },
};
```

## Key Architecture Points

- **Panel Registry** — `Map<string, PanelDefinition>` pattern for extensible panel types
- **PanelContext** — React context provides application state to all panels, decoupling them from GoldenLayout infrastructure
- **Context Wrapper** — The `contextWrapper` prop on PanelWorkspace wraps each panel in providers (e.g., `PanelContextProvider`)
- **Re-rendering** — When context values change, the bridge automatically re-renders all mounted panels via `updateContextWrapper()`
- **Layout Persistence** — Layouts auto-save to localStorage on state changes and restore on mount
