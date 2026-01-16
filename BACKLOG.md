# Backlog

Prioritized list of features, capabilities, and technical debt for Future Debrief.

This document is maintained by the `opportunity-scout` and `backlog-prioritizer` agents, with human oversight.

## Scoring Criteria

| Dimension | Description | 1 | 3 | 5 |
|-----------|-------------|---|---|---|
| **Value** | Capability improvement to Debrief | Nice-to-have, cosmetic | Useful enhancement, improves workflow | Core capability, enables new use cases |
| **Media** | Interest for blog/LinkedIn posts | Internal improvement, hard to visualize | Interesting technical story | Visual, demo-able, compelling narrative |
| **Autonomy** | Suitability for AI-assisted development | Needs significant human judgment/testing | Some verification needed | Clear acceptance criteria, testable |

**Total** = Value + Media + Autonomy (max 15)

## Workflow

| Status | Meaning | Trigger |
|--------|---------|---------|
| **proposed** | Item added, awaiting review | Scout adds, ideas-guy adds, or human submits |
| **approved** | Strategically reviewed, ready for spec | Ideas-guy approves |
| **specified** | Spec created, linked below | `/speckit.start {ID}` |
| **clarified** | Ambiguities resolved | `/speckit.clarify` |
| **planned** | Implementation plan ready | `/speckit.plan` |
| **tasked** | Tasks broken down | `/speckit.tasks` |
| **implementing** | Active development | `/speckit.implement` |
| **complete** | Done (row struck through) | `/speckit.pr` merged |

### Backlog Flow

```
1. IDEATION
   the-ideas-guy ──generates──> strategic ideas ──────────┐
   opportunity-scout ──explores──> technical opportunities │
                                                          ▼
                                                    BACKLOG.md
                                                     (proposed)
                                                          │
2. SCORING (backlog-prioritizer)                          │
   scores V/M/A for proposed items ◄──────────────────────┘
                          │
3. REVIEW (the-ideas-guy)
   reviews scored items against STRATEGY.md
      ├── Approve → status: approved
      ├── Park → STRATEGY.md Parking Lot
      └── Reject → STRATEGY.md Rejected Log
                          │
4. SPECIFICATION          ▼
   /speckit.start {ID} ← requires status: approved
```

### Starting Specification Work

When an item has status `approved`:

```bash
/speckit.start 007    # Validates item is approved, creates spec, updates this file
```

This bridges backlog approval to the speckit workflow by:
1. Validating the item exists and has status `approved`
2. Creating a feature branch and specification
3. Updating this file: status → `specified`, description → link to spec

## Items

<!--
Format:
| ID | Category | Description | V | M | A | Total | Status |

Description formats:
- New items from /idea: [Short title](github_issue_url) — links to detailed requirement
- When specified: [Title](docs/specs/feature-name/spec.md) — links to spec
- When complete: entire row gets ~~strikethrough~~
-->

| ID | Category | Description | V | M | A | Total | Status |
|----|----------|-------------|---|---|---|-------|--------|
| 007 | Enhancement | Implement REP file special comments (NARRATIVE, CIRCLE, etc.) | 4 | 4 | 4 | 12 | proposed |
| 002 | Feature | Add MCP wrapper for debrief-io service | 4 | 3 | 4 | 11 | proposed |
| 005 | Tech Debt | Add cross-service end-to-end workflow tests (io -> stac -> calc) | 4 | 2 | 5 | 11 | proposed |
| 008 | Feature | Design and implement extension discovery mechanism for contrib packages | 4 | 3 | 3 | 10 | proposed |
| 003 | Tech Debt | Create shared React component library (shared/components) | 3 | 3 | 4 | 10 | proposed |
| 004 | Infrastructure | Add contrib folder scaffolding with example extension (requires #008) | 3 | 3 | 4 | 10 | proposed |
| 001 | Infrastructure | Extract shared MCP utilities into mcp-common package | 3 | 2 | 4 | 9 | proposed |
| 006 | Enhancement | Add i18n infrastructure to VS Code extension | 2 | 1 | 4 | 7 | proposed |
| 009 | Feature | Implement VS Code map PNG export using leaflet-image integration | - | - | - | - | proposed |
| 010 | Tech Debt | Add rollback/cleanup API to debrief-stac for interrupted operations | - | - | - | - | proposed |
| 011 | Documentation | Create Jupyter notebook example demonstrating debrief-calc Python API | - | - | - | - | proposed |
| 012 | Enhancement | Wire loader plot count to debrief-stac list_plots call | - | - | - | - | proposed |
| 013 | Bug | [Time Range and Tools panels show empty](https://github.com/debrief/debrief-future/issues/30) | - | - | - | - | proposed |
| 014 | Feature | [Add styling properties schemas to GeoJSON features](docs/ideas/014-geojson-styling-properties.md) | 5 | 4 | 5 | 14 | approved |

## Categories

- **Feature** — New user-facing capability
- **Enhancement** — Improvement to existing capability
- **Bug** — Defect in existing functionality (links to GitHub issue)
- **Tech Debt** — Internal improvement, cleanup, refactoring
- **Infrastructure** — Build, CI/CD, tooling improvements
- **Documentation** — Docs, examples, tutorials

## Notes

- Items without scores are awaiting prioritization
- Ideas-guy and scout add items (status: `proposed`)
- Prioritizer scores proposed items (V/M/A)
- Ideas-guy reviews scored items → changes status to `approved`, parks, or rejects
- `/speckit.start {ID}` requires status `approved`
- Completed items remain (struck through) for historical reference
