# Debrief-Future — UI Design Brief for Claude Design

> Audience: Claude Design (or any design partner).
> Purpose: produce a UI model / layout strategy / interaction plan for the Debrief v4 analyst experience.
> Status: working brief — feed this in as the primary context, then ask follow-up questions.
> Companion documents (already in this repo):
> - `VISION.md` — product strategy, audience, multi-frontend rationale
> - `ARCHITECTURE.md` — thick-services / thin-frontends, data model
> - `CONSTITUTION.md` — immutable principles (offline-first, schema integrity, provenance)
> - `docs/future-debrief-design-spec.md` — *brand-level* visual language (colour, type, voice). This brief assumes that spec as the visual baseline; do **not** redesign the brand here.
> - `docs/future-debrief-mood-board.md` — chart-room aesthetic references.

---

## 1. What Debrief-Future Is

Debrief is the maritime tactical analysis platform used by UK Defence (DSTL) and NATO partners since 1995. v4 is a ground-up rebuild: a **Python service layer** with **multiple thin frontends**, replacing the declining Eclipse RCP v3 platform.

Debrief is **post-exercise** — analysts reconstruct what happened: where vessels went, what each sensor heard, when contacts were classified, how Target Motion Analysis (TMA) solutions were derived. The output is reports and visualisations used to validate tactics, train crews, and feed lessons-learned cycles.

**This is not a real-time operations tool.** It is not a GIS. It is a **reconstruction, analysis, and reporting workbench** for time-stamped maritime feature data.

### The user
A defence analyst — typically ex-Royal Navy, deeply technical, comfortable with sonar waterfalls and tactical plots. They open Debrief once and stay in it for hours. They are the audience for the *chart-room aesthetic* described in the design spec — substance over decoration, technical confidence, restrained colour.

### The artefact
A **plot** = a STAC Item containing a GeoJSON FeatureCollection. Features are: tracks (vessel paths over time), contacts (sensor bearings to unknown emitters), reference points, drawn annotations, scenes (storyboard frames), and analysis results. Every feature carries provenance (source → method/version → output).

---

## 2. Primary User Goals

The UI must make these goals fast and unambiguous:

| # | Goal | Frequency |
|---|------|-----------|
| G1 | **Find a plot** in a STAC catalog (across many exercises) | Every session |
| G2 | **See the spatial picture** — tracks, sensors, geometry on a map | Continuous |
| G3 | **See the temporal picture** — when things happened relative to each other | Continuous |
| G4 | **Filter** — narrow the scene to a platform, time window, classification, etc. | Frequent |
| G5 | **Select features** and have selection sync across map / list / timeline | Continuous |
| G6 | **Run analysis tools** (track length, range/bearing, CPA, TMA, etc.) on selection | Frequent |
| G7 | **Inspect/edit feature properties** (name, classification, tags, platform) | Frequent |
| G8 | **Read the audit trail** — what tools ran, with what parameters, on what input | Frequent |
| G9 | **Tune & re-run** an analysis (change a parameter, see the effect, compare) | Frequent |
| G10 | **Capture and replay scenes** — narrative storyboarding for briefings | Occasional |
| G11 | **Import** legacy files (REP, etc.) into the STAC store | Occasional |
| G12 | **Export** results (CSV, GeoJSON, chart PNG) for reports | Per session |

Goals G2/G3/G5 are the *core loop* — everything else orbits them.

---

## 3. Frontends (Hosts)

The same component library renders inside multiple hosts. The design system must look **native in each**.

| Host | Role | Notes |
|------|------|-------|
| **VS Code extension** (`apps/vscode/`) | Primary analyst workflow | Sidebar (STAC tree, outline, timeline) + main editor (map, charts, tables). Must respect VS Code dark/light tokens. |
| **Web Shell** (`apps/web-shell/`) | Browser-based analysis surface | GoldenLayout dockable panels; full layout freedom; used for Playwright + stakeholder demos. |
| **Electron Loader** (`apps/loader/`) | File ingest mini-app | 2-step wizard: pick file → pick STAC store. Linear, not a workbench. |
| **Jupyter** (planned) | Exploratory scripting | Components rendered as widgets; layout owned by the notebook. |
| **Storybook** (`shared/components/`) | Component dev + design review | Light/dark/vscode-light/vscode-dark theme matrix. |

