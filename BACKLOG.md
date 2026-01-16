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
| _Example entries below — replace with real items_ ||||||| |
| 001 | Feature | Example: Real-time track interpolation | 4 | 5 | 3 | 12 | proposed |
| 002 | Tech Debt | Example: Add missing unit tests for io service | 3 | 2 | 5 | 10 | proposed |

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
