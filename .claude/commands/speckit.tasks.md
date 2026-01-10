---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
handoffs: 
  - label: Analyze For Consistency
    agent: speckit.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speckit.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:
   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (API endpoints), research.md (decisions), quickstart.md (test scenarios)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map endpoints to user stories
   - If research.md exists: Extract decisions for setup tasks
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - **Evidence Requirements section** (see Evidence Planning Rules below)
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (if requested), implementation tasks
   - Final Phase: Polish & cross-cutting concerns (MUST include evidence collection AND media content tasks)
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

5. **Plan evidence artifacts**: Determine what evidence should be captured to demonstrate the feature works:
   - **Test evidence**: What test output/summary will prove correctness?
   - **Usage evidence**: What example demonstrates the feature in action?
   - **Feature-specific evidence**: Based on feature type:
     - CLI tools → Terminal session recordings, command output
     - APIs → Sample request/response JSON
     - UI components → Screenshots of key states
     - Data processing → Before/after data samples
     - Libraries → Code examples with output
   - Add specific evidence collection tasks to the Polish phase

6. **Report**: Output path to generated tasks.md and summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - **Evidence artifacts planned** (list what will be captured)
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)
   - Reminder: Run `/speckit.pr` after implementation to create PR with evidence

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label  
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Endpoints/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)

2. **From Contracts**:
   - Map each contract/endpoint → to the user story it serves
   - If tests requested: Each contract → contract test task [P] before implementation in that story's phase

3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns (MUST include evidence collection AND media content)

## Evidence Planning Rules

**Purpose**: Plan artifacts that demonstrate the feature works. These are used in PR descriptions, documentation, and blog posts.

### Evidence Directory Structure

```text
specs/[###-feature-name]/evidence/
├── test-summary.md      # REQUIRED: Test pass/fail counts, coverage
├── usage-example.md     # REQUIRED: Concrete usage demonstration
└── [feature-specific]   # Varies by feature type
```

### Determining Feature-Specific Evidence

Based on the feature type detected from spec.md and plan.md:

| Feature Type | Evidence to Plan | Example Files |
|--------------|------------------|---------------|
| **CLI Tool** | Command examples with output | `cli-demo.txt`, `help-output.txt` |
| **API/Service** | Request/response samples | `api-sample.json`, `endpoints.md` |
| **Library/SDK** | Code examples with results | `usage-example.py`, `output.txt` |
| **Data Processing** | Before/after samples | `input-sample.json`, `output-sample.json` |
| **UI Component** | Screenshots of states | `initial.png`, `completed.png` |
| **Parser/Converter** | Input/output file pairs | `sample-input.rep`, `parsed-output.json` |
| **Integration** | End-to-end flow demo | `integration-flow.md`, `sequence.mermaid` |

### Evidence Task Generation

For the Polish phase, ALWAYS generate these tasks:

1. **Test Summary Task** (REQUIRED):
   ```markdown
   - [ ] TXXX Capture test results in specs/[feature]/evidence/test-summary.md
   ```
   Content should include: total tests, passed, failed, coverage %, key scenarios.

2. **Usage Example Task** (REQUIRED):
   ```markdown
   - [ ] TXXX Create usage demonstration in specs/[feature]/evidence/usage-example.md
   ```
   Content should include: code/command example, expected output, explanation.

3. **Feature-Specific Tasks** (based on feature type):
   ```markdown
   - [ ] TXXX [P] Capture [specific artifact] in specs/[feature]/evidence/[filename]
   ```

4. **Shipped Post Task** (REQUIRED - for media announcement):
   ```markdown
   - [ ] TXXX Create shipped blog post in specs/[feature]/media/shipped-post.md
   ```
   Use Content Specialist agent (`.claude/agents/media/content.md`) to generate:
   - Shipped Post following the template
   - Include: What We Built, Screenshots (if applicable), Lessons Learned, What's Next

5. **LinkedIn Shipped Summary Task** (REQUIRED):
   ```markdown
   - [ ] TXXX [P] Create LinkedIn shipped summary in specs/[feature]/media/linkedin-shipped.md
   ```
   150-200 words, hook opening, link to full post

### Evidence Quality Guidelines

Good evidence should be:
- **Reproducible**: Others can follow the example and get the same result
- **Concise**: Shows the key behavior without unnecessary complexity
- **Visual when possible**: Screenshots, diagrams, or formatted output
- **Self-contained**: Includes all context needed to understand it

### Example Evidence Section in tasks.md

```markdown
## Evidence Requirements

**Evidence Directory**: `specs/002-debrief-io/evidence/`
**Media Directory**: `specs/002-debrief-io/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with 47 tests | After all tests pass |
| usage-example.md | Python code parsing REP file | After parser complete |
| cli-demo.txt | Terminal session showing parse command | After CLI works |
| sample-output.json | GeoJSON output from boat1.rep | After parsing works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |
```

## Media Content Rules

**Purpose**: Create blog posts and social content to announce planning and celebrate shipped features.

### Media Agents

Use the agents in `.claude/agents/media/` via the Task tool:

1. **Content Specialist** (`.claude/agents/media/content.md`):
   - Planning posts (announce what we're building)
   - Shipped posts (celebrate what we built)
   - LinkedIn summaries
   - Voice & tone guidelines

2. **Technical Specialist** (`.claude/agents/media/technical.md`):
   - Technical context for posts
   - Diagram descriptions
   - Architecture summaries

### Spawning Media Agents

To create media content, spawn a subagent via Task tool:

```text
Task tool call:
  subagent_type: "general-purpose"
  prompt: |
    You are the Content Specialist for Future Debrief.

    [Include full content of .claude/agents/media/content.md]

    Create a [Planning/Shipped] Post for:
    - Feature: [name]
    - Goal: [from spec.md]
    - Key accomplishments: [from evidence/]
    - Lessons learned: [notable challenges/decisions]
```
