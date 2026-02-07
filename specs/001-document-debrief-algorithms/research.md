# Research: Document Debrief Algorithms and Tools for Migration

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07

## Executive Summary

This research documents the technical decisions for systematically documenting every migrateable algorithm and tool in the legacy Debrief Java codebase. The feature produces documentation artifacts (discovery report, golden I/O fixtures, language-neutral specs) — not executable code. Key decisions centre on the two-repo workflow, tool identification strategy, golden I/O capture approach, and incremental delivery.

## Research Topics

### R1: Relationship with Feature 050 (Tool Migration Workflow)

**Decision**: This feature (001) is the EXECUTION of the workflow that feature 050 designed. Feature 050 created the infrastructure (4 commands, 4 agents, templates, Java harness); this feature uses that infrastructure to produce actual deliverables.

**Rationale**:
- Feature 050 produced: `/tool.discover`, `/tool.spec`, `/tool.implement`, `/tool.verify` commands; `legacy-tool-analyst`, `tool-spec-author`, `tool-implementer`, `golden-example-validator` agents; Java capture harness template
- This feature produces: discovery report, golden I/O JSON pairs, and 9-section tool specifications
- The tooling from 050 is available in `debrief-future` but NOT in the legacy `debrief/debrief` repo
- `LEGACY-REPO-TASK.md` inlines all necessary instructions for working in the legacy repo without the commands/agents

**Alternatives Considered**:
- Running 050 commands from debrief-future against legacy source: Rejected because commands assume same-repo context
- Re-implementing the commands in the legacy repo: Rejected — the self-contained task brief is sufficient

### R2: Two-Repository Workflow

**Decision**: Work is performed across two repositories with a staging directory as the bridge.

**Rationale**:
- **Legacy repo** (`debrief/debrief`): Java source analysis, golden I/O capture via harness, and spec authoring happen here because the source code is here
- **Staging directory** (`_tool-migration/` at legacy repo root): All outputs are staged here, structured to mirror the final destination
- **Future repo** (`debrief-future`): Final destination for specs (`shared/tools/`) and discovery report (`docs/tool-migration/`)
- The `_tool-migration/` directory is gitignored or kept in a branch — it is NOT permanent in the legacy repo

**Transfer Process**:
1. Complete work in `_tool-migration/` in the legacy repo
2. Copy `discovery-report.md` → `debrief-future/docs/tool-migration/`
3. Copy `tools/**` → `debrief-future/shared/tools/`
4. Review and merge via PR in debrief-future

### R3: Tool Identification Strategy

**Decision**: Scan four Java package roots using a combination of class name patterns, interface implementations, and method signatures.

**Rationale**:
- **Package roots**: `org.mwc.debrief.core`, `org.mwc.debrief.track_shift`, `org.mwc.cmap.plotViewer`, `Debrief/`
- **Class patterns**: `*Tool`, `*Action`, `*Analyzer`, `*Calculator`, `*Operation`
- **Interface patterns**: `IAction`, `AbstractAction`, `IMenuCreator`
- **Method signatures**: Methods taking `Layers`, `TrackWrapper`, `WatchableList`, `FeatureCollection`
- Claude's natural language understanding (from 050 R4) is used for analysis, not AST parsing

**Exclusions** (classes with no algorithmic body):
- Dialog launchers (`*Dialog`, `*Wizard`, `*Page`) — but capture their parameters as tool inputs
- View factories, preference pages, menu/toolbar wiring
- Deprecated or dead code (`@Deprecated`, unreachable via callers)

### R4: Golden I/O Capture Approach

**Decision**: Two-track approach — Java capture harness (preferred) for tools that can run in isolation, manual construction (fallback) for UI-coupled tools.

**Rationale**:
- **Approach A (preferred)**: Use the `ToolCaptureHarness.java` template from `docs/tool-migration/java-harness-template/`. Requires integrating the harness into the legacy Maven build. Uses Gson 2.10.1 for serialisation.
- **Approach B (fallback)**: Manually construct JSON input/output by reading the Java source and computing expected results by hand. Acceptable for Low-complexity tools and tools tightly coupled to Eclipse RCP.
- Tools using Approach B have their status annotated with "manual construction" in the discovery report

**Serialisation Rules** (mandatory for both approaches):
- Floating-point: full precision, no rounding (epsilon 1e-9 for cross-language comparison)
- Timestamps: ISO 8601, always UTC with `Z` suffix
- Coordinates: `[longitude, latitude]` (GeoJSON convention)
- Collections: deterministic ordering (same order every run)

**Minimum Examples Per Tool**:

| Complexity | Count | Required Cases |
|------------|-------|----------------|
| Low | 1 | `basic` |
| Medium | 3 | `basic`, `edge`, `complex` |
| High | 4+ | `basic`, `edge-1`, `edge-2`, `complex` |

### R5: Category Taxonomy

**Decision**: Start with 9 hypothesised categories; refine during discovery based on actual tool groupings.

**Rationale**:
- Starting categories derive from the 4 already-migrated tools (`track/styling`) and the SRD's domain analysis
- Categories use hierarchical path structure: `{domain}/{subdomain}`
- New categories can be created; existing categories can be merged or split

**Starting Taxonomy**:

