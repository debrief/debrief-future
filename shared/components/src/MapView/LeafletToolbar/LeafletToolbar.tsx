/**
 * LeafletToolbar - Custom map control toolbar with zoom, fit-to-window, and shape drawing buttons.
 *
 * This component renders a Leaflet control positioned on the map that provides:
 * - Zoom in/out buttons
 * - Fit to window button (zooms to fit all visible features)
 * - '+' button to open shape palette dropdown for Geoman drawing mode (FR-001..FR-016)
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Bounds } from '../../utils/types';
import { expandBounds } from '../../utils/bounds';
import './LeafletToolbar.css';

/** Drawing mode values matching session-state DrawingMode type */
export type DrawingMode = 'point' | 'rectangle' | 'polygon' | 'polyline' | null;

/** Maps Debrief DrawingMode values to Geoman enableDraw() shape names */
const GEOMAN_SHAPE_MAP: Record<Exclude<DrawingMode, null>, string> = {
  point: 'Marker',
  rectangle: 'Rectangle',
  polygon: 'Polygon',
  polyline: 'Line',
};

/** Shape palette item configuration */
interface ShapePaletteItem {
  id: Exclude<DrawingMode, null>;
  label: string;
  icon: string;
  title: string;
}

/** Static configuration for the four shape options (FR-002, FR-003) */
const SHAPE_PALETTE_ITEMS: ShapePaletteItem[] = [
  {
    id: 'point',
    label: 'Point',
    title: 'Draw a point',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0">
      <circle cx="12" cy="12" r="4"></circle>
    </svg>`,
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    title: 'Draw a rectangle',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="1"></rect>
    </svg>`,
  },
  {
    id: 'polygon',
    label: 'Polygon',
    title: 'Draw a polygon',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12,2 22,20 2,20"></polygon>
    </svg>`,
  },
  {
    id: 'polyline',
    label: 'Polyline',
    title: 'Draw a polyline',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="4,20 10,8 16,16 22,4"></polyline>
    </svg>`,
  },
];

/** Plus icon SVG for the add-shape trigger button */
const PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="5" x2="12" y2="19"></line>
  <line x1="5" y1="12" x2="19" y2="12"></line>
