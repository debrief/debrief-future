# Feature Specification: Air-Gapped Briefing Zip — Storyboard Renderer (SPA)

**Feature Branch**: `264-briefing-zip-renderer`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Air-gapped briefing zip — self-contained distraction-free Storyboard renderer (SPA). Ship the briefing renderer as a self-contained zip that opens in any modern browser by double-clicking `index.html`: no server, no extension host, no network calls. Contents = bundled SPA + `features.geojson` (which already contains the `StoryboardFeature` / `SceneFeature` entries — Storyboards live inside the plot's GeoJSON per `storyboard.yaml`, not as a separate document) + `item.json` + Scene-thumbnail assets + pre-fetched basemap tiles. Build command takes a Storyboard ID (one plot may contain multiple Storyboards). Single Storyboard per zip, read-only, with Present (chrome-hidden) / Minimal (transport + scrub) toggle. Reuses the shared playback engine from #217 + #258 displayMode capture. New VS Code command 'Export Storyboard as briefing zip…' on the Storyboard overflow menu. New SPA at `apps/briefing-renderer/`. Blocked on #263 (time-range Scenes) per interview sequencing — briefing renderer should ship knowing time-range is in play to avoid rework on the shared engine. (split from #229 via /interview 229; requires #215–#218 MVP, #174 thumbnails, #258 displayMode capture). GitHub issue: #631."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Export a Storyboard as a briefing zip (Priority: P1)

An analyst has finished authoring a Storyboard inside a plot they were working on in VS Code. They want to share the briefing with a colleague, a stakeholder, or a downstream team who does not have Debrief installed and may be working on a machine without internet access. From the Storyboard's overflow menu in the VS Code extension they invoke "Export Storyboard as briefing zip…", pick a destination on disk, and the platform writes a single `.zip` file containing everything needed to view the Storyboard standalone.

**Why this priority**: This is the entry point. Without an export command the briefing zip artefact never exists, and every downstream story is unreachable. It also defines the exact contents the SPA must consume, so it gates the rest of the feature.

**Independent Test**: With an open plot containing at least one Storyboard, invoke "Export Storyboard as briefing zip…" from the Storyboard's overflow menu, pick a destination, and confirm. A single `.zip` file appears at the chosen path. Unzipping it reveals an `index.html`, the bundled SPA assets, a `features.geojson`, an `item.json`, a Scene-thumbnails directory, and a basemap-tiles directory. No further interaction with VS Code is needed to verify the export succeeded.

**Acceptance Scenarios**:

1. **Given** a plot is open and contains one Storyboard, **When** the analyst opens the Storyboard's overflow menu and selects "Export Storyboard as briefing zip…", **Then** the platform prompts for a destination path and, on confirmation, writes a single `.zip` file there.
2. **Given** the export has just completed, **When** the resulting zip is unpacked into an empty directory, **Then** that directory contains an `index.html` at its root, a bundled SPA (HTML / CSS / JS assets), a `features.geojson` carrying the Storyboard's Scenes and every feature referenced by them, an `item.json` describing the source plot, a directory of Scene-thumbnail image assets, and a directory of pre-fetched basemap tiles covering every Scene's viewport.
3. **Given** the plot contains multiple Storyboards, **When** the analyst invokes the export command on one specific Storyboard, **Then** the resulting zip contains exactly that Storyboard's Scenes — Scenes belonging to other Storyboards in the same plot are not included.
4. **Given** the analyst cancels the destination prompt, **When** no destination is chosen, **Then** no zip is written and the plot state is unchanged.

---

### User Story 2 — Open the briefing zip and play the Storyboard with no installation (Priority: P1)

A recipient receives the briefing zip on a memory stick, in an email attachment, or via an internal file share. Their machine has no Debrief install, no VS Code, no Node, no Python — only a modern web browser. They unzip the file into any directory and double-click `index.html`. A browser tab opens; after a brief load the Storyboard begins (or is one click away from beginning) and plays back exactly as it would inside the authoring tool — same viewport tweens, same time-slider scrub for time-range Scenes, same visible track motion, same Scene ordering.

**Why this priority**: This is the entire user value. The point of the briefing zip is that anyone, anywhere, on any machine with a browser, can watch the Storyboard. If the SPA needs a local server, an extension host, or a network round-trip to render, the feature fails its core promise.

**Independent Test**: Take a briefing zip produced by Story 1, copy it to a machine that has never had Debrief installed and is air-gapped (no internet), unzip it, and double-click `index.html`. A browser window opens and renders the Storyboard. Pressing Play (or, if auto-play is enabled, observing the opening Scene) shows the same visual sequence as in the authoring environment.

**Acceptance Scenarios**:

1. **Given** an unpacked briefing zip on a filesystem and a modern browser, **When** the user double-clicks `index.html`, **Then** the SPA loads from local files only — it does not issue any network request to an external host.
2. **Given** the SPA has finished loading, **When** the user starts playback, **Then** the Storyboard plays back with the same Scene order, the same per-Scene viewports, the same Scene durations, and the same in-Scene behaviour (instant Scenes rest on their captured viewport; time-range Scenes interpolate viewport and time-slider simultaneously) as in the authoring environment.
3. **Given** a time-range Scene whose interpolation depends on visible features (track motion, chart cursors, feature-visibility windows), **When** the Scene plays back inside the briefing SPA, **Then** every time-driven layer advances in lock-step with the time slider — no layer lags or leads beyond normal redraw latency.
4. **Given** the Storyboard reaches its final Scene, **When** playback completes, **Then** the SPA rests on that Scene without crashing, looping unbidden, or attempting to fetch additional resources.
5. **Given** the user has reached the end of the Storyboard, **When** they choose to replay it, **Then** the SPA starts again from the first Scene using only the resources already loaded from the zip.

---

### User Story 3 — Toggle between Present and Minimal modes (Priority: P1)

The recipient is about to show the briefing in a room — to a customer, to a senior officer, or to a training audience. They want the screen to show only the map and the Scene content, with no UI chrome visible. They press a key (or click a discreet control) and the SPA enters Present mode: every UI control disappears, the map fills the viewport, and the Storyboard plays. Later, in a smaller setting where they want to scrub back to a moment of interest and pause, they switch to Minimal mode: a transport bar (play / pause / next / previous Scene) and a time-slider scrubber appear, and they can step or seek through the Storyboard.

**Why this priority**: The two modes serve the two real briefing-audience contexts — a hands-off presentation (Present) and an interactive walkthrough (Minimal). Shipping only one would substantially weaken the feature's usefulness, so both modes are core to the P1 release.

**Independent Test**: Open a briefing zip in a browser. Confirm a mode switch is reachable from the visible UI (or via a documented keyboard shortcut). Toggle from Minimal to Present: all chrome disappears and only the map / Scene content remains. Toggle back to Minimal: transport controls and time slider re-appear. The Storyboard's playback state (current Scene, current time) is preserved across the toggle.

**Acceptance Scenarios**:

1. **Given** the briefing SPA is loaded in Minimal mode, **When** the user activates the Present-mode control, **Then** all UI controls (transport, time slider, mode toggle indicator) hide and only the map / Scene content is visible. The mode toggle itself remains reachable via at least one input (e.g. a keyboard shortcut or a hover-revealed corner control) so the user is never trapped.
2. **Given** the briefing SPA is in Present mode and the Storyboard is playing, **When** the user activates the toggle back to Minimal mode, **Then** the transport bar and time slider re-appear, the current Scene and playback position are unchanged, and the user can immediately interact with the transport controls.
3. **Given** the briefing SPA is in Minimal mode, **When** the user uses the transport controls (play, pause, step to next/previous Scene) or scrubs the time slider, **Then** the Storyboard responds — playback starts/stops, Scenes advance/retreat, and the slider seeks within the current Scene as expected for the Scene's type (instant or time-range).
4. **Given** the SPA has just been opened from `index.html`, **When** no preference is yet stored, **Then** the SPA opens in a default mode that exposes the transport controls (i.e. Minimal) so a first-time user always has a visible affordance to start playback.

---

### User Story 4 — Multi-Storyboard plot: export the chosen Storyboard (Priority: P2)

A plot contains several Storyboards — for example, "Phase 1 brief", "Phase 2 brief", and "After-action review". The analyst wants to export only one of them. The export command is invoked from the specific Storyboard's overflow menu, not from a plot-wide menu, so there is no ambiguity about which Storyboard is being exported. The resulting zip contains exactly that Storyboard's Scenes and the features its Scenes reference — Scenes and Storyboard metadata from the other Storyboards in the same plot are excluded.

**Why this priority**: Plots routinely accumulate multiple Storyboards as an analyst iterates. Without per-Storyboard selection, every export would either bundle all Storyboards (bloating the zip and confusing the recipient) or fail when more than one exists. It is P2 (not P1) only because the same outcome can be hand-curated by the analyst keeping a single Storyboard per plot until the feature lands, but shipping the multi-Storyboard case is necessary for routine use.

**Independent Test**: Open a plot containing at least two Storyboards. Invoke the export command from Storyboard A's overflow menu. Verify the resulting zip's `features.geojson` carries Storyboard A's Scenes but not Storyboard B's. Repeat from Storyboard B's overflow menu and verify the inverse.

**Acceptance Scenarios**:

1. **Given** a plot with two or more Storyboards, **When** the analyst invokes the export command from Storyboard A's overflow menu, **Then** the resulting zip's `features.geojson` contains Storyboard A's `StoryboardFeature` entry and every `SceneFeature` referenced by Storyboard A — and contains no `StoryboardFeature` entries for any other Storyboard.
2. **Given** Storyboards A and B reference some shared underlying features (e.g. the same track), **When** Storyboard A is exported, **Then** those shared features are included in the zip (because Storyboard A depends on them) regardless of whether Storyboard B also depended on them.
3. **Given** Storyboard A and Storyboard B reference different sets of underlying features, **When** Storyboard A is exported, **Then** the zip does not include features that are referenced only by Storyboard B.

---

### Edge Cases

- **Empty Storyboard (no Scenes)**: the export still produces a valid zip but the SPA, on open, displays a clear "this Storyboard has no Scenes" empty state rather than a blank map or a runtime error.
- **Storyboard with only instant Scenes (pre-#263 capture)**: the SPA renders these unchanged — viewport tween per Scene, no time-slider scrub between Scenes — matching the authoring environment's behaviour. The shared playback engine handles the absence of `time_range` correctly.
- **Storyboard with time-range Scenes (#263)**: the SPA simultaneously interpolates viewport and time-slider during each time-range Scene, matching #263's playback contract. Reverse playback (if exposed) also scrubs both axes backward.
- **Storyboard mixing instant and time-range Scenes**: both kinds coexist within a single playback; transitioning between them does not cause a visible glitch, a slider jump, or a viewport snap that wasn't already part of the authored Storyboard.
- **Browser refuses to load local resources**: certain browsers restrict `file://`-origin pages from loading sibling files via XHR/`fetch`. The SPA's loading strategy must work under `file://` in mainstream modern browsers, or the briefing-zip user experience is broken.
- **Basemap tiles not pre-fetched for a viewport**: if a Scene's viewport extends beyond the captured tile coverage, the SPA shows the available tiles plus a clear placeholder (e.g. neutral background or a "no tile" pattern) — it never silently issues a network request to a tile server.
- **Scene thumbnail missing**: the SPA falls back gracefully (e.g. the Scene plays back from its viewport and features without showing a thumbnail preview) rather than erroring.
- **Zip opened on a phone / very small viewport**: the SPA renders the map and Scene content at the available size; transport controls in Minimal mode remain reachable. The feature does not promise a tuned mobile experience but does not crash or become unusable.
- **User unzips into a path with spaces, non-ASCII characters, or unusual filesystem layout**: `index.html` still finds its sibling resources, because all internal paths are relative.
- **Re-export of the same Storyboard**: producing a fresh zip overwrites the previous one cleanly (or the analyst is prompted before overwrite, depending on the destination-prompt convention) and the new zip reflects the latest Storyboard state.
- **Time-range Scene with degenerate range (`t_end == t_start`)**: handled per the inherited playback contract from #263 — the viewport tweens, the slider rests, no crash.

## Requirements *(mandatory)*

### Functional Requirements

**Export command (authoring side)**

- **FR-001**: The VS Code extension MUST expose an "Export Storyboard as briefing zip…" command on each Storyboard's overflow menu within the current plot.
- **FR-002**: The export command MUST operate on a single chosen Storyboard, identified unambiguously by its presence on the overflow menu — the command never asks the analyst to disambiguate which Storyboard.
- **FR-003**: The export command MUST prompt the analyst for a destination path before writing and MUST NOT write any file if the analyst cancels.
- **FR-004**: The export command MUST produce a single `.zip` file at the chosen destination — the briefing zip is a single artefact, not a folder of files.
- **FR-005**: The export command MUST NOT modify the source plot, its `features.geojson`, or any other Storyboard in the plot.

**Zip contents (artefact contract)**

- **FR-006**: The briefing zip MUST contain, at its root, an `index.html` that boots the SPA when opened in a browser.
- **FR-007**: The briefing zip MUST contain the bundled SPA static assets (HTML, CSS, JavaScript, fonts, icons) needed to render the Storyboard with no further downloads.
- **FR-008**: The briefing zip MUST contain a `features.geojson` carrying (a) the exported `StoryboardFeature` and its `SceneFeature` entries, and (b) every feature referenced — directly or indirectly — by those Scenes (tracks, points, regions, etc.).
- **FR-009**: The briefing zip MUST contain an `item.json` describing the source plot at the level needed to render context (plot title, capture metadata, time bounds).
- **FR-010**: The briefing zip MUST contain Scene-thumbnail image assets for every Scene that has a captured thumbnail.
- **FR-011**: The briefing zip MUST contain pre-fetched basemap tiles covering every Scene's viewport at the zoom levels reachable through playback.
- **FR-012**: The briefing zip MUST NOT include Scenes or `StoryboardFeature` entries from other Storyboards in the source plot.
- **FR-013**: All internal paths inside the zip MUST be relative, so that `index.html` resolves its siblings regardless of the absolute path the user unpacked the zip into.

**SPA playback (recipient side)**

- **FR-014**: The SPA MUST load and run from `file://` origin in mainstream modern desktop browsers without requiring a local web server.
- **FR-015**: The SPA MUST NOT issue any network request to an external host at any point in its lifecycle — load, playback, mode switch, or replay.
- **FR-016**: The SPA MUST render the Storyboard using the same playback contract as the authoring environment: instant Scenes rest on their captured viewport; time-range Scenes interpolate viewport and time-slider in lock-step over the Scene's wall-clock duration.
- **FR-017**: The SPA MUST advance every time-driven layer (track positions, feature-visibility windows, chart cursors, any layer keyed off "current time") in lock-step with the time slider during time-range Scene playback.
- **FR-018**: The SPA MUST be read-only — it MUST NOT expose any control that edits the Storyboard, its Scenes, or any underlying feature.
- **FR-019**: The SPA MUST support starting, pausing, and resuming playback; stepping forward and backward by Scene; and seeking within the Storyboard's time range via the time slider.
- **FR-020**: The SPA MUST handle Storyboards composed entirely of instant Scenes, entirely of time-range Scenes, or any mix thereof, without per-Storyboard configuration.
- **FR-021**: When playback completes the final Scene, the SPA MUST rest on that Scene and offer the user a way to replay from the start.
- **FR-022**: The SPA MUST replay using only the resources already loaded from the zip — replay MUST NOT trigger any additional fetch.

**Display modes**

- **FR-023**: The SPA MUST support two display modes: Present (UI chrome hidden, only map / Scene content visible) and Minimal (transport controls and time slider visible alongside the map).
- **FR-024**: The SPA MUST expose a mode toggle reachable in both directions: from Minimal to Present and from Present back to Minimal. The toggle MUST remain reachable in Present mode (e.g. via a keyboard shortcut or a hover-revealed control) so the user is never locked into one mode.
- **FR-025**: Toggling display mode MUST preserve the current playback state — current Scene, current time within the Scene, and play/pause state are all unchanged across the toggle.
- **FR-026**: On first open (no stored preference) the SPA MUST start in Minimal mode so a first-time user always sees a visible affordance to start playback.

**Air-gapped operation**

- **FR-027**: The SPA MUST render basemap tiles only from the pre-fetched tiles in the zip — it MUST NOT fall back to an online tile server when a tile is missing.
- **FR-028**: When a Scene's viewport extends beyond the pre-fetched tile coverage, the SPA MUST display a non-network placeholder (e.g. neutral background or "no tile" pattern) rather than issuing a network request.
- **FR-029**: The SPA MUST load all fonts, icons, and other static assets from inside the zip.

**Robustness**

- **FR-030**: If the Storyboard contains zero Scenes, the SPA MUST display a clear empty-state message rather than a blank map or a runtime error.
- **FR-031**: If a Scene's thumbnail asset is missing or corrupt, the SPA MUST fall back gracefully (Scene still plays from its viewport and features) rather than aborting playback.

### Key Entities

- **Briefing Zip**: A single `.zip` file that bundles everything needed to render one Storyboard standalone in a browser. Contains the SPA, a `features.geojson`, an `item.json`, Scene-thumbnail assets, and pre-fetched basemap tiles. Produced by the export command, consumed by double-clicking `index.html`.
- **Briefing SPA**: The bundled single-page application at `apps/briefing-renderer/`. Loads from `file://` in any modern browser, renders the bundled `features.geojson` via the shared playback engine, and exposes Present / Minimal display modes. Read-only.
- **`features.geojson` (briefing payload)**: A GeoJSON `FeatureCollection` carrying the exported `StoryboardFeature`, its `SceneFeature` entries (including any `time_range` and `viewport_end` fields per #263), and every feature those Scenes reference. Same shape as the authoring environment's plot GeoJSON, scoped to one Storyboard.
- **Scene thumbnail asset**: An image file representing a Scene's captured viewport. Stored inside the zip alongside the SPA; used by the SPA for Scene previews (e.g. on a Scene strip in Minimal mode, if exposed).
- **Pre-fetched basemap tiles**: A directory of raster (or vector) tile files covering every Scene's viewport at the zoom levels the SPA may render during playback. Served by the SPA from inside the zip; no network fallback.
- **`item.json`**: A small JSON document describing the source plot — at minimum the plot's title and time bounds — so the SPA can render contextual chrome (title bar in Minimal mode, etc.) without re-deriving from the GeoJSON.
- **Display mode**: One of Present (chrome hidden) or Minimal (transport + slider visible). Held in SPA-local state; defaults to Minimal on first open.

## User Interface Flow

### Decision Analysis

- **Primary Goal (export side)**: The analyst's goal is to package one specific Storyboard into a single shareable artefact that anyone with a browser can play back, with no install and no network.
- **Primary Goal (playback side)**: The recipient's goal is to watch the Storyboard end-to-end (Present mode) or step through it interactively (Minimal mode), using only files already on disk.
- **Key Decisions**:
  1. (Export) Which Storyboard to export — disambiguated by invoking the command from that Storyboard's overflow menu rather than a plot-wide menu.
  2. (Export) Where on disk to write the zip.
  3. (Playback) Which display mode to use — Present for a hands-off briefing, Minimal for an interactive walkthrough.
  4. (Playback) Whether to play through, scrub via the slider, or step Scene-by-Scene.
- **Decision Inputs (export)**: The Storyboard overflow menu identifies the Storyboard by its title; the destination prompt shows the local filesystem so the analyst can pick a path they'll later share.
- **Decision Inputs (playback)**: The Scene currently visible (and its position in the Storyboard), the time slider's current position, and (in Minimal mode) the transport controls' current state make clear what playback will do next.

### Screen Progression

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | Plot open in VS Code with a Storyboard | Open the Storyboard's overflow menu, select "Export Storyboard as briefing zip…" | Destination prompt opens |
| 2 | Destination prompt | Choose a path, confirm | A single `.zip` file is written; the analyst is notified of success |
| 3 | Recipient receives zip and unpacks | Double-click `index.html` | Browser tab opens; SPA loads from local files; SPA opens in Minimal mode by default |
| 4 | SPA loaded, Minimal mode, first Scene visible | Press Play | Storyboard begins; Scenes advance per the captured playback contract |
| 5 | Storyboard playing in Minimal mode | Toggle to Present mode | All UI chrome hides; only the map / Scene content is visible; playback state is preserved |
| 6 | Storyboard playing in Present mode | Toggle back to Minimal | Transport bar and time slider re-appear; playback state is preserved |
| 7 | Storyboard reaches its final Scene | (no action — or press Replay) | SPA rests on the final Scene; choosing Replay restarts from Scene 1 using already-loaded resources |

### UI States

- **Empty state**: Storyboard contains no Scenes — the SPA shows a clear message ("This Storyboard has no Scenes to play") instead of a blank map.
- **Loading state**: The SPA is parsing the bundled `features.geojson` and loading initial tiles — a brief load indicator is shown; no network activity occurs.
- **Error state**: Required bundled file is missing or unreadable (e.g. `features.geojson` malformed) — the SPA shows a clear error explaining which file is missing or unreadable and does not attempt a network fallback.
- **Success state**: The Storyboard plays back smoothly with the same Scene order, viewports, and time-driven layers as in the authoring environment.
- **Present-mode state**: No UI chrome is visible; the map / Scene content fills the viewport; the mode toggle remains reachable via at least one input.
- **Minimal-mode state**: Transport bar (play / pause / next / previous Scene) and time slider are visible alongside the map; the user can interact with all controls.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A recipient with a modern desktop browser and no Debrief install can unzip a briefing zip and watch the Storyboard with no further configuration, in under 60 seconds from receiving the file.
- **SC-002**: 100% of the SPA's runtime resource loads (HTML, JS, CSS, fonts, icons, GeoJSON, item.json, thumbnails, basemap tiles) come from inside the zip — zero external network requests are observed across load, playback, mode toggle, and replay.
- **SC-003**: For Storyboards composed of instant Scenes, time-range Scenes, or any mix, the playback sequence observed in the briefing SPA is visually indistinguishable from the sequence observed in the authoring environment — Scene order, per-Scene viewports, time-slider position during time-range Scenes, and motion of time-driven layers all match.
- **SC-004**: Multi-Storyboard plots produce per-Storyboard zips: a zip exported from Storyboard A contains Storyboard A's Scenes and no other Storyboard's Scenes; the same is independently true for every other Storyboard in the same plot.
- **SC-005**: The display-mode toggle preserves playback state across at least 10 consecutive toggles in a single session — current Scene, current time within Scene, and play/pause state are identical before and after each toggle.
- **SC-006**: A first-time recipient finds the play affordance unaided on first open: in usability testing (or by inspection), Minimal mode is the open-state default and at least one transport control is visible without further user action.
- **SC-007**: The briefing zip remains playable when copied between machines, between operating systems, and to paths containing spaces or non-ASCII characters — `index.html` always finds its siblings.

## Assumptions

- The shared playback engine introduced in #217 and extended in #258 (displayMode capture) and #263 (time-range Scenes) is structured such that it can be reused inside a `file://`-origin SPA — i.e. it does not depend on the VS Code extension host, the MCP layer, or any service round-trip to render a Scene.
- Scene thumbnails are already produced by #174 and addressable by Scene; the export command can collect them without re-running thumbnail capture.
- The plot GeoJSON's `StoryboardFeature` carries enough information to identify which `SceneFeature` entries belong to which Storyboard, so the export can scope `features.geojson` to one Storyboard cleanly per `storyboard.yaml`.
- Modern desktop browsers (current versions of Chrome, Firefox, Edge, Safari) permit a `file://`-origin page to load relative sibling resources via the loading strategy used by the SPA. The export does not promise a polished experience on browsers that block all `file://` sibling loads.
- "Pre-fetched basemap tiles" means a tile-set captured at export time covering each Scene's viewport at the zoom levels reachable during playback; the exact tile-coverage strategy (which zoom levels, how much padding around each viewport) is an implementation concern resolved during planning, not a spec-level decision.
- The exported zip is intended for human briefing audiences, not as a re-import format — Debrief does not need to round-trip a briefing zip back into a plot.
- "Read-only" applies to the briefing SPA's UI surface; the user is free to copy, share, or delete the zip's files at the OS level.

## Dependencies

- **#263 — Storyboard Time-Range Scenes** (currently in implementation): defines the `time_range` and `viewport_end` shape and the simultaneous viewport+slider playback contract that this feature inherits. The briefing SPA must be able to play back time-range Scenes correctly. Specification of this feature can proceed in parallel with #263's implementation; implementation of this feature must not begin until #263 has merged so the shared playback engine is stable.
- **#217 — Shared playback engine** (prerequisite, complete or in flight): supplies the engine that the briefing SPA reuses. The SPA must not fork the engine — it must consume the same engine that the authoring environment uses, configured for a `file://`-origin context.
- **#258 — displayMode capture** (prerequisite): each Scene's captured `displayMode` is honoured by the playback engine; the briefing SPA inherits this behaviour transparently.
- **#174 — Scene thumbnails** (prerequisite): supplies the per-Scene thumbnail assets that the export bundles.
- **#215–#218 — Storyboarding MVP** (prerequisite): defines the `StoryboardFeature` / `SceneFeature` schema, capture flows, and Storyboard overflow menu surface that the export command extends.
- **`storyboard.yaml`** (cluster schema): defines that Storyboards live inside the plot's GeoJSON. The export's `features.geojson` payload conforms to this schema.

## Out of Scope

- Round-tripping a briefing zip back into a Debrief plot (the zip is a one-way export, not an interchange format).
- Editing Storyboards or Scenes inside the briefing SPA (the SPA is read-only).
- Bundling more than one Storyboard per zip (one Storyboard per zip; multi-Storyboard plots produce one zip per Storyboard via separate export invocations).
- Live network features inside the SPA — fetching fresh tiles, live data overlays, collaborative annotations, telemetry — none are part of this feature.
- A polished mobile/touch experience. The SPA should not crash on small viewports, but tuned mobile rendering is not promised.
- Authentication, watermarking, DRM, or any access-control layer on the zip. The zip is a plain file; whoever receives it can open it.
- Re-running thumbnail capture or basemap pre-fetching at export time as a slow background job — those assets are expected to be already produced (#174) or producible cheaply at export. Long-running capture work at export time is out of scope for this spec.
