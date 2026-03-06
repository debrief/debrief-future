/**
 * PanelWorkspace Component Contract
 *
 * Defines the props for the top-level GoldenLayout wrapper component
 * that replaces the current fixed flexbox layout in the analysis view.
 *
 * Feature: 096-add-goldenlayout-panels
 */

import type { ComponentType } from 'react';
import type { PanelRegistry } from './panel-registry';

// ---------------------------------------------------------------------------
// PanelWorkspace props
// ---------------------------------------------------------------------------

/** Props for the PanelWorkspace component (analysis view container) */
export interface PanelWorkspaceProps {
  /** Panel registry containing all available panel definitions */
  readonly registry: PanelRegistry;

  /**
   * localStorage key for persisting layout.
   * Default: 'debrief-panel-layout'
   */
  readonly storageKey?: string;

  /**
   * Callback fired when the user triggers "Reset Layout".
   * The PanelWorkspace handles the reset internally; this callback
   * is for external notification (e.g., showing a toast).
   */
  readonly onLayoutReset?: () => void;

  /**
   * Callback fired when layout save fails (e.g., localStorage full).
   * Silent by default — use this for error reporting.
   */
  readonly onSaveError?: (error: Error) => void;

  /** Additional CSS class name for the workspace container */
  readonly className?: string;
}

// ---------------------------------------------------------------------------
// Panel content wrapper contract
// ---------------------------------------------------------------------------

/**
 * Each panel definition's component receives application-specific props
 * via React context (session state, callbacks, etc.) — NOT via
 * PanelWorkspace props. This keeps PanelWorkspace generic.
 *
 * Application-specific context is provided by wrapping PanelWorkspace
 * in the necessary providers (e.g., Zustand store, theme, services).
 */

// ---------------------------------------------------------------------------
// Reset Layout action
// ---------------------------------------------------------------------------

/** Command to reset layout, exposed via header menu or keyboard shortcut */
export interface ResetLayoutAction {
  /** Trigger identifier */
  readonly command: 'debrief.resetLayout';
  /** Keyboard shortcut (optional) */
  readonly keybinding?: string;
  /** Menu location */
  readonly menu?: 'header' | 'context';
}
