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
| **needs-interview** | Quick capture, awaiting detailed requirements | `/idea --defer` |
| **proposed** | Item added, awaiting review | Scout adds, ideas-guy adds, or human submits |
| **approved** | Strategically reviewed, ready for spec | Ideas-guy approves |
| **specified** | Spec created, linked below | `/speckit.start {ID}` |
| **clarified** | Ambiguities resolved | `/speckit.clarify` |
| **planned** | Implementation plan ready | `/speckit.plan` |
| **tasked** | Tasks broken down | `/speckit.tasks` |
| **implementing** | Active development | `/speckit.implement` or `/bugfix` |
| **complete** | Done (row struck through) | `/speckit.pr` merged or `/bugfix` PR merged |

### Backlog Flow

```
1. IDEATION
   the-ideas-guy ──generates──> strategic ideas ──────────┐
   opportunity-scout ──explores──> technical opportunities │
                                                          ▼
                                                    BACKLOG.md
                                                          │
                  ┌───────────────────┬───────────────────┘
                  │                   │
                  ▼                   ▼
           (needs-interview)     (proposed)
           Quick capture         Full detail
                  │                   │
                  │                   │
2. INTERVIEW      │                   │
   /interview ────┘                   │
   completes requirements gathering   │
          │                           │
          └─────────────> proposed <──┘
                              │
3. SCORING (backlog-prioritizer)
   scores V/M/A for proposed items
                              │
4. REVIEW (the-ideas-guy)
   reviews scored items against STRATEGY.md
      ├── Approve → status: approved
      ├── Park → STRATEGY.md Parking Lot
      └── Reject → STRATEGY.md Rejected Log
                              │
5. SPECIFICATION              ▼
   /speckit.start {ID} ← requires status: approved
                              │
   OR (for Bug items only):   │
   /bugfix {ID} ──────────────┼──> implementing ──> complete
                              │    (skips specify → tasked)
```

### Status Validation Rules

| Command | Required Status | Error if Wrong Status |
|---------|-----------------|----------------------|
| `/interview` | `needs-interview` | "Item {ID} doesn't need an interview (status: {status})" |
| `/speckit.start` | `approved` | "Item {ID} needs interview first. Run `/interview` to complete requirements gathering." (if `needs-interview`) |
| `/speckit.start` | `approved` | "Item {ID} has status '{status}'. Only 'approved' items can be started." (other statuses) |

**Quick Capture Path** (via `/idea --defer`):
1. User captures idea quickly → status: `needs-interview`
2. Later, user runs `/interview` → conducts full interview → status: `proposed`
3. Normal flow continues: scoring → approval → specification

**Full Detail Path** (via `/idea`):
1. User provides full detail with interview → status: `proposed`
2. Normal flow continues: scoring → approval → specification

### Starting Specification Work

When an item has status `approved`:

```bash
/speckit.start 007    # Validates item is approved, creates spec, updates this file
```

This bridges backlog approval to the speckit workflow by:
1. Validating the item exists and has status `approved`
2. Creating a feature branch and specification
3. Updating this file: status → `specified`, description → link to spec

### Bug Fast-Track

Bug items (`Category: Bug`) skip the full speckit pipeline. A bug fix restores existing specified behaviour — it doesn't need a new spec, plan, or task breakdown.

```bash
/bugfix 013    # Validates item is approved + Category is Bug, then fix → test → PR
```

**Fast-track status flow**:
```
approved → implementing → complete
```

**What is skipped**: specification, clarification, planning, task breakdown, media content, evidence artifacts.

**What still applies**: tests required (Constitution Art. VI), atomic commits (Art. XIII), PR with summary and test plan.

**Constitution note**: Article VIII ("Specs before code") applies to *significant new implementations*. A bug fix restores behaviour already defined by a prior feature's spec, so it falls outside this gate.

## Epics

Large features broken down into multiple backlog items.

| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
| 024 | [Storyboarding Briefings](docs/ideas/017-storyboarding-briefings.md) | Add storyboarding capability for mission/exercise briefings | proposed | — |
| E01 | Tool Implementation Sequence | Implement 63 documented legacy tools in phased order | approved | #062, #063, #064, #065, #066, #067, #068 |
| E02 | PROV Logging Implementation | [Implement PROV logging system per SRD priorities P1-P6](docs/architecture/prov-transition-plan.md) | approved | #070, #071, #072, #073, #074, #075, #076 |
| E03 | Buffer Zone Analysis Demo | [Reactive PROV cascade with 5-tool chain for stakeholder demo](docs/ideas/E03-buffer-zone-analysis-demo.md) | approved | #078, #079, #080, #081, #082, #084 |
| E04 | Results Visualization | [Vega-Lite based results viewing infrastructure](docs/ideas/E04-results-visualization.md) | approved | #085, #086, #087, #088, #089, #090 |
| ~~E05~~ | ~~Shape Drawing Tools~~ | ~~Add shape drawing tools to map via Geoman (point, rectangle, polygon, polyline) with '+' toolbar dropdown~~ | ~~complete~~ | ~~#091, #092, #093, #094, #095, #096~~ |
| E06 | Architectural Consistency | [Fix implementation drift and constitutional violations from six-axis review](docs/architectural-consistency-review.md) | approved | #102, #103, #104, #105, #106, #107, #108, #109, #110, #111, #112 |
| E07 | Sensor Data Pipeline | [Port legacy sensor capabilities in 7 phases: schema, import, rendering, array offsets, residuals, TMA, interactive drag](docs/ideas/E07-sensor-data-pipeline.md) | proposed | #116, #117, #118, #119, #120, #121, #122 |

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
| 102 | Bug | [Add feature-level provenance to TS tool executor](docs/architectural-consistency-review.md#f-15-web-shell-provenance-on-tool-results-art-iii1) [E06] — TS toolService lacks W3C PROV LogEntry attachment; constitutional violation Art. III.1 (Blocking) | 5 | 3 | 4 | 12 | Medium | approved |
| 103 | Bug | [Canonicalize `kind` attribute values in LinkML schema](docs/architectural-consistency-review.md#f-22-kind-attribute-values-diverge) [E06] — Python/TS produce different kind values; define in LinkML and propagate constants (Blocking) | 5 | 3 | 4 | 12 | Medium | approved |
| 104 | Bug | [Align range-bearing tool: selection requirements + GeoJSON output](docs/architectural-consistency-review.md#f-24-range-bearing-selection-requirements-diverge) [E06] — Python accepts TRACK+SHAPE and returns non-GeoJSON; TS requires 2 TRACK and returns GeoJSON; align both (F-2.4, F-2.5) | 4 | 3 | 4 | 11 | Medium | approved |
| 105 | Tech Debt | [Unify tool type definitions and consolidate MCP adapters](docs/architectural-consistency-review.md#f-51-vs-code-typestooltts-extends-schema-types) [E06] — VS Code hand-authored types shadow schema-generated types; two mcpAdapter files diverge; no legacy to support (F-5.1, F-5.2) | 4 | 2 | 4 | 10 | Medium | approved |
| 106 | Tech Debt | [Add post-execution output validation to TS tools](docs/architectural-consistency-review.md#f-23-typescript-has-no-output-validation) [E06] — Python validates tool output; TS has zero post-execution validation (requires #103) | 4 | 2 | 4 | 10 | Medium | approved |
| 107 | Bug | [Align area-summary tool input semantics](docs/architectural-consistency-review.md#f-26-area-summary-input-semantics-diverge) [E06] — Python expects context.bounds; TS extracts bbox from coordinates; same algorithm, different contract | 4 | 2 | 4 | 10 | Low | approved |
| 108 | Tech Debt | [Wire drawing mode and palette to session-state store](docs/architectural-consistency-review.md#f-31-drawing-mode-not-using-session-state-store) [E06] — both frontends use local useState instead of session-state; drawing mode resets on webview re-render (F-3.1, F-3.2) | 3 | 2 | 5 | 10 | Low | approved |
| 109 | Tech Debt | [Unify result layer lifecycle across frontends](docs/architectural-consistency-review.md#f-33-result-layers-have-different-lifecycles) [E06] — web-shell uses persistent app state; VS Code uses ephemeral webview state; neither persists to STAC | 4 | 3 | 3 | 10 | High | approved |
| 110 | Tech Debt | [Investigate and resolve tool-level undo gap in VS Code](docs/architectural-consistency-review.md#f-35-tool-level-undo-only-in-web-shell) [E06] — web-shell has full tool undo via Log Service; VS Code only has UI-state undo; Log Service exists but VS Code never invokes it | 4 | 3 | 3 | 10 | High | approved |
| 111 | Tech Debt | [Add periodic heartbeat re-validation for Python dependencies](docs/architectural-consistency-review.md#f-65-periodic-heartbeats-missing) [E06] — after activation, if debrief-calc becomes unavailable, status bar stays green until next tool execution fails | 3 | 2 | 5 | 10 | Low | approved |
| 112 | Tech Debt | [Align result type annotations and provenance field naming with spec](docs/architectural-consistency-review.md#f-42-web-shell-resulttype-annotation-uses-wrong-format) [E06] — resultType missing type prefix; provenance field naming needs doc/code alignment (F-4.2, F-4.3) | 3 | 1 | 5 | 9 | Low | approved |
| 123 | Tech Debt | Add `disabled` and `rationale` fields to Python `LogEntry` model — fields exist in LinkML schema (log-entry.yaml:61-69) and TypeScript types but not in Python Pydantic model (models.py); Art. II.1 violation, same gap pattern as #116's inputState fix | 3 | 1 | 5 | 9 | Low | proposed |
| 124 | Bug | Log Panel webview fails to load in VS Code E2E (openvscode-server) — `getLogPanelFrame()` cannot find `[data-testid="log-panel"]` in any webview frame; all 5 `test-capture-log-evidence` tests time out; likely extension activation or webview view registration issue in openvscode-server | 4 | 1 | 4 | 9 | Medium | proposed |
| 061 | Feature | [Add generate courses and speeds for track tool spec](specs/061-generate-courses-speeds/spec.md) (requires #049) | 4 | 3 | 5 | 12 | Low | implementing |
| ~~028~~ | ~~Tech Debt~~ | ~~[Add comprehensive unit tests for stacService](specs/028-stacservice-unit-tests/spec.md)~~ | ~~4~~ | ~~2~~ | ~~5~~ | ~~11~~ | ~~Low~~ | ~~complete~~ |
| 076 | Feature | [Implement replay and parameter tuning](specs/076-replay-tune/spec.md) [E02] — parameter editing, positional replay, revert operations (requires #071, #074) | 5 | 4 | 2 | 11 | High | implementing |
| 056 | Feature | [Add move shape tool spec](specs/056-move-shape/spec.md) (requires #049) | 3 | 3 | 5 | 11 | Low | implementing |
| ~~016~~ | ~~Infrastructure~~ | ~~[Add dynamic component bundling for blog posts](specs/016-dynamic-blog-components/spec.md)~~ | ~~3~~ | ~~5~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| 080 | Feature | [Implement buffer-zone-generator tool](specs/080-buffer-zone-generator/spec.md) [E03] — stub sensor model returning 3 detection-likelihood buffer polygons (requires #049, #079) | 4 | 4 | 4 | 12 | Medium | specified |
| 091 | Feature | [Add tool parameter context menus for pre-execution configuration](specs/091-tool-parameter-context-menus/spec.md) — successive inline context menus in webview to collect parameter values before tool execution; presets defined in LinkML | 4 | 4 | 3 | 11 | High | specified |
| ~~092~~ | ~~Infrastructure~~ | ~~[[E05] Integrate Geoman drawing library](specs/092-integrate-geoman-drawing-library/spec.md) [E05]~~ | ~~4~~ | ~~3~~ | ~~3~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| ~~091-E05~~ | ~~Infrastructure~~ | ~~[[E05] Add POLY FeatureKind for arbitrary polygons](specs/091-poly-featurekind/spec.md) [E05]~~ | ~~3~~ | ~~2~~ | ~~5~~ | ~~10~~ | ~~Low~~ | ~~complete~~ |
| 068 | Feature | [Implement Phase 5 tools: track/analysis](docs/ideas/068-implement-tools-phase5-analysis.md) [E01] — 8 high-complexity TMA, zig detection, and plotting tools (requires #062, #064, #067) | 5 | 5 | 3 | 13 | High | approved |
| 066 | Feature | [Implement Phase 3 tools: track/manipulation](docs/ideas/066-implement-tools-phase3-manipulation.md) [E01] — 12 group, merge, split, trim, interpolate tools (requires #062, #064) | 5 | 4 | 4 | 13 | High | approved |
| 064 | Feature | [Implement Phase 1 tools: track/measurement](docs/ideas/064-implement-tools-phase1-measurement.md) [E01] — 19 foundational calculation tools (requires #049, #062, #063) | 5 | 4 | 4 | 13 | High | approved |
| 055 | Feature | [Add track-position to track range/bearing tool spec](specs/055-track-position-range-bearing/spec.md) (requires #049, #053) | 4 | 4 | 5 | 13 | Medium | specified |
| 084 | Feature | [Wire buffer zone analysis demo end-to-end](docs/ideas/E03-buffer-zone-analysis-demo.md) [E03] — 5-step reactive PROV cascade with edit-mode map interaction (requires #076, #078-082, E04 #086, E04 #089) | 5 | 5 | 2 | 12 | High | approved |
| ~~067~~ | ~~Feature~~ | ~~[Implement Phase 4 tools: sensor/analysis + calibration](docs/ideas/067-implement-tools-phase4-sensor.md) [E01] — 9 sensor contact, ambiguity, and frequency tools (requires #062, #064)~~ | ~~5~~ | ~~4~~ | ~~3~~ | ~~12~~ | ~~High~~ | ~~absorbed by E07~~ |
| 116 | Feature | [[E07] Sensor schema overhaul](docs/ideas/E07-sensor-data-pipeline.md#phase-1-sensor-schema-overhaul-116) [E07] — full SensorContact/SensorData redesign with display properties, array offset modes, measured positions; update 9 tool spec fixtures (requires #062) | - | - | - | - | High | proposed |
| 117 | Feature | [[E07] REP sensor import](docs/ideas/E07-sensor-data-pipeline.md#phase-2-rep-sensor-import-117) [E07] — SENSOR v1/v2/v3 and SENSORARC parsers in debrief-io (requires #116) | - | - | - | - | Medium | proposed |
| 118 | Feature | [[E07] Sensor rendering](docs/ideas/E07-sensor-data-pipeline.md#phase-3-sensor-rendering-118) [E07] — Leaflet custom layer for bearing lines, ambiguous bearings, sensor arcs, snail mode (requires #116, #117) | - | - | - | - | High | proposed |
| 119 | Feature | [[E07] Array offset calculations](docs/ideas/E07-sensor-data-pipeline.md#phase-4-array-offset-calculations-119) [E07] — PLAIN, WORM, MEASURED array centre modes (requires #116) | - | - | - | - | Medium | proposed |
| 120 | Feature | [[E07] Bearing and frequency residual analysis](docs/ideas/E07-sensor-data-pipeline.md#phase-5-bearing--frequency-residual-analysis-120) [E07] — Doublet infrastructure, stacked dots custom React component, Doppler calculations (requires #116, #119) — **deferred pending executive sponsorship** | - | - | - | - | High | proposed |
| 121 | Feature | [[E07] TMA data model and solution generation](docs/ideas/E07-sensor-data-pipeline.md#phase-6-tma-data-model--solution-generation-121) [E07] — TMA schemas, Absolute/Relative segments, solution generation from sensor cuts (requires #116, #120) — **deferred pending executive sponsorship** | - | - | - | - | High | proposed |
| 122 | Feature | [[E07] TMA interactive drag](docs/ideas/E07-sensor-data-pipeline.md#phase-7-tma-interactive-drag-122) [E07] — rotate/shear/stretch drag modes with live residual feedback (requires #121, #120) — **deferred pending executive sponsorship** | - | - | - | - | High | proposed |
| 063 | Infrastructure | [Analyse tool specs for phased implementation sequence](docs/ideas/063-tool-implementation-sequence.md) [E01] — dependency graph, phase groupings, and per-phase backlog items for 63 documented tools | 5 | 3 | 4 | 12 | Medium | approved |
| ~~085~~ | ~~Feature~~ | ~~[Chart renderer + dataset-to-spec transformer](docs/ideas/E04-results-visualization.md) [E04] — React component with Vega-Lite (swappable); transformer converts standard result datasets to render specs~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| 079 | Feature | [Implement move-track tool](docs/ideas/E03-buffer-zone-analysis-demo.md) [E03] — offset track by range/bearing with map drag support (requires #049, #062) | 4 | 4 | 4 | 12 | Medium | approved |
| 081 | Feature | [Implement point-in-zone-classifier tool](docs/ideas/E03-buffer-zone-analysis-demo.md) [E03] — classify and recolor reference points by buffer zone membership (requires #049, #078, #080) | 4 | 4 | 4 | 12 | Medium | approved |
| 082 | Feature | [Implement zone-histogram-generator tool](docs/ideas/E03-buffer-zone-analysis-demo.md) [E03] — outputs dataset/zone_histogram, point counts per buffer zone (requires #049, #081) | 4 | 4 | 4 | 12 | Medium | approved |
| ~~094~~ | ~~Feature~~ | ~~[[E05] Implement point and rectangle drawing](docs/ideas/094-point-rectangle-drawing.md) (requires #091, #092, #093) [E05]~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| 011 | Documentation | Create Jupyter notebook example demonstrating debrief-calc Python API | 4 | 4 | 4 | 12 | Low | approved |
| 065 | Feature | [Implement Phase 2 tools: track/styling + dataset/export](docs/ideas/065-implement-tools-phase2-styling-export.md) [E01] — 15 styling and export tools (requires #064) | 4 | 3 | 4 | 11 | Medium | approved |
| 060 | Feature | [Add resample track tool spec](docs/ideas/060-resample-track.md) (requires #049) | 4 | 3 | 4 | 11 | Medium | approved |
| 002 | Feature | Add MCP wrapper for debrief-io service | 4 | 3 | 4 | 11 | Medium | approved |
| 089 | Feature | [Result view auto-refresh on logical ID change](docs/ideas/E04-results-visualization.md) [E04] — watches logical result IDs, re-renders preserving viewport; absorbs E03 #083 (requires #086, #087, #088) | 4 | 4 | 3 | 11 | Medium | approved |
| ~~086~~ | ~~Feature~~ | ~~[Results bottom panel with tabbed layout](docs/ideas/E04-results-visualization.md) [E04] — VS Code panel hosting Vega-Lite renderer tabs (requires #085)~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~093~~ | ~~Feature~~ | ~~[[E05] Add drawing toolbar with shape palette](docs/ideas/093-drawing-toolbar-shape-palette.md) (requires #092) [E05]~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~095~~ | ~~Feature~~ | ~~[[E05] Implement polygon and polyline drawing](specs/095-polygon-polyline-drawing/spec.md) (requires #091, #092, #093) [E05]~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~087~~ | ~~Infrastructure~~ | ~~[Logical result ID registry](docs/ideas/E04-results-visualization.md) [E04] — maps stable logical IDs to current result files, emits change events (requires #071)~~ | ~~4~~ | ~~3~~ | ~~4~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| 027 | Infrastructure | [Add automated screenshot capture for Storybook stories](docs/ideas/027-automated-screenshots.md) | 3 | 4 | 4 | 11 | Medium | approved |
| ~~088~~ | ~~Feature~~ | ~~[Custom editor provider for result datasets](docs/ideas/E04-results-visualization.md) [E04] — opens results as editor tabs, supports drag-to-float via auxiliary windows (requires #085)~~ | ~~3~~ | ~~4~~ | ~~4~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~115~~ | ~~Tech Debt~~ | ~~[Enforce schema-validated tool inputs and outputs (ADR-008)](specs/115-schema-validated-tool-io/spec.md) — all 12 calc tools bypass generated Pydantic models, working with raw `dict[str, Any]`; add `debrief_schemas` dependency, validate at service boundary, replace hardcoded enums with schema imports~~ | ~~4~~ | ~~2~~ | ~~4~~ | ~~10~~ | ~~High~~ | ~~complete~~ |
| 005 | Tech Debt | [Add cross-service end-to-end workflow tests (io -> stac -> calc)](specs/005-e2e-workflow-tests/spec.md) | 4 | 2 | 5 | 11 | Low | specified |
| 057 | Feature | [Add enlarge shape tool spec](specs/057-enlarge-shape/spec.md) (requires #049) | 3 | 3 | 5 | 11 | Low | specified |
| 078 | Feature | [Implement generate-reference-points tool](specs/078-generate-reference-points/spec.md) [E03] — creates grid/scatter of reference points on plot (requires #049) | 3 | 3 | 5 | 11 | Low | specified |
| 008 | Feature | Design and implement extension discovery mechanism for contrib packages | 4 | 3 | 3 | 10 | High | approved |
| 090 | Infrastructure | [E04 sample data workshop: identify realistic generators for all result types](docs/ideas/090-e04-sample-data-workshop.md) [E04] — collaborative workshop using E03 demo scenario; pseudocode + golden fixtures for all result categories (prerequisite for #085) | 5 | 3 | 2 | 10 | Low | approved |
| ~~096~~ | ~~Enhancement~~ | ~~[[E05] Drawing UX guidance and STAC persistence](docs/ideas/096-drawing-ux-persistence.md) (requires #094, #095) [E05]~~ | ~~4~~ | ~~3~~ | ~~3~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| 058 | Feature | [Add flip shape horizontal tool spec](docs/ideas/058-flip-shape-horizontal.md) (requires #049) | 2 | 2 | 5 | 9 | Low | approved |
| 059 | Feature | [Add flip shape vertical tool spec](docs/ideas/059-flip-shape-vertical.md) (requires #049) | 2 | 2 | 5 | 9 | Low | approved |
| ~~094~~ | ~~Feature~~ | ~~[[E05] Implement point and rectangle drawing](docs/ideas/094-point-rectangle-drawing.md) (requires #091, #092, #093) [E05]~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| ~~093~~ | ~~Feature~~ | ~~[[E05] Add drawing toolbar with shape palette](specs/093-drawing-toolbar-shape-palette/spec.md) (requires #092) [E05]~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~095~~ | ~~Feature~~ | ~~[[E05] Implement polygon and polyline drawing](specs/095-polygon-polyline-drawing/spec.md) (requires #091, #092, #093) [E05]~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| 099 | Infrastructure | [Browser-based VS Code extension preview via Heroku Review Apps](specs/099-browser-extension-preview/spec.md) — code-server container with Debrief extension + sample data, auto-deployed per PR | 3 | 4 | 4 | 11 | Medium | tasked |
| 114 | Enhancement | Keyboard-only flip-card interaction — add Enter/Space to trigger card flip, focus management on back face, Tab order through edit controls; accessibility compliance for the flip-card paradigm introduced in #113 (requires #113) | 3 | 2 | 5 | 10 | Low | approved |
| 101 | Bug | [Layers panel does not expand to fill vertical space](specs/101-layers-panel-vertical-space/spec.md) — Layers section should flex-grow when Time Controller and Tools are collapsed; pure CSS fix | 3 | 2 | 5 | 10 | Low | specified |
| 100 | Tech Debt | [Unify feature pipeline: single FeatureCollection from stacService](specs/100-unify-feature-pipeline/spec.md) — stacService.loadPlotData() should return one FeatureCollection instead of splitting into tracks/locations/otherFeatures; let React components classify by feature properties | 3 | 1 | 4 | 8 | Medium | specified |
| 029 | Tech Debt | [Add unit tests for VS Code extension providers](https://github.com/debrief/debrief-future/issues/104) | 4 | 2 | 5 | 11 | Low | proposed |
| 004 | Infrastructure | Add contrib folder scaffolding with example extension (requires #008) | 3 | 3 | 4 | 10 | Low | proposed |
| 033 | Tech Debt | [Re-enable debrief-stac tests in pytest](docs/ideas/033-reenable-stac-tests.md) | 4 | 2 | 4 | 10 | Low | proposed |
| 034 | Tech Debt | [Remove synchronous fs calls from VS Code stacService](docs/ideas/034-async-stac-service-fs.md) | 3 | 2 | 5 | 10 | Low | proposed |
| 001 | Infrastructure | Extract shared MCP utilities into mcp-common package | 3 | 2 | 4 | 9 | Medium | proposed |
| 037 | Tech Debt | [Fix test isolation in debrief-config tests](docs/ideas/030-fix-config-test-isolation.md) | 3 | 1 | 5 | 9 | Low | proposed |
| 053 | Tech Debt | Remove migration-specific tool commands after Legacy Debrief migration complete (keep /tool.spec and /tool.implement for general use) | 2 | 1 | 5 | 8 | Low | proposed |
| 010 | Tech Debt | Add rollback/cleanup API to debrief-stac for interrupted operations | 3 | 1 | 4 | 8 | Medium | proposed |
| 012 | Enhancement | Wire loader plot count to debrief-stac list_plots call | 2 | 1 | 5 | 8 | Low | proposed |
| 018 | Infrastructure | [Add VS Code multi-root workspace configuration](specs/018-vscode-workspace-config/spec.md) | 3 | 1 | 5 | 9 | Low | shipped |
| ~~042~~ | ~~Feature~~ | ~~[Add STAC catalog overview panel with map and timeline](specs/042-stac-catalog-overview-panel/spec.md)~~ | ~~5~~ | ~~5~~ | ~~3~~ | ~~13~~ | ~~High~~ | ~~complete~~ |
| ~~051~~ | ~~Bug~~ | ~~[Load existing result files into Attachments dropdown](specs/051-load-result-attachments/spec.md)~~ | ~~5~~ | ~~3~~ | ~~4~~ | ~~12~~ | ~~Low~~ | ~~complete~~ |
| ~~054~~ | ~~Infrastructure~~ | ~~[Discover and spec all migrateable tools from Legacy Debrief](docs/tool-migration/TOOL-LIBRARY-SRD.md) — scan legacy Java source, classify trigger types and UX integration, capture golden I/O, author language-neutral specs (requires #049, #050)~~ | ~~5~~ | ~~3~~ | ~~3~~ | ~~11~~ | ~~High~~ | ~~complete~~ |
| ~~019~~ | ~~Enhancement~~ | ~~[Add 'needs-interview' status to backlog workflow](specs/019-needs-interview-status/spec.md)~~ | ~~3~~ | ~~3~~ | ~~5~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~023~~ | ~~Infrastructure~~ | ~~[Add epic support to speckit workflow](specs/023-epic-workflow-support/spec.md)~~ | ~~4~~ | ~~3~~ | ~~4~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~013~~ | ~~Bug~~ | ~~[Time Range and Tools panels show empty](https://github.com/debrief/debrief-future/issues/30)~~ | ~~5~~ | ~~2~~ | ~~4~~ | ~~11~~ | ~~Low~~ | ~~complete~~ |
| ~~036~~ | ~~Infrastructure~~ | ~~[Reinstate Playwright E2E testing in CI](docs/ideas/030-reinstate-playwright-ci.md)~~ | ~~4~~ | ~~2~~ | ~~5~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~052~~ | ~~Enhancement~~ | ~~[Restore previously-open plots on VS Code startup](docs/ideas/052-restore-plots-session.md)~~ | ~~4~~ | ~~2~~ | ~~5~~ | ~~11~~ | ~~Low~~ | ~~complete~~ |
| ~~050~~ | ~~Infrastructure~~ | ~~[Add tool migration workflow for Legacy Debrief](specs/050-tool-migration-workflow/spec.md)~~ | ~~4~~ | ~~2~~ | ~~4~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| ~~031~~ | ~~Documentation~~ | ~~[Document vscrui as standard component library for VS Code webviews](specs/031-vscrui-component-library/spec.md)~~ | ~~3~~ | ~~1~~ | ~~5~~ | ~~9~~ | ~~Low~~ | ~~complete~~ |
| ~~032~~ | ~~Documentation~~ | ~~[Document Storybook VS Code theming setup](specs/032-storybook-vscode-theming/spec.md)~~ | ~~2~~ | ~~2~~ | ~~5~~ | ~~9~~ | ~~Low~~ | ~~complete~~ |
| ~~083~~ | ~~Feature~~ | ~~[Add auto-refresh for open STAC result views](docs/ideas/E03-buffer-zone-analysis-demo.md) [E03]~~ | ~~4~~ | ~~4~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~absorbed by #089~~ |
| ~~072~~ | ~~Feature~~ | ~~[Implement Log Panel](specs/072-log-panel/spec.md) [E02] — VS Code activity panel, timeline view, entry display, filter/search (requires #071, optionally #044)~~ | ~~5~~ | ~~5~~ | ~~3~~ | ~~13~~ | ~~High~~ | ~~complete~~ |
| ~~077~~ | ~~Feature~~ | ~~[STAC File Tree Component](specs/077-stac-file-tree/spec.md) — shared React tree view of STAC catalog filesystem backed by memfs; highlights new files from snapshots, opens plots from tree (requires #074, #071)~~ | ~~4~~ | ~~4~~ | ~~4~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| ~~070~~ | ~~Infrastructure~~ | ~~[Implement PROV schema foundation](specs/070-prov-schema-foundation/spec.md) [E02] — LinkML Log Entry schema, expanded ToolResult model, provenance migration, system record (requires #062)~~ | ~~5~~ | ~~3~~ | ~~4~~ | ~~12~~ | ~~High~~ | ~~complete~~ |
| ~~071~~ | ~~Feature~~ | ~~[Implement Log Recording service](specs/071-log-recording-service/spec.md) [E02] — TypeScript Log Service, recordToolResult, getTimeline, session-state integration (requires #070)~~ | ~~5~~ | ~~4~~ | ~~3~~ | ~~12~~ | ~~High~~ | ~~complete~~ |
| ~~073~~ | ~~Tech Debt~~ | ~~[Split undo/redo: UI-only undo, data changes via Log](specs/073-undo-redo-split/spec.md) [E02] — narrow StateSnapshot, remove featureCollectionUri and savePath (requires #071)~~ | ~~4~~ | ~~2~~ | ~~5~~ | ~~11~~ | ~~Low~~ | ~~complete~~ |
| ~~074~~ | ~~Feature~~ | ~~[Implement snapshots with doubly-linked chain](specs/074-snapshots/spec.md) [E02] — clean-state checkpoints, snapshot assets in STAC (requires #071)~~ | ~~5~~ | ~~3~~ | ~~3~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~075~~ | ~~Feature~~ | ~~[Implement branching from history point](specs/075-branching/spec.md) [E02] — plot duplication, two-way links, branch records (requires #074)~~ | ~~4~~ | ~~3~~ | ~~3~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| ~~077~~ | ~~Bug~~ | ~~[Fix VS Code extension: time slider, location marker, trail mode, and tool offering](specs/077-fix-vscode-extension-bugs/spec.md)~~ | ~~5~~ | ~~2~~ | ~~3~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| ~~062~~ | ~~Tech Debt~~ | ~~[Compound track model with embedded children](specs/062-missing-feature-kind-enum-values/spec.md) [E01] — extend TrackFeature with MultiLineString compound geometry, embedded sensors, TUAs, and per-segment metadata; blocks 30+ tool implementations~~ | ~~5~~ | ~~2~~ | ~~5~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| ~~069~~ | ~~Infrastructure~~ | ~~[Plan PROV logging integration with application state](specs/069-plan-prov-logging/spec.md) — transition plan from current state to SRD provenance target; covers ToolResult contract, Log Service, undo/redo split, schema migration, phased implementation sequence~~ | ~~5~~ | ~~3~~ | ~~3~~ | ~~11~~ | ~~High~~ | ~~complete~~ |
| ~~049~~ | ~~Infrastructure~~ | ~~[Add language-neutral tool documentation model](specs/049-tool-documentation-model/spec.md)~~ | ~~4~~ | ~~3~~ | ~~5~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| ~~046~~ | ~~Tech Debt~~ | ~~[Convert raw HTML to vscrui components and theme library](specs/046-vscrui-conversion/spec.md)~~ | ~~4~~ | ~~3~~ | ~~5~~ | ~~12~~ | ~~Medium~~ | ~~complete~~ |
| ~~045~~ | ~~Feature~~ | ~~[Add layers toolbar to FeatureList in shared-components](specs/045-featurelist-layers-toolbar/spec.md) (prerequisite for #044)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~High~~ | ~~complete~~ |
| ~~044~~ | ~~Enhancement~~ | ~~[Build unified Debrief activity panel as single webview](docs/ideas/044-unified-activity-panel.md) (requires #031, #045)~~ | ~~5~~ | ~~5~~ | ~~3~~ | ~~13~~ | ~~High~~ | ~~complete~~ |
| ~~043~~ | ~~Feature~~ | ~~[Load REP files into new plot via "Add to new plot in store"](specs/043-load-rep-new-plot/spec.md)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~040~~ | ~~Feature~~ | ~~[Save analysis results to STAC](specs/001-save-calc-results-stac/spec.md)~~ | ~~5~~ | ~~4~~ | ~~4~~ | ~~13~~ | ~~Medium~~ | ~~complete~~ |
| ~~041~~ | ~~Documentation~~ | ~~[Document tool results architecture](specs/041-document-tool-results/spec.md)~~ | ~~5~~ | ~~3~~ | ~~5~~ | ~~13~~ | ~~Medium~~ | ~~complete~~ |
| ~~040~~ | ~~Enhancement~~ | ~~[Reorganize STAC store to per-item folder structure](specs/040-stac-store-organization/spec.md)~~ | ~~4~~ | ~~3~~ | ~~4~~ | ~~11~~ | ~~Medium~~ | ~~complete~~ |
| ~~039~~ | ~~Bug~~ | ~~[Wire TimeController to TemporalTrackLayer in VS Code extension](specs/039-wire-timecontroller-temporal-track/spec.md)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~038~~ | ~~Feature~~ | ~~[Integrate context-sensitive tool offering into VS Code extension](specs/038-context-tool-vscode/spec.md) (absorbs #035, requires #029)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~035~~ | ~~Feature~~ | ~~[Invoke debrief-calc distance tool from VS Code extension](https://github.com/debrief/debrief-future/issues/115)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~absorbed by #038~~ |
| ~~029~~ | ~~Tech Debt~~ | ~~[Integrate session-state service into VS Code extension](specs/029-session-state-vscode/spec.md) (multi-document support)~~ | ~~5~~ | ~~3~~ | ~~4~~ | ~~12~~ | ~~High~~ | ~~complete~~ |
| ~~030~~ | ~~Tech Debt~~ | ~~[Add replay mode and time acceleration to temporal state schema](docs/ideas/030-temporal-ui-state.md) (requires #029)~~ | ~~4~~ | ~~2~~ | ~~4~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| ~~026~~ | ~~Feature~~ | ~~[Add annotation shape renderers to VS Code extension](https://github.com/debrief/debrief-future/issues/86) (requires ~~#021~~)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~025~~ | ~~Feature~~ | ~~[Design time controller UI/UX for VS Code extension](specs/025-time-controller/spec.md)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~022~~ | ~~Feature~~ | ~~[Add SYSTEM kind discriminator for non-spatial state](specs/022-system-kind-discriminator/spec.md)~~ | ~~5~~ | ~~2~~ | ~~5~~ | ~~12~~ | ~~Low~~ | ~~complete~~ |
| ~~021~~ | ~~Feature~~ | ~~[Add REP file loading to VS Code extension](specs/021-load-rep-files-stac/spec.md)~~ | ~~5~~ | ~~5~~ | ~~4~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
| ~~020~~ | ~~Infrastructure~~ | ~~[Add remaining shape type importers with Storybook verification](specs/020-shape-types-importer/spec.md)~~ | ~~4~~ | ~~4~~ | ~~5~~ | ~~13~~ | ~~Low~~ | ~~complete~~ |
| ~~017~~ | ~~Enhancement~~ | ~~[Configure VS Code extension to hide default activities on load](specs/017-vscode-hide-activities/spec.md)~~ | ~~3~~ | ~~3~~ | ~~4~~ | ~~10~~ | ~~Medium~~ | ~~complete~~ |
| ~~015~~ | ~~Infrastructure~~ | ~~[Create LinkML schemas for REP annotation item types](specs/015-annotation-item-schemas/spec.md)~~ | ~~5~~ | ~~3~~ | ~~5~~ | ~~13~~ | ~~Medium~~ | ~~complete~~ |
| ~~014~~ | ~~Feature~~ | ~~[Add styling properties schemas to GeoJSON features](specs/014-geojson-styling-schemas/spec.md)~~ | ~~5~~ | ~~4~~ | ~~5~~ | ~~14~~ | ~~Medium~~ | ~~complete~~ |
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
