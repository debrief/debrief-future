/**
 * Map Panel wrapper — renders MapView in a GoldenLayout panel
 * with resize-aware invalidateSize.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { PanelProps } from '../PanelWorkspace/panelRegistry';
import { usePanelContext } from './PanelContext';
import type { ComponentContainer } from 'golden-layout';

export function MapPanel(props: PanelProps) {
  const ctx = usePanelContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced resize handler to invalidate Leaflet map size
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      // Trigger Leaflet invalidateSize by dispatching a resize event
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }, []);

  // Listen for GoldenLayout container resize events
  useEffect(() => {
    const container = props.container as ComponentContainer;
    if (container && typeof container.on === 'function') {
      container.on('resize', handleResize);
      // Also trigger initial resize after mount
      handleResize();
    }
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (container && typeof container.off === 'function') {
        container.off('resize', handleResize);
      }
    };
  }, [props.container, handleResize]);

  if (!ctx.mapViewProps) {
    return <div style={{ padding: 16, color: '#969696' }}>No plot loaded</div>;
  }

  const { MapView } = ctx.components;

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%', position: 'relative' }}
      data-testid="panel-map"
    >
      <MapView {...ctx.mapViewProps} height="100%" className="web-shell__map" />
    </div>
  );
}
