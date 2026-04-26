---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs:
  - label: Review Plan
    agent: speckit.review
    prompt: Review the plan before task generation
    send: true
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

4. **Cache opening context**: After design artifacts are complete, capture the opener for the eventual feature post:
   - Read the Content Specialist agent definition from `.claude/agents/media/content.md`
   - Use the Task tool with `subagent_type: "general-purpose"` to spawn the Content Specialist
   - Provide the specialist with:
     - Feature name and goal from spec.md
     - Key technical decisions from research.md
     - Architecture overview from plan.md
     - Media Components table from plan.md (Storybook stories, if any)
   - Request the cached opener — four sections (`## Hook`, `## What We're Building`, `## How It Fits`, `## Key Decisions`), no front matter, matching the contract in the agent definition. The Hook form (screenshot / mermaid / bullets / before-after) is chosen at planning time so the post has a deliberate opener, not an improvised one.
   - Save to `FEATURE_DIR/evidence/opening-context.md` (create the `evidence/` directory if missing)

5. **Stop and report**: Command ends after planning. Report branch, IMPL_PLAN path, generated artifacts, and the cached opener path.

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

### Phase 1.5: Media Components Assessment

**Prerequisites:** Phase 1 complete (design artifacts exist)

**Purpose**: Identify Storybook stories to bundle for blog post demos. This enables interactive component demos in feature posts.

1. **Scan for Storybook stories** related to the feature:
   - Check for `.stories.tsx` files in the feature scope
   - Look for components mentioned in spec.md
   - Check if the feature creates or modifies visual components

2. **Apply inclusion criteria**:
   - New visual component? → Include
   - Significant visual change? → Include
   - Interactive demo adds narrative value? → Include
   - Backend-only / minor UI tweak / no story? → Exclude

3. **Verify bundleability** for each candidate:
   - Existing Storybook story exists
   - Component can render standalone (no app context required)
   - Reasonable bundle size expected (< 500KB)

4. **Populate Media Components section** in plan.md:
   - Fill table with component name, story source, bundle name, purpose
   - Check applicable inclusion criteria checkboxes
   - Add permanent Storybook link for each component

5. **Get author confirmation** if components identified:
   - Present the Media Components section
   - Allow author to modify or decline suggestions
   - If no components identified, write "None - backend/infrastructure feature"

**Output**: plan.md with Media Components section populated (or marked as N/A)

### Phase 2: Opening Context Capture

**Prerequisites:** Phase 1 complete (design artifacts exist)

1. **Create evidence directory**: `mkdir -p FEATURE_DIR/evidence/`

2. **Spawn Content Specialist** via Task tool:
   - Read `.claude/agents/media/content.md` for agent definition (Cached Opening Context section + "The Hook" guidance)
   - Provide context:
     ```text
     Feature: [name from spec.md]
     Goal: [goal statement from spec.md]
     Key Decisions: [from research.md]
     Architecture: [summary from plan.md]
     Media Components: [from plan.md "Media Components" section, if populated — list of Storybook stories]
     Audience: DSTL scientists, potential contributors, defence maritime analysis community
     ```
   - Request: "Write the cached opener — four sections: Hook, What We're Building, How It Fits, Key Decisions. Prose only, no front matter, no feedback solicitation. For the Hook, choose the form (screenshot path / mermaid diagram / capability bullets / before/after table) best suited to this feature; if a screenshot is the right answer, predict the path it will live at after evidence collection."

3. **Write cached opener**: Save to `FEATURE_DIR/evidence/opening-context.md`
   - Four sections with `##` headings: `## Hook`, `## What We're Building`, `## How It Fits`, `## Key Decisions`
   - No YAML front matter
   - Use the template at `.specify/templates/evidence/opening-context-template.md` as the structural reference

**Output**: evidence/opening-context.md

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
