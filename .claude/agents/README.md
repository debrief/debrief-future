# Claude Agents

This directory contains agent definitions for specialized subagents that can be invoked via the Task tool.

## Structure

```
agents/
├── README.md           # This file
└── media/              # Media & communications agents
    ├── content.md      # Content Specialist (blog posts, LinkedIn)
    ├── jekyll.md       # Jekyll Specialist (site structure, templates)
    └── technical.md    # Technical Specialist (specs, docs, diagrams)
```

## Usage

These agents are coordinated via the `/media` command (`.claude/commands/media.md`).

### Direct Invocation

To use a specialist directly via the Task tool:

1. Read the agent definition file
2. Include its content in your Task tool prompt
3. Specify the subtask for the agent

### Via Coordinator

Use the `/media` slash command to invoke the coordinator, which will:
- Analyze your request
- Delegate to appropriate specialists
- Coordinate multi-specialist workflows
- Assemble final outputs

## Adding New Agents

1. Create a new `.md` file in the appropriate subdirectory
2. Define the agent's role, responsibilities, and guidelines
3. Update the coordinator command if the agent should be part of a workflow
4. Document the agent in this README
