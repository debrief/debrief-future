# Future Debrief — UI & Business-Process Requirements for the Designer

> **Status:** v1.0 — 2026-09-14. Supersedes `docs/claude-design-ui-brief.md` (April 2026), whose still-valid content is absorbed here.
> **Audience:** an external UI designer with no access to the repository. This document is self-contained; a glossary is in Appendix A.
> **Owner:** Ian Mayo (project lead). Feedback returns as comments on the pull request that carries this document, or by email.
> **Companion visual references:** `docs/future-debrief-design-spec.md` (brand palette, type, motion) and `docs/future-debrief-mood-board.md` (chart-room aesthetic). They are the visual baseline; this brief does not redesign the brand.

---

## 0. How to read this brief

Future Debrief is a ground-up rebuild of **Debrief**, the maritime tactical-analysis workbench used by UK Defence (Dstl) and NATO partners since 1995. We are commissioning a UI design for its VS Code-based analyst experience.

The design has four mandates, in priority order:

1. **Recognisably Debrief.** An analyst who has used classic Debrief for twenty years should feel at home in the first minute.
2. **Native to VS Code.** The UI lives inside the VS Code workbench and must follow its conventions rather than fight them.
3. **Modern UI practice.** Declared modes, coherent states, accessibility, density that scales.
4. **Touch, tablet and phone.** Full analysis on a tablet; browse and playback on a phone.

There are **two UIs** to design:

- **Mode A — the STAC Browser**, shown when no plot is open: find, resume, triage and import plots.
- **Mode B — the Plot Editor with control panels**, shown when a plot is open: the map, the timeline, the feature list and the panels that drive analysis.

**Requirement IDs.** UI requirements are numbered `UI-nnn`, business-process requirements `BP-nnn`. Each carries a priority (**Must / Should / Could**) and a device tag: **D** desktop, **T** tablet, **P** phone. Respond to them item by item where you disagree.

**What is fixed and what is open.** Sections 4, 7 and 9 describe constraints we cannot move (VS Code, the tool contract, the constitution). Sections 3, 5, 6 and 8 describe what we want and why; the layout and interaction answers are yours. Section 11 lists tensions we expect you to resolve rather than paper over.

**Decisions already taken for this commission**

| Question | Decision |
|---|---|
| Mobile scope | Full analysis on **tablet** (touch-first). **Phone** gets catalog browsing and storyboard/briefing playback only, no editing. |
| Mobile host | Tablet runs **VS Code in the browser** (code-server / vscode.dev), so VS Code conventions still apply. Phone runs the **standalone web shell** as a lightweight installable web app. |
| Classic heritage input | Fifteen screenshots of classic Debrief (Section 3, Appendix E). |
| What we want back | **Wireframes and an interaction specification.** Low-fidelity layout, the mode model and a written interaction spec. Visual design is a second commission. |

---

## 1. What Debrief is and who uses it

Debrief is **post-exercise**. After a naval exercise, analysts reconstruct what happened: where vessels went, what each sensor heard, when contacts were classified, how target-motion solutions were derived. The output is reports, briefings and visualisations that validate tactics, train crews and feed lessons-learned.

It is **not** a real-time operations display and it is **not** a GIS. It is a reconstruction, analysis and reporting workbench for time-stamped maritime feature data.

**The artefact** is a **plot**: a catalog record (a STAC Item) holding a GeoJSON feature collection. Features are tracks (vessel paths over time), sensor contacts (bearings to unknown emitters), reference points, drawn annotations, narrative entries, storyboard scenes and analysis results. Every feature carries provenance: source → method and version → output.

### 1.1 Personas

| Persona | Goals | Device |
|---|---|---|
| **Analyst** (primary) | Typically ex-Royal Navy, deeply technical, reads sonar waterfalls and tactical plots daily. Opens Debrief once and stays in it for hours. Wants density, precision and speed. | Desktop; increasingly tablet |
| **Briefing author / instructor** | Turns an analysis into a narrative: captures scenes, orders them, plays them back to a room or exports them for others. | Desktop, tablet |
| **Briefing recipient** | Has no Debrief. Receives an air-gapped briefing package and plays it back in a browser; may be on a phone. | Phone, tablet, any browser |
| **Data curator** | Imports legacy files into the catalog, fixes metadata, enriches platform information, keeps the catalog tidy. | Desktop |
| **Scientist / tool author** | Writes analysis tools in Python. Never touches the UI directly, but every tool they publish appears in the Tools panel with its own parameters and result types. | Not a UI user, but the UI must accommodate their output |
| **Assistant (Copilot chat)** | Not a person. An LLM agent in VS Code that searches the catalog, summarises the open plot and runs tools on the analyst's behalf, with confirmation for anything that changes data. | Desktop, tablet |

What the audience wants, in their own terms: to deliver insights that influence real operational decisions, to be recognised for their work, to build tools others rely on, and to be the expert others consult. The UI should make them look competent, not make the software look clever.

### 1.2 Analyst goals and frequency

| # | Goal | Frequency |
|---|---|---|
| G1 | Find a plot in a catalog spanning many exercises | Every session |
| G2 | See the spatial picture: tracks, sensors, geometry on a map | Continuous |
| G3 | See the temporal picture: when things happened relative to each other | Continuous |
| G4 | Filter: narrow to a platform, time window, classification | Frequent |
| G5 | Select features and have selection follow across map, list and timeline | Continuous |
| G6 | Run analysis tools (track length, range and bearing, closest approach, TMA) on a selection | Frequent |
| G7 | Inspect and edit feature properties (name, classification, tags, platform, style) | Frequent |
| G8 | Read the audit trail: what ran, with what parameters, on what input | Frequent |
| G9 | Tune and re-run an analysis, see the effect, compare | Frequent |
| G10 | Capture and replay scenes for briefings | Occasional |
| G11 | Import legacy files into the catalog | Occasional |
| G12 | Export results (CSV, GeoJSON, chart image, briefing package) | Per session |

G2, G3 and G5 are the **core loop**. Everything else orbits them.

---

## 2. The design mandate

**Recognisably Debrief.** Carry forward the concepts in Section 3 in recognisable form: time as a first-class control, the Tote's primary/secondary track relationship, the layer tree with visibility, charts as peers of the map, and declared interaction modes. Done means: a classic user can locate the time controller, the layer tree and the tote without being told.

**Native to VS Code.** Use the workbench's regions, views, command palette, keybindings, theme tokens and notification patterns (Section 4). Done means: nothing in the design would look foreign next to the Explorer, Search or Source Control views, and the same design works in VS Code desktop and VS Code in a browser.

**Modern UI practice.** Modes are declared, not inferred. Every surface has empty, loading, error and stale states. Colour is never the only channel. Density scales from five features to five thousand. Done means: the states matrix in Section 12 is complete, and a new analyst can identify the map/timeline/list triad as one coordinated view within ten seconds.

**Touch, tablet and phone.** Tablet analysts do the full job with fingers; phone users browse and watch. Done means: every desktop interaction in Section 8 has a named touch equivalent, and nothing depends on hover.

---

## 3. Classic-Debrief heritage

Classic Debrief (v3, Eclipse-based) is what our users know. We are not cloning it: the project vision says explicitly "rebuild, not clone", feature parity is not required, and some legacy views will be retired. But the concepts below are the vocabulary of the domain, and the design should carry them forward in recognisable form.

The fifteen reference screenshots are listed in Appendix E and stored under `docs/design/legacy/`. Each is described here so the brief reads without them.

### 3.1 The workbench (figures 01, 07)

A menu bar (File, Edit, Run, Chart Features, Drawing, View, Window, Help), a two-row icon toolbar, and a fixed "Tactical Analysis" perspective: a left column stacking the **Time Controller**, a tabbed group (**Properties | Track Tote | Chart Overview | Navigator**) and the **Outline**; the **plot editor** filling the centre with a chart backdrop (bathymetry, coastline) or a black canvas; and **XY plots** (Range vs Time, Bearing-rate vs Time) as tabbed views bottom-right. Tracks carry date-time labels along their length. Annotations (a NOGO rectangle, a "Stovepipe" circle, a "BARRIER CHARLIE" line, text labels) sit on the same canvas. A status bar shows the cursor position and the last measurement.

*Trait to keep:* everything relevant visible at once; charts as peers of the map; a live status readout. *Trait to drop:* two rows of undifferentiated icons; menu-bar chrome; a fixed perspective.

### 3.2 Time Controller (figure 02)

