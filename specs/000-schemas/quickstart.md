# Quickstart: Schema Foundation

Get started with Debrief schemas in minutes.

---

## Prerequisites

- Python 3.11+
- Node.js 18+ (for TypeScript)
- uv (Python package manager)
- pnpm (TypeScript package manager)

## Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/debrief/debrief-future.git
cd debrief-future

# Install Python dependencies (includes LinkML)
uv sync

# Install TypeScript dependencies
pnpm install
```

### 2. Generate Schemas

```bash
cd shared/schemas
make generate
```

This generates:
- `src/generated/python/debrief_schemas/` — Pydantic models
- `src/generated/json-schema/` — JSON Schema files
- `src/generated/typescript/` — TypeScript interfaces

---

## Python Usage

### Import Models

```python
from debrief_schemas import TrackFeature, TrackProperties, TimestampedPosition

# Create a track
track = TrackFeature(
    id="track-001",
    geometry={
        "type": "LineString",
        "coordinates": [[-5.0, 50.0], [-4.9, 50.1]]
    },
    properties=TrackProperties(
        platform_id="HMS-EXAMPLE",
        track_type="OWNSHIP",
        start_time="2026-01-09T10:00:00Z",
        end_time="2026-01-09T12:00:00Z",
        positions=[
            TimestampedPosition(
                time="2026-01-09T10:00:00Z",
                coordinates=[-5.0, 50.0]
            ),
            TimestampedPosition(
                time="2026-01-09T12:00:00Z",
                coordinates=[-4.9, 50.1]
            )
        ]
    )
)
```

### Validate Data

```python
from pydantic import ValidationError

# Valid data passes
valid_json = '{"type": "Feature", "id": "track-001", ...}'
track = TrackFeature.model_validate_json(valid_json)

# Invalid data raises ValidationError
try:
    invalid = TrackFeature(id="bad", geometry=None, properties=None)
except ValidationError as e:
    print(e.errors())
```

### Serialize to JSON

```python
# To JSON string
json_str = track.model_dump_json()

# To dict
data = track.model_dump()
```

---

## TypeScript Usage

### Import Types

```typescript
import type { TrackFeature, SensorContact } from '@debrief/schemas';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import trackSchema from '@debrief/schemas/json-schema/TrackFeature.schema.json';

// Type-safe variable
const track: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-5.0, 50.0], [-4.9, 50.1]]
  },
  properties: {
    platform_id: 'HMS-EXAMPLE',
    track_type: 'OWNSHIP',
    start_time: '2026-01-09T10:00:00Z',
    end_time: '2026-01-09T12:00:00Z',
    positions: [
      { time: '2026-01-09T10:00:00Z', coordinates: [-5.0, 50.0] },
      { time: '2026-01-09T12:00:00Z', coordinates: [-4.9, 50.1] }
    ]
  }
};
```

### Validate with AJV

```typescript
// Setup AJV (do once at startup)
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateTrack = ajv.compile(trackSchema);

// Validate data
const data = JSON.parse(jsonString);
if (validateTrack(data)) {
  // data is valid TrackFeature
  const track = data as TrackFeature;
} else {
  console.error(validateTrack.errors);
}
```

---

## Validate Raw JSON

### Using LinkML CLI

```bash
# Validate against LinkML schema
linkml-validate -s src/linkml/debrief.yaml data.json
```

### Using JSON Schema CLI

```bash
# Install ajv-cli
npm install -g ajv-cli ajv-formats

# Validate
ajv validate -s TrackFeature.schema.json -d data.json --all-errors
```

---

## Modify Schemas

### 1. Edit LinkML Source

```bash
# Edit the master schema
vim src/linkml/geojson.yaml
```

### 2. Regenerate

```bash
make generate
```

### 3. Run Tests

```bash
make test
```

All three adherence test strategies run:
- Golden fixture validation
- Round-trip (Python → JSON → TypeScript → JSON → Python)
- Schema comparison (LinkML vs Pydantic JSON Schema)

---

## Common Tasks

| Task | Command |
|------|---------|
| Generate all schemas | `make generate` |
| Run all tests | `make test` |
| Run Python tests only | `pytest tests/` |
| Run TypeScript tests only | `pnpm test` |
| Validate a JSON file | `linkml-validate -s src/linkml/debrief.yaml file.json` |
| Clean generated files | `make clean` |

---

## Project Structure

```
shared/schemas/
├── src/
│   ├── linkml/           # Edit these (master schemas)
│   │   ├── debrief.yaml
│   │   ├── geojson.yaml
│   │   ├── stac.yaml
│   │   └── tools.yaml
│   ├── generated/        # Never edit (regenerated)
│   │   ├── python/
│   │   ├── json-schema/
│   │   └── typescript/
│   └── fixtures/         # Test data
│       ├── valid/
│       └── invalid/
├── tests/
├── Makefile
├── pyproject.toml
└── package.json
```

---

## Next Steps

1. **Read the data model**: `specs/000-schemas/data-model.md`
2. **Explore fixtures**: `shared/schemas/src/fixtures/`
3. **Run tests**: `make test`
4. **Add a field**: Edit LinkML, regenerate, run tests
