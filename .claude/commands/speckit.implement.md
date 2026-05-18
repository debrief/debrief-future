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

3. **Load implementation context and update backlog status**:
   - Read spec.md for feature goals and acceptance criteria
   - Read plan.md for technical approach and architecture
   - Read tasks.md for the task breakdown
   - Read BACKLOG.md to determine feature complexity and model selection
   - Update the backlog row status to `implementing`
   - Commit: `chore(backlog): mark item {ID} as implementing`

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
     - Capture test-summary.md using the template at `.specify/templates/evidence/test-summary-template.md`:
       - Fill YAML front matter: `feature`, `captured_at` (ISO 8601), `git_sha` (current HEAD short SHA), `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`
       - Include test breakdown by suite, key scenarios verified, and known issues
     - Create usage-example.md demonstrating the feature
     - Capture feature-type-specific evidence per the Quality Rubric in `.specify/templates/tasks-template.md`:
       - UI Components: 3 theme screenshots (light/dark/vscode) + interaction GIF
       - CLI Tools: full terminal session transcript (`cli-demo.txt`)
       - APIs: sample request + response JSON
       - Parsers: input + output side-by-side
       - Schema changes: round-trip proof
     - For UI components: capture interaction GIF showing the key user flow (< 5s, < 2MB) via Playwright `recordVideo` or screen recording
   - **Media component bundling**: If plan.md has Media Components entries:
     - For each component in the Media Components table:
       - Locate the Storybook story source file
       - Create esbuild entry point that imports the story and renders with createRoot
       - Build self-contained bundle (IIFE format, include React, inline CSS, minify)
     - Store bundles at `FEATURE_DIR/media/components/`
     - Verify bundles: self-contained, < 500KB, renders in isolation
     - Record bundle details in evidence/
   - **Media content**: Create the feature post using the Content Specialist agent (reads cached opener from `evidence/opening-context.md`)
   - **E2E test tasks** — pick the path that matches the feature:
     - **Storybook E2E** (isolated components, when plan.md has "Storybook E2E Testing" entries):
       - Create test file in `shared/components/e2e/` using pattern from `.specify/templates/e2e-test-template.ts`
       - Use Storybook story URL: `/iframe.html?id=category-component--variant`
       - Test all theme variants using URL globals parameter: `&globals=theme:light|dark|vscode`
       - Add `data-testid` attributes to components for reliable selection
       - Capture screenshots for evidence: `await page.screenshot({ path: 'specs/[feature]/evidence/screenshots/...' })`
       - Run tests: `pnpm --filter @debrief/components test:e2e [testfile]`
     - **Web-shell E2E** (full extension workflows and blog/PR screenshots, when plan.md has "Web-Shell E2E Testing" entries):
       - Create test file in `apps/web-shell/playwright/tests/[workflow].spec.ts` — model on `properties-screenshots.spec.ts` (multi-theme + interaction GIF) or `drawing.spec.ts` (workflow interaction).
       - Reuse page objects in `apps/web-shell/playwright/pages/` (`AnalysisPage`, `CatalogPage`); extend with new selectors rather than duplicating.
       - Write screenshots/GIFs directly into `specs/[feature]/evidence/screenshots/` from the spec file — this is the source of record for blog/PR media.
       - Run tests: `cd apps/web-shell && node run-playwright.mjs [workflow]` (cloud) or `pnpm --filter @debrief/web-shell test [workflow]` (local).
       - **Do NOT** reach for the openvscode-server / `xvfb-run --config tests/e2e/playwright.config.ts` path to capture screenshots — it was explored in #142 and is unreliable; use it only if a test genuinely requires the real VS Code chrome (command palette, sidebar host).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright tests because you think browsers can't be installed. Standard browser CDN downloads are blocked (403), but `@sparticuz/chromium` bundles a Linux Chromium binary via npm and works fully. The project's `playwright.config.ts` auto-detects the environment and uses the bundled binary when `CLAUDE_CODE=1` is set. Run via `node apps/web-shell/run-playwright.mjs` to extract and configure the bundled browser. Full details: `docs/project_notes/playwright-installation-research.md`

