# Usage Example: STAC Extension Properties

## Python: Load and Validate a Fixture

```python
import json
from pathlib import Path
from debrief_schemas import StacExtensionProperties

# Load an exercise fixture
fixture_dir = Path("shared/schemas/fixtures/stac-browser/exercise-joint-warrior")
item = json.loads((fixture_dir / "item.json").read_text())

# Extract extension properties from item.properties
props = item["properties"]
ext = StacExtensionProperties(
    vessel_classes=props.get("debrief:vessel_classes", []),
    tags=props.get("debrief:tags", []),
    feature_tags=props.get("debrief:feature_tags", []),
    track_names=props.get("debrief:track_names", []),
    nationalities=props.get("debrief:nationalities", []),
)

print(f"Exercise: {item['id']}")
print(f"Vessel classes: {ext.vessel_classes}")
print(f"Nationalities: {ext.nationalities}")
# Author is derived from PROV lineage, not stored in extension properties
```

**Expected output:**
```
Exercise: exercise-joint-warrior
Vessel classes: ['surface/warship/frigate/type23', 'subsurface/submarine/ssn/astute']
Nationalities: ['GB', 'US']
```

## Python: Filter Fixtures by Vessel Class

```python
import json
from pathlib import Path

stac_dir = Path("shared/schemas/fixtures/stac-browser")
exercises = sorted(p for p in stac_dir.iterdir() if p.is_dir() and p.name.startswith("exercise-"))

# Find all exercises involving submarines
submarine_exercises = []
for d in exercises:
    item = json.loads((d / "item.json").read_text())
    vessel_classes = item["properties"].get("debrief:vessel_classes", [])
    if any(vc.startswith("subsurface/submarine") for vc in vessel_classes):
        submarine_exercises.append(item["id"])

print(f"Exercises with submarines: {len(submarine_exercises)} of {len(exercises)}")
# Output: Exercises with submarines: ~20 of 100
```

## TypeScript: Type-Safe Property Access

```typescript
import type { StacExtensionProperties } from '@debrief/schemas';

interface StacItem {
  id: string;
  properties: Record<string, unknown> & {
    'debrief:vessel_classes'?: string[];
    'debrief:tags'?: string[];
    'debrief:feature_tags'?: string[];
    'debrief:track_names'?: string[];
    'debrief:nationalities'?: string[];
  };
}

function getExtensionProps(item: StacItem): StacExtensionProperties {
  const p = item.properties;
  return {
    vessel_classes: p['debrief:vessel_classes'] ?? [],
    tags: p['debrief:tags'] ?? [],
    feature_tags: p['debrief:feature_tags'] ?? [],
    track_names: p['debrief:track_names'] ?? [],
    nationalities: p['debrief:nationalities'] ?? [],
  };
}
```

## Computing Duration (Not Stored — Computed at Query Time)

```python
from datetime import datetime

def compute_duration_hours(item: dict) -> float | None:
    """Duration is computed from start/end datetime, per research decision R3."""
    props = item.get("properties", {})
    start = props.get("start_datetime")
    end = props.get("end_datetime")
    if not start or not end:
        return None  # Single-timestamp item
    s = datetime.fromisoformat(str(start).replace("Z", "+00:00"))
    e = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
    return (e - s).total_seconds() / 3600.0
```
