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

1. **Proposed** — Item added with description (by scout or human)
2. **Specified** — Description becomes link to `docs/specs/*/spec.md`
3. **Clarified** → **Planned** → **Tasked** — Speckit workflow progresses
4. **Implementing** — Active development
5. **Complete** — ~~Strikethrough row~~, item done

## Items

<!--
Format:
| ID | Category | Description | V | M | A | Total | Status |

When specified, description becomes: [Title](docs/specs/feature-name/spec.md)
When complete, entire row gets ~~strikethrough~~
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

## Categories

- **Feature** — New user-facing capability
- **Enhancement** — Improvement to existing capability
- **Tech Debt** — Internal improvement, cleanup, refactoring
- **Infrastructure** — Build, CI/CD, tooling improvements
- **Documentation** — Docs, examples, tutorials

## Notes

- Items without scores are awaiting prioritization
- Scout adds items; Prioritizer scores them
- Human reviews and approves before speckit workflow begins
- Completed items remain (struck through) for historical reference