Seven-button transport (start, big step back, step back, play, step forward, big step forward, end). A green LED-style date-time readout on black. A fine scrub slider. Below it a **dual-thumb time-period selector** with tick labels in DDHHMM (120500 to 121145) that bounds the visible period. Header icons for "filter to period", snail/trail display mode, step size and time format. "Fit to window" honours the filtered period.

*Keep:* the transport, the readout, the period selector and filter-to-period as one unit. *Translate:* the LED readout into the design system without pastiche.

### 3.3 Track Tote (figures 03, 13)

An attribute-by-track matrix: Range, Bearing, Relative Bearing, Bearing Rate, Angle on the Bow, Speed, Course, Depth, Time; one column per track with values in that track's colour; a units column (yards, degrees, deg/min, knots, metres). The Tote is **dynamic**: values are read at the time on the stepper (the value on or immediately after it). One track is **primary** (usually the target); any number are **secondary**. The primary shows absolute data; each secondary shows absolute data plus data relative to the primary; with exactly one secondary the primary shows relative data too. Annotations can be placed on the Tote; outside their validity period they show "n/a".

*Keep:* the concept, the primary/secondary relationship and the live update. This is a **gap in the current v4 surface set**: twenty tote-style measurement tools exist as services, but no live Tote panel exists yet. See UI-140.

### 3.4 Outline (figure 04)

A tree of layers with a **Visibility** check column: a Chart Features folder (coast plotter, scale, drawn line, polygon with nodes, rectangle), Annotations, Narratives, and one node per track expandable to its fixes and sensors. The toolbar carries select, **make primary (1)**, **make secondary (2, +2)** and show/hide toggles. Primary/secondary assignment lives here and drives the Tote.

*Keep:* tree with visibility; primary/secondary assignment from the tree; expansion to individual fixes and sensor cuts (v4 already supports nested selection down to a single fix).

### 3.5 Declared interaction modes (figures 05, 06)

The View toolbar carries five **mutually exclusive mouse modes**: Drag Track Segment, Drag Component (a corner or a single fix), Drag Whole Feature, Pan, and Range-Bearing (drag to measure; the result appears at the midpoint, e.g. `1392.69yd 145°`), plus Zoom In as the default drag-rectangle mode. Separate non-modal click buttons: Zoom Out, Fit to Window, Refresh View.

*Keep:* **modes are declared and exclusive.** Classic Debrief solved a problem our current prototype has not: today filter, selection and drawing are three mental models on one map with the mode inferred from the cursor. *Drop:* Refresh View (a design should never need one); mouse-only drag modes without a touch equivalent.

### 3.6 Chart Overview and chart furniture (figures 07, 10)

An inset overview map with a highlight rectangle of the current view (drag a region to zoom, double-click to recentre). The Chart Features menu adds furniture to the plot: Scale, Time Display (absolute / relative), grids (4W, standard, local), coastline, ETOPO bathymetry, chart library, VPF layers, Natural Earth.

*Keep as requirements:* on-map scale, on-map time display, grid, north/rotation indicator, overview inset (UI-150). *Translate:* backdrops become an offline vector basemap that v4 already has.

### 3.7 Properties view (figure 08)

An Eclipse property sheet: grouped Property | Value rows (Format: colour swatch, line thickness, link positions, symbol colour, length, type such as `ScaledSubmarine`, width, track font; Misc: arrow frequency, label frequency, line style) with pin, categorise, sort and restore-defaults controls.

*Translate:* v4 generates the property form from the schema; the design must handle dynamic field sets, grouped, with overrides marked.

### 3.8 Stacked dots / bearing residuals and track shifting (figure 09)

Two time-vertical charts (absolute bearing and bearing error against time) with a legend for course, measured, ambiguous and calculated bearings, and a drag-mode strip: **Translate, Rotate, Stretch, Shear**. This is the target-motion-analysis workflow: with a primary track carrying sensor data and exactly one secondary track, the analyst drags the solution on the map and the residuals update live. The five drag tools here are the ones our tool inventory flags as needing a touch-friendly and parameter-based equivalent (Section 7.6).

*Keep:* the live residual feedback loop and the primary/secondary precondition. *Translate:* drag modes into declared modes with touch handles and numeric twins.

### 3.9 Drawing toolbar (figure 11)

A one-click shape palette: ellipse, polygon, line, rectangle, wheel, circle, arc, label, range rings, target, vector, arrow. New drawings land in a Misc layer by default; a "manually select target layer" setting prompts for a layer per new feature.

*Keep:* one-click palette; a target-layer choice. v4 has point, rectangle, polygon and polyline today; the palette should be designed to grow.

### 3.10 Grid Editor (figure 12)

A tabular editor for a sensor's cuts (date-time, label, visible, frequency, bearing, ambiguous bearing) with a linked chart (frequency against time) beneath it, supporting bulk edits and smoothing. It opens as an editor beside the map, which shows the bearing fan.

*Keep as a requirement:* tabular bulk editing of fixes and cuts with a linked chart, side by side with the map (UI-141).

### 3.11 Time-variable plots (figure 14)

Opened from the Outline's right-click menu on candidate items ("Show XY Plot"), choosing the calculation and the primary track. The line is coloured by time to match the track's shading. A **tracker bar** (vertical line) follows the current time. Drag down to zoom in, drag up to zoom out, fit to window; gaps where data is absent. A **waterfall mode** puts time on the vertical axis.

*Keep:* charts synced to the playhead; waterfall option.

### 3.12 Symbology (figure 15)

Built-in vector symbols per platform type (frigate, towed-array frigate, submarine, minesweeper, merchant, helicopter, aircraft, destroyer, cruiser, carrier, fishing vessel, datum, reference position, sonobuoy types) and two SVG libraries: an **indexed** set on the affiliation-by-domain grid (friend / neutral / enemy / unknown by air / surface / subsurface, NTDS-style frames, plus civil vessels, buoys, weapons, drop and splash points, vectors) and a **non-indexed** set (mines, decoys, countermeasures, jammers, drones, wrecks, markers). Symbols scale in metres and take the track's colour.

*Keep as a requirement:* v4 currently has five geometric point shapes only. See UI-152.

### 3.13 Keep / translate / drop summary

No project document enumerates which classic views are retired. The table below is therefore a **proposal** for the designer to work from; the project lead will confirm.

| Classic concept | Disposition | v4 anchor |
|---|---|---|
| Time Controller (transport, readout, period selector, filter-to-period) | Keep | Time Controller panel |
| Track Tote (primary/secondary, live) | Keep — **not yet in v4** | UI-140 |
| Outline (tree, visibility, primary/secondary assignment) | Keep | Layers panel |
| Declared mouse modes | Keep, extend to touch | Mode model, UI-120 |
| Range-Bearing measure mode | Keep | UI-121 |
| Chart Overview inset | Keep (Could) | UI-150 |
| Chart furniture (scale, grid, time display) | Keep | UI-150 |
| Properties sheet | Translate to schema-driven form | Properties panel |
| XY / time-variable plots, tracker bar, waterfall | Keep | Results panel, UI-143 |
| Stacked dots + drag modes (TMA) | Translate to declared modes + numeric twins | Section 7.6 |
| Drawing palette + target layer | Keep, grow | Drawing toolbar |
| Grid Editor | Keep — **not yet in v4** | UI-141 |
| Platform symbology libraries | Keep — **not yet in v4** | UI-152 |
| Narratives view | Keep (Should) | Narrative entries are features today |
| Navigator (file tree) | Translate | STAC Stores tree |
| Menu bar, perspectives, Refresh View, two-row icon toolbar | Drop | VS Code command palette, views, panels |
| Lightweight tracks | Dropped by project decision | — |

Legacy interaction triggers, from the tool-migration inventory of 63 legacy tools: 30 are right-click context-menu tools, 19 are automatic tote calculations, 5 are drag operations on the plot, 5 are actions inside a specialised view, 4 are menu-bar items and 3 are toolbar buttons. Each trigger type needs a v4 and a touch equivalent (Section 7.5).

---

## 4. VS Code conventions the design must respect

The primary host is the VS Code extension. On tablet it is the same workbench served in a browser. The design must use VS Code's own structure:

