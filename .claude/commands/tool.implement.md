---
description: Generate Python and TypeScript implementations from a tool specification.
---

## User Input

```text
$ARGUMENTS
```

## Purpose

This command generates working implementations in Python and TypeScript from a language-neutral tool specification. It creates code that follows project patterns and includes test files that exercise golden examples.

## Agent Reference

| Role | Agent File |
|------|------------|
| Implementer | `.claude/agents/tools/tool-implementer.md` |
| Validator | `.claude/agents/tools/golden-example-validator.md` |

**Read the agent files** to understand code patterns and validation protocols.

## Invocation

```
/tool.implement {tool-name} [--python-only] [--typescript-only]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| tool-name | Yes | - | Tool identifier (e.g., `set-track-color`) |
| --python-only | No | false | Generate only Python implementation |
| --typescript-only | No | false | Generate only TypeScript implementation |

## Execution Flow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- **tool-name**: Required, kebab-case identifier
- **--python-only**: Optional flag
- **--typescript-only**: Optional flag

If no tool-name provided:
> "Please provide a tool name, e.g., `/tool.implement set-track-color`"

### Step 2: Locate Specification

1. **Search for spec file** in `shared/tools/`:
   ```
   shared/tools/**/{tool-name}.*.md
   ```

2. **If not found**:
   > "Specification not found for '{tool-name}'. Run `/tool.spec {tool-name}` first."

3. **Read the specification** and extract:
   - Category
   - Algorithm pseudocode
   - Input/output types
   - Edge cases
   - Golden example references

### Step 3: Locate Golden Examples

1. **Find golden files** in the spec's category directory:
   ```
   shared/tools/{category}/{tool-name}.*.input.json
   shared/tools/{category}/{tool-name}.*.output.json
   ```

2. **If no golden files found**:
   > WARN: "No golden examples found. Tests will be incomplete."

### Step 4: Generate Implementations

Act as the **tool-implementer**:

#### Python Implementation (unless --typescript-only)

1. **Create implementation file**:
   ```
   services/debrief-calc/src/debrief_calc/tools/{category}/{tool_name}.py
   ```

2. **Create test file**:
   ```
   services/debrief-calc/tests/tools/{category}/test_{tool_name}.py
   ```

3. **Verify Python syntax**:
   - Check file parses correctly
   - Verify imports resolve

#### TypeScript Implementation (unless --python-only)

1. **Create implementation file**:
   ```
   apps/vscode/src/tools/{category}/{toolName}.ts
   ```

2. **Create test file**:
   ```
   apps/vscode/src/tools/{category}/{toolName}.test.ts
   ```

3. **Verify TypeScript syntax**:
   - Check file parses correctly
   - Verify imports resolve

### Step 5: Basic Validation

If golden examples exist:

1. **Run Python implementation** against first golden example
2. **Run TypeScript implementation** against first golden example
3. **Compare outputs** to expected

Report any discrepancies but don't fail - full verification is done by `/tool.verify`.

### Step 6: Report Completion

```markdown
## Implementation Generated

**Tool**: {tool-name}
**Category**: {category}
**Spec**: `shared/tools/{category}/{tool-name}.{version}.md`

### Files Created

#### Python
- `services/debrief-calc/src/debrief_calc/tools/{category}/{tool_name}.py`
- `services/debrief-calc/tests/tools/{category}/test_{tool_name}.py`

#### TypeScript
- `apps/vscode/src/tools/{category}/{toolName}.ts`
- `apps/vscode/src/tools/{category}/{toolName}.test.ts`

### Basic Validation

| Language | Status | Notes |
|----------|--------|-------|
| Python | {PASS/FAIL/SKIP} | {notes} |
| TypeScript | {PASS/FAIL/SKIP} | {notes} |

### Next Steps

1. Review the generated implementations
2. Run full test suite for each language
3. Run `/tool.verify {tool-name}` for comprehensive validation
```

## Error Handling

| Error | Action |
|-------|--------|
| Spec not found | ERROR: "Run /tool.spec first" |
| Directory doesn't exist | Create directory structure |
| Parse error in generated code | ERROR with details |
| Import resolution fails | WARN with guidance |
| Golden example missing | WARN and continue |

## Generated Code Quality

Implementations must:
- Follow project code style
- Include proper type hints (Python) / types (TypeScript)
- Handle all edge cases from spec
- Include docstrings/JSDoc comments
- Reference the spec file in header comments
- Pass basic syntax/parse validation

## Example Session

```
User: /tool.implement set-track-color