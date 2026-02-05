---
description: Verify tool implementations against golden I/O examples using floating-point tolerant comparison.
---

## User Input

```text
$ARGUMENTS
```

## Purpose

This command verifies that Python and TypeScript implementations produce correct output by running them against golden I/O examples and comparing results with floating-point tolerance. It ensures behavioral equivalence across implementations.

## Agent Reference

| Role | Agent File |
|------|------------|
| Validator | `.claude/agents/tools/golden-example-validator.md` |

**Read the agent file** to understand validation protocols and comparison rules.

## Invocation

```
/tool.verify {tool-name} [--epsilon=1e-9] [--python-only] [--typescript-only] [--verbose]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| tool-name | Yes | - | Tool identifier (e.g., `set-track-color`) |
| --epsilon | No | 1e-9 | Floating-point comparison tolerance |
| --python-only | No | false | Verify only Python implementation |
| --typescript-only | No | false | Verify only TypeScript implementation |
| --verbose | No | false | Include full JSON in failure reports |

## Execution Flow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- **tool-name**: Required, kebab-case identifier
- **--epsilon**: Optional, floating-point tolerance
- **--python-only**: Optional flag
- **--typescript-only**: Optional flag
- **--verbose**: Optional flag

If no tool-name provided:
> "Please provide a tool name, e.g., `/tool.verify set-track-color`"

### Step 2: Locate Specification

1. **Search for spec file** in `shared/tools/`:
   ```
   shared/tools/**/{tool-name}.*.md
   ```

2. **If not found**:
   > "Specification not found for '{tool-name}'. Run `/tool.spec {tool-name}` first."

3. **Extract category** from spec file location

### Step 3: Locate Golden Examples

1. **Find golden files** in the spec's category directory:
   ```
   shared/tools/{category}/{tool-name}.*.input.json
   shared/tools/{category}/{tool-name}.*.output.json
   ```

2. **Group by example name**:
   - Parse filename: `{tool-name}.{example-name}.{input|output}.json`
   - Ensure each example has both input and output files

3. **If no golden files found**:
   > ERROR: "No golden examples found. Create golden I/O files first using the Java harness."

### Step 4: Locate Implementations

1. **Python implementation**:
   ```
   services/debrief-calc/src/debrief_calc/tools/{category}/{tool_name}.py
   ```

2. **TypeScript implementation**:
   ```
   apps/vscode/src/tools/{category}/{toolName}.ts
   ```

3. **Report missing implementations**:
   - If neither found: ERROR with guidance to run `/tool.implement`
   - If one missing: WARN and continue with available implementation

### Step 5: Run Verification

Act as the **golden-example-validator**:

For each golden example:

#### Python Verification (unless --typescript-only)

1. **Load input JSON**
2. **Execute Python implementation**:
   ```python
   from debrief_calc.tools.{category}.{tool_name} import {tool_name_snake}
   result = {tool_name_snake}(input_data, parameters)
   ```
3. **Capture output as JSON**
4. **Compare to expected output** using epsilon tolerance

#### TypeScript Verification (unless --python-only)

1. **Load input JSON**
2. **Execute TypeScript implementation**:
   ```typescript
   import { {toolNameCamel} } from './tools/{category}/{toolName}';
   const result = {toolNameCamel}(inputData, parameters);
   ```
3. **Capture output as JSON**
4. **Compare to expected output** using epsilon tolerance

### Step 6: Cross-Implementation Comparison

If both implementations were tested:

1. **Compare Python output to TypeScript output** for each example
2. **Report any behavioral differences** between implementations
3. **Flag as WARNING** if implementations produce different (but individually correct) results

### Step 7: Generate Verification Report

```markdown
# Verification Report: {tool-name}

**Date**: {timestamp}
**Epsilon**: {epsilon}
**Examples Tested**: {count}

## Summary

| Status | Count |
|--------|-------|
| PASS | {pass_count} |
| FAIL | {fail_count} |
| SKIP | {skip_count} |

