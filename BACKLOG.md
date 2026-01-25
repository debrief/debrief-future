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

### Complexity

| Level | Meaning | Model |
|-------|---------|-------|
| **Low** | Straightforward, limited scope | Haiku |
| **Medium** | Moderate scope, some design decisions | Sonnet |
| **High** | Significant scope, complex design | Opus |

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

## Epics

Large features broken down into multiple backlog items.

| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
| 024 | [Storyboarding Briefings](docs/ideas/017-storyboarding-briefings.md) | Add storyboarding capability for mission/exercise briefings | proposed | — |

## Items

<!--
Format:
| ID | Category | Description | V | M | A | Total | Complexity | Status |

Complexity: Low (Haiku), Medium (Sonnet), High (Opus)

Description formats:
- New items from /idea: [Short title](github_issue_url) — links to detailed requirement
- When specified: [Title](docs/specs/feature-name/spec.md) — links to spec
- When complete: entire row gets ~~strikethrough~~
-->

| ID | Category | Description | V | M | A | Total | Complexity | Status |
|----|----------|-------------|---|---|---|-------|------------|--------|
| 021 | Feature | [Add REP file loading to VS Code extension](specs/021-load-rep-files-stac/spec.md) | 5 | 5 | 4 | 14 | Medium | tasked |
| 022 | Feature | [Add SYSTEM kind discriminator for non-spatial state](specs/022-system-kind-discriminator/spec.md) | 5 | 2 | 5 | 12 | Low | tasked |
| 017 | Enhancement | [Configure VS Code extension to hide default activities on load](specs/017-vscode-hide-activities/spec.md) | 3 | 3 | 4 | 10 | Medium | tasked |
| 016 | Infrastructure | [Add dynamic component bundling for blog posts](specs/016-dynamic-blog-components/spec.md) | 3 | 5 | 4 | 12 | Medium | specified |
| 023 | Infrastructure | [Add epic support to speckit workflow](specs/023-epic-workflow-support/spec.md) | 4 | 3 | 4 | 11 | Medium | specified |
| 025 | Feature | [Design time controller UI/UX for VS Code extension](docs/ideas/022-time-controller.md) | 5 | 5 | 4 | 14 | Medium | approved |
| 026 | Feature | [Add annotation shape renderers to VS Code extension](https://github.com/debrief/debrief-future/issues/86) (requires #021) | 5 | 5 | 4 | 14 | Medium | approved |
| 011 | Documentation | Create Jupyter notebook example demonstrating debrief-calc Python API | 4 | 4 | 4 | 12 | Low | approved |
| 002 | Feature | Add MCP wrapper for debrief-io service | 4 | 3 | 4 | 11 | Medium | approved |
| 005 | Tech Debt | Add cross-service end-to-end workflow tests (io -> stac -> calc) | 4 | 2 | 5 | 11 | Low | approved |
| 013 | Bug | [Time Range and Tools panels show empty](https://github.com/debrief/debrief-future/issues/30) | 5 | 2 | 4 | 11 | Low | approved |
| 008 | Feature | Design and implement extension discovery mechanism for contrib packages | 4 | 3 | 3 | 10 | High | approved |
| 019 | Enhancement | [Add 'needs-interview' status to backlog workflow](docs/ideas/019-backlog-interview-capture.md) | 3 | 3 | 5 | 11 | Medium | proposed |
| 020 | Infrastructure | [Add ELLIPSE and POLYGON annotation schemas](https://github.com/debrief/debrief-future/issues/56) | 3 | 2 | 5 | 10 | Low | proposed |
| 004 | Infrastructure | Add contrib folder scaffolding with example extension (requires #008) | 3 | 3 | 4 | 10 | Low | proposed |
| 001 | Infrastructure | Extract shared MCP utilities into mcp-common package | 3 | 2 | 4 | 9 | Medium | proposed |
| 010 | Tech Debt | Add rollback/cleanup API to debrief-stac for interrupted operations | 3 | 1 | 4 | 8 | Medium | proposed |
| 027 | Infrastructure | [Add automated screenshot capture for Storybook stories](docs/ideas/027-automated-screenshots.md) | 3 | 4 | 4 | 11 | Medium | approved |
| 012 | Enhancement | Wire loader plot count to debrief-stac list_plots call | 2 | 1 | 5 | 8 | Low | proposed |
| 027 | Documentation | [Document vscrui as standard component library for VS Code webviews](docs/ideas/027-vscrui-component-library.md) | 3 | 1 | 5 | 9 | Low | approved |
| 027 | Documentation | [Document Storybook VS Code theming setup](docs/ideas/027-storybook-vscode-theming.md) | 2 | 2 | 5 | 9 | Low | approved |
| 018 | Infrastructure | [Add VS Code multi-root workspace configuration](specs/018-vscode-workspace-config/spec.md) | 3 | 1 | 5 | 9 | Low | shipped |
| ~~014~~ | ~~Feature~~ | ~~[Add styling properties schemas to GeoJSON features](specs/014-geojson-styling-schemas/spec.md)~~ | ~~5~~ | ~~4~~ | ~~5~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~015~~ | ~~Infrastructure~~ | ~~[Create LinkML schemas for REP annotation item types](specs/015-annotation-item-schemas/spec.md)~~ | ~~5~~ | ~~3~~ | ~~5~~ | ~~13~~ | ~~Medium~~ | ~~complete~~ |
| ~~007~~ | ~~Enhancement~~ | ~~[Implement REP file special comments (NARRATIVE, CIRCLE, etc.)](specs/007-rep-special-comments/spec.md)~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |

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
