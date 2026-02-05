---
description: Scan Legacy Debrief Java source to discover migrateable tools and produce an inventory report.
---

## User Input

```text
$ARGUMENTS
```

## Purpose

This command scans Legacy Debrief Java source code to identify tools that can be migrated to Future Debrief. It produces an inventory report listing discovered tools with their categories, complexity ratings, and migration recommendations.

## Agent Reference

| Role | Agent File |
|------|------------|
| Java Analyst | `.claude/agents/tools/legacy-tool-analyst.md` |

**Read the agent file** to understand tool identification patterns and complexity assessment criteria.

## Invocation

```
/tool.discover [path-to-java-source]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| path | No | (prompt user) | Path to Legacy Debrief Java source directory |

## Execution Flow

### Step 1: Parse Arguments

Extract the Java source path from `$ARGUMENTS`.

If no path provided:
> "Please provide the path to Legacy Debrief Java source, e.g., `/tool.discover /path/to/debrief/src`"

### Step 2: Validate Path

1. Check the path exists
2. Verify it contains Java files (*.java)
3. Look for characteristic Legacy Debrief packages:
   - `org/mwc/debrief/`
   - `org/mwc/cmap/`

If validation fails:
> "The path does not appear to contain Legacy Debrief Java source. Expected to find packages like org.mwc.debrief.* or org.mwc.cmap.*"

### Step 3: Discover Tools

Act as the **legacy-tool-analyst** (read `.claude/agents/tools/legacy-tool-analyst.md`):

1. **Scan for tool classes** using patterns from the agent:
   - Package patterns: `*.actions.*`, `*.tools.*`, `*.analysis.*`
   - Class patterns: `*Tool`, `*Action`, `*Analyzer`, `*Calculator`
   - Interface implementations: `IAction`, `AbstractAction`

2. **For each potential tool**:
   - Read the Java source file
   - Identify if it has algorithmic logic (not just UI)
   - Extract metadata (name, description, category)
   - Assess migration complexity

3. **Categorize tools** by type:
   - `track/styling` - Color, visibility, label formatting
   - `track/analysis` - CPA, range/bearing, interpolation
   - `measurement` - Distance, area, bearing calculations
   - `formatting` - Export, display formatting
   - `other` - Uncategorized tools

### Step 4: Generate Report

Create the discovery report at `docs/tool-migration/discovery-report.md`:

```markdown
# Tool Discovery Report

**Source**: {path}
**Date**: {timestamp}
**Tools Found**: {count}

## Summary

| Category | Count | Ready | Needs Review |
|----------|-------|-------|--------------|
| track/styling | X | X | X |
| track/analysis | X | X | X |
| measurement | X | X | X |

## Inventory

| Name | Category | Java Class | Complexity | Description |
|------|----------|------------|------------|-------------|
| ... | ... | ... | ... | ... |

## Recommendations

### Ready for Migration (Low complexity)
Tools that can be migrated with the standard workflow.

- **tool-name**: Brief description

### Needs Review (Medium/High complexity)
Tools that require additional analysis or may have dependencies.

- **tool-name**: Concern or dependency noted

### Out of Scope
Tools that cannot be migrated (UI-only, deprecated, etc.).

- **tool-name**: Reason excluded

## Next Steps

1. Select a tool from "Ready for Migration"
2. Capture golden I/O using the Java harness (see `docs/tool-migration/java-harness-template/`)
3. Run `/tool.spec {tool-name}` to generate a specification
```

### Step 5: Report Completion

```markdown
## Discovery Complete

**Tools Found**: {count}
**Ready for Migration**: {ready_count}
**Needs Review**: {review_count}
**Out of Scope**: {excluded_count}

**Report**: `docs/tool-migration/discovery-report.md`

### Recommended First Migration

{tool-name} ({category})
- Complexity: Low
- Description: {description}
- Command: `/tool.spec {tool-name}`

### Next Steps

1. Review the discovery report
2. For tools marked "Needs Review", analyze dependencies
3. Start migration with `/tool.spec {tool-name}` for a "Ready" tool
```

## Error Handling

| Error | Action |
|-------|--------|
| Path not found | ERROR with suggestion to check path |
| No Java files | ERROR: "No .java files found in {path}" |
| Not Legacy Debrief | WARN: "Path may not be Legacy Debrief source (missing expected packages)" |
| Read permission denied | ERROR with permission guidance |

## Example Session

```
User: /tool.discover /home/user/legacy-debrief/org.mwc.debrief.core/src