# Research: Epic Support for Speckit Workflow

## Research Questions

### 1. Skill/Command File Patterns

**Question**: What is the correct structure for defining a new skill/command?

**Finding**: Commands are defined in `.claude/commands/` with YAML frontmatter:

```markdown
---
description: Brief description shown in skill list
---

## User Input

```text
$ARGUMENTS
```

[Rest of command documentation...]
```

**Key patterns observed from `/idea` command**:
- Use `$ARGUMENTS` placeholder for user input
- Structured execution flow with numbered steps
- Clear error handling section
- Example usage at the end
- Output format templates for different paths

**Decision**: Place `/epic` command at `.claude/commands/epic.md` following the same pattern as `/idea`.

### 2. BACKLOG.md Table Parsing

**Question**: How to parse and modify BACKLOG.md tables reliably?

**Finding**: BACKLOG.md uses standard markdown tables:

```markdown
| ID | Category | Description | V | M | A | Total | Complexity | Status |
|----|----------|-------------|---|---|---|-------|------------|--------|
| 023 | Infrastructure | [Add epic...](url) | 4 | 3 | 4 | 11 | Medium | approved |
```

**Patterns for parsing**:
1. Find table by header row: `| ID | Category |`
2. Skip separator row: `|----|-----`
3. Extract rows by splitting on `|`
4. Find max ID by scanning first column

**Decision**: Use Read tool to get BACKLOG.md, Edit tool to insert rows. No special parsing library needed.

### 3. Opus Model Prompting for BA/Architect Analysis

**Question**: How to prompt Opus for effective epic breakdown?

**Finding**: The breakdown requires dual perspective:
- **Business Analyst**: Focus on user value, acceptance criteria, stakeholder needs
- **Technical Architect**: Focus on dependencies, complexity, technical sequencing

**Prompt strategy**:
```
Act as both a Business Analyst and Technical Architect. Analyze this feature specification and break it down into 3-10 independently deliverable backlog items.

For each item:
1. Identify a discrete piece of user-visible value
2. Estimate complexity (Low/Medium/High)
3. Assign category (Feature/Enhancement/Tech Debt/Infrastructure/Research Spike)
4. Note dependencies on other items

Sequencing principles:
- Infrastructure first if it unblocks others
- Research spikes early to reduce uncertainty
- Core features in dependency order
- Polish/enhancement items last

Output format:
| # | Category | Title | Complexity | Depends On |
```

**Decision**: Include this prompt structure in the `/epic` command definition.

### 4. GitHub CLI Issue Creation

**Question**: Best practices for creating multiple GitHub issues?

**Finding**: Use `gh issue create` with heredoc for body:

```bash
gh issue create --repo owner/repo --title "Title" --body "$(cat <<'EOF'
Issue body here...
EOF
)"
```

**For multiple issues**, create them sequentially and capture IDs:

```bash
ISSUE_URL=$(gh issue create --repo owner/repo --title "Title" --body "Body" | tail -1)
ISSUE_NUM=$(echo $ISSUE_URL | grep -oE '[0-9]+$')
```

**Fallback**: If `gh` unavailable, create local files at `docs/ideas/{ID}-{slug}.md`.

**Decision**: Create issues one at a time, capture URLs for backlog linking. Include fallback to local files.

### 5. Epic ID Assignment

**Question**: How to assign sequential epic IDs (E01, E02, etc.)?

**Finding**: No Epics table exists yet; this feature creates it.

**Algorithm**:
1. Check if Epics section exists in BACKLOG.md
2. If not, create it after Workflow section
3. If exists, scan for max epic ID: `grep -oE 'E[0-9]+' | sort -V | tail -1`
4. Increment by 1, pad to 2 digits: E01, E02, ... E99

**Decision**: Handle both creation of new Epics section and appending to existing.

## Alternatives Considered

### Command Location

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| `.claude/commands/epic.md` | Project-specific, version controlled | Only works in this repo | ✅ Selected |
| `~/.claude/commands/epic.md` | Works everywhere | Not version controlled | Rejected |
| `.specify/skills/epic.md` | With other speckit tools | Skills dir doesn't exist | Rejected |

### Item Prefix Format

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| `[E01]` prefix | Clear, grep-able, compact | Takes description space | ✅ Selected |
| `epic: E01` field | Separate column | Requires BACKLOG.md schema change | Rejected |
| Tags in description | Flexible | Inconsistent parsing | Rejected |

### Breakdown Model

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Opus only | Best analysis quality | Higher cost | ✅ Selected |
| Sonnet with review | Cheaper | May miss nuance | Rejected |
| Haiku draft, Opus refine | Cost balanced | Complex flow | Rejected |

## Dependencies

| Dependency | Version | Required For |
|------------|---------|--------------|
| Claude Code CLI | Any | Skill execution |
| GitHub CLI (`gh`) | 2.x+ | Issue creation |
| Opus model access | — | Epic breakdown analysis |

## Risks Identified

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Opus produces poor breakdown | Low | Medium | Include detailed guidelines in prompt |
| GitHub API rate limits | Low | Low | Batch issues, add delay if needed |
| BACKLOG.md format changes | Medium | High | Validate table structure before edit |
| User provides insufficient description | Medium | Medium | Require document link for complex epics |
