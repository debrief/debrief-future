# Quickstart: Using the PROV Transition Plan

**Feature**: 069 — Plan PROV Logging Integration
**Date**: 2026-02-08

## What This Delivers

A single transition plan document at `docs/architecture/prov-transition-plan.md` that bridges the current codebase to the SRD provenance target.

## How to Read the Plan

### If you're picking up a PROV backlog item

1. Open `docs/architecture/prov-transition-plan.md`
2. Find the section for your phase (0-6)
3. Read "Current State" to see what exists today (with file paths)
4. Read "Target State" to see what the SRD requires
5. Read "Migration Steps" for the ordered list of changes
6. Check the dependency graph to confirm prerequisites are complete

### If you're checking for conflicts

1. Open the **Breaking Change Inventory** section
2. Search for the file you're working on
3. If listed, check which phase changes it and what the change is
4. Plan your work accordingly (merge before or after the PROV change)

### If you're creating backlog items from the plan

1. Open the **Phased Implementation Sequence** section
2. Each phase maps to one or more backlog items
3. Use the phase description, inputs/outputs, and acceptance criteria to populate the backlog item
4. Verify dependencies using the Mermaid diagram

## Key Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| SRD (Provenance & Undo) | `docs/srd-prov-undo.md` | Authoritative design for PROV system |
| UX Log Panel | `docker/code-server/ux-log-panel.md` | Log Panel UX specification |
| Transition Plan | `docs/architecture/prov-transition-plan.md` | **This feature's deliverable** |
| Feature Spec | `specs/069-plan-prov-logging/spec.md` | Requirements for the plan itself |
| Research | `specs/069-plan-prov-logging/research.md` | Gap analysis and design decisions |
| Data Model | `specs/069-plan-prov-logging/data-model.md` | Entity inventory (current vs target) |

## Verification

After the transition plan is written, verify against spec acceptance criteria:

- [ ] All 7 areas have sections with "Current State" and "Target State"
- [ ] Dependency graph is acyclic (visually inspect Mermaid diagram)
- [ ] Every SRD priority P1-P6 maps to at least one phase
- [ ] Breaking change inventory lists specific file paths
- [ ] Each phase can stand alone as a backlog item
- [ ] All referenced file paths exist in the repository
