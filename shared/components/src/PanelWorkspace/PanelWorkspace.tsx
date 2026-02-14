/**
 * PanelWorkspace — GoldenLayout container component.
 *
 * Mounts GoldenLayout into a container div, wires the React bridge,
 * handles layout persistence, and exposes a reset action.
 */

import { useRef, useEffect, useCallback, type ReactElement } from 'react';
import {
  GoldenLayout,
  LayoutConfig,
  ResolvedLayoutConfig,
  type ComponentContainer,
} from 'golden-layout';
import type { PanelRegistry } from './panelRegistry';
import { DEFAULT_LAYOUT_CONFIG } from './defaultLayout';
import { saveLayout, loadLayout, clearLayout } from './layoutPersistence';
import { createBindHandler, createUnbindHandler, unmountAll, updateContextWrapper } from './goldenLayoutBridge';
import './PanelWorkspace.css';

export interface PanelWorkspaceProps {
  /** Panel registry containing all available panel definitions */
  registry: PanelRegistry;
  /** localStorage key override for layout persistence (default: uses internal key) */
  storageKey?: string;
  /** Optional context wrapper for panel React elements */
  contextWrapper?: (element: ReactElement, container: ComponentContainer) => ReactElement;
  /** Callback fired when layout is reset to default */
  onLayoutReset?: () => void;
  /** Callback fired when layout save fails */
  onSaveError?: (error: Error) => void;
  /** Additional CSS class name */
  className?: string;
}

/** Ref handle exposed via useImperativeHandle (if needed) */
export interface PanelWorkspaceHandle {
  resetLayout: () => void;
}

export function PanelWorkspace({
  registry,
  contextWrapper,
  onLayoutReset,
  onSaveError,
  className,
}: PanelWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<GoldenLayout | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save handler
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      const gl = glRef.current;
      if (!gl || !gl.isInitialised) return;
      try {
        const resolvedConfig = gl.saveLayout();
        saveLayout(resolvedConfig);
      } catch (error) {
        if (onSaveError) onSaveError(error as Error);
        else console.warn('Failed to save layout:', error);
      }
    }, 500);
  }, [onSaveError]);

  // Initialize GoldenLayout on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bindHandler = createBindHandler(registry, contextWrapper);
    const unbindHandler = createUnbindHandler();

    const gl = new GoldenLayout(container, bindHandler, unbindHandler);
    glRef.current = gl;

    // Try to load saved layout, fall back to default
    const registeredTypes = registry.getTypes();
    const savedConfig = loadLayout(registeredTypes as string[]);

    let layoutConfig: LayoutConfig;
    if (savedConfig) {
      try {
        layoutConfig = LayoutConfig.fromResolved(savedConfig as ResolvedLayoutConfig);
      } catch {
        console.warn('Failed to parse saved layout, using default');
        layoutConfig = DEFAULT_LAYOUT_CONFIG;
      }
    } else {
      layoutConfig = DEFAULT_LAYOUT_CONFIG;
    }

    gl.loadLayout(layoutConfig);

    // Listen for state changes to save layout (debounced)
    gl.on('stateChanged', debouncedSave);

    return () => {
      // Save layout before destroying
      if (gl.isInitialised) {
        try {
          const resolvedConfig = gl.saveLayout();
          saveLayout(resolvedConfig);
        } catch {
          // Ignore save errors during cleanup
        }
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      unmountAll();
      gl.destroy();
      glRef.current = null;
    };
  }, []); // Only initialize once on mount

  // Re-render all mounted panels when context wrapper changes
  useEffect(() => {
    updateContextWrapper(contextWrapper);
  }, [contextWrapper]);

  // Reset layout handler
  const handleResetLayout = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;

    clearLayout();
    gl.loadLayout(DEFAULT_LAYOUT_CONFIG);
    onLayoutReset?.();
  }, [onLayoutReset]);

  // Expose reset via a data attribute for external triggering
  // (PanelWorkspace is controlled by the app, which can call resetLayout)
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      (container as HTMLElement & { __resetLayout?: () => void }).__resetLayout = handleResetLayout;
    }
  }, [handleResetLayout]);

  return (
    <div
      ref={containerRef}
      className={`panel-workspace ${className ?? ''}`}
      data-testid="panel-workspace"
    />
  );
}
