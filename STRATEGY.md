# Strategy

Current strategic priorities for Future Debrief. This document bridges VISION.md (why we exist) and BACKLOG.md (what we're building).

Maintained by the `the-ideas-guy` agent with human oversight.

## Current Phase: Tracer Bullet (Q1 2026)

Validate the architecture with a thin end-to-end thread before investing in breadth.

**Phase goal**: Load a REP file → store in STAC → display in VS Code → run analysis tool → see results.

**Phase complete when**: Full workflow demonstrable, architecture validated, foundation ready for stakeholder engagement.

## Active Themes

### 1. Prove the Architecture

Every feature must contribute to the end-to-end workflow. Avoid breadth until depth is proven.

**Filter**: Does this item help complete or validate the tracer bullet? If not, defer it.

### 2. Enable Scientist Self-Service

Reduce barriers to Python tool creation. Success = a domain expert builds a calc tool without touching core platform.

**Filter**: Does this make it easier for non-core-developers to extend Debrief?

### 3. Demonstrate Value for Stakeholder Engagement

Spring 2026 brings stakeholder conversations. We need compelling demos and clear capability narratives.

**Filter**: Will this help us show (not tell) what Debrief v4 can do?

## Opportunity Evaluation Criteria

Before adding items to BACKLOG.md, they should pass this filter:

| Question | If No... |
|----------|----------|
| Does it serve an active theme above? | Park it for future phase |
| Can it work offline? | Reject or redesign |
| Does it require major UI framework changes? | High bar — justify carefully |
| Is it duplicating legacy features we've decided to retire? | Reject |
| Can we verify it works without manual testing? | Lower the Autonomy score |

## Current Trade-offs

| We're Choosing... | Over... | Because... |
|-------------------|---------|------------|
| Depth (full workflow) | Breadth (many formats) | Architecture validation comes first |
| VS Code extension | Standalone application | Lower barrier, faster iteration, broader reach |
| Local-first | Cloud features | Core users work in air-gapped environments |
| Python services | Polyglot services | Scientist accessibility is a core value prop |
| Schema-first | Code-first | Enables future migrations, multi-language support |

## Scoring Guidance

The BACKLOG.md scoring dimensions (Value, Media, Autonomy) should be interpreted through current strategy:

### Value (V) — Current Phase Lens

- **5**: Directly enables tracer bullet completion or unblocks scientist self-service
- **4**: Significantly improves a shipped capability or fills an architectural gap
- **3**: Useful enhancement to existing functionality
- **2**: Nice-to-have improvement
- **1**: Cosmetic or very minor

### Media (M) — Stakeholder Engagement Lens

- **5**: Compelling demo for Spring 2026 stakeholder conversations
- **4**: Good visual story, would engage defence scientists on LinkedIn
- **3**: Interesting technical narrative for developer audience
- **2**: Technical audience only, limited visual appeal
- **1**: Internal improvement, hard to communicate externally

### Autonomy (A) — Unchanged

AI-implementation suitability remains objective, not strategy-dependent.

## Parking Lot

Items that don't fit current strategy but may return later:

| Item | Reason Parked | Revisit When |
|------|---------------|--------------|
| Browser SPA dashboard | Out of scope for tracer bullet | After VS Code extension proves value |
| Real-time streaming | Not post-exercise analysis | Unless stakeholder demand emerges |
| Cloud STAC synchronisation | Offline-first phase | NATO pilot planning begins |
| Legacy feature parity | Rebuild, not clone | Specific stakeholder requests |
| Shared Web Components library (BACKLOG #003) | No VS Code extension exists yet to extract from | VS Code extension development begins (tracer bullet step 6) |
| VS Code map PNG export (BACKLOG #009) | Nice demo but not tracer bullet critical | After core workflow validated |
| i18n infrastructure (BACKLOG #006) | Premature for NATO pilot | NATO pilot planning begins |

## Rejected Items Log

Items rejected from backlog with reasons. Helps scout learn what doesn't fit.

| Date | Item | Reason | Proposed By |
|------|------|--------|-------------|
| — | *(none yet)* | — | — |

## Strategic Decisions Log

Record significant prioritisation decisions here for future reference.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01 | Tracer bullet before breadth | Validate architecture with thin slice before investing in many formats/tools |
| 2026-01 | VS Code as primary frontend | Lower barrier than Electron standalone; developer audience familiar with it |
| 2026-01-16 | Batch approval: 6 items for tracer bullet | Approved #002, #005, #007, #008, #011, #013 - all serve Themes 1-3; parked #006, #009 |

---

*Document version: 1.1 — January 2026*
*Next review: At phase boundary (post tracer bullet)*
