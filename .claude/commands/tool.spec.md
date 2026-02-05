---
description: Generate a language-neutral tool specification from Legacy Debrief Java source and golden examples.
---

## User Input

```text
$ARGUMENTS
```

## Purpose

This command creates a language-neutral specification for a Legacy Debrief tool. It analyzes the Java source to extract the algorithm, references golden I/O examples, and produces a complete specification following the TEMPLATE.md format.

## Agent References

| Role | Agent File |
|------|------------|
| Java Analyst | `.claude/agents/tools/legacy-tool-analyst.md` |
| Spec Author | `.claude/agents/tools/tool-spec-author.md` |

**Read these agent files** to understand algorithm extraction and specification writing protocols.

## Invocation

```
/tool.spec {tool-name} [--golden path/to/*.json] [--category category/path] [--java-class fully.qualified.ClassName]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| tool-name | Yes | - | Tool identifier (e.g., `set-track-color`) |
| --golden | No | Auto-detect | Path pattern to golden example files |
| --category | No | From discovery | Category path (e.g., `track/styling`) |
| --java-class | No | From discovery | Java class to analyze |

## Execution Flow

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- **tool-name**: Required, kebab-case identifier
- **--golden**: Optional glob pattern for golden files
- **--category**: Optional category override
- **--java-class**: Optional Java class override

If no tool-name provided:
> "Please provide a tool name, e.g., `/tool.spec set-track-color`"

### Step 2: Locate Tool Information

1. **Check discovery report** at `docs/tool-migration/discovery-report.md`:
   - Find the tool by name
   - Extract category and Java class if not provided

2. **If no discovery report** or tool not found:
   - Require `--java-class` argument
   - Infer category from package name

3. **Locate golden examples**:
   - If `--golden` provided, use that pattern
   - Otherwise, look for `shared/tools/{category}/{tool-name}.*.json`
   - If no golden files found, warn user

### Step 3: Analyze Java Source

Act as the **legacy-tool-analyst**:

1. **Read the Java class** source file
2. **Identify the main execution method**
3. **Extract algorithm logic**:
   - Data flow from input to output
   - Loop structures and conditionals
   - Mathematical operations
4. **Convert to pseudocode** following the style guide
5. **Identify input/output types** from method signatures
6. **Extract edge cases** from error handling and null checks

### Step 4: Write Specification

Act as the **tool-spec-author**:

1. **Create specification file** at:
   ```
   shared/tools/{category}/{tool-name}.1.0.md
   ```

2. **Fill all 9 sections**:
   - Metadata (YAML frontmatter)
   - MCP (LLM description)
   - Inputs (schema references)
   - Outputs (ToolResponse structure)
   - Algorithm (pseudocode)
   - Edge Cases (boundary conditions)
   - Examples (golden file references)
   - Changelog (initial version)
   - References (Java class, related tools)

3. **Validate against TEMPLATE.md**:
   - Ensure all required sections present
   - Check schema references are valid
   - Verify golden file paths exist

### Step 5: Report Completion

```markdown
## Specification Created

**Tool**: {tool-name}
**Category**: {category}
**Version**: 1.0
**File**: `shared/tools/{category}/{tool-name}.1.0.md`

### Summary

- **Algorithm**: {brief description}
- **Inputs**: {input types}
- **Outputs**: {output type}
- **Golden Examples**: {count} examples referenced

### Golden Examples

| Example | Input | Output |
|---------|-------|--------|
| basic | {tool-name}.basic.input.json | {tool-name}.basic.output.json |
| ... | ... | ... |

### Next Steps

1. Review the generated specification
2. Verify algorithm pseudocode matches expected behavior
3. Run `/tool.implement {tool-name}` to generate implementations

### Missing Golden Examples

{If no golden files found}
> No golden examples found. To capture golden I/O:
> 1. Use the Java harness template in `docs/tool-migration/java-harness-template/`
> 2. Place output files in `shared/tools/{category}/`
> 3. Re-run `/tool.spec {tool-name}` to link examples
```

## Error Handling

| Error | Action |
|-------|--------|
| Tool not found in discovery | Require --java-class |
| Java class not found | ERROR with path suggestion |
| No algorithm detected | WARN: "Tool appears to be UI-only" |
| Golden files missing | WARN and proceed (examples section incomplete) |
| Category not determinable | Require --category |

## Example Session

```
User: /tool.spec set-track-color --golden shared/tools/track/styling/set-track-color.*.json