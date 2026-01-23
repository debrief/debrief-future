# Specification: Epic Support for Speckit Workflow

## Overview

Add epic support to the speckit workflow, enabling large features to be broken down into multiple deliverable backlog items while maintaining traceability.

## Problem Statement

Large features (like Storyboarding Briefings) don't fit the current single-item backlog workflow. They need to be broken down into multiple deliverable items while maintaining traceability to the parent epic.

## Solution

### 1. BACKLOG.md Epics Section

Add a new "Epics" section between "Workflow" and "Items" sections:

```markdown
## Epics

Large features broken down into multiple backlog items.

| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
| E01 | Storyboarding Briefings | Structured briefing authoring and playback | active | 024, 025, 026 |
```

**Epic Table Columns:**

| Column | Description |
|--------|-------------|
| ID | Epic identifier (E01, E02, etc.) |
| Title | Short epic name |
| Description | Brief summary or link to spec document |
| Status | proposed, active, complete |
| Items | Comma-separated list of child backlog item IDs |

### 2. Epic Statuses

| Status | Meaning | Transition |
|--------|---------|------------|
| proposed | Epic added, not yet broken down | Initial state |
| active | Items created, work in progress | After `/epic` breakdown |
| complete | All child items complete | Manual update when done |

### 3. New `/epic` Skill

Create `.specify/skills/epic.md` that:

1. **Parses input**: Accept description text or document link (local path or GitHub URL)
2. **Fetches content**: If link provided, read the document
3. **Analyzes with Opus**: Act as Business Analyst + Technical Architect to:
   - Identify distinct deliverables
   - Sequence for value delivery
   - Include research spikes where needed
   - Identify tech debt prerequisites
4. **Creates items**: For each identified item:
   - Generate title with epic prefix: `[E01] Item title`
   - Estimate complexity (Low/Medium/High)
   - Assign category (Feature/Enhancement/Tech Debt/Infrastructure)
5. **Updates BACKLOG.md**:
   - Add row to Epics table
   - Add rows to Items table (status: proposed)
   - Link items back to epic via `[Ex]` prefix
6. **Creates GitHub issues**: One issue per item with full context

### 4. Item Nomenclature

Items from epics include epic reference in description:

```markdown
| 024 | Feature | [E01] Create storyboard schema | - | - | - | - | Medium | proposed |
| 025 | Feature | [E01] Implement scene capture UI | - | - | - | - | Medium | proposed |
| 026 | Tech Debt | [E01] Add thumbnail storage service | - | - | - | - | Low | proposed |
```

The `[E01]` prefix:
- Provides visual traceability
- Allows filtering/grouping by epic
- Links back to parent epic row

### 5. Epic ID Assignment

- Epic IDs are sequential: E01, E02, E03...
- Parse existing Epics table to find max ID
- Assign next available ID

### 6. Breakdown Guidelines

The `/epic` command uses Opus to break down features following these principles:

**Value Delivery:**
- Each item should deliver incremental value
- Avoid items that only "prepare" without visible output
- Prefer vertical slices over horizontal layers

**Item Sizing:**
- Target 3-10 items per epic
- Each item should be completable in 1-3 days
- Complex items can be split further

**Item Types:**
- **Feature**: User-facing capability
- **Enhancement**: Improvement to existing capability
- **Tech Debt**: Refactoring or cleanup needed for epic
- **Infrastructure**: Build/tooling support needed
- **Research Spike**: Time-boxed investigation (clearly labeled)

**Sequencing:**
- Infrastructure/Tech Debt items first if they unblock others
- Research spikes early to reduce uncertainty
- Core features in dependency order
- Polish/enhancement items last

## Acceptance Criteria

- [ ] BACKLOG.md has Epics section with table between Workflow and Items
- [ ] Epic table has columns: ID, Title, Description, Status, Items
- [ ] `/epic` skill exists at `.specify/skills/epic.md`
- [ ] Command accepts text description or document link
- [ ] Command fetches and parses linked documents (local .md or GitHub URLs)
- [ ] Breakdown uses Opus model for analysis
- [ ] Breakdown produces 3-10 items per epic
- [ ] Each item has `[Ex]` prefix in description
- [ ] Items include appropriate mix of types (features, tech debt, spikes)
- [ ] Items are sequenced for value delivery
- [ ] Epic row added to Epics table with item list
- [ ] Item rows added to Items table (status: proposed)
- [ ] GitHub issues created for each item

## Technical Design

### Skill File Structure

```
.specify/skills/epic.md
```

### Skill Workflow

```
/epic <input>
    │
    ▼
Parse Input (text or link)
    │
    ▼
Fetch Document (if link)
    │
    ▼
Opus Analysis (BA + Architect role)
    │
    ├── Identify deliverables
    ├── Sequence items
    ├── Estimate complexity
    └── Assign categories
    │
    ▼
Assign Epic ID (E01, E02, ...)
    │
    ▼
Update BACKLOG.md
    ├── Add Epics row
    └── Add Items rows
    │
    ▼
Create GitHub Issues (one per item)
    │
    ▼
Report Summary
```

### Example Usage

```bash
# From text description
/epic Add storyboard briefing capability for analysts to create and share structured presentations

# From local document
/epic docs/storyboard-spec.md

# From GitHub URL
/epic https://github.com/debrief/debrief-future/blob/main/docs/storyboard-spec.md
```

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

## Out of Scope

- Breaking down the Storyboarding epic (separate task)
- Automatic epic status updates based on item completion
- Nested epics (epics containing epics)
- Epic dependencies
- Epic-level scoring (items are scored individually)

## Dependencies

- Existing BACKLOG.md structure
- GitHub CLI (`gh`) for issue creation
- Opus model access for breakdown analysis

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Opus breakdown produces too many/few items | Guidelines specify 3-10 target range |
| Items too large or too small | Complexity guidelines for 1-3 day items |
| Epic ID conflicts | Parse existing table for max ID |
| Document fetch fails | Fallback to manual description entry |
