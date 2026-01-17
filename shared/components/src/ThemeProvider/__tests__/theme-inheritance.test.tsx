import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../../hooks/useTheme';
import { MapView } from '../../MapView';
import { Timeline } from '../../Timeline';
import { FeatureList } from '../../FeatureList';
import type { DebriefFeatureCollection } from '../../utils/types';
import type { TrackFeature } from '@debrief/schemas';

// Mock react-leaflet for MapView
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: any) => (
    <div data-testid="map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: ({ data }: any) => (
    <div data-testid="geojson-layer">
      {data.features.length} features
    </div>
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
    getBounds: () => ({
      getWest: () => -5,
      getSouth: () => 50,
      getEast: () => -3,
      getNorth: () => 52,
    }),
  }),
  useMapEvents: () => null,
}));

// Mock @tanstack/react-virtual for FeatureList
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: any) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        key: `item-${i}`,
        start: i * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

// Test component to verify theme context is available
function ThemeChecker({ testId }: { testId: string }) {
  const { theme, resolvedVariant, isDark } = useTheme();
  return (
    <div data-testid={testId}>
      <span data-testid={`${testId}-variant`}>{theme.variant}</span>
      <span data-testid={`${testId}-resolved`}>{resolvedVariant}</span>
      <span data-testid={`${testId}-isDark`}>{isDark ? 'yes' : 'no'}</span>
    </div>
  );
}

// Sample data for component testing
const sampleTrack: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'Test Vessel',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
  },
};

const sampleFeatures: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [sampleTrack],
};

describe('Theme Inheritance', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
  });

  describe('ThemeProvider propagation', () => {
    it('propagates light theme to nested components', () => {
      render(
        <ThemeProvider theme={{ variant: 'light' }}>
          <ThemeChecker testId="nested" />
        </ThemeProvider>
      );

      expect(screen.getByTestId('nested-variant')).toHaveTextContent('light');
      expect(screen.getByTestId('nested-resolved')).toHaveTextContent('light');
      expect(screen.getByTestId('nested-isDark')).toHaveTextContent('no');
    });

    it('propagates dark theme to nested components', () => {
      render(
        <ThemeProvider theme={{ variant: 'dark' }}>
          <ThemeChecker testId="nested" />
        </ThemeProvider>
      );

      expect(screen.getByTestId('nested-variant')).toHaveTextContent('dark');
      expect(screen.getByTestId('nested-resolved')).toHaveTextContent('dark');
      expect(screen.getByTestId('nested-isDark')).toHaveTextContent('yes');
    });

    it('propagates vscode theme to nested components', () => {
      render(
        <ThemeProvider theme={{ variant: 'vscode' }}>
          <ThemeChecker testId="nested" />
        </ThemeProvider>
      );

      expect(screen.getByTestId('nested-variant')).toHaveTextContent('vscode');
      expect(screen.getByTestId('nested-resolved')).toHaveTextContent('vscode');
      expect(screen.getByTestId('nested-isDark')).toHaveTextContent('yes');
    });
  });

  describe('Document attribute updates', () => {
    it('sets data-theme attribute for light theme', () => {
      render(
        <ThemeProvider theme={{ variant: 'light' }}>
          <div>Content</div>
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('sets data-theme attribute for dark theme', () => {
      render(
        <ThemeProvider theme={{ variant: 'dark' }}>
          <div>Content</div>
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('sets data-theme attribute for vscode theme', () => {
      render(
        <ThemeProvider theme={{ variant: 'vscode' }}>
          <div>Content</div>
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('vscode');
    });
  });

  describe('Custom token application', () => {
    it('applies custom color tokens to document', () => {
      render(
        <ThemeProvider
          theme={{
            variant: 'light',
            tokens: {
              colorPrimary: '#ff0000',
              colorSecondary: '#00ff00',
            },
          }}
        >
          <div>Content</div>
        </ThemeProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--debrief-color-primary')).toBe('#ff0000');
      expect(root.style.getPropertyValue('--debrief-color-secondary')).toBe('#00ff00');
    });

    it('applies custom spacing tokens', () => {
      render(
        <ThemeProvider
          theme={{
            variant: 'light',
            tokens: {
              spacingUnit: '8px',
            },
          }}
        >
          <div>Content</div>
        </ThemeProvider>
      );

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--debrief-spacing-unit')).toBe('8px');
    });
  });

  describe('Component integration', () => {
    it('MapView renders within ThemeProvider context', () => {
      const { container } = render(
        <ThemeProvider theme={{ variant: 'dark' }}>
          <MapView features={sampleFeatures} />
        </ThemeProvider>
      );

      expect(container.querySelector('.debrief-map')).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('Timeline renders within ThemeProvider context', () => {
      const { container } = render(
        <ThemeProvider theme={{ variant: 'dark' }}>
          <Timeline features={sampleFeatures} height={200} />
        </ThemeProvider>
      );

      expect(container.querySelector('.debrief-timeline')).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('FeatureList renders within ThemeProvider context', () => {
      const { container } = render(
        <ThemeProvider theme={{ variant: 'dark' }}>
          <FeatureList features={sampleFeatures} height={200} />
        </ThemeProvider>
      );

      expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('all components render together in same theme context', () => {
      const { container } = render(
        <ThemeProvider theme={{ variant: 'dark' }}>
          <div>
            <MapView features={sampleFeatures} />
            <Timeline features={sampleFeatures} height={100} />
            <FeatureList features={sampleFeatures} height={100} />
          </div>
        </ThemeProvider>
      );

      expect(container.querySelector('.debrief-map')).toBeInTheDocument();
      expect(container.querySelector('.debrief-timeline')).toBeInTheDocument();
      expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Nested ThemeProvider', () => {
    it('inner ThemeProvider overrides outer theme', () => {
      render(
        <ThemeProvider theme={{ variant: 'light' }}>
          <ThemeChecker testId="outer" />
          <ThemeProvider theme={{ variant: 'dark' }}>
            <ThemeChecker testId="inner" />
          </ThemeProvider>
        </ThemeProvider>
      );

      expect(screen.getByTestId('outer-variant')).toHaveTextContent('light');
      expect(screen.getByTestId('inner-variant')).toHaveTextContent('dark');
    });
  });
});
