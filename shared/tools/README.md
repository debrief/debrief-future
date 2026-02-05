# Debrief Tool Specifications

Language-neutral tool documentation for consistent behavior across Python and TypeScript implementations.

## Structure

```
shared/tools/
├── TEMPLATE.md           # Master template for new tool specs
├── README.md             # This file
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