> **⚠️ NEVER DEFER SCREENSHOT-GENERATING PLAYWRIGHT TASKS** — Any task in `tasks.md` whose output is a PNG / GIF written into `specs/[feature]/evidence/screenshots/` is a hard blocker for Phase 7's blog post. A "Screenshots" section that contains a written placeholder explaining why no image is attached is materially weaker than one with a captured frame — the post is the user-facing artefact of the feature, and prose-instead-of-image makes it land flat. The cost of running the Playwright suite (a few minutes) is always lower than the cost of an unillustrated post. Specifically: tasks like T057 (the headline tied-timestamp / capture / interaction flow screenshot) and T059 (the explicit error-state screenshot) MUST be executed during the Phase 7 polish pass, NOT deferred to the user or a follow-up commit. If a test fails to capture, debug and re-run it — do not skip it. Other Playwright tasks (pure behavioural assertions with no screenshot output) may be deferred when time-bound and explicitly called out in the test-summary; screenshot tasks may not.

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
    - **Verify test-summary.md quality**:
      - Check for YAML front matter with required fields (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`)
      - If front matter is missing, WARN: "test-summary.md should use the template at .specify/templates/evidence/test-summary-template.md"
      - If `git_sha` doesn't match current HEAD, WARN: "Evidence was captured at a different commit — consider refreshing"
    - **Verify feature-type evidence** (per Quality Rubric):
      - Determine feature type from spec.md
      - For UI components: check for `screenshots/` directory with theme variants and interaction GIF
      - For CLI tools: check for `cli-demo.txt`
      - For APIs: check for sample request/response JSON
      - WARN about any missing type-specific evidence
    - Verify media directory exists: `FEATURE_DIR/media/`
    - Check that required media files are present:
      - `media/shipped-post.md` - REQUIRED (feature post)
    - Verify cached opener exists:
      - `evidence/opening-context.md` — warn if missing (should have been created during `/speckit.plan`)
    - If evidence or media is missing, WARN the user and recommend completing those tasks
    - If all evidence and media is present:
      - Commit any uncommitted changes
      - Push to the feature branch
      - Execute the final PR creation task (if present in tasks.md)

11. **Mark backlog item as complete**:
    - Read BACKLOG.md and find the row matching the current feature (by ID or description link)
    - Strike through the entire row by wrapping each cell value in `~~`:
      ```markdown
      Before: | 007 | Enhancement | [Title](specs/007-name/spec.md) | 4 | 4 | 4 | 12 | Medium | implementing |
      After:  | ~~007~~ | ~~Enhancement~~ | ~~[Title](specs/007-name/spec.md)~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
      ```
    - Commit: `chore(backlog): mark item {ID} as complete`

12. ## Prompt dev to publish a blog post

    When implementation is complete, output this message:

    ---
    
    ### Publish this update
    
    Open a Claude Code session in the **debrief.github.io** repo and run:
    
        /publish-future-post https://github.com/debrief/debrief-future/tree/<BRANCH>/specs/<NNN>-<slug>/media
    
    This will read the spec from the dev branch, copy screenshots into
    the site's assets, and draft a blog post.

    Replace `<BRANCH>` with the current git branch name, and `<NNN>-<slug>`
    with the spec folder name.

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

For the feature-post task:
```markdown
- [ ] T405 Create feature blog post in specs/002-debrief-io/media/shipped-post.md
```

1. Read Content Specialist agent from `.claude/agents/media/content.md`
2. Spawn Content Specialist via Task tool
3. Provide context: cached opener from `evidence/opening-context.md` (verbatim as first three sections), feature summary from `spec.md`, evidence artefacts
4. Generate content following the Feature Post template (title prefixed with `Building `)
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

### PRs Created
- Feature PR: [URL]
- Blog PR: [URL]

### Next Steps
1. Review and merge the feature PR
2. Review and merge the blog PR
```

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/speckit.tasks` first to regenerate the task list.
