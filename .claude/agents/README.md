# Claude Agents

This directory contains agent definitions for specialized subagents that can be invoked via the Task tool.

## Structure

```
agents/
├── README.md           # This file
├── backlog/            # Backlog management agents
│   ├── the-ideas-guy.md        # Product Strategist (owns STRATEGY.md, oversees backlog)
│   ├── opportunity-scout.md    # Identifies features, capabilities, tech debt
│   ├── backlog-prioritizer.md  # Scores and ranks backlog items
│   └── defector.md             # Handles bug reports, creates GitHub issues
├── media/              # Media & communications agents
│   ├── content.md      # Content Specialist (blog posts, LinkedIn)
│   ├── jekyll.md       # Jekyll Specialist (site structure, templates)
│   └── technical.md    # Technical Specialist (specs, docs, diagrams)
└── website/            # Cross-repo website publishing agents
    └── publisher.md    # Executes cross-repo PRs to debrief.github.io
```

## Usage

### Backlog Agents

The backlog agents manage `BACKLOG.md` and `STRATEGY.md` at the repository root.

**The Ideas Guy** — Product Strategist who generates ideas and maintains strategy:
- "Ideas guy, what should we build next?"
- "Generate ideas for the 'demonstrate value' theme"
- "Review the backlog and update STRATEGY.md for the new phase"
- "Ideas guy, should we park this opportunity or add it to backlog?"

The Ideas Guy owns `STRATEGY.md`, generates strategic ideas, and makes judgment calls on prioritisation. Unlike the scout (who explores code), the ideas guy thinks about strategic gaps, demo-ability, and stakeholder needs.

**Opportunity Scout** — Invoke when you want to identify new work:
- "Use the opportunity-scout to explore the codebase for tech debt"
- "Have the scout flesh out ideas around map visualization"
- "Scout, what opportunities do you see in the io service?"

The scout filters opportunities against `STRATEGY.md` before proposing them to the backlog.

**Backlog Prioritizer** — Invoke when items need scoring:
- "Use the backlog-prioritizer to score the new items"
- "Prioritizer, re-evaluate items in light of the new architecture decision"
- "Score and reorder the backlog"

The prioritizer uses scoring guidance from `STRATEGY.md` to interpret dimensions in context.

**Defector** — Invoke when something is broken:
- "Use defector to handle this bug report"
- "The Tools panel is empty [screenshot]"
- "Defector, investigate why X isn't working"

The defector investigates bugs, creates GitHub issues with root cause analysis, and adds entries to `BACKLOG.md` linking to the issue. It documents defects but doesn't fix them.

### End-to-End Workflow

The complete flow from idea to implementation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKLOG → SPECKIT WORKFLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. IDEATION (parallel)                                             │
│     the-ideas-guy ──generates──> strategic ideas ───┐               │
│     opportunity-scout ──explores──> technical items ┼──> BACKLOG.md │
│     human ──────────────────────────────────────────┘   (proposed)  │
│                                                                     │
│  2. SCORING (backlog-prioritizer)                                   │
│     scores V/M/A for proposed items                                 │
│                                                                     │
│  3. APPROVAL (the-ideas-guy reviews scored items)                   │
│        ├── Approve → status: approved                               │
│        ├── Park → STRATEGY.md Parking Lot                           │
│        └── Reject → STRATEGY.md Rejected Log                        │
│                                                                     │
│  4. SPECIFICATION                                                   │
│     /speckit.start {ID} ──────> requires status: approved           │
│                                 creates spec, status → specified    │
│                                                                     │
│  5. DESIGN (Commands)                                               │
│     /speckit.clarify ─────────> resolves ambiguities                │
│     /speckit.plan ────────────> creates implementation plan         │
│     /speckit.tasks ───────────> breaks down into tasks              │
│                                                                     │
│  6. BUILD (Commands)                                                │
│     /speckit.implement ───────> executes tasks, captures evidence   │
│     /speckit.pr ──────────────> creates PR + publishes blog         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key roles:**
- **the-ideas-guy**: Initiates strategic ideas AND approves items for speckit (changes status to `approved`)
- **opportunity-scout**: Explores code for technical opportunities (light filtering only)
- **backlog-prioritizer**: Scores items mechanically (V/M/A)

**Status progression**: `proposed` → (scored) → `approved` → `specified` → ... → `complete`

### Media Agents

These agents are coordinated via the `/media` command (`.claude/commands/media.md`).

### Website Agents

The website agents handle cross-repository publishing to `debrief/debrief.github.io`.

**Publisher** — Executes the cross-repo PR workflow:
- Invoked via the `/publish` skill
- Clones the website repo to a temp directory
- Transforms content (front matter, image paths)
- Creates PRs for review

The publisher is typically invoked automatically by `/publish` or `/speckit.pr`, but can be used directly via the Task tool for custom publishing workflows.

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
