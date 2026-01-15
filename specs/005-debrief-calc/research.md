# Research: debrief-calc

**Feature**: Context-Sensitive Analysis Tools
**Date**: 2026-01-15

## Overview

This document captures technical decisions, research findings, and rationale for the debrief-calc implementation.

---

## Decision 1: Tool Registration Architecture

**Decision**: Decorator-based registration with a singleton registry

**Rationale**:
- Simple Python idiom familiar to developers
- Tools self-register on import, no configuration files needed
- Enables runtime discovery of available tools
- Follows patterns from pytest (fixtures), Click (commands), Flask (routes)

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Configuration file (JSON/YAML) | Adds maintenance burden; tool code and config can drift |
| Entry points (setuptools) | More complex for development; better for third-party extensions |
| Manual registration | Error-prone; easy to forget to register new tools |
| Class-based registry | More verbose; decorator is more Pythonic |

**Implementation Pattern**:
```python
from debrief_calc import registry

@registry.tool(
    name="track-stats",
    input_kinds=["track"],
    output_kind="analysis-result",
    context_type="single"
)
def track_stats(features: list[Feature], params: dict) -> ToolResult:
    ...
```

---

## Decision 2: Selection Context Model

**Decision**: Enum-based context types with kind filtering

**Rationale**:
- Clear, type-safe representation of selection states
- `kind` attribute from GeoJSON properties provides semantic filtering
- Combines structural context (single/multi/region) with semantic context (kind)

**Context Types**:

| Type | Description | Example Tool |
|------|-------------|--------------|
| `single` | Exactly one feature selected | track-stats |
| `multi` | Two or more features selected | range-bearing |
| `region` | Geographic bounds selected | area-summary |
| `none` | No selection (global tools) | list-all-tracks |

**Kind Filtering**: Tools declare `input_kinds: list[str]` and registry filters by matching `feature.properties.kind`.

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Freeform string context | No type safety; easy to mismatch |
| Complex selection objects | Over-engineered for current needs |
| Kind-only (no context type) | Loses structural information about selection |

---

## Decision 3: Provenance Tracking

**Decision**: Inline provenance in GeoJSON properties

**Rationale**:
- Keeps provenance with the data (no separate tracking system)
- Compatible with GeoJSON standard (properties are extensible)
- Aligns with Constitution Article III.1 (provenance always)
- Enables downstream systems to trace data lineage

**Provenance Structure**:
```json
{
  "type": "Feature",
  "properties": {
    "kind": "analysis-result",
    "provenance": {
      "tool": "track-stats",
      "version": "1.0.0",
      "timestamp": "2026-01-15T10:30:00Z",
      "sources": [
        {"id": "track-001", "kind": "track"}
      ],
      "parameters": {}
    }
  },
  "geometry": {...}
}
```

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Separate provenance database | Adds complexity; data can become orphaned |
| W3C PROV-O ontology | Too heavy for this use case |
| Sidecar files | Easy to lose; doesn't travel with data |

---

## Decision 4: MCP Integration Pattern

**Decision**: Thin wrapper exposing registry and executor

**Rationale**:
- Constitution Article IV.3 requires zero MCP dependency in domain logic
- MCP layer translates protocol to Python function calls
- Same tools work via MCP, CLI, and direct Python import
- Follows mcp-common patterns established in prior stages

**MCP Tools Exposed**:

| MCP Tool | Maps To |
|----------|---------|
| `list_tools` | `registry.find_tools(context, kinds)` |
| `describe_tool` | `registry.get_tool(name).metadata` |
| `run_tool` | `executor.run(tool_name, features, params)` |

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| MCP-first design | Violates Constitution; locks domain to protocol |
| GraphQL API | Different protocol; MCP is project standard |
| REST API | More infrastructure; MCP handles transport |

---

## Decision 5: CLI Framework

**Decision**: Click with command groups

**Rationale**:
- Mature, well-documented Python CLI framework
- Built-in support for command groups (`tools`, `catalog`)
- Good help text generation
- Used widely in Python ecosystem (Flask, pip)

**Command Structure**:
```
debrief-cli
├── tools
│   ├── list [--input FILE] [--store NAME --item ID]
│   ├── run TOOL [--input FILE] [--store NAME --item ID]
│   └── describe TOOL
├── validate FILE
└── catalog
    ├── stores
    ├── list --store NAME
    └── get --store NAME --item ID
```

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| argparse | More verbose; less ergonomic for nested commands |
| Typer | Additional dependency; Click is sufficient |
| Fire | Magic-based; less explicit control |

---

## Decision 6: Output Format Strategy

**Decision**: Human-readable default with `--json` flag

**Rationale**:
- Interactive use benefits from readable output
- Scripts need structured JSON for parsing
- `--json` is a common CLI convention (gh, docker)
- Aligns with clarification decision from spec

**Output Modes**:

| Mode | Trigger | Format |
|------|---------|--------|
| Human | Default (TTY) | Formatted tables, summaries |
| JSON | `--json` flag | Valid JSON to stdout |

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| JSON-only | Poor interactive experience |
| Auto-detect (TTY vs pipe) | Unpredictable; explicit is better |
| Multiple formats (YAML, XML) | Over-engineered; JSON covers scripting needs |

---

## Decision 7: Error Handling Strategy

**Decision**: Typed exceptions with structured error responses

**Rationale**:
- Constitution Article I.3 requires no silent failures
- Typed exceptions enable precise error handling
- CLI maps exceptions to exit codes
- MCP maps exceptions to error responses

**Exception Hierarchy**:
```
DebriefCalcError (base)
├── ToolNotFoundError      → exit code 4
├── InvalidContextError    → exit code 4
├── KindMismatchError      → exit code 4
├── ValidationError        → exit code 3
└── ExecutionError         → exit code 4
```

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Return codes (Go-style) | Less Pythonic; exceptions are idiomatic |
| Result types (Rust-style) | Adds complexity; not standard Python pattern |
| Generic exceptions | Loses error specificity |

---

## Decision 8: Test Fixture Strategy

**Decision**: GeoJSON fixtures in tests/calc/fixtures/

**Rationale**:
- Real GeoJSON files enable round-trip testing
- Fixtures can be reused by CLI tests
- Validates actual data flow, not mocked data
- Aligns with Constitution Article VI (services require tests)

**Fixture Types**:

| Fixture | Content | Tests |
|---------|---------|-------|
| `track-single.geojson` | One track with positions | track-stats |
| `tracks-pair.geojson` | Two tracks for comparison | range-bearing |
| `zone-region.geojson` | Zone polygon | area-summary |
| `invalid-geojson.json` | Malformed data | validation errors |

**Alternatives Considered**:

| Alternative | Why Rejected |
|-------------|--------------|
| Factory functions | Less realistic; may miss edge cases |
| External test data | Harder to maintain; version control issues |
| Generated fixtures | Randomness makes debugging harder |

---

## Open Items

None. All NEEDS CLARIFICATION items resolved during specification phase.

## References

- [Click documentation](https://click.palletsprojects.com/)
- [MCP protocol specification](https://modelcontextprotocol.io/)
- [GeoJSON RFC 7946](https://tools.ietf.org/html/rfc7946)
- [W3C PROV-O](https://www.w3.org/TR/prov-o/) (considered, not adopted)