| Region | What Debrief puts there today | Notes |
|---|---|---|
| **Activity Bar** | A "Debrief" icon and a separate "Debrief Log" icon. A focused profile hides Search, Source Control, Run and Extensions by default; the user can restore them. | Two icons for one product is a known smell (Section 10). |
| **Primary Side Bar** | The Debrief **Activity** view (a webview composing Time Controller, Tools, Layers, Properties as collapsible sections); the **Log** view; the **STAC Stores** tree inside the Explorer. | Activity and Log are webviews; STAC Stores is a native tree view. |
| **Editor area** | The **map** for each open plot (one editor tab per plot); the **Catalog Overview**; chart views. | Multiple plots can be open; each editor tab holds its own state. |
| **Panel** (bottom) | **Debrief Results** alongside Problems, Output and Terminal. | Appears only when the first result arrives. |
| **Secondary Side Bar** | Unused today. Available. | Candidate for Properties or Storyboard on wide screens. |
| **Status Bar** | Service health indicators (calc, catalog). | Health must be persistently visible; errors say what failed, why and how to fix it. |
| **Command Palette** | 61 commands, including the full storyboard family and named tools ("Debrief: Range & Bearing", "Closest Point of Approach"…). | Every action must be reachable from the palette. |
| **Notifications** | Toasts for artifact results and warnings. | First-session toast pile-up was a real problem; keep toasts rare and auto-dismissing. |
| **Copilot Chat** | Four language-model tools: search plots, summarise current plot, list tools, run tool (mutations need confirmation). | The chat pane is a peer surface; results it produces land in the same Results panel. |

**Existing keybindings** (all scoped to map focus unless stated): Ctrl+A select all; Esc / Delete clear selection; Ctrl+0 fit to all; Ctrl+= / Ctrl+- zoom; Ctrl+Shift+O open plot (global); Ctrl+Z / Ctrl+Y undo and redo; Ctrl+S save; Delete removes selected features from the Activity panel; Ctrl+Alt+C capture scene; Left / Right step the active storyboard; `L` toggles viewport lock; Space plays and pauses. A single-letter map-shortcut convention exists (no modifiers, never fires inside text fields, one fire per press) and a `?` help overlay listing live shortcuts is planned.

**Theming.** Four variants are first-class: light, dark, high-contrast light, high-contrast dark. Inside VS Code the palette is whatever theme the user installed; designs may not assume fixed colours. Components already use VS Code-styled primitives and the Codicon icon set; treat these as the de-facto system.

**Webview vs native.** Tree views (STAC Stores) get native VS Code look and keyboard behaviour for free but cannot host custom controls. Webviews (map, Activity, Log, Results, Storyboard) can render anything but must reproduce VS Code affordances themselves. Say which each new surface should be.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| UI-001 | Every Debrief surface maps to a named VS Code region (Activity Bar, side bars, editor, panel, status bar); no floating custom chrome. | Must | D T |
| UI-002 | Every user action is available from the command palette, has a keyboard route, and a touch route on tablet. | Must | D T |
| UI-003 | The design specifies which surfaces are native tree views and which are webviews, and why. | Must | D T |
| UI-004 | All four theme variants are covered with no fixed colours; high contrast is a distinct variant, not a darker dark. | Must | D T P |
| UI-005 | Service health is visible at all times (status bar or equivalent); error messages say what failed, why, and how to fix it. | Must | D T P |
| UI-006 | Toasts are reserved for events that need attention now; nothing sticky covers the editor. | Should | D T |
| UI-007 | The focused workbench profile (hidden default activities) is respected and reversible. | Should | D T |
| UI-008 | The Copilot chat surface is designed as a peer: tool runs from chat produce the same result and provenance surfaces as tool runs from the panel. | Should | D T |

---

## 5. The two UI modes

### 5A. Mode A — STAC Browser (no plot open)

**Purpose.** Continue recent work, discover plots, triage the catalog, import new data. About **70% of sessions start by reopening recent work**, so recent items come first.

**What exists in requirements today.** A persistent lozenge filter bar above three synchronised result views (list, map footprints, Gantt timeline). Metadata filters are lozenges; spatial and temporal filters are implicit in the map viewport and the timeline range and do not appear as lozenges. All three views always reflect the combined filter state.

**Filter bar.** A `+` opens a filter-type picker (ten types today: vessel class via a hierarchical taxonomy with search and counts, plot tag, feature tag, author, plot duration in five bands, plot title, plot contents, track name, track nationality, folder/collection). A compound **Platform** chip ANDs nationality, domain, role and class in one lozenge ("British submarines"). Lozenges AND by default; an **OR group** is itself a lozenge into which other lozenges are dragged (moved, not copied) or added via a mini `+`; one level of nesting only. Lozenges can be negated. Click a lozenge to edit it. A quick-search box does substring search. Configurations can be saved with a name and restored from a separate "historic filters" list. Optionally, a natural-language box converts a phrase into lozenges (off by default, network-dependent, with seven distinguishable failure banners that never destroy existing chips).

**Result views.** The **list** shows title, metadata summary (classes, tags, author, duration), dates and a small spatial thumbnail (200×150) with a recently-opened section at the top; sortable by recency, name or duration. The **map** shows footprints; **panning or zooming is the spatial filter**; double-click opens. The **timeline** shows one bar per plot; **the range handles are the temporal filter**; the time axis stays fixed while the list scrolls. A colour-dimension selector (age, vessel class, tag) applies identically to map and timeline with a legend always visible. Filter changes propagate within 200 ms. When nothing matches, all three views show the same "no matches" state. A **preview pane** shows the selected plot's large overview image (800×600) with previous/next through the filtered set by button and arrow key.

**Opening.** Selecting a plot from any view opens it in a new editor tab; the browser keeps its state.

**Known problems to solve** (from the April and June UI reviews): the timeline-plus-map row takes half the screen to show sparse dots and is not collapsible; the filter-type picker is a flat untyped list; the thumbnail size toggle does nothing; read-only sample items show two banners on first load before the user has tried to edit.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| UI-010 | Recently opened plots are the first thing on screen, one tap to resume. | Must | D T P |
| UI-011 | Metadata (lozenges), spatial (map viewport) and temporal (timeline range) filters compose into one state that all views reflect; the design makes their unity legible. | Must | D T |
| UI-012 | The filter-type picker groups types (metadata / content / operational), with a one-line description per type. | Should | D T |
| UI-013 | OR groups, negation, saved filters and the compound Platform chip are designed as first-class lozenge behaviours, with a touch route for drag-into-group. | Must | D T |
| UI-014 | The catalog preview row (map + timeline) is collapsible, defaults follow first-run vs returning-user logic, and its state persists. | Must | D T |
| UI-015 | List thumbnails come in user-selectable sizes that visibly change the row. | Should | D T |
| UI-016 | A single "no matches" state is shared by list, map and timeline, with a one-tap "clear all filters". | Must | D T P |
| UI-017 | Read-only stores and read-only items are signalled once, quietly, and loudly only on an edit attempt. | Should | D T |
| UI-018 | Collections (folders) are navigable and filterable; the catalog remains usable at 1,000+ items. | Must | D T |
| UI-019 | Import is reachable from the browser ("Load into Debrief…"): pick a file, pick a destination store, confirm; failures are explicit with the reason. | Must | D T |
| UI-020 | Review-feedback status is visible per plot and filterable. | Could | D T |
| UI-021 | The natural-language filter entry, when enabled, is visibly optional and network-dependent; failures preserve the current filter state. | Should | D T |
| UI-022 | On phone the browser degrades to list-first: recent items, search, lozenges as chips, map and timeline as secondary tabs; opening a plot enters read-only view. | Must | P |

### 5B. Mode B — Plot Editor with control panels

**The core loop.** Map, timeline and feature list are **one logical view** showing three projections of the same filtered set. Selection propagates instantly across all three; filter state is shared; the empty state is shared; there is no master view. Selection is path-based: a whole track, a segment, a single fix or a sensor cut can be selected, and multi-selection can mix depths. The design must make the triad legible as one organism.

**Time.** A playhead with scrub, play/pause, speed (1× to 8×), step, a visible range, and a **Full / Trail** display mode (whole track versus start-to-now trail). Playback stops at the end of the range. "Stopped" renders identically to "paused". Ten updates a second during playback. Everything time-driven (map highlight, tote, charts) follows the playhead.

**Control panels.** Each panel is listed with its purpose, its suggested prominence (primary = always visible, secondary = one click away, tertiary = on demand), its classic ancestor, and whether it exists in v4.

