---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
handoffs:
  - label: Create Pull Request
    agent: speckit.pr
    prompt: Create PR with evidence from implementation
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. **Verify prerequisites**:
   - Confirm tasks.md exists in FEATURE_DIR
   - Check that spec.md and plan.md exist for context
   - Verify we're on the correct feature branch

3. **Load implementation context**:
   - Read spec.md for feature goals and acceptance criteria
   - Read plan.md for technical approach and architecture
   - Read tasks.md for the task breakdown
   - Read BACKLOG.md to determine feature complexity and model selection

3a. **Determine model for implementation**:

   Read BACKLOG.md and find the row matching the current feature (by ID or description link).
   Extract the **Complexity** column value and map to model:

   | Complexity | Model | When to Use |
   |------------|-------|-------------|
   | **Low** | `haiku` | Config changes, simple validations, documentation, well-defined patterns |
   | **Medium** | `sonnet` | New endpoints, schema additions, integration work, standard features |
   | **High** | `opus` | Architecture changes, multi-service features, novel algorithms, complex design |

   **Usage**: When spawning Task agents for implementation work, pass the `model` parameter:
   ```
   Task tool with model: "{model}" based on complexity
   ```

   If complexity is not specified in BACKLOG.md, default to `sonnet`.

4. **Parse task structure** from tasks.md:
   - **Phase identification**: Setup, Foundation, User Stories, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers [P]
   - **Execution flow**: Order and dependency requirements
   - **Evidence requirements**: Check for Evidence Requirements section and note what artifacts to capture
   - **Slash command tasks**: Identify tasks containing `: run /` pattern

5. **Understand task types**:
   - **File creation tasks**: Have backtick paths, create/modify files
   - **Test tasks**: Marked with `[test]`, verify behavior
   - **Parallel tasks**: Marked with `[P]`, can run concurrently within phase
   - **Evidence tasks**: Create artifacts in `evidence/` directory
   - **Media tasks**: Create content in `media/` directory
   - **Slash command tasks**: Contain `: run /command`, execute the specified command

6. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the next
   - **Sequential tasks**: Execute in order, respecting dependencies
   - **Parallel tasks [P]**: Can be executed together within the same phase
   - **Test tasks [test]**: Run tests to verify implementation
   - **Slash command tasks**: Execute the specified command (see Slash Command Execution below)

7. **Implementation patterns by task type**:
   - **Setup tasks**: Project scaffolding, configuration files, directory structure
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Unit tests, performance optimization, documentation
   - **Evidence collection**: During Polish phase, capture evidence artifacts as specified in tasks.md:
     - Create `FEATURE_DIR/evidence/` directory
     - Capture test-summary.md with test results
     - Create usage-example.md demonstrating the feature
     - Capture any feature-specific artifacts (screenshots, API samples, CLI output, etc.)
   - **Media content**: Create blog posts and LinkedIn summaries using Content Specialist agent

8. Progress tracking and error handling:
   - Report progress after each completed task
   - Mark tasks complete in tasks.md by changing `- [ ]` to `- [x]`
   - On errors: Document the issue, attempt resolution, or flag for user input
   - For blocking issues: Stop and report clearly what's needed

9. **Final verification**:
   - Run all tests to confirm implementation works
   - Verify all acceptance criteria from spec.md are met
   - Confirm the implementation follows the technical plan
   - Report final status with summary of completed work

10. **Evidence verification and PR preparation**:
    - Verify evidence directory exists: `FEATURE_DIR/evidence/`
    - Check that required evidence files are present:
      - `evidence/test-summary.md` - REQUIRED
      - `evidence/usage-example.md` - REQUIRED
      - Feature-specific artifacts as defined in tasks.md
    - Verify media directory exists: `FEATURE_DIR/media/`
    - Check that required media files are present:
      - `media/shipped-post.md` - REQUIRED
      - `media/linkedin-shipped.md` - REQUIRED
    - If evidence or media is missing, WARN the user and recommend completing those tasks
    - If all evidence and media is present:
      - Commit any uncommitted changes
      - Push to the feature branch
      - Execute the final PR creation task (if present in tasks.md)

## Slash Command Task Execution

Some tasks invoke slash commands rather than creating files. These tasks have the format:

```markdown
- [ ] TXXX Description: run /command-name
```

### Recognizing Slash Command Tasks

A task is a slash command task if the description contains `: run /` followed by a command name.

Examples:
- `Create PR and publish blog: run /speckit.pr` → execute `/speckit.pr`
- `Generate documentation: run /docs.generate` → execute `/docs.generate`

### Execution Process

When you encounter a slash command task:

