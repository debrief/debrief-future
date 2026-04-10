# Usage Example: Sensor Rendering

## Basic Integration

Sensor bearing lines render automatically when a `TrackFeature` has embedded sensor data. No additional setup is required — `MapView` detects `feature.properties.sensors[]` and instantiates `SensorBearingLayer` for each temporal track.

```tsx
import { MapView } from '@debrief/components/MapView';
import type { TrackFeature } from '@debrief/schemas';

// Track with embedded sensor data (produced by REP import #117)
const track: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-5.0, 50.0], [-4.9, 50.1], [-4.8, 50.2]],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Defender',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 45, speed: 12 },
      { time: '2024-01-15T10:00:00Z', course: 45, speed: 12 },
      { time: '2024-01-15T12:00:00Z', course: 45, speed: 12 },
    ],
    sensors: [
      {
        name: 'TOWED_ARRAY',
        color: '#FF0000',
        line_thickness: 2,
        contacts: [
          {
            time: '2024-01-15T09:00:00Z',
            bearing: 45.0,
            has_bearing: true,
            range: 5000,
            visible: true,
            label: 'Contact Alpha',
            show_label: true,
            put_label_at: 'END',
            label_location: 'RIGHT',
            line_style: 'SOLID',
          },
          {
            time: '2024-01-15T09:15:00Z',
            bearing: 47.2,
            has_bearing: true,
            ambiguous_bearing: 227.2,
            has_ambiguous: true,
            range: 4500,
            visible: true,
            line_style: 'SOLID',
          },
        ],
      },
    ],
  },
};

// Bearing lines appear automatically when currentTime is set
function App() {
  const [currentTime, setCurrentTime] = useState(Date.parse('2024-01-15T09:15:00Z'));

  return (
    <MapView
      features={[track]}
      currentTime={currentTime}
      displayMode="full"  // or "trail" for snail mode
      height={600}
      autoFitBounds
    />
  );
}
```

## Display Modes

### Full Mode

Shows all contacts up to the current time at full colour intensity:

```tsx
<MapView features={[track]} currentTime={time} displayMode="full" />
```

### Trail (Snail) Mode

Shows contacts within a time trail window with fade-to-black effect:

```tsx
<MapView features={[track]} currentTime={time} displayMode="trail" />
```

## Sensor Contact Properties

| Property | Effect |
|----------|--------|
| `bearing` | Angle of the bearing line from north (0-360) |
| `has_bearing` | Must be `true` to render (defaults to `true`) |
| `range` | Line extent in metres (defaults to 5-degree cap) |
| `ambiguous_bearing` | Second bearing line in darker shade |
| `has_ambiguous` | Enables ambiguous bearing rendering |
| `visible` | Show/hide the contact (defaults to `true`) |
| `color` | Overrides sensor-level colour |
| `line_style` | SOLID, DASHED, DOT, or DASH_DOT |
| `label` | Text to display on the bearing line |
| `show_label` | Enables label rendering |
| `put_label_at` | START, MIDDLE, or END of bearing line |
| `label_location` | LEFT, CENTER, or RIGHT text alignment |
| `origin` | Explicit [lon, lat] override for line origin |

## Colour Inheritance Chain

Contact-level colour takes precedence, cascading through:

1. `contact.color` (if set)
2. `sensor.color` (parent sensor)
3. `feature.properties.style.line.color` (host track)
4. `#FF0000` (application default)

Ambiguous bearings use `darkenColor(baseColor)` which multiplies RGB by 0.7, matching Java's `Color.darker()`.
