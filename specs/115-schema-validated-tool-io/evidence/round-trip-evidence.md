# Round-Trip Evidence: Provenance Fields

Demonstrates that provenance fields survive Python → JSON → Python round-trip serialization.

## ReferenceLocation with provenance

### Input JSON (Python dict → Pydantic model)

```json
{
  "type": "Feature",
  "id": "ref-001",
  "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
  "properties": {
    "kind": "POINT",
    "name": "Alpha Point",
    "location_type": "REFERENCE",
    "style": {
      "shape": "square",
      "color": "#666666",
      "radius": 5,
      "fill": true,
      "fill_color": "#666666"
    },
    "provenance": [
      {
        "tool_name": "manual-entry",
        "tool_version": "1.0.0",
        "timestamp": "2024-06-15T08:00:00Z",
        "source_ids": [],
        "parameters": {}
      }
    ]
  }
}
```

### Round-trip verification

```python
from debrief_schemas import ReferenceLocation
import json

data = {
    "type": "Feature",
    "id": "ref-001",
    "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
    "properties": {
        "kind": "POINT",
        "name": "Alpha Point",
        "location_type": "REFERENCE",
        "style": {"shape": "square", "color": "#666666", "radius": 5, "fill": True, "fill_color": "#666666"},
        "provenance": [{
            "tool_name": "manual-entry",
            "tool_version": "1.0.0",
            "timestamp": "2024-06-15T08:00:00Z",
            "source_ids": [],
            "parameters": {},
        }],
    },
}

# Step 1: JSON → Python
instance = ReferenceLocation(**data)
assert instance.properties.provenance is not None
assert len(instance.properties.provenance) == 1
assert instance.properties.provenance[0].tool_name == "manual-entry"

# Step 2: Python → JSON
json_str = instance.model_dump_json()
parsed = json.loads(json_str)

# Step 3: JSON → Python (second round)
instance2 = ReferenceLocation(**parsed)
assert instance == instance2  # ✅ Round-trip preserves all data

# Step 4: Verify provenance survived
assert instance2.properties.provenance[0].tool_name == "manual-entry"
assert instance2.properties.provenance[0].tool_version == "1.0.0"
```

### Result: PASS

Provenance fields are preserved through the complete round-trip.

## TypeScript types

The generated TypeScript types include provenance as an optional array of `LogEntry`:

```typescript
// From @debrief/schemas generated types
export interface ReferenceLocationProperties {
  kind: 'POINT';
  name: string;
  location_type: string;
  style: PointProperties;
  provenance?: LogEntry[];
  // ...
}

export interface LogEntry {
  tool_name: string;
  tool_version: string;
  timestamp: string;
  source_ids: string[];
  parameters: Record<string, unknown>;
}
```

The TypeScript types compile without errors alongside all existing components (`pnpm build` succeeds).
