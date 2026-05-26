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

## Future Ideas

Large capabilities identified for future phases. These are epic-scale and not yet broken down into backlog items. When the ideas-guy proposes new work, the highest-value item here should be considered for promotion.

| # | Capability | Description | Analyst Impact |
|---|-----------|-------------|----------------|
| F1 | CPA Analysis Suite | Auto-detect Closest Point of Approach across all track pairs; CPA timeline (range vs. time); what-if CPA prediction; miss-distance analysis for weapon engagements. Family of calc tools returning `cpa_events` features. | The single most fundamental derived measurement in post-exercise maritime analysis |
| F2 | Export & Reporting Pipeline | PDF report generation (exercise summary with maps, charts, narrative); PowerPoint/briefing slides; CSV/Excel data export; georeferenced PDF map export; configurable report templates. New Python service or calc tool category. | Without reports, analysis stays in the tool and never reaches decision-makers |
| F3 | Cross-Exercise Aggregate Query Engine | Query across multiple STAC catalogs: "Show all exercises where detection range was under 5nm." Python query API over STAC collections with results materializable as new plots or exportable datasets. | Transforms Debrief from single-plot tool to institutional knowledge platform |
| F4 | Narrative Timeline & Event Annotation | Structured event chronology: detection, maneuver, weapon release, comms, failure. Event-to-feature linking. Auto-event-detection from track behaviour (speed changes, bearing rate). Timeline panel alongside time slider. | Makes the temporal story a first-class citizen alongside spatial visualization |
| F5 | Spatial Search & Area-of-Interest Analysis | Draw polygon → get all tracks/events within. Transit corridor analysis. Exclusion zone monitoring. Area dwell time. Generalises point-in-zone-classifier to any user-drawn polygon. | Natural extension of drawing tools; answers "what happened in this area?" |
| F6 | Track Reconstruction & Dead Reckoning | Gap interpolation (cubic spline, great-circle, rhumb-line). Dead reckoning projection. Position uncertainty ellipses. Track smoothing (moving average, Kalman filter). Builds on legacy `interpolate-track`, `smooth-track-jumps`, `generate-infill-segment`. | Real-world data is incomplete; critical for submarine analysis |
| F7 | Tactical "What-If" Analysis | Branch at a timeline point, modify ownship course/speed, see how tactical picture evolves. Track projection, sensor coverage recalculation, CPA prediction under modified conditions. Side-by-side actual vs. hypothetical. Extends branching + PROV replay. | The central training question: "could we have done better?" |
| F8 | Multi-Source Data Import | AIS, NMEA 0183/2000, NATO STANAG (4607, 4676), GPX, bathymetric/environmental overlays (GeoTIFF, S-57). Each handler is a self-contained `io` module producing GeoJSON features. | Opens Debrief beyond REP files to much wider user base |
| F9 | AI-Assisted Analysis Companion | LLM with MCP access to all tools. Natural-language queries ("What was the closest approach?"). Tool suggestion from context. Narrative summary generation. Guided workflows for less experienced analysts. Local model option for offline use. | Reduces learning curve; the payoff of the MCP architectural choice |
| F10 | Collaborative STAC Catalog Sharing | Push/pull sync between local and shared STAC catalogs. Conflict detection. Read-only shared access. Annotation/comment threads. Pull-based sync preserves offline-first principle. Note: overlaps with Parking Lot "Cloud STAC synchronisation". | Team analysis is essential but conflicts with current offline-first phase |

