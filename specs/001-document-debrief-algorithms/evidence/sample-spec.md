# Sample Spec — Representative Completed Tool Specification

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07
**Tool**: group-tracks (track/manipulation, Low complexity)

This is a representative completed tool specification demonstrating all 9 required sections.
The original file is at `shared/tools/track/manipulation/group-tracks.1.0.md`.

---

## Validation Against 11-Item Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Spec file exists at correct path | PASS |
| 2 | YAML frontmatter complete (name, version, category, status, migrated_from) | PASS |
| 3 | All 9 sections present with non-placeholder content | PASS |
| 4 | MCP description clear enough for LLM invocation | PASS |
| 5 | Pseudocode uses only approved keywords | PASS |
| 6 | Response builder functions used correctly | PASS — uses build_mutation, build_error |
| 7 | Result subtype matches pattern `^[a-z_]+/[a-z_]+$` | PASS — `track/grouped` |
| 8 | Golden example pair exists and is referenced | PASS |
| 9 | Edge cases table has 5+ entries | PASS — 7 entries |
| 10 | migrated_from references legacy Java class | PASS |
| 11 | Changelog records version 1.0 with date | PASS |

**Result**: 11/11 PASS — Spec-Complete

---

## Spec Content

```yaml
---
name: group-tracks
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GroupTracks
---
```

### Sections Present

1. **Title + Summary** — "Groups multiple tracks into a single track containing track segments"
2. **MCP** — Description, When to use, Parameters, Returns
3. **Inputs** — Schema reference, Constraints (3), Defaults
4. **Outputs** — Result type `mutation/track/grouped`, Content Items, Annotations
5. **Algorithm** — Pseudocode using FUNCTION, IF/ELSE, FOR EACH, SORT, RETURN
6. **Edge Cases** — 7 scenarios including empty input, single track, mixed kinds, overlapping times
7. **Examples** — Basic example with inline JSON, Golden file references, Error response example
8. **Changelog** — Version 1.0 (2026-02-07)
9. **References** — ToolResult architecture, Related tools (3), Input schemas, Legacy class
