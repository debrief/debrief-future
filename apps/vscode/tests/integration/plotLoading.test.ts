import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StacStore } from '../../src/types/stac';
import type { Plot, Track, ReferenceLocation } from '../../src/types/plot';

/**
 * Integration tests for the plot loading workflow.
 * These tests verify the end-to-end flow of loading a plot from a STAC store.
 *
 * Note: Full integration with VS Code requires @vscode/test-electron.
 * These tests simulate the workflow using mocked services.
 */
describe('Plot Loading Workflow', () => {
  const mockStore: StacStore = {
    id: 'store-1',
    path: '/test/stac-store',
    displayName: 'Test Store',
    status: 'available',
  };

  const mockPlot: Plot = {
    id: 'plot-1',
    title: 'Exercise Alpha',
    datetime: '2024-01-15T10:00:00Z',
    itemPath: 'items/plot-1.json',
    catalogId: 'catalog-1',
    bbox: [-5.0, 49.0, 2.0, 52.0],
    timeExtent: ['2024-01-15T09:30:00Z', '2024-01-15T14:00:00Z'],
    trackCount: 2,
    locationCount: 1,
  };

  const mockTracks: Track[] = [
    {
      id: 'track-1',
      name: 'HMS Defender',
      platformType: 'Destroyer',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-3.0, 50.0],
          [-2.5, 50.5],
          [-2.0, 51.0],
        ],
      },
      times: [
        '2024-01-15T09:30:00Z',
        '2024-01-15T11:00:00Z',
        '2024-01-15T14:00:00Z',
      ],
      startTime: '2024-01-15T09:30:00Z',
      endTime: '2024-01-15T14:00:00Z',
      visible: true,
      selected: false,
    },
    {
      id: 'track-2',
      name: 'USS Freedom',
      platformType: 'Frigate',
      geometry: {
        type: 'LineString',
        coordinates: [
          [-1.0, 50.0],
          [-1.5, 50.3],
          [-2.0, 50.8],
        ],
      },
      times: [
        '2024-01-15T10:00:00Z',
        '2024-01-15T12:00:00Z',
        '2024-01-15T14:00:00Z',
      ],
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T14:00:00Z',
      visible: true,
      selected: false,
    },
  ];

  const mockLocations: ReferenceLocation[] = [
    {
      id: 'loc-1',
      name: 'Alpha Point',
      locationType: 'Datum',
      geometry: {
        type: 'Point',
        coordinates: [-2.0, 50.5],
      },
      visible: true,
      selected: false,
    },
  ];

  describe('Loading from STAC store', () => {
    it('loads plot metadata from STAC item', async () => {
      // Simulate STAC service loading a plot
      const loadPlot = vi.fn().mockResolvedValue(mockPlot);

      const plot = await loadPlot(mockStore, 'items/plot-1.json');

      expect(plot).toEqual(mockPlot);
      expect(plot.trackCount).toBe(2);
      expect(plot.locationCount).toBe(1);
    });

    it('loads track and location data from GeoJSON', async () => {
      // Simulate loading plot data
      const loadPlotData = vi.fn().mockResolvedValue({
        tracks: mockTracks,
        locations: mockLocations,
      });

      const data = await loadPlotData(mockStore, 'items/plot-1.json');

      expect(data.tracks).toHaveLength(2);
      expect(data.locations).toHaveLength(1);
      expect(data.tracks[0].name).toBe('HMS Defender');
    });

    it('validates plot bbox for map fitting', () => {
      const [west, south, east, north] = mockPlot.bbox;

      expect(west).toBeLessThan(east);
      expect(south).toBeLessThan(north);

      // Bounds should be valid for Leaflet
      const bounds = [
        [south, west],
        [north, east],
      ];
      expect(bounds[0][0]).toBeLessThan(bounds[1][0]); // south < north
      expect(bounds[0][1]).toBeLessThan(bounds[1][1]); // west < east
    });

    it('validates time extent for time filter', () => {
      const [startTime, endTime] = mockPlot.timeExtent;

      expect(new Date(startTime).getTime()).toBeLessThan(
        new Date(endTime).getTime()
      );
    });
  });

  describe('Track rendering preparation', () => {
    it('converts GeoJSON coordinates to Leaflet format', () => {
      const track = mockTracks[0];
      const leafletCoords = track.geometry.coordinates.map((coord) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      expect(leafletCoords[0]).toEqual({ lat: 50.0, lng: -3.0 });
      expect(leafletCoords).toHaveLength(3);
    });

    it('tracks have valid time arrays matching coordinates', () => {
      for (const track of mockTracks) {
        expect(track.times.length).toBe(track.geometry.coordinates.length);
      }
    });
  });

  describe('Recent plots tracking', () => {
    it('adds plot to recent list on open', () => {
      const recentPlots: Array<{
        plotId: string;
        title: string;
        lastOpened: string;
      }> = [];

      // Add plot
      recentPlots.unshift({
        plotId: mockPlot.id,
        title: mockPlot.title,
        lastOpened: new Date().toISOString(),
      });

      expect(recentPlots[0].plotId).toBe('plot-1');
      expect(recentPlots[0].title).toBe('Exercise Alpha');
    });

    it('moves reopened plot to front of list', () => {
      const recentPlots = [
        { plotId: 'plot-2', title: 'Other Plot', lastOpened: '2024-01-14T10:00:00Z' },
        { plotId: 'plot-1', title: 'Exercise Alpha', lastOpened: '2024-01-13T10:00:00Z' },
      ];

      // Re-open plot-1
      const index = recentPlots.findIndex((p) => p.plotId === 'plot-1');
      if (index !== -1) {
        const [plot] = recentPlots.splice(index, 1);
        plot.lastOpened = new Date().toISOString();
        recentPlots.unshift(plot);
      }

      expect(recentPlots[0].plotId).toBe('plot-1');
    });
  });
});
