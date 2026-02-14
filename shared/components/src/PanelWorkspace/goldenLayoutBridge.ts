/**
 * GoldenLayout React Bridge
 *
 * Mounts and unmounts React components into GoldenLayout panel containers.
 * Uses the bindComponentEvent / unbindComponentEvent pattern from GL v2.
 */

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import type {
  ComponentContainer,
  VirtualLayout,
  ResolvedComponentItemConfig,
} from 'golden-layout';
import type { PanelRegistry, PanelProps } from './panelRegistry';

/** Tracks mounted React roots so they can be unmounted on unbind */
const mountedRoots = new Map<ComponentContainer, Root>();

/** Counter for generating unique panel instance IDs */
let panelIdCounter = 0;

/**
 * Creates a bind handler for GoldenLayout that mounts React components
 * from the Panel Registry into panel containers.
 */
export function createBindHandler(
  registry: PanelRegistry,
  contextWrapper?: (element: React.ReactElement, container: ComponentContainer) => React.ReactElement,
): VirtualLayout.BindComponentEventHandler {
  return (
    container: ComponentContainer,
    itemConfig: ResolvedComponentItemConfig,
  ): ComponentContainer.BindableComponent => {
    const componentType = String(itemConfig.componentType);
    const definition = registry.get(componentType);

    if (!definition) {
      console.warn(`GoldenLayout bridge: unknown component type "${componentType}"`);
      // Render a placeholder for unknown types
      const root = createRoot(container.element);
      root.render(
        createElement('div', {
          style: { padding: 16, color: '#d32f2f' },
        }, `Unknown panel type: ${componentType}`),
      );
      mountedRoots.set(container, root);
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
    let element = createElement(definition.component, props);

    // Wrap with application context if provided
    if (contextWrapper) {
      element = contextWrapper(element, container);
    }

    root.render(element);
    mountedRoots.set(container, root);

    return { component: undefined, virtual: false };
  };
}

/**
 * Creates an unbind handler that unmounts React roots from containers.
 */
export function createUnbindHandler(): VirtualLayout.UnbindComponentEventHandler {
  return (container: ComponentContainer): void => {
    const root = mountedRoots.get(container);
    if (root) {
      root.unmount();
      mountedRoots.delete(container);
    }
  };
}

/**
 * Unmounts all tracked React roots. Call on workspace destroy.
 */
export function unmountAll(): void {
  for (const [container, root] of mountedRoots) {
    root.unmount();
    mountedRoots.delete(container);
  }
}