**Overall**: {PASS | FAIL}

## Results

| Example | Python | TypeScript | Cross-Check | Status |
|---------|--------|------------|-------------|--------|
| basic | PASS | PASS | MATCH | PASS |
| empty | PASS | PASS | MATCH | PASS |
| edge-1 | FAIL | PASS | N/A | FAIL |

## Failures

### Example: edge-1

**Implementation**: Python

**Path**: `.content[0].annotations["debrief:value"]`

**Expected**:
```json
1.5
```

**Actual**:
```json
1.500000001
```

**Difference**: Numeric value differs by 1e-9 (tolerance: {epsilon})

---

## Cross-Implementation Comparison

| Example | Python vs TypeScript | Notes |
|---------|---------------------|-------|
| basic | MATCH | Identical outputs |
| edge-1 | MISMATCH | Python differs at .content[0] |

## Recommendations

1. edge-1: Check Python implementation precision handling
2. Consider increasing epsilon if differences are acceptable

## Next Steps

- Fix failing implementations
- Re-run `/tool.verify {tool-name}` after fixes
- If all pass, implementation is ready for review
```

## Comparison Rules

### Floating-Point Comparison

```python
def numbers_equal(expected: float, actual: float, epsilon: float = 1e-9) -> bool:
    if expected == 0:
        return abs(actual) < epsilon
    return abs(expected - actual) / abs(expected) < epsilon
```

### Structure Comparison

| Type | Rule |
|------|------|
| Object | All keys must match, values compared recursively |
| Array | Order matters, element-by-element comparison |
| String | Exact match required |
| Number | Use epsilon tolerance |
| Boolean | Exact match required |
| Null | `null` matches `null` only |

### Path Notation

Report differences using JSON path notation:
- `.field` - Object property
- `[0]` - Array index
- `.field[0].nested` - Combined path

Example: `.content[0].annotations["debrief:resultType"]`

## Error Handling

| Error | Action |
|-------|--------|
| No golden examples | ERROR: "Create golden I/O files first" |
| No implementations | ERROR: "Run /tool.implement first" |
| One implementation missing | WARN and verify available one |
| Runtime error | Mark as ERROR, include error message |
| JSON parse error | Mark as ERROR, include parse details |
| Timeout (>30s) | Mark as ERROR, suggest optimization |

## Verification Outcomes

| Outcome | Meaning |
|---------|---------|
| PASS | Output matches expected within tolerance |
| FAIL | Output differs from expected |
| SKIP | Implementation or golden file not found |
| ERROR | Runtime error during execution |

### Overall Status

- **PASS**: All examples pass for all tested implementations
- **FAIL**: Any example fails for any implementation

## Example Session

```
User: /tool.verify set-track-color

Claude: Running verification for 'set-track-color'...

Found specification: shared/tools/format/set-track-color.v1.md
Found 3 golden examples: basic, empty, multi-track
Found implementations: Python ✓, TypeScript ✓

Running verification with epsilon=1e-9...

# Verification Report: set-track-color

**Date**: 2026-02-05T14:30:00Z
**Epsilon**: 1e-9
**Examples Tested**: 3

## Summary

| Status | Count |
|--------|-------|
| PASS | 3 |
| FAIL | 0 |
| SKIP | 0 |

**Overall**: PASS ✓

## Results

| Example | Python | TypeScript | Cross-Check | Status |
|---------|--------|------------|-------------|--------|
| basic | PASS | PASS | MATCH | PASS |
| empty | PASS | PASS | MATCH | PASS |
| multi-track | PASS | PASS | MATCH | PASS |

All implementations verified successfully!
```

## Integration with Workflow

This command is typically run after `/tool.implement`:

1. `/tool.discover` - Find tools to migrate
2. `/tool.spec {tool}` - Create specification
3. `/tool.implement {tool}` - Generate implementations
4. **`/tool.verify {tool}`** - Verify correctness ← You are here

After verification passes, the tool migration is complete.