</svg>`;

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

  /** Current drawing mode (null = no drawing active) */
  drawingMode?: DrawingMode;

  /** Callback when drawing mode changes */
  onDrawingModeChange?: (mode: DrawingMode) => void;
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
  private drawingMode: DrawingMode = null;
  private onDrawingModeChange: ((mode: DrawingMode) => void) | null = null;
  private drawTriggerButton: HTMLAnchorElement | null = null;
  private dropdownContainer: HTMLDivElement | null = null;
  private isDropdownOpen: boolean = false;
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(options: L.ControlOptions & {
    visibleBounds: Bounds | null;
    fitPadding: number;
    showZoomControls: boolean;
    showFitButton: boolean;
    drawingMode?: DrawingMode;
    onDrawingModeChange?: (mode: DrawingMode) => void;
  }) {
    super(options);
    this.visibleBounds = options.visibleBounds;
    this.fitPadding = options.fitPadding;
    this.showZoomControls = options.showZoomControls;
    this.showFitButton = options.showFitButton;
    this.drawingMode = options.drawingMode ?? null;
    this.onDrawingModeChange = options.onDrawingModeChange ?? null;
  }

  onAdd(map: L.Map): HTMLElement {
    this.map = map;
    this.container = L.DomUtil.create('div', 'debrief-leaflet-toolbar leaflet-bar');
    this.render();

    // Listen for Geoman events to sync state
    if (map.pm) {
      map.on('pm:create', this.handleShapeCreated);
      map.on('pm:drawend', this.handleDrawEnd);
    }

    return this.container as HTMLElement;
  }

  onRemove(): void {
    // FR-016: Clean up drawing mode when toolbar is removed
    if (this.map?.pm) {
      if (this.drawingMode !== null) {
        this.map.pm.disableDraw();
      }
      this.map.off('pm:create', this.handleShapeCreated);
      this.map.off('pm:drawend', this.handleDrawEnd);
    }

    this.closeDropdown();
    this.onDrawingModeChange?.(null);
    this.drawTriggerButton = null;
    this.dropdownContainer = null;
    this.map = null;
    this.container = null;
  }

  updateProps(props: {
    visibleBounds: Bounds | null;
    fitPadding: number;
    showZoomControls: boolean;
    showFitButton: boolean;
    drawingMode?: DrawingMode;
    onDrawingModeChange?: (mode: DrawingMode) => void;
  }): void {
    const drawingModeChanged = this.drawingMode !== (props.drawingMode ?? null);
    this.visibleBounds = props.visibleBounds;
    this.fitPadding = props.fitPadding;
    this.showZoomControls = props.showZoomControls;
    this.showFitButton = props.showFitButton;
    this.drawingMode = props.drawingMode ?? null;
    this.onDrawingModeChange = props.onDrawingModeChange ?? null;

    // Only update the draw trigger button appearance if drawing mode changed
    // to avoid full re-render disrupting active drawing (US3)
    if (drawingModeChanged && this.drawTriggerButton) {
      this.updateDrawTriggerAppearance();
    } else if (!drawingModeChanged) {
      // For other prop changes, do a full render
      this.render();
    } else {
      this.render();
    }
  }

  private render(): void {
    if (!this.container || !this.map) return;

    // Clear existing content
    this.container.innerHTML = '';
    this.drawTriggerButton = null;
    this.dropdownContainer = null;

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

    // FR-012: Only render '+' button when Geoman is available
    if (this.map?.pm) {
      this.drawTriggerButton = this.createButton(
        PLUS_ICON,
        'Add shape',
        'debrief-leaflet-toolbar__button debrief-leaflet-toolbar__draw-trigger',
        () => this.handleDrawTriggerClick()
      );
      this.drawTriggerButton.innerHTML = PLUS_ICON;
      this.drawTriggerButton.setAttribute('data-testid', 'draw-trigger');
      this.updateDrawTriggerAppearance();
      this.container.appendChild(this.drawTriggerButton);

      // Create dropdown (hidden by default)
      this.dropdownContainer = this.createShapePaletteDropdown();
      this.container.appendChild(this.dropdownContainer);
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

  private createShapePaletteDropdown(): HTMLDivElement {
    const dropdown = L.DomUtil.create('div', 'debrief-shape-palette') as HTMLDivElement;
    dropdown.style.display = 'none';
    dropdown.setAttribute('role', 'menu');
    dropdown.setAttribute('data-testid', 'shape-palette');

    L.DomEvent.disableClickPropagation(dropdown);

    for (const item of SHAPE_PALETTE_ITEMS) {
      const itemEl = L.DomUtil.create('a', 'debrief-shape-palette__item', dropdown) as HTMLAnchorElement;
      itemEl.href = '#';
      itemEl.setAttribute('role', 'menuitem');
      itemEl.setAttribute('data-testid', `shape-${item.id}`);
      itemEl.setAttribute('data-shape', item.id);
      itemEl.title = item.title;

      const iconSpan = L.DomUtil.create('span', 'debrief-shape-palette__icon', itemEl);
      iconSpan.innerHTML = item.icon;

      const labelSpan = L.DomUtil.create('span', 'debrief-shape-palette__label', itemEl);
      labelSpan.textContent = item.label;

      L.DomEvent.on(itemEl, 'click', (e: Event) => {
        L.DomEvent.preventDefault(e);
        this.selectShape(item.id);
      });
    }

    return dropdown;
  }

  private handleDrawTriggerClick(): void {
    if (this.drawingMode !== null) {
      // FR-007: Cancel drawing when '+' is clicked during active drawing
      this.cancelDrawing();
    } else {
      // Toggle dropdown
      if (this.isDropdownOpen) {
        this.closeDropdown();
      } else {
        this.openDropdown();
      }
    }
  }

  private selectShape(shapeId: Exclude<DrawingMode, null>): void {
    this.closeDropdown();

    // FR-011: Only one drawing mode at a time — disable any active first
    if (this.map?.pm && this.drawingMode !== null) {
      this.map.pm.disableDraw();
    }

    // Activate Geoman drawing mode (FR-004)
    const geomanShape = GEOMAN_SHAPE_MAP[shapeId];
    if (this.map?.pm) {
      this.map.pm.enableDraw(geomanShape);
    }

    this.drawingMode = shapeId;
    this.onDrawingModeChange?.(shapeId);
    this.updateDrawTriggerAppearance();
  }

  private cancelDrawing(): void {
    if (this.map?.pm) {
      this.map.pm.disableDraw();
    }
    this.drawingMode = null;
    this.onDrawingModeChange?.(null);
    this.updateDrawTriggerAppearance();
  }

  private openDropdown(): void {
    if (!this.dropdownContainer || !this.drawTriggerButton) return;

    // FR-014: Position dropdown to stay within viewport
    this.positionDropdown();
    this.dropdownContainer.style.display = '';
    this.isDropdownOpen = true;

    // FR-013: Click outside dismisses dropdown
    this.outsideClickHandler = (e: MouseEvent) => {
      if (
        this.dropdownContainer &&
        !this.dropdownContainer.contains(e.target as Node) &&
        this.drawTriggerButton &&
        !this.drawTriggerButton.contains(e.target as Node)
      ) {
        this.closeDropdown();
      }
    };
    // Delay to avoid catching the current click
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler!);
    }, 0);
  }

  private closeDropdown(): void {
    if (this.dropdownContainer) {
      this.dropdownContainer.style.display = 'none';
    }
    this.isDropdownOpen = false;

    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
  }

  private positionDropdown(): void {
    if (!this.dropdownContainer || !this.drawTriggerButton) return;

    const buttonRect = this.drawTriggerButton.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Default: position to the right of the button
    const spaceRight = viewportWidth - buttonRect.right;

    if (spaceRight > 140) {
      // Enough room to the right
      this.dropdownContainer.style.left = '100%';
      this.dropdownContainer.style.right = '';
      this.dropdownContainer.style.top = '0';
    } else {
      // Not enough room — position below the button
      this.dropdownContainer.style.left = '0';
      this.dropdownContainer.style.right = '';
      this.dropdownContainer.style.top = '100%';
    }
  }

  private updateDrawTriggerAppearance(): void {
    if (!this.drawTriggerButton) return;

    if (this.drawingMode !== null) {
      // FR-005: Active state styling
      this.drawTriggerButton.classList.add('debrief-leaflet-toolbar__button--active');
    } else {
      this.drawTriggerButton.classList.remove('debrief-leaflet-toolbar__button--active');
    }
  }

  // FR-008: Reset after shape completion
  private handleShapeCreated = (): void => {
    this.drawingMode = null;
    this.onDrawingModeChange?.(null);
    this.updateDrawTriggerAppearance();
  };

  // FR-006: Detect Escape-triggered cancellation via pm:drawend
  private handleDrawEnd = (): void => {
    // pm:drawend fires when drawing mode exits for any reason.
    // Only reset if we think drawing is still active (avoids double-reset).
    if (this.drawingMode !== null) {
      this.drawingMode = null;
      this.onDrawingModeChange?.(null);
      this.updateDrawTriggerAppearance();
    }
  };

  private getFitIcon(): string {
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
  drawingMode,
  onDrawingModeChange,
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
      drawingMode,
      onDrawingModeChange,
    });
    control.addTo(map);
    controlRef.current = control;

    return () => {
      control.remove();
      controlRef.current = null;
    };
  }, [map, position]);

  // Update control props when they change (including drawingMode for US3)
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.updateProps({
        visibleBounds,
        fitPadding,
        showZoomControls,
        showFitButton,
        drawingMode,
        onDrawingModeChange,
      });
    }
  }, [visibleBounds, fitPadding, showZoomControls, showFitButton, drawingMode, onDrawingModeChange]);

  return null;
}
