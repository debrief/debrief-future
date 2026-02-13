/**
 * LeafletToolbar - Custom map control toolbar with zoom and fit-to-window buttons.
 *
 * This component renders a Leaflet control positioned on the map that provides:
 * - Zoom in/out buttons
 * - Fit to window button (zooms to fit all visible features)
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Bounds } from '../../utils/types';
import { expandBounds } from '../../utils/bounds';
import './LeafletToolbar.css';

export interface LeafletToolbarProps {
  /** Position of the toolbar on the map */
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';

  /** Bounds of visible features for fit-to-window functionality */
  visibleBounds: Bounds | null;

  /** Padding percentage when fitting bounds (default: 0.1 = 10%) */
  fitPadding?: number;

  /** Whether to show zoom controls (default: true) */
  showZoomControls?: boolean;

  /** Whether to show fit-to-window button (default: true) */
  showFitButton?: boolean;
}

/**
 * Custom Leaflet control for the toolbar
 */
class ToolbarControl extends L.Control {
  private container: HTMLDivElement | null = null;
  private map: L.Map | null = null;
  private visibleBounds: Bounds | null = null;
  private fitPadding: number = 0.1;
  private showZoomControls: boolean = true;
  private showFitButton: boolean = true;
  // TEMPORARY: 092-proof-of-concept — remove when #093 lands
  private drawRectButton: HTMLAnchorElement | null = null;
  private isDrawingRect: boolean = false;

  constructor(options: L.ControlOptions & {
    visibleBounds: Bounds | null;
    fitPadding: number;
    showZoomControls: boolean;
    showFitButton: boolean;
  }) {
    super(options);
    this.visibleBounds = options.visibleBounds;
    this.fitPadding = options.fitPadding;
    this.showZoomControls = options.showZoomControls;
    this.showFitButton = options.showFitButton;
  }

  onAdd(map: L.Map): HTMLElement {
    this.map = map;
    this.container = L.DomUtil.create('div', 'debrief-leaflet-toolbar leaflet-bar');
    this.render();
    return this.container;
  }

  onRemove(): void {
    // TEMPORARY: 092-proof-of-concept — remove when #093 lands
    if (this.map?.pm) {
      this.map.off('pm:create', this.onRectCreated);
      if (this.isDrawingRect) {
        this.map.pm.disableDraw();
      }
    }
    this.drawRectButton = null;
    this.isDrawingRect = false;

    this.map = null;
    this.container = null;
  }

  updateProps(props: {
    visibleBounds: Bounds | null;
    fitPadding: number;
    showZoomControls: boolean;
    showFitButton: boolean;
  }): void {
    this.visibleBounds = props.visibleBounds;
    this.fitPadding = props.fitPadding;
    this.showZoomControls = props.showZoomControls;
    this.showFitButton = props.showFitButton;
    this.render();
  }

  private render(): void {
    if (!this.container || !this.map) return;

    // Clear existing content
    this.container.innerHTML = '';

    // Zoom in button
    if (this.showZoomControls) {
      const zoomInButton = this.createButton(
        '+',
        'Zoom in',
        'debrief-leaflet-toolbar__button debrief-leaflet-toolbar__zoom-in',
        () => this.map?.zoomIn()
      );
      this.container.appendChild(zoomInButton);

      // Zoom out button
      const zoomOutButton = this.createButton(
        '\u2212', // Minus sign
        'Zoom out',
        'debrief-leaflet-toolbar__button debrief-leaflet-toolbar__zoom-out',
        () => this.map?.zoomOut()
      );
      this.container.appendChild(zoomOutButton);
    }

    // Fit to window button
    if (this.showFitButton) {
      const fitButton = this.createButton(
        this.getFitIcon(),
        'Fit to visible features',
        'debrief-leaflet-toolbar__button debrief-leaflet-toolbar__fit',
        () => this.handleFitToWindow()
      );
      fitButton.innerHTML = this.getFitIcon();
      this.container.appendChild(fitButton);
    }

    // TEMPORARY: 092-proof-of-concept — remove when #093 lands
    // Draw Rectangle button to prove Geoman integration works end-to-end
    if (this.map?.pm) {
      this.drawRectButton = this.createButton(
        this.getRectangleIcon(),
        'Draw rectangle',
        'debrief-leaflet-toolbar__button debrief-leaflet-toolbar__draw-rect',
        () => this.handleDrawRectangle()
      );
      this.drawRectButton.innerHTML = this.getRectangleIcon();
      if (this.isDrawingRect) {
        this.drawRectButton.classList.add('debrief-leaflet-toolbar__button--active');
      }
      this.container.appendChild(this.drawRectButton);

      // Listen for pm:create to exit drawing mode after rectangle is drawn
      this.map.off('pm:create', this.onRectCreated);
      this.map.on('pm:create', this.onRectCreated);
    }
  }