**Constraint:** the same `MapView`, `Timeline`, `FilterBar`, `LogPanel`, etc. mount in all hosts. Layout is host-owned; component appearance and behaviour are shared.

---

## 4. Inventory of Existing UI Surfaces

These already exist (some prototyped, some shipped). Treat this list as the **vocabulary** the design must work with.

### Spatial
- **MapView** — Leaflet base map with layered renderers: `TemporalTrackLayer` (track segments coloured by time), `SensorBearingLayer` (radial bearings from contacts), `PositionSymbolsLayer` (point markers), `SceneRectangleLayer` (storyboard frames).
- **LayersToolbar / FilterDropdown** — visibility, colour dimension, drawing-tool entry points.
- **LeafletToolbar** — point/rectangle/freehand drawing palette.
- **GeometryDialog** — name + edit a drawn shape.

### Temporal
- **TimelineView** — Gantt-style horizontal bars per feature; ctrl-wheel zoom, drag-pan, reset.
- **TimeController** — playback head with scrubber, play/pause, speed, "Full / Trail" mode, current time read-out.

### Tabular & List
- **FeatureList** — virtualised table of all features in the plot; click-to-select, multi-select, sync with map + timeline.
- **ExerciseListView** — STAC catalog browser (cards / rows of exercises).
- **TableRenderer** / **ChartRenderer** — analysis result display (Vega-Lite charts and tabular metrics).

### Filtering
- **FilterBar** with **lozenge chips** — drag-droppable, OR-grouped, taxonomy-driven editors. Optional NL→CQL2 input.
- **Quick search** input (substring, no syntax).

### Provenance / Activity
- **LogPanel** — chronological audit log of every tool invocation; "Timeline / By Feature / Compact / Detailed" view modes; **card-flip** to reveal tunable parameters and re-run.
- **ActivityPanel** — running operations and their progress.

### Properties & Tools
- **PropertiesPanel** — form editor for the selected feature (title, datetime override, tags, platform).
- **ToolsPanel** — context-sensitive tool list ("Track Length — requires 1 track selected"); disabled tools explain *why*.
- **ParameterEditor** — auto-generated form from a tool's input schema.

### Catalog & Storage
- **StacFileTree** / **StacBrowser** — STAC catalog navigation, item preview thumbnails.

### Storyboarding
- **StoryboardPanel** — ordered list of scenes with thumbnails, timestamp, title, hard-block constraints.
- **TransportRow** / **SceneRow** — per-scene playback row.

### Cross-cutting
- **ContextMenu / CascadingMenu / FormatMenu** — right-click on features (colour, line width, symbol).
- **ThemeProvider** — `light | dark | vscode-light | vscode-dark` variants, CSS-variable based.
- **PanelWorkspace** (web-shell only) — GoldenLayout host with layout persistence + reset.

---

## 5. Three-View Synchronisation (Core Pattern)

Map, Timeline, and FeatureList are **one logical view** showing three projections of the same filtered set:

- **Selection** propagates instantly across all three (click on map → row highlights in list → bar highlights in timeline).
- **Filter state** is shared: filter chips + map viewport bounds + timeline visible range *all* compose into the same Zustand store.
- **Empty state** is shared: when filters yield zero results, all three show a coherent "no matches" affordance.
- **No master view** — each view can both *receive* and *emit* selection/filter changes.

The design must reinforce this triad. They should *feel* like one organism.

---

## 6. Reference Screenshots (current state)

These are the most informative current renderings. Use them to ground the design — note what works, what is rough, what needs rethinking.

### Whole-app layouts
- `specs/005-e2e-workflow-tests/evidence/screenshots/web-shell-full-layout.png` — web-shell with map + time controller + tools + layers in left rail. Light theme. Shows the current panel hierarchy.
- `specs/006-speckit-vscode-extension/evidence/screenshot-map.png` — VS Code dark theme: Explorer / Outline / Timeline / STAC Stores in primary sidebar; map fills the editor area. **Closest thing we have to a "real" analyst layout today.**
- `specs/178-vscode-tabular-results/evidence/screenshots/canonical-02-populated-in-vscode.png` — VS Code with results tab in the bottom panel ("Debrief Results" alongside Problems / Output / Terminal).
- `specs/178-vscode-tabular-results/evidence/screenshots/canonical-03-chart-in-vscode.png` — chart view in editor area (range vs. time line chart).

