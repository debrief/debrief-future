# Usage Example: /epic Command

## Example 1: Text Description

```
Human: /epic Add storyboard briefing capability for analysts to create and share structured presentations
```

Expected output:
```markdown
## Epic Created: E01 - Storyboarding Briefings

**Source**: text description

### Breakdown (7 items)

| ID | Category | Title | Complexity | Depends On |
|----|----------|-------|------------|------------|
| 024 | Infrastructure | [E01] Add storyboard schema to LinkML | Low | - |
| 025 | Feature | [E01] Create storyboard panel webview | Medium | 024 |
| 026 | Feature | [E01] Implement scene capture and thumbnail | Medium | 025 |
| 027 | Feature | [E01] Add scene reordering UI | Low | 025 |
| 028 | Feature | [E01] Implement playback transport controls | Medium | 025 |
| 029 | Feature | [E01] Add viewport/time animation | High | 028 |
| 030 | Enhancement | [E01] Add properties panel editing | Low | 025 |

### BACKLOG.md Updated
- Epic E01 added to Epics table
- 7 items added to Items table (status: proposed)

### GitHub Issues Created
- #80: [E01] Add storyboard schema to LinkML
- #81: [E01] Create storyboard panel webview
- #82: [E01] Implement scene capture and thumbnail
- #83: [E01] Add scene reordering UI
- #84: [E01] Implement playback transport controls
- #85: [E01] Add viewport/time animation
- #86: [E01] Add properties panel editing

### Next Steps
1. Run `backlog-prioritizer` to score the new items
2. Run `the-ideas-guy` to approve items for implementation
3. Use `/speckit.start {ID}` to begin individual items
```

## Example 2: Local Document

```
Human: /epic docs/storyboard-spec.md
```

The command will:
1. Detect input as local path (contains `/`)
2. Read the file using Read tool
3. Analyze the full document content
4. Generate breakdown based on the specification

## Example 3: GitHub URL

```
Human: /epic https://github.com/debrief/debrief-future/blob/main/docs/storyboard-spec.md
```

The command will:
1. Detect input as GitHub URL (starts with `https://`)
2. Fetch the document using WebFetch
3. Analyze the remote specification
4. Generate breakdown based on the content

## Offline Mode

If `gh` CLI is unavailable, the command falls back to local files:

```markdown
### Items Saved Locally
- docs/ideas/024-add-storyboard-schema.md
- docs/ideas/025-create-storyboard-panel.md
- ...

> GitHub issue creation unavailable. Items saved locally to `docs/ideas/`.
> Create GitHub issues manually when `gh` is available.
```
