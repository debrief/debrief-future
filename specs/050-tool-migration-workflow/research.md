# Research: Tool Migration Workflow

**Feature**: 050-tool-migration-workflow
**Date**: 2026-02-05

## Executive Summary

This research documents the technical decisions for implementing a tool migration workflow that enables systematic migration of tools from Legacy Debrief (Java/Eclipse RCP) to Future Debrief. The workflow consists of four slash commands and four supporting agents that automate discovery, specification, implementation, and verification.

## Research Topics

### R1: Slash Command vs Agent Architecture

**Decision**: Implement four slash commands (`.claude/commands/tool.*.md`) that orchestrate four supporting agents (`.claude/agents/tools/*.md`).

**Rationale**:
- Slash commands provide user-invocable entry points with clear interfaces
- Agents encapsulate specialized logic that can be reused across commands
- This pattern matches existing speckit workflow (commands invoke specialist agents)
- Commands handle orchestration; agents handle domain expertise

**Alternatives Considered**:
- Single monolithic command: Rejected because migration phases have distinct concerns
- Agents only (no commands): Rejected because users need clear invocation points
- Python scripts: Rejected because Claude-based agents can analyze Java source directly

### R2: Agent File Organization

**Decision**: Create new directory `.claude/agents/tools/` for migration-related agents.

**Rationale**:
- Keeps tool migration agents separate from backlog and media agents
- Clear namespace for future tool-related agents
- Follows existing organizational pattern (agents/backlog/, agents/media/)

**New Files**:
```
.claude/agents/tools/
├── README.md
├── legacy-tool-analyst.md
├── tool-spec-author.md
├── tool-implementer.md
└── golden-example-validator.md
```

### R3: Command Invocation Pattern

**Decision**: Commands follow `tool.*` naming convention with tool-name as argument.

**Rationale**:
- Consistent with existing `speckit.*` pattern
- Clear hierarchy: `/tool.discover`, `/tool.spec {name}`, `/tool.implement {name}`, `/tool.verify {name}`
- Matches user mental model of progressive workflow

**Command Signatures**:
```
/tool.discover [path-to-java-source]
/tool.spec {tool-name} [--golden path/to/*.json]
/tool.implement {tool-name} [--python-only | --typescript-only]
/tool.verify {tool-name}
```

### R4: Java Source Analysis Approach

**Decision**: Use Claude's natural language understanding to analyze Java source code, rather than AST parsing.

**Rationale**:
- Claude can understand Java code patterns, comments, and naming conventions
- No need for external Java parsing tools or dependencies
- Agents can ask clarifying questions when source is ambiguous
- Works with incomplete or non-compiling code

**Constraints**:
- Requires developer to provide path to Legacy Debrief source
- Cannot execute Java code (golden I/O capture is manual)
- Analysis quality depends on code documentation

### R5: Golden I/O Capture Strategy

**Decision**: Provide Java harness template (JUnit-based) that developers integrate manually into Legacy Debrief.

**Rationale**:
- Cannot automate running Legacy Debrief (Eclipse RCP application)
- JUnit is standard in Legacy Debrief testing infrastructure
- Template approach minimizes developer effort while ensuring consistent output format
- Produces JSON files matching project GeoJSON schemas

**Harness Location**: `docs/tool-migration/java-harness-template/`

**Output Convention**:
```
{tool-name}.{example-name}.input.json
{tool-name}.{example-name}.output.json
```

### R6: Spec Generation Workflow

**Decision**: `/tool.spec` generates specifications following TEMPLATE.md from feature 049, with algorithm section derived from Java analysis.

**Rationale**:
- Builds on established tool documentation model
- Ensures consistency with existing tool specs
- Language-neutral pseudocode serves as implementation contract

**Workflow**:
1. `legacy-tool-analyst` reads Java source, extracts algorithm logic
2. `tool-spec-author` generates spec following TEMPLATE.md
3. Developer provides golden I/O files (captured via Java harness)
4. Spec includes references to golden example files

### R7: Implementation Generation Targets

**Decision**: Generate both Python (debrief-calc) and TypeScript (VS Code extension) implementations.

**Rationale**:
- Python implementation runs server-side via MCP
- TypeScript implementation runs client-side in VS Code
- Both share same algorithm (language-neutral spec is contract)
- Enables offline operation (TypeScript) and remote analysis (Python)

**Output Locations**:
```
services/debrief-calc/src/debrief_calc/tools/{category}/{tool-name}.py
apps/vscode/src/tools/{category}/{tool-name}.ts
```

### R8: Verification Report Format

**Decision**: Markdown report with pass/fail table per golden example.

**Rationale**:
- Human-readable for review
- Can be committed as evidence
- Shows specific differences for debugging

**Report Structure**:
```markdown
# Verification Report: {tool-name}

| Example | Python | TypeScript | Expected | Status |
|---------|--------|------------|----------|--------|
| basic   | PASS   | PASS       | match    | PASS   |
| edge-1  | FAIL   | PASS       | diff     | FAIL   |

## Failures

### edge-1 (Python)
Expected: {...}
Actual: {...}
Diff: [specific differences]
```

### R9: Floating-Point Comparison Strategy

**Decision**: Use epsilon tolerance of 1e-9 for floating-point comparisons across all implementations.

**Rationale**:
- Java, Python, and TypeScript have different floating-point representations
- Standard epsilon avoids false failures from precision differences
- 1e-9 is precise enough for maritime analysis (sub-millimeter at coordinate scale)

**Implementation**:
- Verification agent recursively compares JSON, using epsilon for numbers
- Tolerance is configurable per-tool if needed

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Feature 049 | Tool documentation model (TEMPLATE.md, @tool_spec decorator) | Complete |
| `.claude/agents/` | Agent infrastructure | Exists |
| `.claude/commands/` | Command infrastructure | Exists |
| `shared/tools/` | Tool specification location | Exists |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Java source unavailable | Document that developer must provide source path |
| Tool logic too complex for spec | Agent can flag for human review |
| Golden I/O capture difficult | Provide detailed harness documentation with examples |
| Cross-language behavioral differences | Verification catches differences; document expected precision |

## Conclusion

The tool migration workflow leverages existing infrastructure (agents, commands, tool specs) while adding specialized agents for Java analysis and cross-language implementation. The key innovation is using Claude's natural language understanding to analyze legacy Java code and generate language-neutral specifications, enabling automated implementation in both Python and TypeScript.
