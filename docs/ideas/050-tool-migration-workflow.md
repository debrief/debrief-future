# Tool Migration Workflow for Legacy Debrief

## Problem

We've built a language-neutral tool documentation model (feature 049), but need to validate it works for real tool migration from Legacy Debrief (Java/Eclipse RCP). Currently there's no systematic workflow for:
- Discovering which tools exist in the legacy codebase
- Creating language-neutral specs from Java implementations
- Generating Python/TypeScript implementations from specs
- Validating implementations produce identical results

## Proposed Solution

Create a workflow with four slash commands and supporting agents:

### Commands

| Command | Purpose |
|---------|---------|
| `/tool.discover` | Scan legacy Java source, identify migrateable tools, produce inventory report |
| `/tool.spec` | Create language-neutral spec from legacy tool analysis + golden examples |
| `/tool.implement` | Generate Python/TS implementations from spec |
| `/tool.verify` | Run golden examples against implementations, compare outputs |

### Agents

| Agent | Role |
|-------|------|
| `legacy-tool-analyst` | Read Java source, extract algorithm logic, identify I/O types |
| `tool-spec-author` | Write language-neutral specs following TEMPLATE.md |
| `tool-implementer` | Generate Python/TS code from pseudocode algorithm |
| `golden-example-validator` | Compare implementation output to expected JSON |

### Java Harness

Provide a template for capturing golden I/O from running Java code:
- JUnit-based harness that serializes inputs/outputs to JSON
- Outputs match our GeoJSON schemas
- Produces files matching naming convention: `{tool}.{example}.{input|output}.json`

### Workflow Diagram

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

## Success Criteria

- [ ] All four commands documented and functional
- [ ] At least one legacy tool successfully migrated end-to-end
- [ ] Golden examples captured from Java, validated in Python and TypeScript
- [ ] Migration guide documents the complete workflow

## Constraints

- Java harness requires manual developer involvement (cannot auto-run legacy Debrief)
- Must work offline (developer tooling)
- Builds on 049 tool documentation model (shared/tools/ structure)

## Out of Scope

- Automatic Java code analysis (relies on Claude reading source)
- Full migration of all legacy tools (validates workflow with one tool)
- Runtime Java integration (harness is for capturing test data only)

## Dependencies

- Requires feature 049 (tool documentation model) - **complete**

## Related

- Feature 049: Language-neutral tool documentation model
- `shared/tools/TEMPLATE.md`: Template for tool specifications
- `services/debrief-tools/`: Python @tool_spec decorator
