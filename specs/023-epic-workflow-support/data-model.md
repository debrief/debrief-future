# Data Model: Epic Support for Speckit Workflow

## Entities

### Epic

An epic represents a large feature that is broken down into multiple backlog items.

**Storage**: Row in BACKLOG.md Epics table

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ID | string | Yes | Sequential identifier (E01, E02, ...) |
| Title | string | Yes | Short epic name (3-5 words) |
| Description | string | Yes | Brief summary or link to spec document |
| Status | enum | Yes | Epic lifecycle state |
| Items | string | Yes | Comma-separated list of child item IDs |

**Status Values**:

| Status | Description |
|--------|-------------|
| `proposed` | Epic added, not yet broken down into items |
| `active` | Items created, work in progress |
| `complete` | All child items marked complete |

### Item (Extended)

Existing backlog items gain optional epic association.

**Change**: Items may include `[Ex]` prefix in Description field

| Field | Change | Description |
|-------|--------|-------------|
| Description | Modified | May contain `[E01]` prefix for epic traceability |

**Pattern**: `[E01] Item title` or `[E01] [Item title](url)`

## Table Schemas

### New: Epics Table

Location: BACKLOG.md, between "Workflow" and "Items" sections

```markdown
## Epics

Large features broken down into multiple backlog items.

| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
| E01 | Storyboarding Briefings | [Structured briefing authoring](docs/storyboard-spec.md) | active | 024, 025, 026, 027 |
```

**Column Specifications**:

| Column | Width | Alignment | Format |
|--------|-------|-----------|--------|
| ID | 3-4 | Left | `E##` (padded) |
| Title | 20-40 | Left | Plain text |
| Description | 40-80 | Left | Text or `[text](url)` |
| Status | 8-12 | Left | `proposed`, `active`, `complete` |
| Items | Variable | Left | Comma-separated IDs |

### Modified: Items Table

Existing table structure unchanged. Items from epics have `[Ex]` prefix.

```markdown
| ID | Category | Description | V | M | A | Total | Complexity | Status |
|----|----------|-------------|---|---|---|-------|------------|--------|
| 024 | Feature | [E01] Create storyboard schema | - | - | - | - | Medium | proposed |
| 025 | Feature | [E01] Implement scene capture UI | - | - | - | - | Medium | proposed |
```

## Relationships

```
Epic (1) ────────< (N) Item
  │                    │
  │ Items field        │ [Ex] prefix
  │ "024, 025, 026"    │ "[E01] Title"
  │                    │
  └────────────────────┘
      Bidirectional traceability
```

**Relationship Rules**:
1. An epic must have at least 1 item (after breakdown)
2. An item belongs to at most 1 epic
3. Items without `[Ex]` prefix are standalone (no epic)
4. Epic's Items field must match items with corresponding `[Ex]` prefix

## State Transitions

### Epic Lifecycle

```
                    /epic command
                         │
                         ▼
┌──────────┐        ┌──────────┐        ┌──────────┐
│ proposed │───────>│  active  │───────>│ complete │
└──────────┘        └──────────┘        └──────────┘
     │                   │                    │
     │                   │                    │
     └── (breakdown)  ───┘── (all items)  ───┘
                              complete
```

**Transition Triggers**:

| From | To | Trigger |
|------|----|---------|
| (none) | proposed | `/epic` command with description only |
| proposed | active | `/epic` command completes breakdown |
| active | complete | Manual update when all items complete |

### Item Lifecycle (unchanged)

Items follow existing workflow: proposed → approved → specified → ... → complete

## Validation Rules

### Epic Validation

| Rule | Error Message |
|------|---------------|
| ID must be unique | "Epic {ID} already exists" |
| ID must follow E## pattern | "Invalid epic ID format" |
| Title required | "Epic title cannot be empty" |
| Status must be valid enum | "Invalid status: {value}" |
| Items must exist after active | "Active epic must have items" |

### Item Epic Reference Validation

| Rule | Error Message |
|------|---------------|
| Epic reference must exist | "Epic {ID} not found for item {item_id}" |
| Epic reference format `[Exx]` | "Invalid epic reference format" |
| Referenced epic must be active | "Cannot add item to proposed/complete epic" |

## Migration Notes

### Adding Epics Section

When first epic is created, insert section into BACKLOG.md:

**Location**: After `## Workflow` section, before `## Items` section

**Insertion template**:
```markdown
## Epics

Large features broken down into multiple backlog items.

| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
| {new_epic_row} |

```

### Existing Items

No migration needed. Existing items without `[Ex]` prefix remain standalone.
