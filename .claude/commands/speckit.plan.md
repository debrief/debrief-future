---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs: 
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/setup-plan.sh --json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Media content - Planning Post**: After design artifacts are complete, create a planning announcement:
   - Read the Content Specialist agent definition from `.claude/agents/media/content.md`
   - Use the Task tool with `subagent_type: "general-purpose"` to spawn the Content Specialist
   - Provide the specialist with:
     - Feature name and goal from spec.md
     - Key technical decisions from research.md
     - Architecture overview from plan.md
   - Request a "Planning Post" following the template in the agent definition
   - Save the draft post to `FEATURE_DIR/media/planning-post.md`
   - Generate a LinkedIn summary and save to `FEATURE_DIR/media/linkedin-planning.md`

5. **Stop and report**: Command ends after planning. Report branch, IMPL_PLAN path, generated artifacts, and media content drafts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Agent context update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

### Phase 2: Media Content Creation

**Prerequisites:** Phase 1 complete (design artifacts exist)

1. **Create media directory**: `mkdir -p FEATURE_DIR/media/`

2. **Spawn Content Specialist** via Task tool:
   - Read `.claude/agents/media/content.md` for agent definition
   - Provide context:
     ```text
     Feature: [name from spec.md]
     Goal: [goal statement from spec.md]
     Key Decisions: [from research.md]
     Architecture: [summary from plan.md]
     Audience: DSTL scientists, potential contributors, defence maritime analysis community
     ```
   - Request: "Write a Planning Post announcing this feature"

3. **Generate planning post**: Save to `FEATURE_DIR/media/planning-post.md`
   - Must follow the Planning Post template from content.md
   - Include sections: What We're Building, How It Fits, Key Decisions, What We'd Love Feedback On

4. **Generate LinkedIn summary**: Save to `FEATURE_DIR/media/linkedin-planning.md`
   - 150-200 words, strong hook, link placeholder
   - Follow LinkedIn template from content.md

**Output**: media/planning-post.md, media/linkedin-planning.md

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
