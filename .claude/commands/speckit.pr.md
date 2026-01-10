---
description: Create a pull request with a well-structured title, description, and evidence artifacts from the completed implementation.
handoffs:
  - label: View PR
    agent: none
    prompt: PR created successfully
    send: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

2. **Verify implementation is complete**:
   - Read tasks.md and count completed vs incomplete tasks
   - If more than 10% of tasks are incomplete, WARN the user and ask if they want to proceed
   - If evidence collection tasks are incomplete, STRONGLY recommend completing them first

3. **Load context for PR generation**:
   - **REQUIRED**: Read spec.md for feature name and description
   - **REQUIRED**: Read tasks.md for completed work summary
   - **IF EXISTS**: Read plan.md for technical context
   - **IF EXISTS**: Read evidence/ directory for captured artifacts

4. **Generate PR title**:
   - Format: `feat(scope): Brief description of the feature`
   - Extract scope from feature directory name (e.g., `002-debrief-io` → `debrief-io`)
   - Keep title under 72 characters
   - Use conventional commit format:
     - `feat`: New feature
     - `fix`: Bug fix
     - `refactor`: Code restructuring
     - `docs`: Documentation only
     - `test`: Adding tests
     - `chore`: Maintenance tasks

5. **Generate PR description** using this structure:

   ```markdown
   ## Summary

   [2-4 bullet points describing what this PR delivers]

   ## Changes

   ### [Phase/Category Name]
   - [Grouped list of completed tasks by phase]

   ## Evidence

   ### Test Results
   [Include test-summary.md content or test output summary]

   ### Usage Example
   [Include usage-example.md content or demonstrate feature usage]

   ### [Additional Evidence]
   [Include any feature-specific evidence: screenshots, API samples, CLI output, etc.]

   ## Test Plan

   - [x] [List key test scenarios that were verified]
   - [x] [Include coverage information if available]

   ## Related

   - Spec: `specs/[feature]/spec.md`
   - Tasks: `specs/[feature]/tasks.md`
   ```

6. **Generate or verify media content**:
   - Check for `FEATURE_DIR/media/` directory
   - If shipped-post.md is missing or incomplete:
     - Read Content Specialist agent from `.claude/agents/media/content.md`
     - Spawn Content Specialist via Task tool with:
       - Feature summary from spec.md
       - Evidence artifacts from evidence/
       - Lessons learned from implementation
     - Generate shipped-post.md following the Shipped Post template
     - Generate linkedin-shipped.md (150-200 words)
   - Save media content to `FEATURE_DIR/media/`

7. **Collect evidence artifacts**:
   - Check for `FEATURE_DIR/evidence/` directory
   - If exists, list all files and incorporate into PR description:
     - `.md` files: Include content directly (formatted)
     - `.txt` files: Include in code blocks
     - `.json` files: Include as collapsible JSON blocks
     - `.png`, `.jpg`, `.gif` images: Reference with relative paths (will need to be added to repo)
     - `.csv` files: Convert to markdown tables
   - If evidence directory is missing or empty, add a note: "⚠️ No evidence artifacts captured. Consider running evidence collection tasks."

8. **Check git and branch status**:
   - Verify all changes are committed
   - Check current branch name
   - Determine target branch (usually `main` or as specified in arguments)
   - If there are uncommitted changes, STOP and ask user to commit first

9. **Create the pull request**:
   - Use `gh pr create` with generated title and body
   - Use HEREDOC for body to preserve formatting:

   ```bash
   gh pr create --title "feat(scope): Title here" --body "$(cat <<'EOF'
   ## Summary
   ...PR body content...
   EOF
   )"
   ```

10. **Handle existing PR**:
   - If a PR already exists for this branch, offer to UPDATE it instead:
     - Use `gh pr edit` to update title and body
   - Display the PR URL to the user

11. **Report**:
    - Display the PR URL
    - Show summary of what was included:
      - Number of completed tasks referenced
      - Evidence artifacts included
      - Any warnings about missing evidence
    - **Media content status**:
      - List media files created/updated in `FEATURE_DIR/media/`
      - Remind user: "Blog posts are ready for review in media/ directory"
      - Provide next steps: "Copy shipped-post.md to debrief.github.io/_posts/ and linkedin-shipped.md for social sharing"

## Evidence Integration Guidelines

When incorporating evidence into the PR:

### Test Summary (test-summary.md)
```markdown
### Test Results

| Metric | Value |
|--------|-------|
| Total Tests | XX |
| Passed | XX |
| Failed | 0 |
| Coverage | XX% |

**Key scenarios verified:**
- [List from test-summary.md]
```

### Usage Example (usage-example.md or usage-demo.txt)
```markdown
### Usage Example

\`\`\`python
# Code example from usage-example.md
\`\`\`

**Output:**
\`\`\`
# Expected output
\`\`\`
```

### Screenshots/Images
```markdown
### Screenshots

![Description](./specs/[feature]/evidence/screenshot.png)
```

### API Samples (*.json)
```markdown
### API Response Sample

<details>
<summary>Click to expand</summary>

\`\`\`json
{ ... }
\`\`\`

</details>
```

## Media Content Integration

When creating media content for the shipped feature:

### Shipped Post Generation

Spawn the Content Specialist agent via Task tool:

```text
subagent_type: "general-purpose"
prompt: |
  You are the Content Specialist for Future Debrief.

  [Include .claude/agents/media/content.md content]

  Create a Shipped Post for:
  - Feature: [name from spec.md]
  - What was built: [summary from evidence/usage-example.md]
  - Test results: [from evidence/test-summary.md]
  - Key decisions: [from research.md if exists]

  Follow the Shipped Post template exactly.
```

### LinkedIn Summary

Generate alongside the shipped post:
- 150-200 words
- Hook opening (not "I'm excited to announce...")
- Key accomplishment highlight
- Link placeholder: `[Read the full post: LINK]`
- Tags: `#FutureDebrief #MaritimeAnalysis #OpenSource`

### Output Files

Save to `FEATURE_DIR/media/`:
- `shipped-post.md` - Full blog post
- `linkedin-shipped.md` - LinkedIn summary

## Error Handling

- **No `gh` CLI**: Provide instructions to install: `brew install gh` or `apt install gh`, then `gh auth login`
- **Not authenticated**: Run `gh auth login` first
- **No upstream branch**: Push first with `git push -u origin <branch>`
- **Missing evidence**: Proceed with warning, but strongly recommend capturing evidence

## Notes

- Always include a link back to the spec and tasks files
- Evidence makes PRs more reviewable and documents behavior for future reference
- Screenshots and demos are especially valuable for UI changes or complex behaviors
- The PR description serves as documentation that persists with the codebase
