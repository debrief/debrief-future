# Epic 10: NL-Assisted Catalog Discovery — Dependency Fishbone

```mermaid
---
title: "E10 Fishbone: Dependency Flow"
---
graph LR
    %% ── Spine: the goal ──────────────────────────────────
    GOAL{{"E10\nNL-Assisted\nCatalog Discovery"}}

    %% ── Phase 0: Foundation ──────────────────────────────
    subgraph P0["Phase 0 — Foundation"]
        direction TB
        B180(["#180 Platform Registry ✅"])
        B181(["#181 LinkML Schema Update"])
        B180 --> B181
    end

    %% ── Phase 1: Import Pipeline ─────────────────────────
    subgraph P1["Phase 1 — Import Pipeline"]
        direction TB
        B182(["#182 Import Handler Warnings"])
        B183(["#183 Save-time Registry Resolution"])
        B184(["#184 Nuke + Regenerate Catalog"])
        B182 --> B184
        B183 --> B184
    end

    %% ── Phase 2: CQL2 Extension ─────────────────────────
    subgraph P2["Phase 2 — CQL2 Extension"]
        direction TB
        B185(["#185 CQL2 array_filter Evaluator"])
        B186(["#186 Filter Bar Platform Chips"])
        B185 --> B186
    end

    %% ── Phase 3: NL → CQL2 ──────────────────────────────
    subgraph P3["Phase 3 — NL → CQL2"]
        direction TB
        B187(["#187 Build-time Enum Extraction"])
        B188(["#188 NL → CQL2 Prompt Design"])
        B189(["#189 LLM Transport Integration"])
        B187 --> B188
        B188 --> B189
    end

    %% ── Phase 4: Stakeholder Demo ────────────────────────
    subgraph P4["Phase 4 — Stakeholder Demo"]
        direction TB
        B190(["#190 Prototype Demo UI"])
    end

    %% ── Cross-phase dependencies (the "bones") ──────────
    B180 --> B182
    B180 --> B183
    B181 --> B183
    B181 --> B185
    B180 --> B187
    B184 --> B187
    B185 --> B188
    B186 --> B190
    B189 --> B190

    %% ── Converge on goal ─────────────────────────────────
    P4 --> GOAL

    %% ── External dependencies (upstream — all complete) ──
    subgraph EXT["External Dependencies (all complete)"]
        direction TB
        E126(["#126 CQL2 Filter Engine ✅"])
        E127(["#127 Filter Bar Lozenge UI ✅"])
        E125(["#125 STAC Extension Mock Data ✅"])
    end

    E126 -.->|"extended by"| B185
    E127 -.->|"extended by"| B186
    E125 -.->|"affected by"| B184

    %% ── Styling ─────────────────────────────────────────
    classDef complete fill:#4caf50,stroke:#2e7d32,color:#fff
    classDef proposed fill:#42a5f5,stroke:#1565c0,color:#fff
    classDef external fill:#4caf50,stroke:#2e7d32,color:#fff,stroke-dasharray: 5 5
    classDef goal fill:#ab47bc,stroke:#6a1b9a,color:#fff

    class B180 complete
    class B181,B182,B183,B184,B185,B186,B187,B188,B189,B190 proposed
    class E126,E127,E125 external
    class GOAL goal
```

## Dependency Summary

| Item | Depends On | Depended On By | Phase |
|------|-----------|----------------|-------|
| **#180** Platform Registry | — | #181, #182, #183, #187 | 0 |
| **#181** LinkML Schema Update | #180 | #183, #185 | 0 |
| **#182** Import Handler Warnings | #180 | #184 | 1 |
| **#183** Save-time Registry Resolution | #180, #181 | #184 | 1 |
| **#184** Nuke + Regenerate Catalog | #182, #183 | #187 | 1 |
| **#185** CQL2 `array_filter` Evaluator | #181 | #186, #188 | 2 |
| **#186** Filter Bar Platform Chips | #185 | #190 | 2 |
| **#187** Build-time Enum Extraction | #180, #184 | #188 | 3 |
| **#188** NL → CQL2 Prompt Design | #185, #187 | #189 | 3 |
| **#189** LLM Transport Integration | #188 | #190 | 3 |
| **#190** Stakeholder Demo UI | #186, #189 | — | 4 |

## Critical Path

**#180** → **#181** → **#183** → **#184** → **#187** → **#188** → **#189** → **#190**

This 8-item chain determines the minimum elapsed time. The critical path runs through Foundation → Import Pipeline → NL → CQL2 → Demo.

## Parallel Work Opportunities

- **#182** (Import Warnings) can start as soon as #180 is done (already complete)
- **#185** (CQL2 array_filter) can start as soon as #181 is done, independently of the Import Pipeline
- **#186** (Filter Bar Chips) and **#187** (Enum Extraction) can run in parallel once their respective prerequisites are met

## Legend

- 🟢 **Green (solid)** — Complete (E10 items)
- 🟢 **Green (dashed)** — Complete (external dependencies)
- 🔵 **Blue** — Proposed (not yet started)
- 🟣 **Purple** — Epic goal
