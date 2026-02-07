# Debrief Tool Specifications

Language-neutral tool documentation for consistent behavior across Python and TypeScript implementations.

## ToolResult Architecture

All tools return a **ToolResponse** containing content items with Debrief annotations — they do NOT return modified features directly.

```
Tool Input (FeatureCollection)
    → Tool Processing
    → ToolResponse { content: [MutationResult | AdditionResult | DeletionResult | ArtifactResult] }
```

**Key concepts**:
- **Result Types**: `mutation/`, `addition/`, `deletion/`, `artifact/` — categorize what the tool does
- **Annotations**: Every content item includes `debrief:resultType`, `debrief:sourceFeatures`, `debrief:label`
- **Provenance**: Results carry lineage information for audit trails

**Essential documentation**:
- [ToolResult Data Model](../specs/041-document-tool-results/data-model.md) — Complete response structure
- [Python API Contract](../specs/041-document-tool-results/contracts/python-api.md) — `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](./schemas/src/linkml/tool-result.yaml) — LinkML schema for annotations

## Structure

```
shared/tools/
├── TEMPLATE.md           # Master template for new tool specs
├── README.md             # This file
├── dataset/
│   └── export/           # Data export and clipboard tools
│       ├── export-track-as-csv.1.0.md
│       ├── copy-bearings-to-clipboard.1.0.md
│       ├── export-track-to-gpx.1.0.md
│       └── copy-time-data-to-clipboard.1.0.md
├── sensor/
│   └── analysis/         # Sensor analysis and data entry tools
│       └── generate-new-sensor-contact.1.0.md
└── track/
    └── styling/          # Track styling tools
        ├── set-track-color.1.0.md
        ├── apply-symbol-style.1.0.md
        ├── label-interval.1.0.md
        └── symbol-interval.1.0.md
```

## Categories

| Category | Description |
|----------|-------------|
| `dataset/export` | Data export (CSV, GPX) and clipboard copy operations |
| `sensor/analysis` | Sensor analysis and manual data entry |
| `track/styling` | Visual appearance of tracks (colors, symbols, labels) |
| `track/analysis` | Track analysis operations (future) |
| `track/transform` | Track modifications (future) |
| `annotation/` | Annotation operations (future) |
| `measure/` | Measurement tools (future) |

## Creating a New Tool Spec

1. Copy `TEMPLATE.md` to the appropriate category folder
2. Rename using the pattern `[tool-name].[major].[minor].md`
3. Fill in all 9 required sections
4. Create golden example files: `[tool-name].[example-name].input.json` and `.output.json`

See [Quickstart Guide](../../specs/049-tool-documentation-model/quickstart.md) for detailed instructions.

## Linking Implementation

### Python

```python
from debrief_tools.decorators import tool_spec

@tool_spec("track/styling/set-track-color.1.0")
def set_track_color(features, color):
    # Implementation
    pass
```

## Template Sections

Each tool specification includes these 9 sections:

1. **Metadata** - YAML frontmatter with name, version, category, status
2. **MCP** - LLM-optimized descriptions for tool discovery
3. **Inputs** - Schema references and constraints
4. **Outputs** - Result schema and ToolResult annotations
5. **Algorithm** - Language-neutral pseudocode
6. **Edge Cases** - Boundary conditions and error handling
7. **Examples** - Golden input/output pairs
8. **Changelog** - Version history
9. **References** - Related tools, schemas, legacy code

## Schema References

Tool specs reference existing schemas:

- **GeoJSON features**: `shared/schemas/src/linkml/geojson.yaml`
- **Styling properties**: `shared/schemas/src/linkml/styling.yaml`
- **Tool results**: `shared/schemas/src/linkml/tool-result.yaml`
