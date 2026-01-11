# API Contracts: SpecKit UI Workflow Enhancement

**Feature**: 004-speckit-ui-workflow

## No API Contracts

This feature is a **tooling enhancement** that modifies markdown templates and Claude Code command definitions. It does not expose any programmatic APIs, REST endpoints, GraphQL schemas, or other machine interfaces.

### What This Feature Modifies

| File | Type | Description |
|------|------|-------------|
| `.specify/templates/spec-template.md` | Template | Markdown template for feature specifications |
| `.claude/commands/speckit.specify.md` | Command | Claude Code command definition |

### Why No Contracts

- **No HTTP APIs**: This is not a web service
- **No CLI interface**: No command-line arguments exposed
- **No library exports**: No functions/classes for programmatic use
- **No data exchange**: No structured data formats to document

### Human Interface

The "interface" for this feature is the natural language interaction with Claude Code:

```
User: /speckit.specify Create a file upload dialog
Claude: [Generates spec with UI section]

User: /speckit.specify Create a file parser service
Claude: [Generates spec without UI section]
```

This interaction is documented in the spec and quickstart, not as a formal API contract.
