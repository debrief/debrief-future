import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SpatialThumbnail } from './SpatialThumbnail';
import type { GeoJSONFeatureCollection } from './types';

const BBOX: [number, number, number, number] = [-5, 49, 2, 52];

function makeTrackData(lineCount: number = 1): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: lineCount }, (_, i) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-4 + i, 50],
          [-3 + i, 51],
          [-2 + i, 50.5],
        ],
      },
      properties: { name: `Track ${i}` },
    })),
  };
}

describe('SpatialThumbnail', () => {
  it('T017a: renders SVG tracks from GeoJSON data', () => {
    render(
      <SpatialThumbnail bbox={BBOX} trackData={makeTrackData(2)} />,
    );

    const thumbnail = screen.getByTestId('spatial-thumbnail');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail.querySelector('svg')).toBeInTheDocument();
    expect(thumbnail.querySelectorAll('path')).toHaveLength(2);
  });

  it('T017b: shows placeholder when trackData is null', () => {
    render(<SpatialThumbnail bbox={BBOX} trackData={null} />);

    const thumbnail = screen.getByTestId('spatial-thumbnail');
    expect(thumbnail).toHaveAttribute('aria-label', 'No track data');
    expect(thumbnail.querySelector('.spatial-thumbnail__placeholder')).toBeInTheDocument();
  });

  it('T017c: shows placeholder when bbox is null', () => {
    render(<SpatialThumbnail bbox={null} trackData={makeTrackData()} />);

    const thumbnail = screen.getByTestId('spatial-thumbnail');
    expect(thumbnail).toHaveAttribute('aria-label', 'No track data');
  });

  it('T017d: shows loading state', () => {
    render(<SpatialThumbnail bbox={BBOX} loading={true} />);

    const thumbnail = screen.getByTestId('spatial-thumbnail');
    expect(thumbnail).toHaveAttribute('aria-label', 'Loading track data');
    expect(thumbnail.querySelector('.spatial-thumbnail__loading')).toBeInTheDocument();
  });

  it('T017e: shows placeholder for empty feature collection', () => {
    const emptyFC: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    render(<SpatialThumbnail bbox={BBOX} trackData={emptyFC} />);

    const thumbnail = screen.getByTestId('spatial-thumbnail');
    expect(thumbnail).toHaveAttribute('aria-label', 'No track data');
  });
});