| Panel | Purpose | Prominence | Classic ancestor | v4 status |
|---|---|---|---|---|
| **Time Controller** | Playhead, transport, range, speed, Full/Trail | Primary | Time Controller | Exists |
| **Layers** (feature list + toolbar) | Tree of features to arbitrary depth (track → segments / positions / sensors → contacts), per-feature visibility, selection, 10,000-row virtualisation; toolbar with Delete, Visibility, Run (tools) on the left and Filter, Associated Files on the right; the Run menu pulses when the applicable tool set changes | Primary | Outline | Exists |
| **Tote** | Live kinematics for primary vs secondaries at the playhead | Primary for TMA work | Track Tote | **Missing** |
| **Properties** | Schema-generated form for plot, feature, sub-feature or multi-selection; auto-derived fields marked and overridable; per-field commit on blur or Enter; read-only plots disable editing visibly | Secondary | Properties | Exists |
| **Tools** | Context-sensitive list; active tools first with a run affordance, inactive tools dimmed with a plain-English reason ("needs 2 tracks, 1 selected"); hide/show inactive toggle; parameters collected one at a time in inline menus anchored at the tool; zero-parameter tools run at once | Secondary | Right-click menus | Exists |
| **Results** | Appears only when the first result arrives, beneath the map at a 70/30 split; one panel per tool type side by side, third becomes a tab; title `Tool · feature +N`, unsaved dot, Save, Save As, Retry on error; body is a chart or a table as the tool declares, no user toggle | Secondary | XY plots | Exists |
| **Log** (provenance) | Cards newest-first: step number, category glyph, tool name, track badge, timestamp, duration, parameter chips with type icons and a non-default marker; four views (Timeline, By Feature, Compact, Detailed); card-flip to reveal rationale and editable parameters with live replay; disabled entries at half opacity but still interactive; Tune, Revert-this, Revert-to-here, Snapshot-from-here, Branch-from-here; reference-data currency badges and a shadow-track dismiss control | Secondary, but its importance exceeds its current prominence | none | Exists |
| **Storyboard** | A modeless side rail next to the map and time controls (never occluding either): storyboard picker, Capture, range capture, Preview, Export, viewport-lock toggle, transport; scene rows with thumbnail, title, constraint icons, overflow menu (rename, describe, delete with undo, update-to-current, duplicate, copy, refresh thumbnail); no drag reorder by decision; collapses to a tab strip keeping one capture affordance | Secondary; primary in briefing mode | none | Exists (VS Code), spec'd cross-host |
| **Drawing** | `+` palette: point, rectangle, polygon, polyline today; guidance text while drawing; Esc cancels; mode ends when the shape completes; ephemeral | Tertiary | Drawing toolbar | Exists |
| **In-plot filter bar** | Same lozenge component as the browser, scoped to features (name, type, platform, attachments, before/after, visibility) with "apply to selection" | Tertiary | none | Exists |
| **Activity / progress** | Running operations, service health, boot state | Tertiary | none | Partial |
| **Chart furniture** | Scale, grid, on-map time, north/rotation, overview inset | Primary (furniture) | Chart Features | **Missing** |

