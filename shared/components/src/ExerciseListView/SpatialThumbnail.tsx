/**
 * SpatialThumbnail — props-driven SVG renderer for exercise track patterns (#129).
 *
 * Review decisions: 6A (props-driven), 12B (line simplification), 10A (error fallback).
 */

import React, { useMemo } from 'react';
import type { SpatialThumbnailProps } from './types';
import { extractLineCoordinates, simplifyLine, projectToPixel } from './utils';

/** Track colours for visual distinction. */
const TRACK_COLOURS = [
  'var(--vscode-charts-blue, #3794ff)',
  'var(--vscode-charts-red, #f14c4c)',
  'var(--vscode-charts-green, #89d185)',
  'var(--vscode-charts-yellow, #cca700)',
  'var(--vscode-charts-purple, #b180d7)',
  'var(--vscode-charts-orange, #d18616)',
];

/** Simplification epsilon in geographic degrees — tune for thumbnail clarity. */
const SIMPLIFICATION_EPSILON = 0.001;

export const SpatialThumbnail: React.FC<SpatialThumbnailProps> = ({
  bbox,
  trackData,
  loading = false,
  width = 56,
  height = 56,
}) => {
  const paths = useMemo(() => {
    if (!trackData || !bbox) return [];

    const lines = extractLineCoordinates(trackData);
    return lines.map((coords, i) => {
      const simplified = simplifyLine(coords, SIMPLIFICATION_EPSILON);
      const points = simplified.map((coord) =>
        projectToPixel(coord[0] ?? 0, coord[1] ?? 0, bbox, width, height, 4),
      );
      const d = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
      return { d, colour: TRACK_COLOURS[i % TRACK_COLOURS.length] };
    });
  }, [trackData, bbox, width, height]);

  if (loading) {
    return (
      <div
        className="spatial-thumbnail"
        data-testid="spatial-thumbnail"
        style={{ width, height }}
        role="img"
        aria-label="Loading track data"
      >
        <div className="spatial-thumbnail__loading" />
      </div>
    );
  }

  if (!bbox || !trackData || paths.length === 0) {
    return (
      <div
        className="spatial-thumbnail"
        data-testid="spatial-thumbnail"
        style={{ width, height }}
        role="img"
        aria-label="No track data"
      >
        <span className="spatial-thumbnail__placeholder" aria-hidden="true">&#x25A1;</span>
      </div>
    );
  }

  return (
    <div
      className="spatial-thumbnail"
      data-testid="spatial-thumbnail"
      style={{ width, height }}
      role="img"
      aria-label="Track pattern thumbnail"
    >
      <svg
        className="spatial-thumbnail__svg"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            fill="none"
            stroke={path.colour}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
};