1. **Complete all prerequisite tasks first**
   - Slash command tasks typically depend on evidence and media content being ready
   - Verify all earlier tasks in the phase are complete

2. **Extract the command**
   - Parse the command name after `run /`
   - Example: `"Create PR and publish blog: run /speckit.pr"` → `/speckit.pr`

3. **Execute the command**
   - Invoke it as if the user typed it directly
   - For `/speckit.pr`: This creates the feature PR and publishes the blog post
   - The command will perform its full workflow and return results

4. **Capture the output**
   - Store any URLs, status messages, or results returned by the command
   - These become part of the implementation report

5. **Mark task complete**
   - Change `- [ ]` to `- [x]` in tasks.md after successful execution

6. **Report the results**
   - Include command output in your progress report
   - For `/speckit.pr`, report both PR URLs:
     ```
     ✅ Feature PR: https://github.com/debrief/debrief-future/pull/XX
     ✅ Blog PR: https://github.com/debrief/debrief.github.io/pull/YY
     ```

### Example Execution

```markdown
Task in tasks.md:
- [ ] T507 Create PR and publish blog: run /speckit.pr

Execution steps:
1. Verify T501-T506 are complete (evidence + media tasks)
2. Parse command: /speckit.pr
3. Execute /speckit.pr
4. Command output:
   ✅ Feature PR created: https://github.com/debrief/debrief-future/pull/12
   ✅ Blog PR created: https://github.com/debrief/debrief.github.io/pull/24
5. Update tasks.md:
   - [x] T507 Create PR and publish blog: run /speckit.pr
6. Report to user with both URLs
```

### Error Handling for Slash Commands

| Error | Action |
|-------|--------|
| Command not found | Report error, mark task as blocked |
| Command fails partially | Report what succeeded, what failed |
| Prerequisites missing | List missing prerequisites, do not execute |
| Network/auth errors | Report error, suggest manual retry |

**Important:** 
- Never skip slash command tasks — they complete the workflow
- Order matters — PR task must run after all evidence and media tasks
- Partial success is acceptable — if blog publishing fails but feature PR succeeds, report both and continue

## Task Execution Guidelines

**Model Selection**: When spawning Task agents (e.g., for Content Specialist, technical implementation), always pass the `model` parameter based on the complexity determined in step 3a. This ensures appropriate reasoning depth for each task.

### File Creation Tasks

For tasks with file paths in backticks:
```markdown
- [ ] T001 Create parser module `src/debrief_io/parser.py`
```

1. Create the file at the specified path
2. Implement the functionality described
3. Follow patterns established in plan.md
4. Mark complete when file exists and is functional

### Test Tasks

For tasks marked with `[test]`:
```markdown
- [ ] T015 [test] Write parser unit tests `tests/test_parser.py`
```

1. Create test file with comprehensive test cases
2. Cover happy path and edge cases
3. Run tests to verify they pass
4. Mark complete when all tests pass

### Parallel Tasks

For tasks marked with `[P]`:
```markdown
- [ ] T002 [P] Add type definitions `src/types.py`
- [ ] T003 [P] Add constants `src/constants.py`
```

These can be executed in any order or simultaneously within the same phase.

### Evidence Tasks

For tasks in the evidence collection section:
```markdown
- [ ] T401 Capture test results in specs/002-debrief-io/evidence/test-summary.md
```

1. Run the relevant tests or commands
2. Capture the output in the specified format
3. Save to the evidence directory
4. Mark complete when file exists with valid content

### Media Tasks

For tasks creating blog posts or social content:
```markdown
- [ ] T405 Create shipped blog post in specs/002-debrief-io/media/shipped-post.md
```

1. Read Content Specialist agent from `.claude/agents/media/content.md`
2. Spawn Content Specialist via Task tool
3. Provide feature context from spec.md and evidence/
4. Generate content following the Shipped Post template
5. Save to media directory
6. Mark complete when file exists with valid front matter

## Completion Report

After all tasks are complete, provide a summary:

```markdown
## Implementation Complete

### Tasks Completed
- Phase 1 (Setup): X/X tasks
- Phase 2 (Foundation): X/X tasks
- Phase 3 (User Story 1): X/X tasks
- Phase N (Polish): X/X tasks

### Evidence Captured
- test-summary.md ✓
- usage-example.md ✓
- [feature-specific artifacts] ✓

### Media Content Created
- shipped-post.md ✓
- linkedin-shipped.md ✓

### PRs Created
- Feature PR: [URL]
- Blog PR: [URL]

### Next Steps
1. Review and merge the feature PR
2. Review and merge the blog PR
3. Post LinkedIn summary after blog is live
```

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/speckit.tasks` first to regenerate the task list.
