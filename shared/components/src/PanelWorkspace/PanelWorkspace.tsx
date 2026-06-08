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
  RowOrColumn,
  ContentItem,
  type ComponentContainer,
} from 'golden-layout';
import type { PanelRegistry } from './panelRegistry';
import { getDefaultLayout, BASELINE_WIDTH, PANEL_MAP } from './defaultLayout';
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
  const suppressSaveRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(false);

  // Debounced save handler
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      const gl = glRef.current;
      if (!gl || !gl.isInitialised) return;
      // Don't persist during reset or when layout is empty/degraded
      if (suppressSaveRef.current) return;
      if (!gl.rootItem || gl.rootItem.contentItems.length === 0) return;
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

    // Read container width ONCE at GL init (Decision #3, #13 — key off
    // clientWidth of the container, not window.innerWidth).
    const containerWidth = container.clientWidth || BASELINE_WIDTH;

    // Try to load saved layout, fall back to responsive default
    const registeredTypes = registry.getTypes();
    const savedConfig = loadLayout(registeredTypes as string[]);

    let layoutConfig: LayoutConfig;
    if (savedConfig) {
      try {
        layoutConfig = LayoutConfig.fromResolved(savedConfig as ResolvedLayoutConfig);
      } catch {
        console.warn('Failed to parse saved layout, using default');
        layoutConfig = getDefaultLayout(containerWidth);
      }
    } else {
      layoutConfig = getDefaultLayout(containerWidth);
    }

    gl.loadLayout(layoutConfig);

    // Listen for state changes to save layout (debounced) and detect empty state
    gl.on('stateChanged', () => {
      debouncedSave();
      setIsEmpty(!gl.rootItem || gl.rootItem.contentItems.length === 0);
    });

    return () => {
      // Cancel any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Save layout before destroying — but only if the layout still has
      // content. During React unmount (e.g. navigating away from analysis
      // view), GoldenLayout may report an empty/degraded state. Persisting
      // that would corrupt the saved layout for the next session.
      if (gl.isInitialised && gl.rootItem && gl.rootItem.contentItems.length > 0) {
        try {
          const resolvedConfig = gl.saveLayout();
          saveLayout(resolvedConfig);
        } catch {
          // Ignore save errors during cleanup
        }
      }

      unmountAll();
      gl.destroy();
      glRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once on mount

  // Re-render all mounted panels when context wrapper changes
  useEffect(() => {
    updateContextWrapper(contextWrapper);
  }, [contextWrapper]);

  // Reset layout handler
  const handleResetLayout = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;

    // Suppress layout saves during reset to prevent persisting the
    // intermediate empty state between clearRoot and addChild.
    suppressSaveRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    clearLayout();
    // Read container width ONCE at reset (Decision #3, #13).
    const containerWidth = containerRef.current?.clientWidth ?? BASELINE_WIDTH;
    gl.loadLayout(getDefaultLayout(containerWidth));

    // After loadLayout, GoldenLayout has created new DOM containers and
    // the bridge has bound fresh React roots. Force a re-render of all
    // panels with the current context wrapper so they pick up the latest
    // props (plot data, tools, etc.).
    updateContextWrapper(contextWrapper);

    suppressSaveRef.current = false;
    onLayoutReset?.();
  }, [onLayoutReset, contextWrapper]);

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

  // Add a panel dynamically (e.g., Results panel when results arrive).
  // Places it below the map by finding the map's parent column.
  const addPanel = useCallback((componentType: string, title: string) => {
    const gl = glRef.current;
    if (!gl || !gl.isInitialised) return;
    if (hasPanel(componentType)) return; // already present

    // Find the column containing the map so we can add below it
    const findMapColumn = (item: ContentItem): RowOrColumn | null => {
      if (ContentItem.isComponentItem(item) && item.componentType === PANEL_MAP) {
        // Walk up to find the parent column
        let parent = item.parent;
        while (parent) {
          if (parent.isColumn && parent instanceof RowOrColumn) return parent;
          parent = parent.parent;
        }
      }
      for (const child of item.contentItems) {
        const found = findMapColumn(child);
        if (found) return found;
      }
      return null;
    };

    const mapColumn = gl.rootItem ? findMapColumn(gl.rootItem) : null;
    if (mapColumn) {
      mapColumn.addComponent(componentType, undefined, title);

      // Set 70/30 split between map (top) and results (bottom) (#177).
      // After addComponent, the column has two stacks. Assign relative
      // sizes so the map keeps 70% and results gets 30%.
      const items = mapColumn.contentItems;
      if (items.length === 2) {
        (items[0] as ContentItem & { size: number }).size = 70;
        (items[1] as ContentItem & { size: number }).size = 30;
        mapColumn.updateSize(false);
      }
    } else {
      // Fallback: use default placement
      gl.addComponent(componentType, undefined, title);
    }
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
