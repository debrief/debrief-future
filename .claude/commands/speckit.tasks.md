---
description: Generate a detailed task breakdown from spec.md and plan.md. Creates tasks.md with phased implementation checklist including evidence collection, media content, and PR creation.
handoffs:
  - label: Implement Tasks
    agent: speckit.implement
    prompt: Execute the generated task plan
    send: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. (The script already requires plan.md unconditionally — no extra flags needed.)

2. **Read plan.md** from FEATURE_DIR for implementation approach and architecture.

3. **Read spec.md** from FEATURE_DIR for user stories and acceptance criteria.

4. **Generate tasks.md incrementally** (REQUIRED — do NOT write the full file in one call). A single `Write` call producing the entire file can exceed the stream idle timeout on dense features. Instead:

   **Step 4a — Write skeleton** (`Write` tool, one call):
   Create `tasks.md` with ONLY:
   - Title (feature name from plan.md)
   - Evidence Requirements section (full content — see Evidence Planning Rules below)
   - Phase headings as empty placeholders (e.g. `## Phase 1: Setup`, `## Phase 2: Foundation`, one heading per user story, `## Phase N: Polish & Cross-Cutting Concerns`)
   - Empty `## Dependencies` heading
   - Empty `## Implementation Strategy` heading

   **Step 4b — Fill each phase** (`Edit` tool, one call per phase):
   For each phase placeholder in turn, replace it with the fully populated section:
   - Story goal, independent test criteria, tests (if requested), implementation tasks
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Parallel execution examples inside the phase

   **Step 4c — Fill cross-cutting sections** (`Edit` tool, one call each):
   - Replace empty `## Dependencies` with story completion order
   - Replace empty `## Implementation Strategy` with incremental delivery notes

   Use `.specify/templates/tasks-template.md` as the structural reference. The Polish phase MUST include evidence collection, media content, AND PR creation tasks (see Evidence Planning Rules).

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
├── test-summary.md     # REQUIRED: Use template from .specify/templates/evidence/test-summary-template.md
├── usage-example.md    # REQUIRED: Concrete usage demonstration
├── screenshots/        # For UI features: theme variants + interaction GIF
│   ├── component-light.png
│   ├── component-dark.png
│   ├── component-vscode.png
│   └── interaction.gif   # Key user flow as short GIF (< 5s, < 2MB)
└── [feature-specific]  # Per quality rubric (see below)
```

### Determining Feature-Specific Evidence

Based on the feature type detected from spec.md and plan.md:

| Feature Type | Evidence to Plan | Example Files |
|--------------|------------------|---------------|
| **CLI Tool** | Full terminal session transcript | `cli-demo.txt`, `help-output.txt` |
| **API/Service** | Sample request + response JSON | `sample-request.json`, `sample-response.json` |
| **Library/SDK** | Code examples with results | `usage-example.py`, `output.txt` |
| **Data Processing** | Before/after samples | `input-sample.*`, `output-sample.*` |
| **UI Component** | 3 theme screenshots (light/dark/vscode) + interaction GIF showing key user flow (via Storybook E2E) | `screenshots/component-light.png`, `screenshots/component-dark.png`, `screenshots/component-vscode.png`, `screenshots/interaction.gif` |
| **VS Code Extension Workflow** | Workflow screenshots + interaction GIF captured by Playwright driving the **web-shell** (`apps/web-shell/playwright/tests/`, run via `node apps/web-shell/run-playwright.mjs`). The web-shell hosts the same shared components as the extension, so its screenshots are the source of record for blog/PR media. Do **not** route screenshots through openvscode-server / `xvfb-run` — that path is unreliable. | `screenshots/workflow-*.png`, `screenshots/interaction.gif`, `webview-e2e-summary.md` |
| **Parser/Converter** | Input/output file pairs side-by-side | `sample-input.rep`, `parsed-output.json` |
| **Schema Change** | Round-trip proof (Python -> JSON -> TypeScript -> JSON) | `round-trip-evidence.md` |
| **Integration** | End-to-end flow demo + sequence diagram | `integration-flow.md`, `sequence.mermaid` |
| **Infrastructure** | Configuration sample + validation output | `config-sample.*`, `validation-output.txt` |
| **Electron/Desktop App** | Runtime smoke test, app window screenshots, graceful error handling | `runtime-startup.png`, `runtime-workflow.png`, `e2e-trace.zip` |

### Evidence Task Generation

For the Polish phase, ALWAYS generate these tasks:

1. **Test Summary Task** (REQUIRED):
   ```markdown
   - [ ] TXXX Capture test results using template (.specify/templates/evidence/test-summary-template.md) in specs/[feature]/evidence/test-summary.md
   ```
   MUST use the test-summary template with YAML front matter including: `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body should include: total tests, passed, failed, coverage %, key scenarios verified.

