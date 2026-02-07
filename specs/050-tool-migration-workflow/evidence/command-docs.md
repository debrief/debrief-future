# Command Documentation: Tool Migration Workflow

This document provides quick reference for all commands in the tool migration workflow.

## Commands Overview

| Command | Purpose | Inputs | Outputs |
|---------|---------|--------|---------|
| `/tool.discover` | Find migrateable tools | Java source path | Inventory report |
| `/tool.spec` | Create tool specification | Tool name, Java source | Spec file (.md) |
| `/tool.implement` | Generate implementations | Tool name | Python & TypeScript files |
| `/tool.verify` | Validate implementations | Tool name | Verification report |

---

## /tool.discover

**Purpose**: Scan Legacy Debrief Java source and produce an inventory of migrateable tools.

**Syntax**:
```
/tool.discover {java-source-path} [--category={category}] [--output={output-path}]
```

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| java-source-path | Yes | Path to Legacy Debrief Java source |
| --category | No | Filter to specific category |
| --output | No | Custom output path for report |

**Example**:
```
/tool.discover /path/to/org.mwc.debrief.core --category=analysis
```

**Output**: Tool discovery report with tool names, categories, and complexity ratings.

---

## /tool.spec

**Purpose**: Generate a language-neutral tool specification from Java source and golden examples.

**Syntax**:
```
/tool.spec {tool-name} [--java-source={path}] [--version={version}]
```

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| tool-name | Yes | Tool identifier (kebab-case) |
| --java-source | No | Path to Java implementation |
| --version | No | Spec version (default: v1) |

**Example**:
```
/tool.spec set-track-color --java-source /path/to/SetTrackColor.java
```

**Output**: Specification file at `shared/tools/{category}/{tool-name}.{version}.md`

---

## /tool.implement

**Purpose**: Generate Python and TypeScript implementations from a tool specification.

**Syntax**:
```
/tool.implement {tool-name} [--python-only] [--typescript-only]
```

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| tool-name | Yes | Tool identifier (kebab-case) |
| --python-only | No | Generate only Python |
| --typescript-only | No | Generate only TypeScript |

**Example**:
```
/tool.implement set-track-color
```

**Output**:
- Python: `services/debrief-calc/src/debrief_calc/tools/{category}/{tool_name}.py`
- TypeScript: `apps/vscode/src/tools/{category}/{toolName}.ts`
- Test files for both languages

---

## /tool.verify

**Purpose**: Verify implementations against golden I/O examples with floating-point tolerance.

**Syntax**:
```
/tool.verify {tool-name} [--epsilon={tolerance}] [--python-only] [--typescript-only] [--verbose]
```

**Arguments**:
| Argument | Required | Description |
|----------|----------|-------------|
| tool-name | Yes | Tool identifier (kebab-case) |
| --epsilon | No | Floating-point tolerance (default: 1e-9) |
| --python-only | No | Verify only Python |
| --typescript-only | No | Verify only TypeScript |
| --verbose | No | Include full JSON in report |

**Example**:
```
/tool.verify set-track-color --epsilon=1e-6
```

**Output**: Verification report showing pass/fail status for each golden example.

---

## Supporting Agents

Each command is backed by a specialized agent:

| Command | Agent | File |
|---------|-------|------|
| `/tool.discover` | legacy-tool-analyst | `.claude/agents/tools/legacy-tool-analyst.md` |
| `/tool.spec` | tool-spec-author | `.claude/agents/tools/tool-spec-author.md` |
| `/tool.implement` | tool-implementer | `.claude/agents/tools/tool-implementer.md` |
| `/tool.verify` | golden-example-validator | `.claude/agents/tools/golden-example-validator.md` |

---

## Workflow Sequence

```
/tool.discover → /tool.spec → [Java Harness] → /tool.implement → /tool.verify
```

1. **Discover** what tools exist in Legacy Debrief
2. **Spec** the tool's behavior in language-neutral format
3. **Capture** golden I/O using Java harness (manual step)
4. **Implement** in Python and TypeScript
5. **Verify** implementations match golden examples
