---
description: Create a pull request with a well-structured title, description, and evidence artifacts from the completed implementation. Also publishes blog post to debrief.github.io.
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
     - `.png`, `.jpg` images: Reference with relative paths (will need to be added to repo)
     - `.gif` images: Embed inline — interaction GIFs are high-value evidence for UI features
     - `.csv` files: Convert to markdown tables
   - If evidence directory is missing or empty, add a note: "⚠️ No evidence artifacts captured. Consider running evidence collection tasks."

7a. **Check evidence freshness**:
   - For each evidence file in `FEATURE_DIR/evidence/`:
     - If `test-summary.md` has YAML front matter with `git_sha`, compare it against the current branch HEAD
     - If the SHA doesn't match HEAD, check whether any source files (not evidence/media files) have been modified since the evidence was captured:
       ```bash
       git log --oneline <evidence_git_sha>..HEAD -- . ':!specs/*/evidence/' ':!specs/*/media/'
       ```
     - If source files have changed since evidence capture, add a warning to the PR description:
       ```
       > ⚠️ Evidence may be stale — source files modified after evidence was captured at <sha>.
       > Consider re-running evidence collection tasks.
       ```
   - If `test-summary.md` lacks front matter, add a note: "Evidence uses legacy format — consider updating to template with front matter."

7b. **Check evidence completeness against quality rubric**:
   - Determine feature type from spec.md (UI Component, CLI Tool, API/Service, etc.)
   - Check whether the feature-type-specific evidence files exist per the Quality Rubric in `.specify/templates/tasks-template.md`
   - For UI components: verify theme screenshots and interaction GIF exist
   - For CLI tools: verify `cli-demo.txt` exists
   - For APIs: verify sample request/response JSON exists
   - Report missing type-specific evidence as warnings (not blockers)

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

11. **Capture feature PR URL**:
    - Store the PR URL for use in blog post PR
    - Extract PR number for cross-referencing

11a. **Update evidence index** (`docs/evidence-index.md`):
    - Read or create `docs/evidence-index.md`
    - Add or update an entry for this feature:
      ```markdown
      | Feature | Files | Types | Captured | Freshness | PR |
      |---------|-------|-------|----------|-----------|----|
      | [###-name] | N | md, png, gif, json | YYYY-MM-DD | current/stale | #PR |
      ```
    - Extract file count and types from `FEATURE_DIR/evidence/`
    - Extract `captured_at` from `test-summary.md` front matter (if available)
    - Set freshness to "current" if `git_sha` matches HEAD, "stale" otherwise
    - Link to the PR just created
    - Sort entries by feature number
    - Commit the updated index alongside the PR

11b. **Update CHANGELOG** (`docs/CHANGELOG.md`):
    - Read or create `docs/CHANGELOG.md`
    - Add an entry under the current date heading:
      ```markdown
      ## [YYYY-MM-DD]

      ### Added
      - **[Feature Name]** — [1-line summary from spec.md excerpt]. ([#PR](url))
        - Tests: [passed]/[total] passing, [coverage]% coverage
        - Evidence: [list of key evidence files]
      ```
    - Pull test metrics from `test-summary.md` front matter
    - If no front matter, use "see evidence/" as fallback
    - Group entries under existing date heading if one exists for today
    - Commit the updated CHANGELOG alongside the PR

12. **Check for publishable media content**:
    - Look for `FEATURE_DIR/media/shipped-post.md`
    - If missing, skip to step 15 (final report)
    - If present, proceed with cross-repo publishing

12a. **Check for component bundles**:
    - Look for `FEATURE_DIR/media/components/` directory
    - If present, prepare to pass to /publish skill:
      ```bash
      if [ -d "$FEATURE_DIR/media/components/" ]; then
          COMPONENTS_ARG="--components $FEATURE_DIR/media/components/"
      else
          COMPONENTS_ARG=""
      fi
      ```

13. **Execute cross-repo blog publishing via /publish skill**:

    Invoke the publish skill with the shipped post path (and components if present):

    ```
    Skill tool:
      skill: "publish"
      args: "$FEATURE_DIR/media/shipped-post.md --feature-pr $FEATURE_PR_URL $COMPONENTS_ARG"
    ```

    The `/publish` skill handles:
    - Cloning debrief.github.io to temp directory
    - Transforming front matter to `future-post` layout
    - Updating image paths
    - Creating branch, committing, pushing
    - Creating PR with cross-reference to feature PR

    See `.claude/commands/publish.md` for full workflow details.

14. **Handle blog publishing errors**:
    - If `gh` not installed: Skip, warn user
    - If not authenticated: Skip, show `gh auth login` instructions
    - If any other error: Skip with warning, never fail the main PR
    - **Critical:** Blog publishing failures must never fail the feature PR

15. **Final report with both PRs**:

    Display to user:

    ```
    ✅ Feature PR created:
       {FEATURE_PR_URL}

    ✅ Blog post PR created:
       {BLOG_PR_URL}

    ## Next Steps

    1. Review and merge the feature PR
    2. Review and merge the blog PR
    3. Post will appear at: https://debrief.github.io/future/blog/

    ## LinkedIn Summary

    Ready at: specs/{feature}/media/linkedin-shipped.md
    Copy and post after blog PR is merged.
    ```

    If blog publishing was skipped:

    ```
    ✅ Feature PR created:
       {FEATURE_PR_URL}

    ⚠️  Blog publishing skipped: {reason}

    To publish manually:
    1. Copy specs/{feature}/media/shipped-post.md
    2. Transform front matter (see .claude/agents/media/jekyll.md)
    3. Create PR in debrief/debrief.github.io
    ```

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
- **Blog publishing fails**: Continue with feature PR, report error, provide manual instructions

## Notes

- Always include a link back to the spec and tasks files
- Evidence makes PRs more reviewable and documents behavior for future reference
- Screenshots and demos are especially valuable for UI changes or complex behaviors
- The PR description serves as documentation that persists with the codebase
- Blog posts are automatically published to debrief.github.io when shipped-post.md exists
