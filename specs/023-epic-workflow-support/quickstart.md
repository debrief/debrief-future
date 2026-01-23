# Quickstart: Epic Workflow

## Prerequisites

- Claude Code CLI installed
- GitHub CLI (`gh`) authenticated (optional, for issue creation)
- Opus model access

## Usage

### Breaking Down a Large Feature

**From a local document**:
```bash
/epic docs/storyboard-spec.md
```

**From a GitHub URL**:
```bash
/epic https://github.com/debrief/debrief-future/blob/main/docs/storyboard-spec.md
```

**From a text description**:
```bash
/epic Add storyboard briefing capability for analysts to create and share structured presentations
```

### What Happens

1. **Input parsed** - Document fetched or description captured
2. **Opus analyzes** - Acts as BA + Technical Architect
3. **Items created** - 3-10 deliverable backlog items
4. **BACKLOG.md updated** - Epic row + item rows added
5. **GitHub issues created** - One per item (if `gh` available)
6. **Summary reported** - List of created items

### Example Output

```markdown
## Epic Created: E01 - Storyboarding Briefings

**Source**: docs/storyboard-spec.md

### Breakdown (7 items)

| ID | Type | Title | Complexity |
|----|------|-------|------------|
| 024 | Infrastructure | [E01] Add storyboard schema to LinkML | Low |
| 025 | Feature | [E01] Create storyboard panel webview | Medium |
| 026 | Feature | [E01] Implement scene capture and thumbnail | Medium |
| 027 | Feature | [E01] Add scene reordering UI | Low |
| 028 | Feature | [E01] Implement playback transport controls | Medium |
| 029 | Feature | [E01] Add viewport/time animation | High |
| 030 | Enhancement | [E01] Add properties panel editing | Low |

### BACKLOG.md Updated
- Epic E01 added to Epics table
- 7 items added to Items table (status: proposed)

### GitHub Issues Created
- #80: [E01] Add storyboard schema to LinkML
- #81: [E01] Create storyboard panel webview
- ... (etc)

### Next Steps
1. Run `backlog-prioritizer` to score the new items
2. Run `the-ideas-guy` to approve items for implementation
3. Use `/speckit.start {ID}` to begin individual items
```

## Following Up

### Score the Items

Items are created with status `proposed` and no scores. Score them:

```bash
# The prioritizer will score unscored items
# (Use your normal backlog review process)
```

### Approve Items

After scoring, items need approval before implementation:

```bash
# The ideas-guy reviews and approves
# (Use your normal approval process)
```

### Start Implementation

When an item is approved:

```bash
/speckit.start 024
```

## Offline Mode

If GitHub CLI is unavailable:
- Issues are saved locally to `docs/ideas/{ID}-{slug}.md`
- Backlog links to local files instead of GitHub URLs
- Create GitHub issues manually later if needed

## Epic Statuses

| Status | Meaning |
|--------|---------|
| `proposed` | Epic exists but not broken down |
| `active` | Items created, work in progress |
| `complete` | All items complete (manual update) |

## Troubleshooting

**"Epic ID already exists"**
- Epic IDs are sequential (E01, E02, ...)
- Check BACKLOG.md Epics table for existing IDs

**"Could not parse document"**
- Ensure document is valid markdown
- Try providing a text description instead

**"GitHub issue creation failed"**
- Check `gh auth status`
- Issues will be saved locally as fallback

**"No items generated"**
- Provide more detail in the source document
- Minimum requirement: clear feature description with acceptance criteria
