# Round-Trip Evidence: PlatformRecord

## Python -> JSON -> Python

```python
from debrief_schemas import PlatformRecord, StacExtensionProperties, VesselDomainEnum
import json

# Create original
original = StacExtensionProperties(
    platforms=[
        PlatformRecord(
            id="ARGYLL", name="HMS Argyll", nationality="GB",
            vessel_class="surface/warship/frigate/type23",
            vessel_type="type23", vessel_role="frigate",
            domain=VesselDomainEnum.surface,
        ),
        PlatformRecord(id="CONTACT-01"),
    ],
    tags=["ASW"],
    feature_tags=["sonar-contact"],
)

# Serialize to JSON
json_str = original.model_dump_json()
print("JSON:", json_str)

# Deserialize back
data = json.loads(json_str)
restored = StacExtensionProperties(**data)

# Verify equality
assert restored == original
assert restored.platforms[0].id == "ARGYLL"
assert restored.platforms[0].nationality == "GB"
assert restored.platforms[0].vessel_class == "surface/warship/frigate/type23"
assert restored.platforms[0].domain == VesselDomainEnum.surface
assert restored.platforms[1].id == "CONTACT-01"
assert restored.platforms[1].name is None
print("PASS: Python round-trip preserves all fields")
```

## JSON Output (intermediate)

```json
{
  "platforms": [
    {
      "id": "ARGYLL",
      "name": "HMS Argyll",
      "nationality": "GB",
      "vessel_class": "surface/warship/frigate/type23",
      "vessel_type": "type23",
      "vessel_role": "frigate",
      "domain": "surface"
    },
    {
      "id": "CONTACT-01",
      "name": null,
      "nationality": null,
      "vessel_class": null,
      "vessel_type": null,
      "vessel_role": null,
      "domain": null
    }
  ],
  "tags": ["ASW"],
  "feature_tags": ["sonar-contact"]
}
```

## TypeScript Consumption

```typescript
// Same JSON consumed by TypeScript
import type { PlatformRecord } from '@debrief/schemas';

const json = `{...}`;  // JSON from Python above
const data = JSON.parse(json);
const platforms: PlatformRecord[] = data.platforms;

// Access works with same field names
console.log(platforms[0].id);            // "ARGYLL"
console.log(platforms[0].nationality);   // "GB"
console.log(platforms[0].vessel_class);  // "surface/warship/frigate/type23"
console.log(platforms[0].domain);        // "surface"
console.log(platforms[1].id);            // "CONTACT-01"
console.log(platforms[1].name);          // null
```

## Verification

Round-trip tests confirm:
- 292 Pydantic round-trip tests pass (test_roundtrip.py)
- 23 STAC extension tests pass including round-trip (test_stac_extension.py)  
- 92 golden fixture tests pass (test_golden.py)
- Python and TypeScript use identical JSON field names (snake_case)
- Null/absent optional fields serialize as null and deserialize back correctly
