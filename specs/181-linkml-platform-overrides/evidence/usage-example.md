# Usage Example: PlatformRecord Validation

## Python (Pydantic)

```python
from debrief_schemas import (
    PlatformRecord,
    StacExtensionProperties,
    TrackProperties,
    VesselDomainEnum,
)

# Create a fully-populated platform record
platform = PlatformRecord(
    id="NELSON",
    name="HMS Nelson",
    nationality="GB",
    vessel_class="surface/warship/frigate/type23",
    vessel_type="type23",
    vessel_role="frigate",
    domain=VesselDomainEnum.surface,
)

# Sparse record (unregistered platform, id only)
unknown = PlatformRecord(id="CONTACT-01")

# STAC extension properties with platforms array
ext = StacExtensionProperties(
    platforms=[platform, unknown],
    tags=["ASW", "training"],
    feature_tags=["sonar-contact"],
)

# Derive flat lists from platforms
nationalities = [p.nationality for p in ext.platforms if p.nationality]
vessel_classes = [p.vessel_class for p in ext.platforms if p.vessel_class]
track_names = [p.name for p in ext.platforms if p.name]

print(f"Nationalities: {nationalities}")   # ['GB']
print(f"Vessel classes: {vessel_classes}")  # ['surface/warship/frigate/type23']
print(f"Track names: {track_names}")        # ['HMS Nelson']

# Validation: invalid nationality rejected
try:
    PlatformRecord(id="BAD", nationality="GBR")  # 3-letter code
except Exception as e:
    print(f"Rejected: {e}")  # Invalid nationality format: GBR

# TrackProperties with override fields
track = TrackProperties(
    kind="TRACK",
    platform_id="NELSON",
    platform_name="HMS Nelson",
    track_type="OWNSHIP",
    start_time="2026-01-15T08:00:00Z",
    end_time="2026-01-15T10:00:00Z",
    display_name="HMS Nelson",
    nationality="GB",
    vessel_class="surface/warship/frigate/type23",
    domain=VesselDomainEnum.surface,
    positions=[
        {"time": "2026-01-15T08:00:00Z", "course": 90, "speed": 15},
        {"time": "2026-01-15T10:00:00Z", "course": 88, "speed": 15},
    ],
    default_position_style={"show_symbol": False, "symbol": "circle", "show_label": False},
    style={
        "line": {"stroke": True, "color": "#0066CC", "weight": 2, "opacity": 1.0,
                 "line_cap": "round", "line_join": "round", "dash_array": None},
        "point": {"shape": "circle", "radius": 4, "fill": True, "fill_color": "#0066CC",
                  "fill_opacity": 1.0, "stroke": True, "color": "#FFFFFF", "weight": 1,
                  "opacity": 1.0},
    },
)
print(f"Track override fields: display_name={track.display_name}, nationality={track.nationality}")
```

## TypeScript

```typescript
import type { PlatformRecord, StacExtensionProperties } from '@debrief/schemas';

// Fully-populated platform record
const platform: PlatformRecord = {
  id: 'NELSON',
  name: 'HMS Nelson',
  nationality: 'GB',
  vessel_class: 'surface/warship/frigate/type23',
  vessel_type: 'type23',
  vessel_role: 'frigate',
  domain: 'surface',
};

// Sparse record
const unknown: PlatformRecord = { id: 'CONTACT-01' };

// Derive flat lists from platforms array
const platforms = [platform, unknown];
const nationalities = platforms.map(p => p.nationality).filter(Boolean);
const vesselClasses = platforms.map(p => p.vessel_class).filter(Boolean);
const trackNames = platforms.map(p => p.name).filter(Boolean);

console.log('Nationalities:', nationalities);   // ['GB']
console.log('Vessel classes:', vesselClasses);   // ['surface/warship/frigate/type23']
console.log('Track names:', trackNames);         // ['HMS Nelson']
```

## STAC Item JSON

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "exercise-alpha",
  "properties": {
    "title": "Exercise Alpha",
    "datetime": null,
    "start_datetime": "2026-01-15T08:00:00Z",
    "end_datetime": "2026-01-15T10:00:00Z",
    "debrief:platforms": [
      {
        "id": "NELSON",
        "name": "HMS Nelson",
        "nationality": "GB",
        "vessel_class": "surface/warship/frigate/type23",
        "vessel_type": "type23",
        "vessel_role": "frigate",
        "domain": "surface"
      },
      {
        "id": "CONTACT-01"
      }
    ],
    "debrief:tags": ["ASW", "training"],
    "debrief:feature_tags": ["sonar-contact"]
  }
}
```
