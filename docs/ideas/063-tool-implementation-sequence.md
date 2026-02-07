# Analyse tool specs to produce phased implementation sequence

## Problem

We have 63 language-neutral tool specifications with 151 golden I/O pairs across 7 categories. Before implementing these tools in Python (debrief-calc), we need a structured implementation sequence that accounts for:

- **Dependencies between tools** (e.g., measurement tools are inputs to analysis tools)
- **Schema prerequisites** (#062 — 7 missing FeatureKindEnum values block 30+ tools)
- **Complexity progression** (Low → Medium → High validates the pipeline incrementally)
- **Strategic value** (which tools best demonstrate capability for Spring 2026 stakeholders?)
- **Infrastructure prerequisites** (tool documentation model #049, calc service scaffolding)

## Proposed Solution

Analyse all 63 tool specs and produce a phased implementation plan:

1. **Read every spec** in `shared/tools/` to understand inputs, outputs, and inter-tool dependencies
2. **Build a dependency graph** — which tools produce features that other tools consume?
3. **Group into implementation phases** considering:
   - Phase 0: Schema extensions (#062) and infrastructure prerequisites
   - Phase 1: Foundation tools (low-complexity, no inter-tool dependencies)
   - Phase 2+: Progressive phases building on prior phases
4. **Produce a deliverable** at `docs/tool-migration/implementation-sequence.md` with:
   - Dependency graph (Mermaid diagram)
   - Phase definitions with tool lists and rationale
   - Recommended backlog items (one per phase)
   - Risk assessment per phase

## Success Criteria

- Every spec in `shared/tools/` is assigned to exactly one phase
- Dependency ordering is correct (no tool depends on an unimplemented tool in a later phase)
- Each phase is independently deliverable and testable
- Low-complexity tools appear in early phases, high-complexity in later phases
- The sequence aligns with strategic themes (prove architecture, stakeholder demos)

## Constraints

- Must account for #062 (FeatureKindEnum schema extensions) as a prerequisite for phases using SENSOR, TMA_SEGMENT, etc.
- Tools in debrief-calc must follow the existing MCP service pattern
- Golden I/O fixtures become the acceptance tests for each implementation

## Out of Scope

- Actual tool implementation (separate backlog items per phase)
- VS Code UI integration for tools (already handled by #038, context-sensitive tool offering)
- Schema changes themselves (#062 is a separate item)
