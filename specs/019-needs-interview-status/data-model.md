# Data Model: needs-interview Status

**Feature**: 019-needs-interview-status
**Date**: 2026-01-26

## Status Values

The backlog workflow status is extended with a new value:

```text
Status Flow:
┌─────────────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ needs-interview │ ──> │ proposed │ ──> │ approved │ ──> │ specified │ ──> ...
└─────────────────┘     └──────────┘     └──────────┘     └───────────┘
        │                    │                 │                │
        │                    │                 │                │
   Quick capture        Has scores         Strategic        Has spec
   No interview yet     Interview done     review done      file
```

### Status Definitions

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `needs-interview` | **NEW** - Captured quickly without full interview; requires `/interview` before scoring is reliable | `proposed` |
| `proposed` | Has description and scores; awaiting strategic review | `approved` (via ideas-guy) |
| `approved` | Strategically reviewed; ready for specification | `specified` (via /speckit.start) |
| `specified` | Has spec file; ready for planning | `clarified`, `planned` |
| ... | (subsequent statuses unchanged) | ... |

### Status Validation Rules

| Command | Valid Input Statuses | Invalid Statuses |
|---------|---------------------|------------------|
| `/interview` | `needs-interview` only | All others |
| `/speckit.start` | `approved` only | `needs-interview`, `proposed`, etc. |

## Backlog Item Entity

The backlog item entity in BACKLOG.md gains a new valid status value:

```markdown
| ID | Category | Description | V | M | A | Total | Complexity | Status |
|----|----------|-------------|---|---|---|-------|------------|--------|
| 030 | Feature | [Quick idea title](issue_url) [preliminary] | 3 | 2 | 4 | 9 | Medium | needs-interview |
```

### Field Behavior by Status

| Field | needs-interview | proposed | approved |
|-------|-----------------|----------|----------|
| Description | Short title + `[preliminary]` suffix | Full description | Full description |
| V, M, A | Preliminary estimates | Final scores | Final scores |
| Total | Sum of preliminary | Sum of final | Sum of final |
| GitHub Issue | May exist (minimal content) | Exists (full detail) | Exists (full detail) |

## Interview Session (Transient)

An interview session is not persisted but represents the state during `/interview` execution:

```typescript
interface InterviewSession {
  itemId: string;           // Backlog item ID (e.g., "030")
  currentQuestion: number;  // 1-indexed question number
  totalQuestions: number;   // Estimated total (may adjust)
  answers: Answer[];        // Collected responses
}

interface Answer {
  topic: string;            // Question category
  response: string;         // User's answer (option letter or custom text)
  implications: string;     // What this means for the feature
}
```

This is conceptual; the actual implementation is conversational (Claude Code maintains context implicitly).
