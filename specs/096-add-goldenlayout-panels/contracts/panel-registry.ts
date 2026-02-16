/**
 * Panel Registry API Contract
 *
 * Defines the interface for registering panel types and the props
 * passed to panel content components by the GoldenLayout bridge.
 *
 * Feature: 096-add-goldenlayout-panels
 */

import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Panel content component props (passed by the bridge)
// ---------------------------------------------------------------------------

/** Props injected into every panel content component by the GoldenLayout bridge */
export interface PanelProps {
  /** GoldenLayout container reference — use for resize events and state queries */
  readonly container: unknown; // GoldenLayout.ComponentContainer at runtime
  /** True when this panel instance is rendered in a popped-out browser window */
  readonly isPopout: boolean;
  /** Unique instance identifier for this panel occurrence */
  readonly panelId: string;
}

// ---------------------------------------------------------------------------
// Panel definition (registered by feature authors)
// ---------------------------------------------------------------------------

/** Definition of a panel type registered in the Panel Registry */
export interface PanelDefinition {
  /** Unique identifier for this panel type (e.g., 'map', 'chart', 'navigation') */
  readonly type: string;
  /** Human-readable display name shown in tab headers */
  readonly title: string;
  /** React component to render inside the panel container */
  readonly component: ComponentType<PanelProps>;
  /** Optional codicon icon name for the tab header */
  readonly icon?: string;
  /** Minimum panel width in pixels (default: 200) */
  readonly minWidth?: number;
  /** Minimum panel height in pixels (default: 150) */
  readonly minHeight?: number;
  /** Whether the user can close this panel (default: true) */
  readonly closable?: boolean;
  /** If true, only one instance of this panel type can exist (default: true) */
  readonly singleton?: boolean;
}

// ---------------------------------------------------------------------------
// Panel Registry interface
// ---------------------------------------------------------------------------

/** Registry for panel type definitions */
export interface PanelRegistry {
  /** Register a new panel type. Throws if `type` is already registered. */
  register(definition: PanelDefinition): void;

  /** Unregister a panel type by its type identifier. No-op if not found. */
  unregister(type: string): void;

  /** Retrieve a panel definition by type. Returns undefined if not found. */
  get(type: string): PanelDefinition | undefined;

  /** Check whether a panel type is registered. */
  has(type: string): boolean;

  /** Return all registered panel definitions. */
  getAll(): ReadonlyArray<PanelDefinition>;

  /** Return all registered panel type identifiers. */
  getTypes(): ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Layout persistence
// ---------------------------------------------------------------------------

/** Versioned layout stored in localStorage */
export interface PersistedLayout {
  /** Schema version — increment when default layout structure changes */
  readonly version: number;
  /** Serialized GoldenLayout ResolvedLayoutConfig as JSON-compatible object */
  readonly config: unknown;
}

// ---------------------------------------------------------------------------
// Layout manager interface (consumed by PanelWorkspace component)
// ---------------------------------------------------------------------------

/** High-level layout operations exposed to the application */
export interface LayoutManager {
  /** Load saved layout from storage, falling back to default if unavailable or invalid */
  loadLayout(): void;

  /** Save the current layout to storage */
  saveLayout(): void;

  /** Reset to the default five-panel layout, discarding any saved layout */
  resetLayout(): void;

  /** Add a panel of the given type to the layout (e.g., re-open a closed panel) */
  addPanel(type: string): void;

  /** Check whether a panel of the given type is currently visible in the layout */
  isPanelOpen(type: string): boolean;
}