2. **Usage Example Task** (REQUIRED):
   ```markdown
   - [ ] TXXX Create usage demonstration in specs/[feature]/evidence/usage-example.md
   ```
   Content should include: code/command example, expected output, explanation.

3. **Feature-Specific Tasks** (based on feature type):
   ```markdown
   - [ ] TXXX [P] Capture [specific artifact] in specs/[feature]/evidence/[filename]
   ```

4. **Feature Post Task** (REQUIRED - for media announcement):
   ```markdown
   - [ ] TXXX Create feature blog post in specs/[feature]/media/shipped-post.md
   ```
   Use Content Specialist agent (`.claude/agents/media/content.md`) to generate the Feature Post:
   - Title prefixed with `Building `
   - First three sections (What We're Building, How It Fits, Key Decisions) copied verbatim from `specs/[feature]/evidence/opening-context.md` (cached during `/speckit.plan`)
   - Remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence

5. **Playwright E2E Reminder** (include when generating E2E test tasks):
   > **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

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
- **Visual when possible**: Screenshots, interaction GIFs, diagrams, or formatted output
- **Self-contained**: Includes all context needed to understand it
- **Machine-readable**: test-summary.md uses YAML front matter for automated aggregation
- **Type-appropriate**: Meets the minimum requirements for its feature type (see table above)

### Interaction GIF for UI Components

For UI component features, always plan an interaction GIF task. The GIF should:
- Be under 5 seconds and under 2MB
- Show the primary user interaction (click, drag, hover, selection)
- Demonstrate state transitions or visual feedback
- Be captured during Playwright E2E tests via `page.video()` or `recordVideo` config, then converted to GIF
- Be saved to `specs/[feature]/evidence/screenshots/interaction.gif`

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
| evidence/opening-context.md | Cached opener (What We're Building, How It Fits, Key Decisions) | During /speckit.plan |
| media/shipped-post.md | Feature post combining cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |
```

## Media Content Rules

**Purpose**: Cache opening context at plan time and write one feature post at ship time that combines the cached opener with delivery evidence.

### Media Agents

Use the agents in `.claude/agents/media/` via the Task tool:

1. **Content Specialist** (`.claude/agents/media/content.md`):
   - Cached opener during `/speckit.plan` (three prose sections, no front matter)
   - Feature post during the Polish phase / `/speckit.pr`
   - Voice & tone guidelines

2. **Technical Specialist** (`.claude/agents/media/technical.md`):
   - Technical context for posts
   - Diagram descriptions
   - Architecture summaries

### Spawning Media Agents

To create the feature post, spawn a subagent via Task tool:

```text
Task tool call:
  subagent_type: "general-purpose"
  prompt: |
    You are the Content Specialist for Future Debrief.

    [Include full content of .claude/agents/media/content.md]

    Create a Feature Post for:
    - Feature: [name]
    - Cached opener (copy verbatim as first three sections): [contents of evidence/opening-context.md]
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

- [ ] T505 Create feature blog post in specs/002-debrief-io/media/shipped-post.md (reads evidence/opening-context.md for the first three sections)

### PR Creation

- [ ] T506 Create PR and publish blog: run /speckit.pr

**Task T506 must run last. It depends on all evidence and media tasks being complete.**
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

- [ ] T098 Create feature blog post in specs/004-loader/media/shipped-post.md (reads evidence/opening-context.md for the first three sections)

### PR Creation

- [ ] T099 Create PR and publish blog: run /speckit.pr

**Task T099 must run last. Runtime verification ensures the app works beyond just component tests.**
```