**Mode model.** The editor has these interaction modes, which must be **declared, visible and exclusive**: explore (pan/zoom/select), draw (a shape type), measure (range-bearing), direct-manipulate (drag a feature, a component, a segment; the TMA drag modes), parameterise (a tool's inline parameter menu is open), storyboard play, and viewport-locked. Classic Debrief's toolbar toggles are the reference. The current prototype infers the mode from the cursor; that must go.

**Transitions.** Opening a plot creates an editor tab; multiple plots may be open with per-tab state and results titles prefixed by plot name; closing the last plot returns to the browser. What **persists with the plot**: viewport, current time and range, selection, per-feature visibility, active storyboard, results layers. What is **ephemeral** and resets on open: playback state, drawing mode, viewport lock. Saving is atomic: "Saved" and the dirty flag clear only after the write commits; thumbnail capture is best-effort.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| UI-100 | Map, timeline and feature list are visibly one coordinated view: shared selection, shared filter, shared empty state, no master. | Must | D T |
| UI-101 | Selection down to a single fix or sensor cut is possible from list and map, and its depth is visible. | Must | D T |
| UI-102 | The Time Controller shows transport, readout, range, speed, step and Full/Trail; stopped and paused render alike; playhead drives every time-bound surface. | Must | D T |
| UI-103 | The Time Controller has a **period selector** (dual-thumb) and a **filter-to-period** action that fit-to-window respects. | Should | D T |
| UI-104 | The Layers tree supports nesting to arbitrary depth, per-feature visibility, primary/secondary assignment, grouped sensors and segments, and 10,000 rows. | Must | D T |
| UI-105 | Properties is a schema-driven form: dynamic field sets, grouped, overrides marked, per-field commit, read-only signalled. | Must | D T |
| UI-106 | Tools: active tools are unmistakably distinct from inactive ones (not text colour alone); every inactive tool states why; the list scales to a hundred tools through categories. | Must | D T |
| UI-107 | Tool parameters are collected inline near the trigger, one at a time, from schema-derived presets with a custom entry; Escape or tap-outside cancels the whole flow. | Must | D T |
| UI-108 | Results appear only on first result, at a draggable split, one panel per tool, chart or table by declaration, with unsaved / save / save-as / retry. | Must | D T |
| UI-109 | Results tabs from several open plots are distinguishable by plot name. | Should | D T |
| UI-110 | The Log is discoverable from the main editor (not only a second Activity Bar icon) and its card-flip tune-and-replay is discoverable without instruction. | Must | D T |
| UI-111 | Log category is conveyed by glyph and colour together; parameter type by icon; non-default values by a marker; disabled entries remain readable and interactive. | Must | D T |
| UI-112 | Revert-this, revert-to-here, snapshot-from-here and branch-from-here are visible actions with consequences stated (permanent vs recoverable). | Must | D T |
| UI-113 | Reference-data currency states (current, changed, unavailable, structure-changed, unchecked) each have a distinct badge; a single batched modal on session open offers view-diff / accept / reject per source. | Should | D T |
| UI-114 | After any recalculation the previous solution renders as a faded shadow in the same colour family; a dismiss control lives in the Log; no timeout, no implicit dismissal. | Should | D T |
| UI-115 | The Storyboard rail never occludes the map or time controls during capture; naming and duplicate-time prompts are in-rail, not modal. | Must | D T |
| UI-116 | Storyboard: capture, range capture, preview in a new tab, export briefing package, viewport lock with an on-map unlock indicator; scene rows with overflow actions; no drag reorder; collapses to a tab strip with one capture affordance. | Must | D T |
| UI-117 | The active scene's rectangle on the map carries the selection halo; scenes group under their storyboard in Layers. | Should | D T |
| UI-118 | Drawing is a declared mode with guidance text, Escape/cancel, auto-exit on completion, and a growable palette with a target-layer choice. | Must | D T |
| UI-119 | Multiple open plots: per-tab state; closing the last plot returns to the browser; persisted vs ephemeral state as listed above. | Must | D T |
| UI-120 | Interaction modes are declared, visible and exclusive; the current mode is announced where the eye already is. | Must | D T |
| UI-121 | A measure mode (range and bearing between two points) with a live readout at the midpoint and unit choice. | Should | D T |
| UI-122 | Undo/redo (UI state) and the Log (data history) are visibly different things; undoing a pan never touches data. | Must | D T |
| UI-123 | Saving reports success only after commit; dirty state is visible per plot. | Must | D T |
| UI-124 | Empty, loading, error and stale states for every panel (Section 12). | Must | D T P |
| UI-140 | A **Tote** panel: attribute × track matrix for primary and secondaries, live at the playhead, values coloured per track, units column, "n/a" outside validity; assignment of primary/secondary from Layers and from the Tote. | Must | D T |
| UI-141 | A tabular editor for the fixes of a track or the cuts of a sensor, side by side with the map and a linked chart, supporting bulk edit and smoothing. | Should | D T |
| UI-142 | Track fixes carry optional date-time labels along the track at a configurable interval. | Should | D T |
| UI-143 | Time-series charts show a tracker bar at the playhead, support zoom and fit, show gaps for missing data, and offer a waterfall (time-vertical) orientation. | Should | D T |
| UI-150 | Chart furniture: scale bar, grid, on-map time display (absolute and relative), north/rotation indicator, optional overview inset. | Should | D T |
| UI-151 | The map supports a rotated view ("primary centred, north oriented" style) and the furniture follows it. | Could | D T |
| UI-152 | A platform symbology library: symbol by platform type, affiliation frames, orientation to course, size in map units or pixels, per-track colour, with a legend; the style form exposes it. | Should | D T |
| UI-153 | Narrative entries have a readable, time-synced list surface. | Should | D T |

---

## 6. Business processes

Each process lists trigger, actor, steps, UI touchpoints, exit state and design implications. Requirements are `BP-nnn`.

### BP-1 Ingest and curate

*Trigger:* new exercise data arrives as legacy files (REP, DPF, others). *Actor:* data curator or analyst.

1. Choose a file (from the browser's import action, the OS context menu, or a drag onto the catalog).
2. Choose the destination: create a new plot or add to an existing one, in a chosen store.
3. The importer validates strictly and **fails fast** with a specific reason; no forgiving parse.
4. Features are written; the source file is copied into the plot's assets and is **immutable** from then on; an import entry is written to the Log.
5. Platform names are matched against the platform registry; unmatched platforms raise warnings the curator resolves in Properties (class, nationality).
6. Thumbnails are generated; the plot appears in the catalog.

*Exit:* a plot in the catalog with provenance back to the source file.
*Implications:* the UI never implies "edit the source", only "create a derived feature"; import errors are explicit and actionable; warnings are a work queue, not a toast.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-001 | Import is a two-choice flow (file, destination) with strict, explicit failure and a visible provenance entry. | Must | D T |
| BP-002 | Post-import warnings (unmatched platforms, missing metadata) are presented as a list to resolve, with a route into Properties for each. | Should | D T |

### BP-2 Find and resume

*Trigger:* session start. *Actor:* analyst.

1. Recent plots are offered first; one tap resumes (viewport, time, selection and active storyboard restore from the plot).
2. Otherwise discover iteratively: add a lozenge, look at the map, zoom, adjust the time range, add another lozenge; all views stay in step.
3. Preview the candidate (overview image, metadata); open it in a new tab; the browser keeps its filters.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-003 | Resume is one action and restores the saved working state. | Must | D T P |
| BP-004 | Discovery is order-independent and iterative across three synchronised views. | Must | D T |

### BP-3 Reconstruct and analyse

*Trigger:* a plot is open. *Actor:* analyst.

1. Orient: fit to data, scrub time, toggle visibility, set primary and secondary tracks.
2. Select the inputs on map or list; the Tools panel updates to the applicable set.
3. Pick a tool; supply parameters inline; run. Zero-parameter tools run at once.
4. Feedback by result kind: a **mutation** changes existing features in place with a transient highlight; an **addition** adds features (selected and visible); a **deletion** removes features; an **artifact** (chart, table, image, report) raises a notification and opens in the Results area at the user's preferred placement.
5. Inspect the result in the Results panel and on the map; save it (date-stamped or named) as a plot asset.
6. Tune: open the Log card, change a parameter, watch everything downstream replay; the previous solution shows as a shadow until dismissed.
7. Errors are fail-fast with a category (invalid input, algorithm failure, resource not found) and the affected features; no partial results. Running the same tool again while one is in flight discards the earlier run.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-005 | Select → tool → parameters → run → result → save is achievable without leaving the editor, and each step's state is visible. | Must | D T |
| BP-006 | Result feedback differs by kind (mutation, addition, deletion, artifact) as above. | Must | D T |
| BP-007 | Tune-and-replay is reachable from the result and from the Log, with the shadow comparison. | Must | D T |
| BP-008 | Errors name the category, the affected features and the next step; there is a Retry. | Must | D T P |

### BP-4 Audit, revert, snapshot, branch, trace impact

*Trigger:* the analyst needs to review or change history. *Actor:* analyst; also auditors.

- Two histories: **UI undo/redo** (pan, zoom, time, visibility; session-only) and **the Log** (every data change; saved with the plot). Undoing a pan never touches data.
- The Log shows entries since the last snapshot with "load more (12 earlier operations)" and "load full history".
- **Revert this** removes one entry and replays the rest (recoverable; if a later entry fails, the system halts and names it). **Revert to here** discards everything after (permanent).
- **Snapshot** creates a save point (not the same as Save). **Branch from here** creates a new plot with the history to that point and a two-way link.
- Re-runs never overwrite artifacts: versions v1, v2, v3; open views refresh in place with an "updated to v3" cue, or open side by side if the user prefers.
- **Impact tracing:** when a source file is found faulty, follow forward links through snapshots to list every downstream result and report affected.
- **Reference-data currency:** on session open, external reference values (e.g. a vessel's draft from a register) are re-checked; changed ones are presented once in a batched modal with view-diff / accept / reject; accepting re-runs downstream calculations automatically.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-009 | The Log supports load-more across snapshots, revert-this, revert-to-here, snapshot and branch, each with its consequence stated before commit. | Must | D T |
| BP-010 | Artifact versions are navigable; auto-refresh vs side-by-side is a user preference. | Should | D T |
| BP-011 | Impact tracing from an import entry lists affected downstream results. | Could | D T |
| BP-012 | Reference-data currency is checked on open and presented as one batched decision. | Should | D T |

### BP-5 Annotate and style

*Trigger:* the analyst marks up the plot. *Actor:* analyst.

1. Enter a drawing mode, draw, name the shape, choose its layer; the shape is a real feature and a valid tool input ("draw a polygon, analyse within it").
2. Style via a format menu (only properties valid for that feature kind; palette; preset weights and opacities) or via Properties; hide and reveal features over a time period; colour tracks; set symbol and label intervals.
3. Every style change is a Log entry.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-013 | Drawn shapes are first-class features: selectable, stylable, tool inputs, provenance-bearing. | Must | D T |
| BP-014 | Styling actions are reachable from the feature (map, list) and from Properties, with the format menu scoped to the feature kind. | Must | D T |

### BP-6 Target-motion and sensor reconstruction

*Trigger:* a sensor track with bearings and an ownship track. *Actor:* analyst.

1. Assign primary (target) and secondary (ownship) tracks; the Tote shows relative kinematics live.
2. Resolve ambiguous bearings (port/starboard); trim, merge or split sensor data in the tabular editor.
3. Generate a solution (from cuts, from ownship legs, from an infill); view residuals (stacked dots) beside the map.
4. Adjust the solution directly (translate, rotate, stretch, shear) or numerically; residuals update live; the previous solution shadows.
5. Accept; the segment becomes part of the track with provenance.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-015 | The primary/secondary precondition is visible and settable in one gesture. | Must | D T |
| BP-016 | Direct manipulation of a solution has a touch route (handles) and a numeric twin (parameters), both with live residual feedback. | Should | D T |

### BP-7 Storyboard and brief

*Trigger:* findings need to be told. *Actor:* briefing author; recipients on any device.

1. Frame the map and time; optionally lock the viewport; capture a scene (button or shortcut); name the storyboard on first capture in-rail.
2. Capture a time-range scene in two steps (start, then end); scenes record display mode (Full/Trail) and visible features.
3. Order is capture order; edit title and description in-row; duplicate, copy, refresh stale thumbnails; overlapping time-range scenes get a non-blocking warning.
4. Play back: transport and arrow keys animate the map between scenes; time scrubs in step.
5. Preview the finished briefing in a new browser tab; export an air-gapped package (a folder with an `index.html`) that opens by double-click with no server; Present and Minimal modes.
6. Recipients play it back on any device, including phones.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-017 | Capture never hides the map or time controls; the whole authoring loop is possible without a modal. | Must | D T |
| BP-018 | Playback on phone: full-screen map, scene list as a sheet, transport thumb-reachable, no editing. | Must | P |
| BP-019 | Preview and export are one control each in the storyboard header; disabled states explain why. | Must | D T |

### BP-8 Export and report

*Trigger:* results must leave the tool. *Actor:* analyst.

Today: CSV of results, GeoJSON, chart and map PNG, GPX, briefing package. Planned: a reporting pipeline (PDF summary with maps, charts and narrative; slide decks; geo-referenced PDF maps; templates).

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-020 | Export actions live where the thing being exported lives (result panel, map, storyboard), with a consistent destination prompt. | Must | D T |
| BP-021 | Saved exports are discoverable afterwards from the plot (associated files). | Should | D T |

### BP-9 Assistant-driven work

*Trigger:* the analyst asks Copilot chat. *Actor:* analyst plus assistant.

The assistant can search plots (free text, time, platform, extent) and open one; summarise the open plot; list applicable tools; run a tool. Reads run without asking; **mutations require a plain-language confirmation**, apply as an editor edit, and are undoable in one step. Analytical results go to the chat reply **and** the Results panel. The analyst's request is recorded in provenance.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-022 | Assistant-initiated results and mutations are indistinguishable from manual ones in Results, Log and undo, and are labelled as assistant-originated. | Should | D T |

### BP-10 Extend

*Trigger:* a scientist publishes a new Python tool. *Actor:* tool author; every analyst.

The tool appears in the Tools panel from its manifest alone: name, category, selection requirements, parameters and result types. The UI must handle a tool, parameter type or result type it has never seen, degrading gracefully down the result-type path (a viewer for a known sub-type, a generic preview for its parent, a plain notice at worst).

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| BP-023 | The Tools, parameter and Results designs are generic over the manifest; unknown types have a designed fallback, never a blank. | Must | D T |

*Future-facing:* cross-exercise aggregate queries ("all initial detections under 5 nm across the archive") are a strategic goal; the browser design must not preclude a query-and-results mode.

---

## 7. The analysis tool catalogue, as the designer needs it

### 7.1 Two category systems

**Operational categories** (the directory a tool lives in; 70 specifications today): track/styling (7), track/measurement (20, mostly tote-style live readouts), track/manipulation (13), track/analysis (7), sensor/calibration (3), sensor/analysis (6), sensor/detection (1), dataset/export (8), shape/manipulation (2), reference/generation and classification (2), narrative/formatting (0, reserved). Thirteen are implemented as services today.

**Visual categories** (drive the Log card glyph and tint): import, style, calc, filter, snapshot, plus a neutral "other" fallback. Colour marks the family only; it carries no meaning about outcome.

### 7.2 Selection context

A tool declares which feature kinds it accepts and how many (min/max), possibly at a nested path (`TRACK.SENSOR`, `TRACK.SEGMENT`). Matching is **closed-world**: a tool is active only if the selection contains exactly what it accepts. Context types are single, multi, region (a drawn area) and none. Inactive tools are still listed, dimmed, with a generated explanation ("needs 2 tracks, 1 selected").

### 7.3 Parameters

Six schema-defined types: named colour, marker symbol, cardinal direction, duration preset, numeric preset, reference-point pattern, plus free string, number, boolean and enum. Enum values come from the schema, not from the UI. Parameters are collected one at a time in an inline menu; presets first, "Custom…" reveals a text field.

### 7.4 Result kinds and required feedback

| Kind | Meaning | Feedback |
|---|---|---|
| mutation | Existing features changed (styled, translated, smoothed…) | In-place change plus transient highlight |
| addition | New features (a CPA point, generated reference points, a buffer zone) | Features appear, are selected and visible; Layers updates |
| deletion | Features removed | Removed from all views; Log records it; recoverable via revert |
| artifact | Non-feature output: chart, table, image, report, exported file | Notification; opens in Results at preferred placement; versioned on re-run |

Every result carries a label, its source features, and for artifacts a link. Datasets carry axis labels, types and units, which is what drives charts.

### 7.5 Legacy trigger types and their v4 / touch equivalents

| Legacy trigger | Count | v4 route | Touch route |
|---|---|---|---|
| Right-click context menu | 30 | Context menu on map and list, Tools panel, palette | Long-press; Tools panel |
| Automatic tote calculation | 19 | Tote panel (UI-140) | Same |
| Menu bar | 4 | Command palette, Tools panel | Tools panel |
| Toolbar button | 3 | Editor title actions | Same, ≥44 px |
| View action | 5 | Actions inside Results / residuals views | Same |
| Drag on plot | 5 | Direct-manipulate mode with handles + numeric twin | Handles sized for fingers |
| Intermediate dialog (parameters) | ~12 | Inline parameter menus | Same, bottom-sheet on narrow widths |

### 7.6 Tools needing a new interaction

Rotate, stretch, shear and translate a track segment, and stretch a sensor fan: legacy drag operations with no keyboard, chat or touch route. Each needs a **direct-manipulation mode** (handles on the map) and a **parameter twin** (angle, scale, offset), and the residual chart must update live during the drag.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| UI-160 | Tools are grouped by category with active ones first; the list is searchable and remains usable at 100 tools. | Must | D T |
| UI-161 | Every result kind has a designed feedback pattern; every artifact type has a viewer or a generic fallback. | Must | D T |
| UI-162 | Direct-manipulation tools have handle-based touch designs and a numeric twin, with live residual feedback. | Should | D T |
| UI-163 | Artifact placement (above, below, right, floating) is a user preference, with a sensible default per host. | Could | D T |

---

## 8. Touch, tablet and phone

Nothing in the project's existing analyst-UI documents addresses touch. This section is new. Two decisions bound it: tablet is a **full-analysis** target running VS Code in a browser; phone is a **consumption** target running the standalone web shell as an installable web app. The only precedents in the project are an internal backlog tool (1024 px breakpoint, card list below it, bottom-sheet editors, drag-down dismiss, ≥44×44 px targets, a sticky action bar for unsynced edits) and the web shell's bottom-tab layout below 767 px. Treat them as precedent, not design.

**Assumptions to state in your response:** tablet landscape (≥1024 px) is primary and portrait secondary; a 10-inch tablet is the smallest full-analysis device; phone is 360–430 px wide; both tablet and phone may be offline.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| UI-200 | All interactive targets are ≥44×44 CSS px on touch devices, including tree rows, lozenges, transport buttons and chart handles. | Must | T P |
| UI-201 | No affordance is hover-only: tool explanations, row info and format buttons, resize handles, panel-drag hints and tooltips all have a tap or long-press route. | Must | T P |
| UI-202 | Long-press is the touch equivalent of right-click everywhere a context menu exists. | Must | T P |
| UI-203 | On the map, the declared mode disambiguates gestures: in explore mode pinch zooms and drag pans; in draw, measure and manipulate modes drag acts on data and a two-finger gesture still pans. | Must | T |
| UI-204 | Timeline and chart zoom (ctrl-wheel on desktop) map to pinch; range handles are draggable by finger. | Must | T |
| UI-205 | Drag-and-drop (lozenges into OR groups, panel rearrangement) has a button or menu alternative. | Must | T P |
| UI-206 | The transport is thumb-reachable on tablet and phone; play/pause and step do not require precision. | Must | T P |
| UI-207 | Tablet panel strategy: Activity sections collapse to icons, the storyboard rail collapses to a tab strip, the results split is adjustable by a finger, and the map keeps the majority share in landscape and portrait. | Must | T |
| UI-208 | Text entry is minimised on touch: parameters from presets, names with suggestions, numeric steppers where ranges are known. | Should | T P |
| UI-209 | Phone (web shell): catalog list-first with search and chips; open a plot in **read-only** view with map, time transport and a feature sheet; storyboard playback full-screen; results readable; no drawing, tool execution or property editing. | Must | P |
| UI-210 | Phone offline: an installable web app that works with a previously opened plot and any exported briefing package without a network. | Should | P |
| UI-211 | Keyboard parity is preserved on tablet (external keyboards are common); the single-letter map-shortcut convention and the `?` help overlay apply. | Must | T |
| UI-212 | A hardware pencil/stylus is treated as a precise pointer: hover-like previews where supported, no pencil-only paths. | Could | T |
| UI-213 | Orientation change preserves state and re-flows panels without losing the map centre or the playhead. | Must | T P |

---

## 9. Cross-cutting requirements

These come from the project constitution and architecture. They are not negotiable.

| ID | Requirement | Pri | Dev |
|---|---|---|---|
| UI-300 | **Offline by default.** No design element requires a network for core function. Online features (natural-language filters, remote catalogs, Copilot) are additive and visibly optional. | Must | D T P |
| UI-301 | **No silent failure.** If a tool cannot run, the UI says why. Status is always knowable. Operations succeed fully or fail explicitly. | Must | D T P |
| UI-302 | **Provenance always.** Every result on screen visibly traces to its inputs and parameters. Provenance is a first-class surface, not a debug panel. | Must | D T P |
| UI-303 | **Source preservation.** Original files are immutable; the UI never implies editing the source. | Must | D T |
| UI-304 | **Schema-first forms.** Property and parameter forms are generated; designs accommodate dynamic field sets, not hand-tuned layouts. | Must | D T |
| UI-305 | **Multi-host parity.** Shared components render in VS Code, the web shell and the briefing renderer; any host-specific choice is flagged. Layout is host-owned; appearance and behaviour are shared. | Must | D T P |
| UI-306 | **Theming.** Four variants; VS Code variants inherit the user's theme tokens; the brand palette applies where tokens do not reach. | Must | D T P |
| UI-307 | **Accessibility.** WCAG 2.1 AA minimum (4.5:1 text, 3:1 UI); AAA for high-contrast links; keyboard navigable; screen-reader labelled; colour is never the only channel (the map already spends colour on track identity). | Must | D T P |
| UI-308 | **Internationalisation.** All copy externalisable; no text in icons; right-to-left feasible; dates, numbers and coordinates respect locale. | Must | D T P |
| UI-309 | **Units and conventions.** Knots, nautical miles, yards and metres, degrees (0° = north, clockwise), depth positive downward, date-time groups to the second (microseconds stored), relative bearings with side (R100.7), bearing rate with direction (2.059L). Monospace for values, coordinates and timestamps. | Must | D T P |
| UI-310 | **Density.** Designs that work with 5 features and break at 500 are unacceptable; lists are virtualised and the design must not subvert that; 5,000 features is the target. | Must | D T |
| UI-311 | **Performance feel.** Selection and filter changes propagate within 200 ms; playback renders at ≥10 updates per second; the first plot renders in under 1.5 s on a laptop. | Should | D T |
| UI-312 | **States.** Every surface has designed empty, loading, error, stale and read-only states (Section 12). | Must | D T P |
| UI-313 | **Two histories.** UI undo/redo and the data Log are distinct and never confused. | Must | D T |
| UI-314 | **Visual language.** Substance over decoration; chart-room aesthetic; restrained colour (one highlight per view, red only for errors); Inter and JetBrains Mono; 4 px spacing base; 150 ms / 250 ms motion; no bounces. Applied to a dense application UI, not the marketing site it was written for. | Should | D T P |

---

## 10. Open issues the design should resolve

From the UI reviews of April and June 2026 (still open) and the April brief's pain points:

1. Two coexisting layout strategies (fixed VS Code regions vs dockable panels in the web shell) with no shared mental model.
2. Primary Side Bar overload: Explorer, Outline, STAC Stores, Activity, plus standard views compete; two Debrief icons on the Activity Bar.
3. The map/timeline/list triad is not visibly one view.
4. Filter, selection and drawing are three mental models on one map with an inferred mode.
5. Provenance is rich but hidden: the Log's tune-and-replay is undiscoverable; the "LOG" tab reads as a label.
6. The Tools list is flat; active vs inactive differs by text colour only.
7. Empty states are inconsistent or absent (first run, no plot, no matches, no tools, boot with mixed loading states).
8. Storyboarding feels grafted on rather than a mode of the workbench.
9. Density vs comfort: one dense baseline, or a density toggle?
10. The default layout wastes a third of a 1920 px screen while the activity column is too narrow for tool names; at 720 px tall the Properties panel falls below the fold with no scroll hint.
11. The catalog preview row is not collapsible; the thumbnail size toggle does nothing; the filter-type picker is untyped.
12. Two adjacent `+` icons on the map toolbar (zoom and draw).
13. Read-only banners show for every read-only item before any edit attempt.
14. Result layers, drawing mode and tool-level undo behave differently between hosts; the status bar shows green even if a service dies after start.
15. Reserved keys for map shortcuts need a visible registry (the `?` overlay).

---

## 11. Tensions the designer must resolve

We would rather you argue these out than smooth them over.

- **Density vs touch targets.** Analysts want 500 rows on screen; fingers want 44 px rows. A single dense baseline with a touch density, a scale-with-input-type rule, or a user toggle?
- **VS Code chrome on a 10-inch tablet.** Activity Bar, side bar, editor, panel and status bar eat a lot of a small screen. What collapses, what auto-hides, what becomes a sheet?
- **Brand palette vs VS Code tokens.** Inside VS Code the user's theme wins; where does Bearing Blue survive, and where must it yield?
- **Declared modes vs "everything visible".** Classic showed every panel at once and declared modes with toolbar toggles. VS Code prefers fewer, larger regions. How do modes stay visible without a toolbar row?
- **Tote vs Results.** The Tote is live and time-driven; the Results panel is run-once and saved. Are they one surface with two behaviours, or two surfaces? Where does the classic "XY plot synced to the playhead" belong?
- **Storyboard as a mode vs a rail.** The rail keeps the map visible during capture; a mode would make playback feel like presentation. Can it be both?
- **Log vs undo.** Users will press Ctrl+Z expecting a tool run to revert. How does the UI teach the distinction without a lecture?
- **"No empty Results panel" vs discoverability.** The rule says the panel does not exist until the first result. How does a new user learn results will appear there?
- **Hover-revealed affordances vs touch.** Row info and format buttons, resize cursors and tooltips are hover-first today. What replaces hover without cluttering the dense view?
- **Two Debrief Activity Bar icons.** One product, one icon, or is the Log important enough to be its own destination?

---

## 12. What we want back

A **wireframe set and an interaction specification**, not visual design.

1. **Information architecture.** Every surface grouped by goal (G1–G12), with primary / secondary / tertiary status, and the VS Code region it lives in (UI-001, UI-003).
2. **Layout strategy** for four frames: VS Code desktop (1280×720 laptop and 1920×1080), VS Code in a browser on tablet (landscape and portrait), and the phone web shell. A shared mental model that lets an analyst move between them without relearning.
3. **Mode model.** The declared modes, how each is entered, exited and announced, and how the map's gestures change per mode on pointer and touch.
4. **Wireframes** for Mode A and Mode B in each frame, covering: first run; recent-work resume; discovery with filters; a plot open with the triad; a tool run with parameters and a chart result; tune-and-replay with a shadow track; a TMA session with the Tote; storyboard capture and playback; phone browse and phone playback.
5. **Interaction specification** per surface: pointer, touch and keyboard behaviours; selection and multi-selection rules; drag alternatives; what persists.
6. **States matrix**: for every surface, the empty, loading, error, stale, read-only and no-permission states, with copy.
7. **Component recommendations**: for each panel in Section 5B, keep / refine / rethink with reasons, and the cross-panel interactions the design relies on.
8. **Open questions** you need answered before visual design.

**Definition of good**

1. A returning classic-Debrief analyst finds the time controller, layer tree and tote without instruction.
2. A new analyst identifies the map/timeline/list triad as one coordinated view within ten seconds.
3. Every result on screen visibly traces back to its inputs and parameters.
4. The UI scales from 5 to 5,000 features.
5. Every desktop interaction has a named touch equivalent; nothing depends on hover.
6. The same wireframes are implementable from one shared component library across VS Code, tablet and phone without forks.
7. The constitution survives: offline, no silent failure, provenance, source preservation, schema-first.

---

## 13. Out of scope

Brand identity, logo and voice (settled). Backend services. Analysis algorithms. The Electron loader mini-app (a two-step wizard, not a workbench). Jupyter widgets. Video export of storyboards. Marketing and documentation sites.

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| **Plot** | A tactical scenario or exercise: a catalog item holding a feature collection. |
| **STAC** | SpatioTemporal Asset Catalog: the open standard used to store and index plots; a store holds a catalog of collections of items. |
| **Fix** | A single timestamped position (time, lat, lon, depth, course, speed). The atomic unit of a track. |
| **Track** | The movement record of a platform: ordered fixes, style, sensors, solutions. Types: ownship, contact, reference, solution. |
| **Segment** | A run of consecutive fixes within a track: core (observed), TMA (reconstructed), planning (intended), infill (interpolated). |
| **Ownship** | The platform carrying the sensors; the observer. |
| **Contact / cut** | One sensor measurement: bearing (and possibly range, frequency) to something, at a time. |
| **Ambiguous bearing** | Passive sonar cannot tell which side a sound came from, so each cut has a mirror bearing 180° away. |
| **TMA** | Target Motion Analysis: estimating a target's course and speed from bearings, using ownship manoeuvres to resolve geometry. |
| **Leg** | A period of steady ownship course and speed; each leg gives a different geometric view of the target. |
| **Primary / secondary** | The Tote's reference track (usually the target) and the tracks measured relative to it. |
| **Tote** | The live table of kinematics (range, bearing, relative bearing, bearing rate, angle on the bow, speed, course, depth) at the current time. |
| **ATB** | Angle on the bow: bearing of the observer as seen from the target, relative to the target's heading. |
| **CPA** | Closest point of approach between two tracks. |
| **DTG** | Date-time group; naval timestamp, e.g. 120500 = 12th day, 05:00. |
| **REP / DPF** | Legacy Debrief file formats (replay text; XML plot). |
| **Snail / trail** | Display mode showing the track from start to the current time only; "Full" shows the whole track. |
| **Scene / storyboard** | A captured viewport + time + visibility state; an ordered list of scenes for briefing. |
| **Provenance / the Log** | The recorded chain from inputs through tool and parameters to outputs; the panel that shows it. |
| **Snapshot / branch** | A save point in the Log; a new plot forked from a point in history. |
| **Mutation / addition / deletion / artifact** | The four result kinds a tool can return. |
| **Lozenge** | A pill-shaped filter chip in the filter bar. |
| **CQL2** | The open filter language the lozenges serialise to. |
| **Platform registry** | The reference list of known platforms (names, classes, nationalities). |
| **Web shell** | The standalone browser version of the analysis UI, sharing components with the VS Code extension. |
| **Briefing package** | A self-contained exported folder that plays a storyboard in any browser with no server. |

## Appendix B — Current surface inventory (vocabulary)

Spatial: MapView (Leaflet) with temporal track layer, sensor bearing layer, position symbols, scene rectangles; LayersToolbar; drawing toolbar; geometry dialog. Temporal: TimelineView (Gantt), TimeController. Tabular and list: FeatureList (virtualised), ExerciseListView, TableRenderer, ChartRenderer (Vega-Lite). Filtering: FilterBar with lozenges, quick search, optional NL entry. Provenance: LogPanel, ActivityPanel. Properties and tools: PropertiesPanel, ToolsPanel, inline ParameterCollector, ContextMenu, CascadingMenu, FormatMenu. Catalog: StacFileTree, StacBrowser, Catalog Overview, thumbnail preview. Storyboarding: StoryboardPanel, scene rows, transport, briefing renderer. Cross-cutting: ThemeProvider (four variants), PanelWorkspace (web shell docking), MobileTabLayout (web shell narrow layout).

## Appendix C — Tool catalogue

| Category | Tools |
|---|---|
| track/styling | set-track-color, apply-symbol-style, label-interval, symbol-interval, reformat-fixes, hide-reveal-objects, rainbow-shade-sonar-cuts |
| track/measurement | range, bearing, relative bearing, angle on the bow, speed, course, depth, time, doppler, delta rate, bearing rate, course rate, speed rate, course/speed delta averages, second derivatives, track length, position range-bearing |
| track/manipulation | trim, interpolate, merge, group, split into legs, smooth jumps, remove jumps, set time zero, convert absolute TMA to relative, lightweight conversions, generate courses and speeds, generate infill, generate track; drag ops: translate, rotate, stretch, shear |
| track/analysis | TMA segment from cuts, TMA from ownship, TMA from infill, TUAS solution, track from active cuts, time-variable plot, XY plot generator, zig detector, ownship leg detector |
| sensor/calibration | resolve ambiguity, ambiguity resolver, delete ambiguous bearings |
| sensor/analysis | sensor range plot, insert sensor arc, doppler curve, inflection-point detector, merge contacts, new sensor contact; stretch fan (drag) |
| sensor/detection | buffer-zone generator (detection rings) |
| dataset/export | CSV, GPX, WMF, RTF, geo-PDF, copy bearings, copy time data, paste REP from clipboard |
| shape/manipulation | move shape, enlarge shape |
| reference | generate reference points, point-in-zone classifier |

Implemented today (13): track-stats, area-summary, range-bearing, buffer-zone-generator, generate-reference-points, point-in-zone-classifier, move-shape, enlarge-shape, generate-courses-speeds, set-track-color, apply-symbol-style, label-interval, symbol-interval.

## Appendix D — Sample data for realistic content

The sample catalog ("Debrief Legacy Sample Data", 73 plots, Saxon Warrior exercise series and others) is in the repository at `preview/workspace/samples/local-store/`. Useful for wireframe content:

| Plot | Content |
|---|---|
| Boat1 / Boat2 | NELSON and COLLINGWOOD, 12 Dec 1995 05:00–11:41, the two tracks in the classic screenshots |
| sample | Two-platform plot with annotations |
| multistatics-buoyfield | Five platforms, 45 minutes, buoy field |
| sample-lots-of-sensors, sen-tracks-with-narrative | Sensor-rich tracks; narrative entries |
| ambig-tracks2/3, freq-bluetrack/redtrack | Ambiguous bearings; frequency data for TMA |
| twin-cpa, offsettracks | Closest-approach scenarios |
| jumps, dodgy-track, gapstesttrack, reverse-chrono | Data-quality edge cases |
| bulk-blue-tracks, bulk-red-tracks | Stress (many tracks) |
| plotwithgeotiff, dynamicshapesettest | Raster backdrop; shapes |

Raw REP files: boat1.rep, boat2.rep, narrative.rep, shapes.rep.

## Appendix E — Reference screenshots

Classic Debrief (stored under `docs/design/legacy/`):

| # | File | Content |
|---|---|---|
| 01 | `01-v3-workbench.png` | Full v3 workbench with chart backdrop and two XY plots |
| 02 | `02-time-controller.png` | Time Controller close-up |
| 03 | `03-track-tote.png` | Track Tote (user guide fig 4.1) |
| 04 | `04-outline.png` | Outline view with primary/secondary toolbar |
| 05 | `05-mouse-modes.png` | Mouse mode buttons (guide §2.2) |
| 06 | `06-click-buttons.png` | Zoom out, fit, refresh (guide §2.3) |
| 07 | `07-chart-overview-workbench.png` | Chart Overview and the Tactical Analysis perspective (fig 2.2) |
| 08 | `08-properties-view.png` | Properties sheet (fig 3.1) |
| 09 | `09-stacked-dots.png` | Bearing residuals with drag modes (fig 3.2) |
| 10 | `10-chart-features-menu.png` | Chart Features menu (fig 3.3) |
| 11 | `11-drawing-toolbar.png` | Drawing toolbar (fig 3.13) |
| 12 | `12-grid-editor.png` | Grid Editor with linked chart (fig 3.28) |
| 13 | `13-tote-text.png` | Tote semantics (guide §4.1.1) |
| 14 | `14-time-variable-plot.png` | Time-variable plot and waterfall mode (figs 4.10, 4.11) |
| 15 | `15-symbology.png` | Built-in, indexed and non-indexed symbol sets (figs 6.1–6.3) |

Current prototype (in the repository): whole-app layouts and component captures listed in `docs/claude-design-ui-brief.md` §6, plus the June 2026 re-review set under `docs/project_notes/evidence/ui-review-2026-06-06/`.

## Appendix F — Traceability

| IDs | Sources |
|---|---|
| UI-001…008 | VS Code extension manifest (view containers, views, keybindings, language-model tools); ADR-025 (theme variants); ADR-037 (preview tab); architecture status-indicator rules; idea docs 017 and 044; spec 284 |
| UI-010…022 | STAC browser SRD; specs 077, 126, 127, 128, 129, 130, 131, 132, 133, 134, 136, 174, 175, 186, 191; ADR-028; UI review P2.3, P2.4, P3.5 and read-only banners; spec 281 |
| UI-100…124 | April brief §5; specs 025, 030, 045, 047, 053, 072, 091, 093, 094, 096, 101, 113, 176, 178, 179, 192, 193, 216, 217, 218, 230, 235, 258, 260, 263, 271, 273, 275; ADR-005, 022, 034, 035, 038, 039; results-panel SRD; log-panel SRD; prov/undo SRD; provenance-graph spec |
| UI-140…153 | Classic screenshots 03, 04, 07, 10, 12, 13, 14, 15; discovery report (tote calculations); spec 272 (basemap); idea docs 022, 180, 133 |
| UI-160…163 | Tool schema (categories, selection requirements, parameter types); tool-results architecture (result kinds, user feedback); discovery report (trigger types, drag operations); spec 207 |
| UI-200…213 | Planning decisions (this commission); spec 244 and ADR-030 (mobile precedent); MobileTabLayout; spec 275; backlog 283; idea E07 (touch handlers for TMA drag) |
| UI-300…314 | Constitution Articles I, III, IV, XI, XIV; April brief §7; design spec; mood board; domain glossary; spec 209; spec 132 (200 ms); spec 030 (10 fps) |
| BP-001…002 | Tracer delivery plan (ingest); constitution (strict import, source preservation); spec 182 (platform warnings) |
| BP-003…004 | STAC browser SRD §3, §8; spec 129 |
| BP-005…008 | Tool-results architecture; results-panel SRD §7–8; prov/undo SRD §4.1; provenance-graph spec (shadow tracks) |
| BP-009…012 | Prov/undo SRD §2–6; provenance-graph spec (currency) |
| BP-013…014 | Specs 093–098; layers-toolbar spec; strategy ("draw a polygon, analyse within it") |
| BP-015…016 | Classic screenshots 09, 13; discovery report (drag operations); backlog 120, 122 |
| BP-017…019 | Storyboard spec; specs 216, 217, 218, 235, 260, 263, 264, 273, 280 |
| BP-020…021 | Constitution III.5; strategy F2; spec 178 (associated files) |
| BP-022 | Spec 284 |
| BP-023 | Tool-results architecture (extension model, graceful degradation); vision (contrib) |