*Added: 2026-02-14. Source: opportunity-scout maritime analyst capability scan.*

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
| Storyboarding briefings (BACKLOG #017) | Requires VS Code extension; not tracer bullet critical | VS Code extension core validated (tracer bullet step 6 complete) |
| Tool-provided undo via inverse slug (BACKLOG #091, ADR-006) | #076 replay-tune implementing now; scaling problem not acute at demo scale; ADR-006 preserves the design. Scored V4/M2/A3=9 | E03 demo complete and E01 tool phases (#064-#068) begin landing |
| ~~VS Code E2E webview reliability research sprint (BACKLOG #142)~~ | ~~Unparked 2026-03-18: short-term domain expert availability changes the calculus — A:2 autonomy concern is mitigated by human specialist~~ | ~~N/A — approved~~ |

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
| 2026-01-26 | Approved #029 session-state VS Code integration | Completes 024 architectural investment; enables Python tool state access via MCP; foundational for multi-document workflow |
| 2026-01-26 | Approved #019 needs-interview backlog workflow | Workflow infrastructure has precedent (023, 027, 028); high autonomy score; addresses idea capture friction |
| 2026-01-26 | Approved #035 calc tool invocation from VS Code | Completes tracer bullet ("run analysis tool → see results"); high demo value for stakeholder engagement |
| 2026-01-27 | Approved #038 context-sensitive tool offering (absorbs #035) | Completes Phase 3 of 027-context-tool-offering; full dynamic tool discovery + execution; absorbs #035 as broader scope |
| 2026-02-09 | Approved E02 PROV Logging epic (#070-#076) | 7 phased items implementing SRD provenance priorities P1-P6; serves all three themes (architecture validation, scientist self-service, stakeholder demos); Constitution Article III mandates provenance; #069 transition plan complete |
| 2026-02-10 | Approved #077 STAC File Tree Component | Natural companion to E02 PROV logging; fills visibility gap (users cannot see what STAC store contains); strong Theme 3 fit (demo-able provenance story via change highlighting); memfs dependency justified for browser/Storybook compatibility; depends on #074 and #071 (both in pipeline) |
| 2026-02-11 | Approved E03 Buffer Zone Analysis Demo (#078-#084) | 6 items (after #083 absorbed by E04): 5 demo tools + end-to-end integration; reactive PROV cascade where moving a track updates buffer zones, recolors points, and refreshes a histogram; serves all three themes; depends on E02 PROV infra (#076) and E04 results visualization (#085, #086, #089) for histogram display |
| 2026-02-11 | Approved E04 Results Visualization (#085-#089) | 5 items implementing Vega-Lite results viewing infrastructure; absorbs E03 #083 as #089; Vega-Lite chosen for schema-first philosophy (JSON specs, not code); bottom panel with tabs + editor tab for drag-to-float; logical result ID registry for stable view binding; critical enabler for E03 demo and all future tool output visualization |
| 2026-02-12 | Parked #091 Tool-provided undo via inverse slug | Well-designed (ADR-006 exists) but wrong timing: #076 replay-tune is mid-implementation, changing revert mechanism now is disruptive; scaling concern (10k-position deep-copies) is real but not acute at demo/tracer bullet scale; revisit when E01 tool volume makes generic undo infra urgent |
| 2026-02-13 | Approved E05 Shape Drawing Tools (#091-infra, #092, #093, #094, #095, #096) | 6 items adding map drawing via Geoman library: schema extension (POLY FeatureKind), library integration, toolbar, point/rectangle drawing, polygon/polyline drawing, UX guidance + STAC persistence. Serves all three themes: extends architecture (schema + map interaction model), enables user-created inputs for analysis tools (scientist self-service), and highly demo-able for stakeholder engagement ("draw a polygon, analyse within it"). Well-structured dependency chain with scores 10-12 |
| 2026-02-27 | Approved E06 Architectural Consistency (#102-#112) | 11 items from six-axis architectural consistency review. 2 blocking (constitutional violation on provenance Art. III.1, kind value divergence violating schema-first Art. II.1), 7 significant (tool parity, state management, type unification), 2 minor (annotation alignment). Serves Theme 1 primarily — cannot credibly claim architecture is validated if implementations diverge from governing documents. Demo-critical items (#102, #103, #104, #109) also serve Theme 3 — visible inconsistencies during stakeholder demos undermine confidence. All 11 approved at high priority per user direction |
| 2026-03-06 | Approved E08 STAC Stack Browser Discovery UI (#125-#134) | 10 items from STAC Browser SRD: STAC Extension spec + mock data (#125), CQL2 filter engine (#126), filter bar with lozenges (#127), saved filters (#128), list view (#129), map view (#130), timeline/Gantt (#131), three-view sync (#132), vessel taxonomy (#133), colour scheme engine (#134). Strong Theme 3 fit — the most demo-able capability for Spring 2026 stakeholder conversations; an analyst-facing discovery interface is immediately legible to non-technical audiences. Theme 1 fit — validates STAC-first architecture for discovery, not just storage. Storybook-first development with client-side CQL2 ensures offline capability. Well-structured dependency chain with #125 as foundation. All 10 approved |
| 2026-03-18 | Parked then unparked #142 VS Code E2E webview reliability (subsumes #135) | Initially parked: A:2 autonomy concern, wrong phase for high human-attention research. Unparked same day: short-term availability of domain expert in VS Code/openvscode-server webview architecture mitigates the autonomy concern — the primary reason for parking was human attention cost, which is now externally funded. V:5 reinstated; ~50 skipped tests represent a real testing gap worth closing while expert bandwidth is available |
| 2026-03-20 | Approved #143 Fix openPlotViaStacTree timeout in CI E2E | 8 of 15 non-skipped test suites blocked; covers core tracer bullet workflow (STAC tree -> open plot -> display on map). Value overridden from 4 to 5: without this fix we cannot claim automated validation of the end-to-end architecture (Theme 1). Complements #142 (different root cause: tree data loading vs webview content delivery). Bug fast-track path appropriate |
| 2026-03-20 | Approved #144 Import legacy Debrief sample data into STAC catalog | Strongest Theme 3 item: real maritime scenario data from legacy Debrief is the most compelling demo asset for Spring 2026 stakeholder conversations. Also validates Theme 1 — running ~148 real files (REP/DPF/DSF) through the import pipeline proves architecture at scale. Includes building a new DPF (XML) parser for debrief-io. Catalog committed to repo for immediate availability. V:5 M:5 A:3 = 13, High complexity (new parser + bulk import + schema compliance for legacy data) |
| 2026-04-20 | Approved #213 Unify `shared/components/src/utils/bounds.ts` with `@debrief/utils` | Follow-up to #200 (complete). Article II.1 tripwire: two parallel bounds utilities with different feature-type semantics (`DebriefFeature` / `SafeFeature` / `GeoJSONFeature`) is exactly the schema-adjacent drift the constitution prohibits. Sits within the #206 [E11] LinkML consolidation cluster alongside already-approved #203, #204, #205. Scope honest at Medium (three type families, four consumer migrations, five extra helpers to fold in). Prerequisite #211 (pre-computed-bbox fast-path) remains `proposed` — speckit spec for #213 should sequence #211 first to reduce divergence before unification. V:4 M:2 A:3 = 9 |
| 2026-05-26 | Endorsed (approved) batch of 5 trigger-gated deferred follow-ups: #272, #271, #269, #267, #256 | All five are well-captured deferred follow-ups spawned from `/speckit.review` decisions on shipped/specified work (#240, #249, #263, #264). Endorsing them confirms each is strategically sound and pre-cleared for spec work *when its named trigger fires* — they are not pulled into the current tracer-bullet sprint. **#256** (V2/M1/A4=7, follow-up to shipped #240): makes the spec-240 "debrief:* fields flow to the writer's typed surface" promise actually true at the writer's call sites — Theme 1 (schema-first integrity, Article II.1); trigger = next significant `services/stac` MCP iteration. **#271** (V2/M1/A4=7, follow-up to #263): non-blocking overlap warning for time-range Scenes — low-cost (1–2d) Theme 3 storyboarding polish; trigger = analyst feedback. **#269** (V2/M1/A3=6, follow-up to #263): split `SceneProperties` into discriminated `InstantScene`/`TimeRangeScene` LinkML classes — Theme 1 tech debt, but deliberately sequenced to the v3 schema cycle when a breaking change is allowed (Article XIV); endorsed-but-held. **#267** (unscored, follow-up to #249): tolerant out-of-window `current_time` import policy — Article XIV trigger, revisit only if strict-on-import proves user-hostile post-v4.0.0. **#272** (unscored, follow-up to shipped #264): PMTiles vector basemap to shrink air-gapped briefing zips — Theme 3, but trigger = zip exceeds ~50MB OR transport friction. Note: #272 and #267 carry no V/M/A scores — endorsement is the strategic-fit gate only; the backlog-prioritizer should still score them before `/speckit.start`. |

---

*Document version: 1.1 — January 2026*
*Next review: At phase boundary (post tracer bullet)*