| Category | Expected Content |
|----------|-----------------|
| `track/styling` | Colour, symbol, label, line style changes |
| `track/analysis` | CPA, range/bearing, statistical analysis |
| `track/manipulation` | Splitting, merging, interpolation, smoothing |
| `track/measurement` | Distance, speed, course calculations |
| `sensor/calibration` | Bias correction, alignment |
| `sensor/analysis` | Detection analysis, coverage |
| `dataset/export` | Clipboard, CSV, file format conversion |
| `spatial/geometry` | Area calculations, intersections, buffers |
| `narrative/formatting` | Report generation, annotation formatting |

### R6: Quality Assurance — Phase 4 Validation Checklist

**Decision**: Every spec must pass an 11-item validation checklist before being considered "spec-complete".

**Rationale**:
- The checklist is the "test" for documentation quality (Constitution Article VII — checklists as tests)
- Machine-checkable where possible (section count, regex patterns) and human-reviewable otherwise
- Enables self-assessment by AI agents during spec authoring

**The 11 Checklist Items**:
1. Spec file exists at `_tool-migration/tools/{category}/{tool-name}.1.0.md`
2. YAML frontmatter has `name`, `version`, `category`, `status`, `migrated_from`
3. All 9 sections present with non-placeholder content
4. MCP section is clear enough for an LLM to decide when to invoke the tool
5. Algorithm pseudocode uses only approved keywords (no Java/Python/TS syntax)
6. Response builder functions used correctly (`build_mutation`, etc.)
7. Result subtype matches pattern `^[a-z_]+/[a-z_]+$` (underscores, not hyphens)
8. At least one golden example pair exists and is referenced
9. Edge cases table has at least 5 entries
10. `migrated_from` metadata references the legacy Java class
11. Changelog records version 1.0 with date

### R7: Incremental Delivery Strategy

**Decision**: Process tools in priority order — Low-complexity first, batched by category, High-complexity last.

**Rationale**:
- Low-complexity tools validate the process pipeline quickly with minimal risk
- Batching by category lets related tools share context (same Java packages, similar patterns)
- High-complexity tools may need domain expert input or manual pseudocode — tackled last when the process is proven
- Each batch produces a testable increment: discovery entries → golden I/O → specs → validation

**Delivery Order**:
1. `track/styling` — 4 already done; add any remaining
2. `track/measurement` — typically Low complexity (distance, speed calculations)
3. `dataset/export` — typically Low complexity (format conversion)
4. `narrative/formatting` — typically Low complexity (text generation)
5. `track/analysis` — mix of Medium and High (CPA, statistical analysis)
6. `sensor/calibration` — Medium complexity (bias correction)
7. `track/manipulation` — Medium to High (splitting, merging, interpolation)
8. `spatial/geometry` — Medium to High (area calculations, intersections)
9. `sensor/analysis` — High complexity (detection analysis)

### R8: UX Integration Mapping

**Decision**: Document how each of the 10 legacy trigger types maps to 4 Future Debrief surfaces, explicitly flagging gaps.

**Rationale**:
- Legacy Eclipse RCP has 10 distinct trigger types (context-menu, toolbar-button, menu-bar, drag-drop, property-edit, wizard, key-binding, auto/listener, view-action, bulk/batch)
- Future Debrief has 4 primary surfaces: MCP/LLM Tool, VS Code Command, Webview Panel, Context Menu
- Two known gaps: **drag-drop** (no interactive equivalent in MCP/VS Code commands) and **wizard** (no multi-step dialog equivalent)
- Gaps need explicit UX design before the affected tools can be fully migrated

**Known Gap Tools**: Tools invoked via drag-drop (e.g., track-shift) and wizard (e.g., multi-step import flows) will be flagged in the "Tools Requiring New UX Mechanisms" section of the discovery report.

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Feature 049 | Tool documentation model (TEMPLATE.md, pseudocode style guide) | Complete |
| Feature 050 | Tool migration workflow (commands, agents, Java harness) | Complete |
| `debrief/debrief` repo | Legacy Java source code to scan | External — must be available to the migration engineer |
| 4 existing tool specs | Reference examples for tone, structure, detail level | Complete in `shared/tools/track/styling/` |

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Legacy repo not accessible | Cannot scan Java source | Low | LEGACY-REPO-TASK.md is self-contained; can work from cloned repo |
| More tools than estimated | Extends timeline | Medium | Incremental delivery; Low tools first to prove process |
| Tools too complex for pseudocode | Spec quality degraded | Medium | Flag for human review; provide detailed comments in pseudocode |
| Eclipse RCP coupling prevents golden I/O capture | No automated test oracle | Medium | Manual construction (Approach B) is an acceptable fallback |
| Category taxonomy needs significant revision | Rework during discovery | Low | Categories are explicitly labelled as "starting hypothesis" |
| Cross-language floating-point divergence | False test failures | Low | Epsilon 1e-9 tolerance; document precision requirements |

## Conclusion

This feature is the operational execution of the tool migration process designed in features 049 and 050. The key technical decisions — two-repo workflow, two-track golden I/O capture, incremental Low-first delivery, and 11-item quality checklist — all support the goal of producing complete, accurate, and language-neutral documentation of every legacy Debrief tool. The process is designed to be self-correcting: early batches validate the pipeline, and the Phase 4 checklist catches quality issues before specs enter the implementation pipeline.
