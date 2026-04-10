import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './GeometryDialog.css';

export interface GeometryDialogProps {
  /** Display name of the feature (shown in dialog header) */
  featureName: string;
  /** GeoJSON geometry type */
  geometryType: string;
  /** GeoJSON coordinates array */
  coordinates: number[] | number[][] | number[][][] | number[][][][];
  /** Feature properties to display (optional) */
  properties?: Record<string, unknown>;
  /** Anchor position for dialog placement */
  anchorPosition: { x: number; y: number };
  /** Callback when dialog should close */
  onDismiss: () => void;
}

/**
 * Format coordinates for display based on geometry type.
 */
function formatCoordinates(
  geometryType: string,
  coordinates: number[] | number[][] | number[][][] | number[][][][],
): string {
  if (!coordinates || (Array.isArray(coordinates) && coordinates.length === 0)) {
    return 'No coordinates';
  }

  switch (geometryType) {
    case 'Point':
      return `[${(coordinates as number[]).join(', ')}]`;

    case 'LineString':
    case 'MultiPoint':
      return (coordinates as number[][])
        .map((coord, i) => `${i + 1}. [${coord.join(', ')}]`)
        .join('\n');

    case 'Polygon':
      return (coordinates as number[][][])
        .map((ring, ri) => {
          const ringLabel = ri === 0 ? 'Exterior' : `Hole ${ri}`;
          const coords = ring
            .map((coord, ci) => `  ${ci + 1}. [${coord.join(', ')}]`)
            .join('\n');
          return `${ringLabel}:\n${coords}`;
        })
        .join('\n');

    case 'MultiPolygon':
      return (coordinates as number[][][][])
        .map((polygon, pi) => {
          const polyLabel = `Polygon ${pi + 1}`;
          const rings = polygon
            .map((ring, ri) => {
              const ringLabel = ri === 0 ? '  Exterior' : `  Hole ${ri}`;
              const coords = ring
                .map((coord, ci) => `    ${ci + 1}. [${coord.join(', ')}]`)
                .join('\n');
              return `${ringLabel}:\n${coords}`;
            })
            .join('\n');
          return `${polyLabel}:\n${rings}`;
        })
        .join('\n');

    default:
      return JSON.stringify(coordinates, null, 2);
  }
}

/** Keys to omit from the properties display (large/internal data). */
const OMITTED_KEYS = new Set(['positions', 'pointMetadata', 'pointColors', 'zones', 'position_style_overrides']);

/**
 * Format a property value for display.
 */
function formatPropertyValue(value: unknown, indent = 0): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const pad = '  '.repeat(indent + 1);
    const lines = entries.map(([k, v]) => `${pad}${k}: ${formatPropertyValue(v, indent + 1)}`);
    return `{\n${lines.join('\n')}\n${'  '.repeat(indent)}}`;
  }
  return String(value);
}

/**
 * GeometryDialog displays a feature's geometry type, coordinates,
 * and properties in a fixed-position dialog anchored near the info button.
 *
 * Feature: 098-feature-info-button
 */
export function GeometryDialog({
  featureName,
  geometryType,
  coordinates,
  properties,
  anchorPosition,
  onDismiss,
}: GeometryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: anchorPosition.x, top: anchorPosition.y });

  // Reposition if dialog extends beyond viewport
  useLayoutEffect(() => {
    if (!dialogRef.current) return;

    const rect = dialogRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newLeft = anchorPosition.x;
    let newTop = anchorPosition.y;

    if (rect.right > viewportWidth) {
      newLeft = viewportWidth - rect.width - 8;
    }
    if (rect.bottom > viewportHeight) {
      newTop = viewportHeight - rect.height - 8;
    }
    if (newLeft < 0) newLeft = 8;
    if (newTop < 0) newTop = 8;

    setPosition({ left: newLeft, top: newTop });
  }, [anchorPosition]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('.debrief-geometry-dialog')) return;
      if (dialogRef.current && !dialogRef.current.contains(target)) {
        onDismiss();
      }
    };

    // Bind on next tick so the triggering click doesn't immediately dismiss
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const formattedCoords = formatCoordinates(geometryType, coordinates);

  return (
    <div
      ref={dialogRef}
      className="debrief-geometry-dialog"
      role="dialog"
      aria-label={`Geometry for ${featureName}`}
      data-testid="geometry-dialog"
      style={{ left: position.left, top: position.top }}
    >
      <div className="debrief-geometry-dialog__header">
        <span className="debrief-geometry-dialog__title">{featureName}</span>
        <button
          className="debrief-geometry-dialog__close"
          onClick={onDismiss}
          aria-label="Close"
          tabIndex={0}
        >
          ×
        </button>
      </div>
      <div className="debrief-geometry-dialog__body">
        <div className="debrief-geometry-dialog__type" data-testid="geometry-type">
          {geometryType}
        </div>
        {properties && Object.keys(properties).length > 0 && (
          <div className="debrief-geometry-dialog__properties" data-testid="feature-properties">
            <div className="debrief-geometry-dialog__section-label">Properties</div>
            <pre className="debrief-geometry-dialog__coordinates">
              {Object.entries(properties)
                .filter(([k]) => !OMITTED_KEYS.has(k))
                .map(([k, v]) => `${k}: ${formatPropertyValue(v)}`)
                .join('\n')}
            </pre>
          </div>
        )}
        <div className="debrief-geometry-dialog__section-label">Coordinates</div>
        <pre className="debrief-geometry-dialog__coordinates" data-testid="geometry-coordinates">
          {formattedCoords}
        </pre>
      </div>
    </div>
  );
}