### Individual surfaces
- `specs/186-filter-chips/evidence/screenshots/component-dark.png` — FilterBar with one lozenge.
- `specs/176-log-panel-ux/evidence/screenshots/component-light.png` — LogPanel with timeline view + tunable params.
- `specs/193-properties-panel/evidence/screenshots/properties-form-vscode.png` — PropertiesPanel inside VS Code.
- `specs/217-storyboarding-playback/evidence/screenshots/storyboard-panel-multi-light.png` — StoryboardPanel with scene cards.
- `specs/189-stakeholder-demo-ui/evidence/screenshots/state-unfiltered.png` — exercise catalog grid (NL-demo PoC).
- `specs/005-e2e-workflow-tests/evidence/screenshots/web-shell-catalog.png` — Web Shell catalog browser (dark, map + bottom Gantt).

### How to refresh / produce new screenshots
- Storybook (best for component-level visuals): `pnpm --filter @debrief/components storybook`
- Web-shell E2E (full-app screenshots): `cd apps/web-shell && node run-playwright.mjs`
- VS Code E2E (cloud-ready Playwright against openvscode-server): see `specs/142-vscode-e2e-webview-reliability/` — uses `@sparticuz/chromium` so it runs in Claude Code on the web.
- Spec navigator E2E: `cd apps/spec-navigator && node run-playwright.mjs`

---

## 7. Constraints & Invariants

These come from CONSTITUTION.md and ARCHITECTURE.md and **are not negotiable**.

1. **Offline by default.** No design element may require network access for core function. Online features (LLM filter parsing, remote STAC) are additive.
2. **Defence-grade reliability.** No silent failure states. If a tool can't run, the UI must say *why* (e.g. "Requires 1 TRACK selected"). Status is always knowable.
3. **Provenance always.** Every analysis result has a visible chain back to its inputs and parameters. Provenance is a first-class UI element, not a debug panel.
4. **Source preservation.** Original files are immutable assets. The UI never implies "edit the source" — only "create a derived feature".
5. **Schema-first.** Forms (PropertiesPanel, ParameterEditor) are generated from LinkML schemas. Designs must accommodate dynamic field sets, not hand-tuned layouts.
6. **Multi-host parity.** A design choice that only works in the browser, or only in VS Code, must be flagged. Anything in `shared/components/` is rendered in *all* hosts.
7. **Theming.** Four variants minimum: `light`, `dark`, `vscode-light`, `vscode-dark`. The VS Code variants must inherit native VS Code tokens — designs may not assume a fixed palette inside VS Code.
8. **Accessibility.** Keyboard navigable, screen-reader labelled, AA contrast minimum. We have an a11y audit pattern (`specs/209-logpanel-a11y-audit`) — match that bar.
9. **I18N-ready.** All copy externalisable; no text baked into icons; right-to-left feasible.
10. **Density matters.** Analysts will have hundreds of features and dozens of analyses on screen. Designs that look great with 5 items but break at 500 are not acceptable. Virtualisation is already in place; designs must not subvert it.

---

## 8. Known Pain Points (input for design)

What we *suspect* needs design attention. Treat this as starting hypotheses, not requirements.

