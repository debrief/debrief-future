import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { SensorBearingLayer } from '../SensorBearingLayer';
import {
  createTrackWithSensors,
  towedArraySensor,
  hullSonarSensor,
  sensorTestTimes,
} from '../__fixtures__/sampleSensors';
import type { SensorData } from '@debrief/schemas';

// ── Mock react-leaflet and Leaflet ──────────────────────────────────

const mockAddTo = vi.fn();
const mockRemoveLayer = vi.fn();
const mockSetData = vi.fn();
const mockLayerInstance = {
  addTo: mockAddTo,
  setData: mockSetData,
  _contacts: [],
  _arcs: [],
  _canvas: null,
  _ctx: null,
  _currentTime: undefined,
  _displayMode: 'full',
  _trailLengthMs: 0,
  _update: vi.fn(),
  _draw: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  remove: vi.fn(),
  removeFrom: vi.fn(),
};

vi.mock('react-leaflet', () => ({
  useMap: () => ({
    getSize: () => ({ x: 800, y: 600 }),
    getBounds: () => ({
      contains: () => true,
      getWest: () => -5,
      getSouth: () => 49,
      getEast: () => -3,
      getNorth: () => 51,
    }),
    getPane: () => ({ appendChild: vi.fn() }),
    containerPointToLayerPoint: () => ({ x: 0, y: 0 }),
    latLngToContainerPoint: (ll: number[]) => ({ x: ll[1]! * 100, y: ll[0]! * 100 }),
    on: vi.fn(),
    off: vi.fn(),
    removeLayer: mockRemoveLayer,
  }),
}));

vi.mock('leaflet', () => {
  const actual = {
    Layer: {
      extend: () => {
        // Return a constructor that creates our mock instance
        return function MockLayer() {
          return mockLayerInstance;
        };
      },
    },
    Util: { setOptions: vi.fn() },
    DomUtil: {
      create: () => {
        const el = document.createElement('canvas');
        return el;
      },
      setPosition: vi.fn(),
    },
  };
  return { default: actual, ...actual };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Component Tests ─────────────────────────────────────────────────

describe('SensorBearingLayer', () => {
  it('renders without crashing for track with sensors', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    const { container } = render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    // Component returns null (renders to Leaflet canvas, not DOM)
    expect(container.innerHTML).toBe('');
  });

  it('adds layer to map on mount', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    expect(mockAddTo).toHaveBeenCalled();
  });

  it('sets contact data on the layer', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    expect(mockSetData).toHaveBeenCalled();
    const [contacts] = mockSetData.mock.calls[0]!;
    // Should have prepared contacts (filtered by time and visibility)
    expect(contacts.length).toBeGreaterThan(0);
  });

  it('filters out contacts with has_bearing=false', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.afterAll}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    // Contact at T035 has has_bearing=false — should not be in results
    const bearings = contacts.map((c: { bearing: number }) => c.bearing);
    expect(bearings).not.toContain(60); // bearing=60 has has_bearing=false
  });

  it('filters out contacts with visible=false', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.afterAll}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    // Contact at T040 has visible=false — should not be in results
    const bearings = contacts.map((c: { bearing: number }) => c.bearing);
    expect(bearings).not.toContain(62); // bearing=62 has visible=false
  });

  it('includes ambiguous bearing data for contacts with has_ambiguous=true', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    const ambiguousContacts = contacts.filter(
      (c: { hasAmbiguous: boolean }) => c.hasAmbiguous,
    );
    expect(ambiguousContacts.length).toBeGreaterThan(0);
    for (const c of ambiguousContacts) {
      expect(c.ambiguousFarEnd).not.toBeNull();
    }
  });

  it('renders multiple sensors from same track', () => {
    const feature = createTrackWithSensors([towedArraySensor, hullSonarSensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    // Should include contacts from both sensors
    expect(contacts.length).toBeGreaterThan(towedArraySensor.contacts.length);
  });

  it('skips hidden sensors', () => {
    const feature = createTrackWithSensors([towedArraySensor, hullSonarSensor]);
    const hiddenIds = new Set(['track-ownship-sensor/sensors/HULL_SONAR']);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
        hiddenIds={hiddenIds}
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    // Should only include towed array contacts
    const allColors = contacts.map((c: { color: string }) => c.color);
    expect(allColors).not.toContain('#00AAFF'); // hull sonar colour
  });

  it('skips invisible sensors (visible=false)', () => {
    const invisibleSensor: SensorData = {
      ...hullSonarSensor,
      visible: false,
    };
    const feature = createTrackWithSensors([towedArraySensor, invisibleSensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    const allColors = contacts.map((c: { color: string }) => c.color);
    expect(allColors).not.toContain('#00AAFF');
  });

  it('passes trail displayMode and trail length to layer', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="trail"
      />,
    );
    expect(mockSetData).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      sensorTestTimes.midRange,
      'trail',
      expect.any(Number),
    );
    // Trail length should be > 0
    const trailLength = mockSetData.mock.calls[0]![4];
    expect(trailLength).toBeGreaterThan(0);
  });

  it('renders no contacts when currentTime is before all contacts', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.beforeAll}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    expect(contacts).toHaveLength(0);
  });

  it('uses contact color override when present', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.afterAll}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    // Contact at T055 has color=#0000FF
    const blueContact = contacts.find((c: { color: string }) => c.color === '#0000FF');
    expect(blueContact).toBeDefined();
  });

  it('uses explicit origin when present on contact', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.afterAll}
        displayMode="full"
      />,
    );
    const [contacts] = mockSetData.mock.calls[0]!;
    // Contact at T050 has origin=[-3.5, 50.5] — but our fixture uses [-4.35, 50.4]
    const originContact = contacts.find(
      (c: { origin: [number, number] }) =>
        Math.abs(c.origin[0] - (-4.35)) < 0.01 && Math.abs(c.origin[1] - 50.4) < 0.01,
    );
    expect(originContact).toBeDefined();
  });

  it('removes layer from map on unmount', () => {
    const feature = createTrackWithSensors([towedArraySensor]);
    const { unmount } = render(
      <SensorBearingLayer
        feature={feature}
        currentTime={sensorTestTimes.midRange}
        displayMode="full"
      />,
    );
    unmount();
    expect(mockRemoveLayer).toHaveBeenCalled();
  });
});
