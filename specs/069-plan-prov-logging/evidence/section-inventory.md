# Section Inventory: PROV Transition Plan

**Document**: `docs/architecture/prov-transition-plan.md`
**Date**: 2026-02-08

## Area Sections

| # | Section | Heading | Current State | Target State | Gap Analysis | Migration Steps |
|---|---------|---------|:---:|:---:|:---:|:---:|
| 1 | Section 4 | Area 1: ToolResult Contract Expansion | Line ~55 | Line ~95 | Line ~130 | Line ~145 |
| 2 | Section 5 | Area 2: Log Service Design | Line ~160 | Line ~175 | Line ~230 | Line ~245 |
| 3 | Section 6 | Area 3: Undo/Redo Split | Line ~260 | Line ~290 | Line ~310 | Line ~340 |
| 4 | Section 7 | Area 4: Provenance Schema Migration | Line ~355 | Line ~395 | Line ~475 | Line ~490 |
| 5 | Section 8 | Area 5: System Record Feature | Line ~510 | Line ~525 | Line ~570 | Line ~585 |
| 6 | Section 9 | Area 6: Phased Implementation Sequence | N/A (dependency graph + phases) | N/A (SRD cross-ref table) | N/A | N/A |
| 7 | Section 10 | Area 7: Session-State Integration Points | Line ~640 | Line ~665 | Line ~700 | Line ~720 |

## Supporting Sections

| # | Section | Purpose |
|---|---------|---------|
| 1 | Executive Summary | Purpose, scope, Art. XIV reference |
| 2 | Methodology | Current State → Target State → Gap → Migration structure |
| 3 | Codebase Inventory | 23 files affected, grouped by service |
| 11 | Breaking Change Inventory | 16 changes across 3 phases with checklists |
| 12 | In-Flight Feature Guidance | 3 active features with conflict assessment |

## Completeness

- **7/7 areas** have dedicated sections
- **6/7 areas** follow Current/Target/Gap/Migration structure (Area 6 uses a different structure appropriate for phased sequencing)
- **Table of contents** present at document top
- **Mermaid dependency graph** present in Area 6
- **Backlog item templates** present for all 7 phases (0-6)