- **Two coexisting layout strategies.** VS Code uses fixed sidebar regions; web-shell uses GoldenLayout dockable panels. The same components mount in both, but the visual frame differs sharply. A unifying mental model would help users move between hosts.
- **Sidebar overload in VS Code.** Explorer, Outline, Timeline, STAC Stores, plus standard VS Code views, all compete in the primary sidebar. Hierarchy is unclear.
- **The triad isn't visually obvious.** Map / Timeline / List sync technically, but a new user can't tell from looking that they are *one* coordinated view rather than three independent panels.
- **Filter / selection / drawing are three different mental models** layered on the same map. Mode is currently inferred from cursor and surrounding chrome, not declared.
- **Provenance is rich but hidden.** The LogPanel exposes a powerful "card-flip to tune & re-run" interaction, but most users won't discover it. Its prominence does not match its importance.
- **Tools panel is a flat list.** As the tool catalogue grows (analysis, drawing, export, contrib org-specific), categorisation and discovery will degrade.
- **Empty states.** First-run, no-plot-loaded, no-results-after-filter, no-tools-available — currently inconsistent or absent.
- **Storyboarding is a parallel UI** rather than an integrated mode of the workbench. It feels grafted on.
- **Density vs. comfort.** Analysts want dense displays; new users want breathing room. Today's components lean dense. Should we offer a comfort-density toggle, or commit to one and tune everything?

---

## 9. What We're Asking Claude Design to Produce

A **UI model document** with the following sections. (We will iterate — this is the first ask.)

### 9.1 Information architecture
- A canonical map of every UI surface, grouped by user goal (G1–G12).
- A statement of which surfaces are *primary* (always visible), *secondary* (one click away), and *tertiary* (on demand).

### 9.2 Layout strategy
- A recommended layout for **VS Code** (sidebar regions + editor area + bottom panel).
- A recommended default layout for **web-shell** (GoldenLayout preset).
- A **shared mental model** that lets a user move between hosts without re-learning.
- An explicit treatment of the **Map / Timeline / List triad** — how the design makes its unity legible.

### 9.3 Mode model
- How users tell *which mode* they are in: pure exploration vs. drawing vs. tool parameterisation vs. storyboarding playback.
- How modes enter, exit, and visually announce themselves.

### 9.4 Component-level recommendations
For each major component (FilterBar, FeatureList, MapView, TimelineView, LogPanel, PropertiesPanel, ToolsPanel, StoryboardPanel):
- A short critique of the current implementation (using the screenshots above).
- A proposed direction — keep / refine / rethink.
- Any cross-component interactions the design relies on.

### 9.5 States & affordances
- Empty states for: no plot loaded, no catalog, no selection, no results after filter, no tools applicable.
- Loading states (analysis running, catalog fetching).
- Error states (tool failed, file unparseable, schema mismatch).
- Provenance "freshness" — when a result is stale because its inputs changed.

### 9.6 Density & responsive behaviour
- Recommendation on density (single dense baseline / dual modes / scale-with-viewport).
- Behaviour at small viewports (Loader on a laptop screen, web-shell on a tablet).

### 9.7 Visual integration with the design spec
- How to apply `docs/future-debrief-design-spec.md` palette/typography to a *dense application UI* (the current spec was written for documentation/marketing surfaces).
- Where the chart-room aesthetic translates literally vs. where it must yield to interaction needs.
- VS Code theme reconciliation: when our brand colours conflict with VS Code tokens, who wins?

### 9.8 Design tokens
- A proposed token set spanning surfaces, text, accents, status (success/warn/error/info), data-vis, selection/focus/hover, in all four theme variants.

### 9.9 Open questions for the team
- Anything the design hits where it needs a product/engineering decision before progressing.

---

## 10. Definition of "Good"

The design proposal is good if:

1. A returning analyst can switch between VS Code and web-shell without re-orienting.
2. A new analyst, given a loaded plot, can identify the triad (map/timeline/list) as a single coordinated view within 10 seconds.
3. Every analysis result on screen visibly traces back to its inputs and parameters.
4. The UI scales gracefully from 5 features to 5,000.
5. All four theme variants ship without component rewrites.
6. The design is implementable from `shared/components/` — no host-specific component forks.
7. The principles in CONSTITUTION.md (offline, no silent failure, provenance, schema-first) survive intact.

---

## 11. Out of Scope for This Brief

- Marketing site / documentation site visual design (covered in `docs/future-debrief-design-spec.md`).
- Brand identity, logo, voice (already settled).
- Backend service design (covered in ARCHITECTURE.md).
- Specific tool algorithms (Track Length, CPA, TMA — these are domain logic, not UI).
- Mobile-native (phone) layouts. Tablet should degrade gracefully; phone is not a target.

---

*Brief version: 1.0 — 2026-04-27. Owner: see `COMMS.md` for current product/engineering leads.*
