/**
 * PanelWorkspace — GoldenLayout container component.
 *
 * Mounts GoldenLayout into a container div, wires the React bridge,
 * handles layout persistence, and exposes a reset action.
 */

import { useRef, useEffect, useCallback, useState, type ReactElement } from 'react';
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

/** Methods exposed on the workspace DOM element for external control */
export interface PanelWorkspaceElement extends HTMLElement {
  __resetLayout?: () => void;
  __addPanel?: (componentType: string, title: string) => void;
  __hasPanel?: (componentType: string) => boolean;
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
  const [isEmpty, setIsEmpty] = useState(false);

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

    // Listen for state changes to save layout (debounced) and detect empty state
    gl.on('stateChanged', () => {
      debouncedSave();
      setIsEmpty(!gl.rootItem || gl.rootItem.contentItems.length === 0);
    });

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

  // Check if a component type is currently present in the layout
  const hasPanel = useCallback((componentType: string): boolean => {
    const gl = glRef.current;
    if (!gl || !gl.rootItem) return false;
    // Recursively search content items for the component type
    const search = (items: unknown[]): boolean => {
      for (const item of items as Array<{ type?: string; componentType?: string; contentItems?: unknown[] }>) {
        if (item.type === 'component' && item.componentType === componentType) return true;
        if (item.contentItems && search(item.contentItems)) return true;
      }
      return false;
    };
    return search(gl.rootItem.contentItems as unknown[]);
  }, []);

  // Add a panel dynamically (e.g., Chart panel when results arrive)
  const addPanel = useCallback((componentType: string, title: string) => {
    const gl = glRef.current;
    if (!gl || !gl.isInitialised) return;
    if (hasPanel(componentType)) return; // already present
    gl.addComponent(componentType, undefined, title);
  }, [hasPanel]);

  // Expose control methods on the DOM element for external triggering
  useEffect(() => {
    const container = containerRef.current as PanelWorkspaceElement | null;
    if (container) {
      container.__resetLayout = handleResetLayout;
      container.__addPanel = addPanel;
      container.__hasPanel = hasPanel;
    }
  }, [handleResetLayout, addPanel, hasPanel]);

  return (
    <div
      ref={containerRef}
      className={`panel-workspace ${className ?? ''}`}
      data-testid="panel-workspace"
    >
      {isEmpty && (
        <div className="panel-workspace__empty">
          <p>All panels have been closed.</p>
          <button type="button" onClick={handleResetLayout}>
            Reset Layout
          </button>
        </div>
      )}
    </div>
  );
}
