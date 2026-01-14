---
description: Generate a detailed task breakdown from spec.md and plan.md. Creates tasks.md with phased implementation checklist including evidence collection, media content, and PR creation.
handoffs:
  - label: Implement Tasks
    agent: speckit.implement
    prompt: Execute the generated task plan
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json --require-plan --include-plan` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. **Read plan.md** from FEATURE_DIR for implementation approach and architecture.

3. **Read spec.md** from FEATURE_DIR for user stories and acceptance criteria.

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - **Evidence Requirements section** (see Evidence Planning Rules below)
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (if requested), implementation tasks
   - Final Phase: Polish & cross-cutting concerns (MUST include evidence collection, media content, AND PR creation tasks)
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
   - **PR task included**: Confirm final task triggers /speckit.pr
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)

Context for task generation: $ARGUMENTS

## Task Generation Rules

### Strict Checklist Format

Every task MUST strictly follow this format:

```
- [ ] T### [optional-labels] Description `path/to/file.ext`
```

Components:
- `- [ ]` — Markdown checkbox (required)
- `T###` — Task ID with 3-digit number (required, e.g., T001, T042, T100)
- `[labels]` — Optional labels in square brackets:
  - `[P]` — Can run in parallel with other [P] tasks in same phase
  - `[test]` — Test task
  - `[P][test]` — Parallel test task
- Description — Brief description of what to do
- `` `path` `` — File path in backticks (required for file-creating tasks)

### Valid Examples

```markdown
- [ ] T001 Create project structure `src/debrief_io/__init__.py`
- [ ] T002 [P] Add type definitions `src/debrief_io/types.py`
- [ ] T003 [P] Add constants `src/debrief_io/constants.py`
- [ ] T004 [test] Write parser unit tests `tests/test_parser.py`
- [ ] T005 [P][test] Write validator tests `tests/test_validator.py`
```

### Invalid Examples (DO NOT USE)

```markdown
- [ ] Create project structure  ❌ Missing task ID
- [ ] T1 Create structure       ❌ Task ID must be 3 digits
- [ ] T001: Create structure    ❌ No colon after task ID
- T001 Create structure         ❌ Missing checkbox
- [ ] T001 Create structure     ❌ Missing file path for file task
```

### Phase Order

- **Phase 1**: Setup (project scaffolding, config files)
- **Phase 2**: Foundation (shared code that blocks all stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns (MUST include evidence collection, media content, AND PR creation)

## Evidence Planning Rules

**Purpose**: Plan artifacts that demonstrate the feature works. These are used in PR descriptions, documentation, and blog posts.

### Evidence Directory Structure

```text
specs/[###-feature-name]/evidence/
├── test-summary.md     # REQUIRED: Test pass/fail counts, coverage
├── usage-example.md    # REQUIRED: Concrete usage demonstration
└── [feature-specific]  # Varies by feature type
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
| **Electron/Desktop App** | Runtime smoke test, app window screenshots, graceful error handling | `runtime-startup.png`, `runtime-workflow.png`, `e2e-trace.zip` |

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

6. **Runtime Verification Task** (REQUIRED for Electron/Desktop apps):
   ```markdown
   - [ ] TXXX Run app in dev mode and verify startup
   - [ ] TXXX [P] Capture runtime screenshot of actual app window
   - [ ] TXXX Verify app handles missing services gracefully (shows error, doesn't crash)
   ```
   Must run the actual application, not just Storybook/component tests. Verifies:
   - App launches without crashing
   - UI renders correctly in real Electron window
   - Error handling works when dependencies are unavailable

7. **PR Creation Task** (REQUIRED - must be final task):
   ```markdown
   - [ ] TXXX Create PR and publish blog: run /speckit.pr
   ```
   This task MUST be the final task in tasks.md. It:
   - Creates the feature PR in debrief-future
   - Publishes shipped-post.md to debrief.github.io
   - Returns both PR URLs for review

   **Dependencies:** All other tasks must be complete before this runs.

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

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |
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

## Complete Example: Polish Phase (CLI/Library)

After applying all rules, a generated Polish phase should look like:

```markdown
## Phase 5: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T501 Capture test results in specs/002-debrief-io/evidence/test-summary.md
- [ ] T502 Create usage demonstration in specs/002-debrief-io/evidence/usage-example.md
- [ ] T503 [P] Capture CLI demo in specs/002-debrief-io/evidence/cli-demo.txt
- [ ] T504 [P] Capture sample output in specs/002-debrief-io/evidence/sample-output.json

### Media Content

- [ ] T505 Create shipped blog post in specs/002-debrief-io/media/shipped-post.md
- [ ] T506 [P] Create LinkedIn shipped summary in specs/002-debrief-io/media/linkedin-shipped.md

### PR Creation

- [ ] T507 Create PR and publish blog: run /speckit.pr

**Task T507 must run last. It depends on all evidence and media tasks being complete.**
```

## Complete Example: Polish Phase (Electron/Desktop App)

For Electron apps, include runtime verification:

```markdown
## Phase 7: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T092 Capture test results in specs/004-loader/evidence/test-summary.md
- [ ] T093 Create usage demonstration in specs/004-loader/evidence/usage-example.md
- [ ] T094 [P] Capture Storybook screenshots in specs/004-loader/evidence/screenshots/

### Runtime Verification (REQUIRED for Electron apps)

- [ ] T095 Run Electron app in dev mode (`pnpm electron:dev`) and verify startup
- [ ] T096 [P] Capture runtime screenshot of actual Electron window
- [ ] T097 Verify app handles missing services gracefully (shows error, doesn't crash)

### Media Content

- [ ] T098 Create shipped blog post in specs/004-loader/media/shipped-post.md
- [ ] T099 [P] Create LinkedIn shipped summary in specs/004-loader/media/linkedin-shipped.md

### PR Creation

- [ ] T100 Create PR and publish blog: run /speckit.pr

**Task T100 must run last. Runtime verification ensures the app works beyond just component tests.**
```
