# Product Requirements Document: debrief-cli

**Status**: Draft for Review
**Created**: 2026-01-15
**Related Spec**: 005-debrief-calc

## Overview

`debrief-cli` is a command-line interface providing unified access to the Debrief service ecosystem. It serves as an alternative window into debrief functionality, enabling developers, power users, and automated pipelines to interact with maritime analysis tools without a graphical interface.

## Strategic Rationale

### Why a CLI?

1. **Verification without UI** — debrief-calc cannot be verified until VS Code extension (Stage 6) exists. The CLI bridges this gap.
2. **Power user access** — Analysts who prefer command-line workflows get first-class support
3. **Automation enablement** — CI pipelines, batch processing, and scripting become possible
4. **Developer experience** — Faster iteration during development than launching full UI

### Why a Separate Package?

The CLI depends on multiple services:
- `debrief-calc` — analysis tools
- `debrief-io` — file format parsing
- `debrief-stac` — catalog access

This makes it a cross-cutting integration layer, not a feature of any single service.

## Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Primary purpose | All three: dev verification, power users, scripting | Maximum utility from single investment |
| Command scope | Full suite: tools, validation, catalog | Complete ecosystem access |
| Input sources | Files + STAC IDs (with store identifier) | Catalog integration essential; stdin deferred |
| Output format | Switchable: human default, `--json` flag | Readable by default, scriptable when needed |
| Packaging | Separate package (`debrief-cli`) | Different dependencies than any single service |
| Command name | `debrief-cli` | Explicit, discoverable |

## Command Structure

```
debrief-cli <command-group> <command> [options]
```

### Command Groups

#### `tools` — Analysis Tool Operations
```bash
# List all available tools
debrief-cli tools list [--json]

# List tools applicable to input
debrief-cli tools list --input track.geojson [--json]
debrief-cli tools list --store my-catalog --item track-001 [--json]

# Show tool details
debrief-cli tools describe <tool-name> [--json]

# Execute a tool
debrief-cli tools run <tool-name> --input track.geojson [--json]
debrief-cli tools run <tool-name> --store my-catalog --item track-001 [--json]
debrief-cli tools run <tool-name> --store my-catalog --item track-001 --item track-002 [--json]
```

#### `validate` — Schema Validation
```bash
# Validate GeoJSON against schema
debrief-cli validate <file.geojson> [--json]
debrief-cli validate --store my-catalog --item track-001 [--json]
```

#### `catalog` — STAC Catalog Operations
```bash
# List available stores
debrief-cli catalog stores [--json]

# List items in a store
debrief-cli catalog list --store my-catalog [--json]

# Get item details
debrief-cli catalog get --store my-catalog --item track-001 [--json]
```

### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON instead of human-readable |
| `--store <name>` | STAC catalog store identifier |
| `--help` | Show help for command |
| `--version` | Show version |

## Output Behavior

### Human-Readable (default)
```
$ debrief-cli tools list
Available Tools:
  track-stats     Calculate statistics for a single track
  range-bearing   Compute range and bearing between two tracks
  area-summary    Summarize features within a region

$ debrief-cli tools run track-stats --input track.geojson
Tool: track-stats
Status: Success
Output: track-stats-result.geojson (written)

Summary:
  Duration: 847ms
  Points analyzed: 1,247
  Kind: analysis-result
```

### JSON (with --json flag)
```json
{
  "tools": [
    {"name": "track-stats", "description": "Calculate statistics for a single track", "input_kinds": ["track"], "output_kind": "analysis-result"},
    {"name": "range-bearing", "description": "Compute range and bearing between two tracks", "input_kinds": ["track"], "output_kind": "bearing"},
    {"name": "area-summary", "description": "Summarize features within a region", "input_kinds": ["zone"], "output_kind": "analysis-result"}
  ]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Input validation failed |
| 4 | Tool execution failed |
| 5 | Catalog/store not found |

## Dependencies

```
debrief-cli
├── debrief-calc    (tools, registry)
├── debrief-io      (file parsing)
├── debrief-stac    (catalog access)
└── debrief-schemas (validation)
```

## Success Criteria

- **SC-CLI-001**: All debrief-calc acceptance scenarios can be verified via CLI
- **SC-CLI-002**: JSON output is valid and parseable by standard tools (jq, Python json)
- **SC-CLI-003**: Exit codes accurately reflect operation outcome
- **SC-CLI-004**: Help text is available for all commands
- **SC-CLI-005**: CLI can be used in shell pipelines (`debrief-cli tools run ... | jq '.result'`)

## Out of Scope (Initial Release)

- Stdin input (can add later)
- Interactive mode / REPL
- Configuration file
- Shell completions
- Progress bars for long operations
- Remote MCP server connection (CLI uses local libraries directly)

## Open Questions

1. **Output file handling**: Should `tools run` write to file by default, or output to stdout?
   - Option A: Write to `<tool>-result.geojson`, show path
   - Option B: Output to stdout, user redirects (`> output.geojson`)
   - Option C: Flag to control (`--output <file>` or `--stdout`)

2. **Store discovery**: How does CLI find available STAC stores?
   - Option A: Config file location (XDG)
   - Option B: Environment variable
   - Option C: Command-line only (`--store-path`)

---

**Next Step**: Review and confirm this PRD, then integrate as verification mechanism in 005-debrief-calc spec.
