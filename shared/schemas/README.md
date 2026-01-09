# Debrief Schemas

LinkML master schemas and generated artifacts for Debrief v4.x maritime tactical analysis platform.

## Overview

This package provides schema definitions for five core entity types:

- **TrackFeature** - GeoJSON Feature representing vessel tracks
- **SensorContact** - GeoJSON Feature for sensor detections
- **ReferenceLocation** - GeoJSON Feature for fixed reference points
- **PlotMetadata** - STAC Item properties for Debrief plots
- **ToolMetadata** - Metadata for analysis tools

## Generated Artifacts

From the LinkML master schemas, we generate:

- **Pydantic models** - Python dataclasses with validation
- **JSON Schema** - For frontend validation and API contracts
- **TypeScript interfaces** - For type-safe frontend development

## Usage

### Python (Pydantic)

```python
from debrief_schemas import TrackFeature, SensorContact

# Validate track data
track = TrackFeature(**track_dict)
print(track.properties.platform_id)

# Export to JSON
json_str = track.model_dump_json()
```

### TypeScript

```typescript
import { TrackFeature, TrackTypeEnum } from '@debrief/schemas';

const track: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  // ...
};
```

### JSON Schema (AJV)

```javascript
import Ajv from 'ajv/dist/2019.js';
import trackSchema from '@debrief/schemas/TrackFeature.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(trackSchema);
const valid = validate(trackData);
```

## Development

### Prerequisites

- Python 3.11+ with uv
- Node.js 18+ with pnpm

### Commands

```bash
# Generate all derived schemas
make generate

# Run tests
make test

# Clean generated files
make clean
```

## Known Limitations

LinkML has a limitation with nested array types. GeoJSON coordinates should be arrays of position arrays (e.g., `[[lon, lat], ...]`), but the generated JSON Schema expects flat number arrays. Track features with proper GeoJSON coordinates will validate correctly with Pydantic models but may show validation errors in JSON Schema.

## License

See project root LICENSE file.
