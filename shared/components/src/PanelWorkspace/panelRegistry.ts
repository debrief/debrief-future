/**
 * Panel Registry
 *
 * Map-based registry for panel type definitions. Each panel type has a unique
 * string identifier, title, React component, and optional constraints.
 */

import type { ComponentType } from 'react';

export interface PanelProps {
  readonly container: unknown; // GoldenLayout ComponentContainer at runtime
  readonly isPopout: boolean;
  readonly panelId: string;
}

export interface PanelDefinition {
  readonly type: string;
  readonly title: string;
  readonly component: ComponentType<PanelProps>;
  readonly icon?: string;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly closable?: boolean;
  readonly singleton?: boolean;
}

export interface PanelRegistry {
  register(definition: PanelDefinition): void;
  unregister(type: string): void;
  get(type: string): PanelDefinition | undefined;
  has(type: string): boolean;
  getAll(): ReadonlyArray<PanelDefinition>;
  getTypes(): ReadonlyArray<string>;
}

/**
 * Creates a new panel registry instance.
 *
 * @returns A PanelRegistry implementation
 */
export function createPanelRegistry(): PanelRegistry {
  const registry = new Map<string, PanelDefinition>();

  return {
    register(definition: PanelDefinition): void {
      if (registry.has(definition.type)) {
        throw new Error(
          `Panel type "${definition.type}" is already registered`
        );
      }
      registry.set(definition.type, definition);
    },

    unregister(type: string): void {
      registry.delete(type);
    },

    get(type: string): PanelDefinition | undefined {
      return registry.get(type);
    },

    has(type: string): boolean {
      return registry.has(type);
    },

    getAll(): ReadonlyArray<PanelDefinition> {
      return Array.from(registry.values());
    },

    getTypes(): ReadonlyArray<string> {
      return Array.from(registry.keys());
    },
  };
}