  private createButton(
    content: string,
    title: string,
    className: string,
    onClick: () => void
  ): HTMLAnchorElement {
    const button = L.DomUtil.create('a', className) as HTMLAnchorElement;
    button.href = '#';
    button.title = title;
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', title);
    button.innerHTML = content;

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, 'click', (e: Event) => {
      L.DomEvent.preventDefault(e);
      onClick();
    });

    return button;
  }

  private getFitIcon(): string {
    // SVG icon for fit-to-window (four corners pointing inward)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6"></path>
      <path d="M9 21H3v-6"></path>
      <path d="M21 3l-7 7"></path>
      <path d="M3 21l7-7"></path>
    </svg>`;
  }

  private handleFitToWindow(): void {
    if (!this.map || !this.visibleBounds) return;

    const [minLon, minLat, maxLon, maxLat] = expandBounds(this.visibleBounds, this.fitPadding);
    this.map.fitBounds([[minLat, minLon], [maxLat, maxLon]]);
  }

  // TEMPORARY: 092-proof-of-concept — remove when #093 lands
  private getRectangleIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="1"></rect>
    </svg>`;
  }

  // TEMPORARY: 092-proof-of-concept — remove when #093 lands
  private handleDrawRectangle(): void {
    if (!this.map?.pm) return;

    if (this.isDrawingRect) {
      this.map.pm.disableDraw();
      this.isDrawingRect = false;
      this.drawRectButton?.classList.remove('debrief-leaflet-toolbar__button--active');
    } else {
      this.map.pm.enableDraw('Rectangle');
      this.isDrawingRect = true;
      this.drawRectButton?.classList.add('debrief-leaflet-toolbar__button--active');
    }
  }

  // TEMPORARY: 092-proof-of-concept — remove when #093 lands
  private onRectCreated = (): void => {
    this.isDrawingRect = false;
    this.drawRectButton?.classList.remove('debrief-leaflet-toolbar__button--active');
  };
}

/**
 * React wrapper component for the LeafletToolbar control.
 */
export function LeafletToolbar({
  position = 'topleft',
  visibleBounds,
  fitPadding = 0.1,
  showZoomControls = true,
  showFitButton = true,
}: LeafletToolbarProps) {
  const map = useMap();
  const controlRef = useRef<ToolbarControl | null>(null);

  useEffect(() => {
    // Check if map has control corners (required for Leaflet controls)
    // This may not exist in test environments with mocked maps
    const mapWithCorners = map as L.Map & { _controlCorners?: Record<string, HTMLElement> };
    if (!mapWithCorners._controlCorners) {
      return;
    }

    // Create and add control
    const control = new ToolbarControl({
      position,
      visibleBounds,
      fitPadding,
      showZoomControls,
      showFitButton,
    });
    control.addTo(map);
    controlRef.current = control;

    return () => {
      control.remove();
      controlRef.current = null;
    };
  }, [map, position]);

  // Update control props when they change
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.updateProps({
        visibleBounds,
        fitPadding,
        showZoomControls,
        showFitButton,
      });
    }
  }, [visibleBounds, fitPadding, showZoomControls, showFitButton]);

  return null;
}
