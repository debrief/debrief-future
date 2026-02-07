# Tool Migration Agents

Agents that support the tool migration workflow for moving tools from Legacy Debrief (Java/Eclipse RCP) to Future Debrief.

## Overview

These agents work together with four slash commands to enable systematic tool migration:

```
┌─────────────────────────────────────────────────────────────────┐
│ /tool.discover                                                  │
│   └─> legacy-tool-analyst scans Java source                     │
│       └─> outputs: discovery-report.md (tool inventory)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ /tool.spec {tool-name}                                          │
│   ├─> legacy-tool-analyst extracts algorithm from Java          │
│   ├─> [MANUAL] Developer runs Java harness, captures I/O        │
│   ├─> Developer provides golden example JSON files              │
│   └─> tool-spec-author writes spec following TEMPLATE.md        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ /tool.implement {tool-name}                                     │
│   ├─> tool-implementer reads spec + algorithm                   │
│   ├─> generates Python implementation in debrief-calc           │
│   ├─> generates TypeScript implementation for VS Code           │
│   └─> runs golden-example-validator for basic verification      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ /tool.verify {tool-name}                                        │
│   ├─> golden-example-validator runs all examples                │
│   ├─> compares Python vs TypeScript outputs                     │
│   └─> generates verification report                             │
└─────────────────────────────────────────────────────────────────┘
```

## Agents

| Agent | Purpose | Used By |
|-------|---------|---------|
| [legacy-tool-analyst](legacy-tool-analyst.md) | Analyzes Java source to extract tool metadata and algorithms | /tool.discover, /tool.spec |
| [tool-spec-author](tool-spec-author.md) | Writes language-neutral specifications following TEMPLATE.md | /tool.spec |
| [tool-implementer](tool-implementer.md) | Generates Python and TypeScript implementations from specs | /tool.implement |
| [golden-example-validator](golden-example-validator.md) | Validates implementations against golden I/O examples | /tool.implement, /tool.verify |

## Key Concepts

### Language-Neutral Specifications

Tool specs follow the structure defined in `shared/tools/TEMPLATE.md` (from feature 049). They describe tool behavior without implementation details:

- Inputs and outputs in GeoJSON schema terms
- Algorithm as language-neutral pseudocode
- Golden examples as JSON files

### Golden Examples

Input/output pairs that define expected tool behavior. Naming convention:

```
{tool-name}.{example-name}.input.json
{tool-name}.{example-name}.output.json
```

These are captured from the running Legacy Debrief Java application using the Java harness template in `docs/tool-migration/java-harness-template/`.

### Verification

Implementations pass verification when:
1. Both Python and TypeScript implementations produce output
2. Outputs match the expected golden example outputs
3. Floating-point comparisons use epsilon tolerance (1e-9)

## Related Documentation

- `docs/tool-migration/java-harness-template/` - Template for capturing golden I/O
- `shared/tools/TEMPLATE.md` - Tool specification template
- `specs/050-tool-migration-workflow/` - Feature specification and plan
- `specs/050-tool-migration-workflow/quickstart.md` - Developer guide
