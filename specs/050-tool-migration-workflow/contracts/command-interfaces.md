# Command Interfaces: Tool Migration Workflow

**Feature**: 050-tool-migration-workflow
**Date**: 2026-02-05

## Overview

This document defines the interface contracts for the four tool migration commands.

## Command: /tool.discover

**Location**: `.claude/commands/tool.discover.md`

### Invocation

```
/tool.discover [path-to-java-source]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| path | No | Current working directory | Path to Legacy Debrief Java source |

### Behavior

1. Validate path exists and contains Java files
2. Invoke `legacy-tool-analyst` agent to scan source
3. Identify tool classes by pattern matching:
   - Classes implementing known tool interfaces
   - Classes with tool-related annotations
   - Classes in tool packages (e.g., `*.actions.*`, `*.tools.*`)
4. Estimate migration complexity:
   - Low: Simple property setters, single-feature operations
   - Medium: Multi-feature operations, basic algorithms
   - High: Complex analysis, external dependencies, stateful operations
5. Generate discovery report

### Output

Creates `docs/tool-migration/discovery-report.md`:
```markdown
# Tool Discovery Report

**Source**: {path}
**Date**: {timestamp}
**Tools Found**: {count}

## Inventory

| Name | Category | Java Class | Complexity | Description |
|------|----------|------------|------------|-------------|
| ... | ... | ... | ... | ... |

## Recommendations

- **Ready for migration**: [list of Low complexity tools]
- **Needs review**: [list of High complexity tools]
- **Out of scope**: [UI-only tools, deprecated tools]
```

---

## Command: /tool.spec

**Location**: `.claude/commands/tool.spec.md`

### Invocation

```
/tool.spec {tool-name} [--golden path/to/*.json] [--category category/path]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| tool-name | Yes | - | Name of the tool (from discovery report) |
| --golden | No | Auto-detect | Path pattern to golden example files |
| --category | No | From discovery | Category path for output file |

### Behavior

1. Look up tool in discovery report (if exists)
2. Invoke `legacy-tool-analyst` to analyze Java source
3. Extract:
   - Input/output types from method signatures
   - Algorithm logic from method bodies
   - Edge cases from conditionals and error handling
4. Invoke `tool-spec-author` to write specification
5. Link golden example files (if provided)

### Output

Creates `shared/tools/{category}/{tool-name}.1.0.md`:
- Follows TEMPLATE.md structure
- Algorithm section contains language-neutral pseudocode
- Examples section references golden files

### Error Cases

| Error | Condition |
|-------|-----------|
| "Tool not found" | tool-name not in discovery report and no --category provided |
| "Java source not found" | Cannot locate Java class for tool |
| "Algorithm extraction failed" | Cannot determine algorithm from source |

---

## Command: /tool.implement

**Location**: `.claude/commands/tool.implement.md`

### Invocation

```
/tool.implement {tool-name} [--python-only] [--typescript-only]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| tool-name | Yes | - | Name of the tool (spec must exist) |
| --python-only | No | false | Generate only Python implementation |
| --typescript-only | No | false | Generate only TypeScript implementation |

### Behavior

1. Locate spec file in `shared/tools/`
2. Validate spec has required sections
3. Load golden example files for testing
4. Invoke `tool-implementer` agent for each target language
5. Generate implementation files with test files

### Output

**Python** (unless --typescript-only):
```
services/debrief-calc/src/debrief_calc/tools/{category}/{tool_name}.py
services/debrief-calc/tests/tools/{category}/test_{tool_name}.py
```

**TypeScript** (unless --python-only):
```
apps/vscode/src/tools/{category}/{toolName}.ts
apps/vscode/src/tools/{category}/{toolName}.test.ts
```

### Implementation Requirements

- Python implementation MUST use `@tool_spec` decorator from feature 049
- TypeScript implementation MUST follow ToolResponse pattern
- Test files MUST exercise all golden examples
- Both implementations MUST produce identical output for same input

---

## Command: /tool.verify

**Location**: `.claude/commands/tool.verify.md`

### Invocation

```
/tool.verify {tool-name} [--epsilon 1e-9]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| tool-name | Yes | - | Name of the tool to verify |
| --epsilon | No | 1e-9 | Floating-point comparison tolerance |

### Behavior

1. Locate golden example files for tool
2. Locate Python and TypeScript implementations
3. Invoke `golden-example-validator` agent
4. For each golden example:
   - Run input through Python implementation
   - Run input through TypeScript implementation
   - Compare outputs against expected output
5. Generate verification report

### Output

Prints verification report to console:
```markdown
# Verification Report: {tool-name}

**Date**: {timestamp}
**Epsilon**: {epsilon}

## Results

| Example | Python | TypeScript | Status |
|---------|--------|------------|--------|
| basic   | PASS   | PASS       | PASS   |
| edge-1  | FAIL   | PASS       | FAIL   |

**Overall**: FAIL

## Failures

### edge-1 (Python)

**Expected**:
```json
{ ... }
```

**Actual**:
```json
{ ... }
```

**Differences**:
- properties.value: expected 1.5, got 1.500000001
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All examples passed |
| 1 | One or more examples failed |
| 2 | Missing implementations or golden examples |

---

## Agent Interfaces

### legacy-tool-analyst

**Location**: `.claude/agents/tools/legacy-tool-analyst.md`

**Inputs**:
- Java source code path
- Tool class name (optional)
- Context from discovery report (optional)

**Outputs**:
- Tool metadata (name, category, description)
- Algorithm description (natural language)
- Input/output type analysis
- Edge case identification

### tool-spec-author

**Location**: `.claude/agents/tools/tool-spec-author.md`

**Inputs**:
- Tool metadata from analyst
- Algorithm description
- Golden example file paths

**Outputs**:
- Complete tool specification following TEMPLATE.md

### tool-implementer

**Location**: `.claude/agents/tools/tool-implementer.md`

**Inputs**:
- Tool specification file
- Target language (python or typescript)
- Golden example files for testing

**Outputs**:
- Implementation source file
- Test source file

### golden-example-validator

**Location**: `.claude/agents/tools/golden-example-validator.md`

**Inputs**:
- Tool name
- Golden example file paths
- Implementation file paths
- Comparison epsilon

**Outputs**:
- Verification report (pass/fail per example)
- Failure details with diffs
