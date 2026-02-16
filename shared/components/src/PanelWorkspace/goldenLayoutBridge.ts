/**
 * GoldenLayout React Bridge
 *
 * Mounts and unmounts React components into GoldenLayout panel containers.
 * Uses the bindComponentEvent / unbindComponentEvent pattern from GL v2.
 *
 * Supports re-rendering all mounted panels when context changes,
 * which is essential because GoldenLayout manages the DOM containers
 * and React roots are created per-panel.
 */

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import type {
  ComponentContainer,
  VirtualLayout,
  ResolvedComponentItemConfig,
} from 'golden-layout';
import type { PanelRegistry, PanelProps } from './panelRegistry';

/** Info stored for each mounted panel so we can re-render it */
interface MountedPanel {
  root: Root;
  props: PanelProps;
  componentType: string;
}

/** Tracks mounted React roots and their render info */
const mountedPanels = new Map<ComponentContainer, MountedPanel>();

/** Counter for generating unique panel instance IDs */
let panelIdCounter = 0;

/** Current context wrapper — updated via setContextWrapper */
let currentContextWrapper:
  | ((element: React.ReactElement, container: ComponentContainer) => React.ReactElement)
  | undefined;

/** Current registry reference */
let currentRegistry: PanelRegistry | undefined;

/** Renders a panel element into its root, applying context wrapper if set */
function renderPanel(container: ComponentContainer, panel: MountedPanel): void {
  const definition = currentRegistry?.get(panel.componentType);
  if (!definition) return;

  let element = createElement(definition.component, panel.props);
  if (currentContextWrapper) {
    element = currentContextWrapper(element, container);
  }
  panel.root.render(element);
}

/**
 * Creates a bind handler for GoldenLayout that mounts React components
 * from the Panel Registry into panel containers.
 */
export function createBindHandler(
  registry: PanelRegistry,
  contextWrapper?: (element: React.ReactElement, container: ComponentContainer) => React.ReactElement,
): VirtualLayout.BindComponentEventHandler {
  currentRegistry = registry;
  currentContextWrapper = contextWrapper;

  return (
    container: ComponentContainer,
    itemConfig: ResolvedComponentItemConfig,
  ): ComponentContainer.BindableComponent => {
    const componentType = String(itemConfig.componentType);
    const definition = registry.get(componentType);

    if (!definition) {
      console.warn(`GoldenLayout bridge: unknown component type "${componentType}"`);
      const root = createRoot(container.element);
      root.render(
        createElement('div', {
          style: { padding: 16, color: '#d32f2f' },
        }, `Unknown panel type: ${componentType}`),
      );
      mountedPanels.set(container, {
        root,
        props: { container: container as unknown, isPopout: false, panelId: 'unknown' },
        componentType,
      });
      return { component: undefined, virtual: false };
    }

    panelIdCounter += 1;
    const panelId = `${componentType}-${panelIdCounter}`;

    const props: PanelProps = {
      container: container as unknown,
      isPopout: container.layoutManager.isSubWindow,
      panelId,
    };

    const root = createRoot(container.element);
    const panel: MountedPanel = { root, props, componentType };
    mountedPanels.set(container, panel);
    renderPanel(container, panel);

    return { component: undefined, virtual: false };
  };
}

/**
 * Creates an unbind handler that unmounts React roots from containers.
 */
export function createUnbindHandler(): VirtualLayout.UnbindComponentEventHandler {
  return (container: ComponentContainer): void => {
    const panel = mountedPanels.get(container);
    if (panel) {
      panel.root.unmount();
      mountedPanels.delete(container);
    }
  };
}

/**
 * Updates the context wrapper and re-renders all mounted panels.
 * Called by PanelWorkspace when the contextWrapper prop changes.
 */
export function updateContextWrapper(
  contextWrapper?: (element: React.ReactElement, container: ComponentContainer) => React.ReactElement,
): void {
  currentContextWrapper = contextWrapper;
  for (const [container, panel] of mountedPanels) {
    renderPanel(container, panel);
  }
}

/**
 * Unmounts all tracked React roots. Call on workspace destroy.
 */
export function unmountAll(): void {
  for (const [, panel] of mountedPanels) {
    panel.root.unmount();
  }
  mountedPanels.clear();
  currentContextWrapper = undefined;
  currentRegistry = undefined;
}
