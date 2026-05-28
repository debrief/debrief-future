# Feature Specification: Air-Gapped Briefing Zip — Single-File Vector Basemap (PMTiles)

**Feature Branch**: `272-pmtiles-basemap`
**Created**: 2026-05-26
**Status**: **Blocked** — no accessible offline vector-tile basemap source (see [Blocked](#blocked))
**Input**: User description: "Air-gapped briefing zip — PMTiles / vector-tile basemap. Replace the per-Scene raster XYZ tile cache (typical 5–15 MB; capped near ~50 MB by the integer-zoom-only policy in #264 research.md R2) with a single-file PMTiles vector basemap. PMTiles adds a ~80 KB JS dependency and a new tile renderer in the SPA but eliminates the per-tile file proliferation, supports arbitrary zoom without bundling additional levels, and makes large-area briefings transportable as smaller artefacts (memory stick, email attachment). Considered and deferred during #264 research (R2): raster tiles work today with the existing Leaflet TileLayer; PMTiles is the natural next step if and when zip size proves a real problem in practice. Trigger: a briefing zip exceeds ~50 MB, OR analyst feedback that the raster-tile zip size is impeding transport. Estimate 5 dev-days. (follow-up to #264 /speckit.review decision 3 — captured as deferred-scope BL-C)"

## Context

This is a follow-up to **#264 (Air-Gapped Briefing Zip — Storyboard Renderer)**, which shipped a self-contained briefing zip that opens by double-clicking `index.html` and plays a Storyboard with no install and no network. #264 bundled its basemap as a directory of pre-fetched **raster** tiles (`tiles/{z}/{x}/{y}.png`), rendered by a react-leaflet `TileLayer` in the briefing SPA. During #264's `/speckit.review` (research.md R2) a single-file **vector** basemap was considered and explicitly deferred: raster tiles worked, and the team chose to defer the extra dependency and renderer until zip size proved a real problem.

This feature picks up that deferred scope. It changes **how the basemap travels inside the briefing zip** — from a proliferation of individual raster tile files to a single vector-tile basemap file — and changes **how the SPA draws the basemap** — from a raster `TileLayer` to a vector renderer. Everything else about the briefing zip (export command surface, Storyboard scoping, playback fidelity, Present/Minimal modes, read-only, fully air-gapped) is inherited unchanged from #264.

## Blocked

**Status: BLOCKED — no implementation work to proceed (2026-05-26).**

This feature requires a source of **vector-tile** basemap data to package into the single PMTiles file. #264's existing basemap source is OpenStreetMap **raster** tiles, fetched over the network at export time; it does not provide vector tiles. Three sourcing options were put to the product owner during `/speckit.clarify`:

- (a) clip an extract from a free/open vector basemap **over the network at export time**;
- (b) clip locally from a **vector basemap source pre-staged in the repo/build** (no network at export);
- (c) an **operator-provided** source (configurable URL or file).

**The product owner ruled all three non-viable** for the target operating environment:

> "The one thing we can guarantee is that there won't be an Internet connection. I don't expect my analysts to have easy access to a vector tile source."

- Option (a) fails because an internet connection cannot be guaranteed even on the analyst's export machine — the whole point of the briefing zip is air-gapped operation, and the analysts authoring the Storyboards are themselves frequently offline.
- Option (b) fails because there is no readily-available, suitably-licensed vector basemap source to pre-stage, and committing a large regional basemap into the repo/build is not currently a workable option.
- Option (c) fails for the same reason as (b): analysts do not have easy access to any vector tile source to point the configuration at.

**Resolution**: This feature is **blocked** until an easily-accessible, offline-capable vector tile source exists (for example: a vetted, suitably-licensed regional vector basemap that can be bundled with the toolchain or shipped with Debrief, removing the dependency on either a live network or per-analyst sourcing). When such a source becomes available, this spec can be unblocked, the basemap-source clarification resolved against it, and the feature taken into `/speckit.plan`.

**No code changes** are made on this branch. Only this blocked-status documentation (spec + BACKLOG) is committed. The underlying raster-tile pipeline from #264 remains in place and unchanged; today's briefing zips continue to work exactly as they do now.

The full functional specification below is retained as the **design of record for when the feature is unblocked** — every requirement other than the basemap-source decision is settled, so unblocking is a matter of resolving the source and proceeding to planning, not re-specifying.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Export a large-area briefing as a transportable zip (Priority: P1)

An analyst has authored a Storyboard whose Scenes span a wide geographic area or many viewports. Under the previous raster-tile approach the resulting briefing zip swelled toward (or past) the ~50 MB transport ceiling — too large to email, awkward on a constrained memory stick. The analyst invokes the same "Export Storyboard as briefing zip…" command they already know. The platform now packages the basemap as a single vector-tile file rather than hundreds-to-thousands of individual raster tiles. The resulting zip is meaningfully smaller and contains far fewer files, so it transports cleanly as an email attachment or on a small stick.

**Why this priority**: This is the entire reason the deferred scope is being picked up now — the trigger is "a briefing zip exceeds ~50 MB, OR analyst feedback that the raster-tile zip size is impeding transport". If a large-area briefing does not come out smaller and more transportable, the feature has not delivered its value.

**Independent Test**: Take a Storyboard whose Scenes cover a wide area (the kind that produced a large raster zip under #264). Export it with the updated command. Confirm (a) the resulting zip is a single `.zip` written to the chosen destination exactly as before, (b) its unpacked contents carry a single basemap file rather than a `tiles/` directory of many files, and (c) its total size is smaller than the raster-tile equivalent for the same Storyboard.

**Acceptance Scenarios**:

1. **Given** a Storyboard whose Scenes span a wide geographic extent, **When** the analyst invokes "Export Storyboard as briefing zip…" and picks a destination, **Then** the platform writes a single `.zip` whose unpacked contents contain exactly one basemap file (not a directory of individual tile files) covering every Scene's viewport.
2. **Given** the same Storyboard exported once under the previous raster approach and once under the vector approach, **When** the two zips are compared, **Then** the vector zip is smaller in total bytes and contains far fewer individual files.
3. **Given** the export is running, **When** the basemap is being assembled, **Then** the analyst sees progress feedback (the export does not appear hung) and, on completion, is notified of success exactly as the existing command already notifies.
4. **Given** the analyst cancels the destination prompt, **When** no destination is chosen, **Then** no zip is written and the source plot is unchanged — identical to the existing behaviour.

---

### User Story 2 — Recipient opens the briefing and the basemap renders, still fully offline (Priority: P1)

A recipient receives the new briefing zip on a machine with no Debrief install and no internet. They unzip it and double-click `index.html`. The Storyboard plays back exactly as before — same Scene order, same viewports, same time-slider behaviour, same visible track motion — and the basemap underneath renders from the single bundled vector-tile file. No network request is ever issued. The map looks coherent and legible at every zoom the playback reaches.

**Why this priority**: The whole promise of the briefing zip is air-gapped, install-free playback. Swapping the basemap format must not break that promise. If the vector basemap needs a server, a network round-trip, or a renderer that fails under `file://`, the feature regresses the core value of #264.

**Independent Test**: Take a briefing zip produced by Story 1, copy it to an air-gapped machine with no Debrief install and only a supported browser (current Chrome or Edge on desktop), unzip it, and double-click `index.html`. Confirm the Storyboard plays back and the basemap renders from local files with zero external network requests across load, playback, mode toggle, and replay.

**Acceptance Scenarios**:

1. **Given** an unpacked briefing zip and a supported browser, **When** the user double-clicks `index.html`, **Then** the SPA loads from `file://` origin and the vector basemap renders from the single bundled basemap file — with no network request to any external host.
2. **Given** the Storyboard is playing, **When** the playback engine drives the viewport across Scenes (and interpolates between viewports for time-range Scenes), **Then** the basemap is present and legible throughout, with the same Scene order, per-Scene viewports, and time-driven layer motion as the authoring environment.
3. **Given** the user reaches the end and replays, **When** playback restarts, **Then** the basemap continues to render from already-loaded resources with no additional fetch.
4. **Given** a Scene's viewport extends beyond the bundled basemap coverage, **When** that area is shown, **Then** the SPA displays a non-network placeholder (neutral background or a clear "no basemap here" treatment) rather than issuing a network request.

---

### User Story 3 — Crisp basemap at any zoom the playback reaches (Priority: P2)

Because the basemap is now vector tiles, the SPA can render the basemap legibly at any zoom level the playback drives to, without the export having had to pre-select and bundle a discrete set of raster zoom levels. A Storyboard with a time-range Scene that zooms from a wide regional view down to a close harbour view renders a crisp basemap across the whole zoom range, with no blurry up-scaled raster and no missing intermediate zoom level.

**Why this priority**: Arbitrary-zoom rendering is one of the two named benefits of moving to vector tiles ("supports arbitrary zoom without bundling additional levels"). It removes the #264 constraint where only the integer zoom levels reachable by playback were bundled, and it is what keeps the artefact small even for Scenes that traverse many zoom levels. It is P2 (not P1) because a Storyboard that never changes zoom still benefits primarily from the size reduction in Story 1; the arbitrary-zoom payoff is most visible on zoom-traversing Scenes.

**Independent Test**: Author a Storyboard with at least one time-range Scene that interpolates between two viewports at substantially different zoom levels. Export it and open the briefing. Scrub/play across the zoom transition and confirm the basemap stays crisp and complete throughout — no blurry raster up-scaling, no "no tile" gap at intermediate zooms within the covered extent.

**Acceptance Scenarios**:

1. **Given** a time-range Scene that interpolates between a wide-area viewport and a close-in viewport, **When** the briefing plays that Scene, **Then** the basemap renders legibly at every intermediate zoom without blurring or missing-tile gaps inside the covered extent.
2. **Given** the export ran for that Storyboard, **When** the zip is inspected, **Then** the basemap was bundled once (a single file covering the extent), not as separate per-zoom-level tile sets.

---

### Edge Cases

- **Scene viewport extends beyond basemap coverage**: the SPA shows a non-network placeholder for the uncovered area; it never falls back to an online tile/vector server (inherited from #264 FR-027/FR-028).
- **Empty Storyboard (no Scenes)**: the export still produces a valid zip; with no viewports to cover, the basemap is empty or omitted and the SPA shows the inherited "no Scenes" empty state rather than erroring.
- **Vector-tile source unavailable or partial at export time**: the export reports the gap explicitly (not silently) and still produces a usable zip; uncovered area renders as the placeholder at playback (Article I.3 — no silent failure).
- **Wide-area Storyboard producing a large coverage extent**: the basemap file stays bounded and transport-friendly; the feature's success depends on the vector basemap being smaller than the raster equivalent even for large extents.
- **Antimeridian-crossing viewports**: basemap coverage spans the 180° meridian correctly, consistent with the existing coverage computation for raster tiles.
- **`file://`-origin binary read restriction**: current Chrome/Edge restrict `fetch()`/XHR of sibling files under `file://` (the reason #264 inlined JSON and used `<img>`/`TileLayer` for raster tiles). The SPA's strategy for reading the single basemap file MUST work under `file://` on the supported browsers without a local server. This is the central technical risk to resolve in planning (see Assumptions).
- **Already-distributed raster briefing zips**: each briefing zip is self-contained including its own bundled SPA build, so zips exported before this change continue to open and play with their bundled raster renderer. No migration of existing artefacts is required; the format change is forward-only.
- **High-DPI / retina display**: the vector basemap renders sharply on high-DPI displays (a vector-tile advantage over fixed-resolution raster), and at minimum is no worse than the previous raster rendering.
- **Re-export of the same Storyboard**: producing a fresh zip overwrites cleanly per the existing destination-prompt convention; the new zip carries the vector basemap.

## Requirements *(mandatory)*

### Functional Requirements

**Export — basemap generation (authoring side)**

- **FR-001**: The export command MUST produce a **single-file vector-tile basemap** (PMTiles format) covering every Scene's viewport, in place of the directory of individual raster tile files produced by #264.
- **FR-002**: The basemap MUST cover the geographic extent of every Scene's viewport — and, for time-range Scenes, the interpolation path between the start and end viewports — so that no playback-reachable viewport pans onto uncovered area within the captured Storyboard.
- **FR-003**: The export MUST NOT need to pre-select or bundle discrete raster zoom levels; the single vector basemap MUST be sufficient to render every zoom level the playback can reach within the covered extent.
- **FR-004**: The export MUST record the basemap's attribution into `item.json` so the SPA can display the required attribution.
- **FR-005**: The export command's user-facing surface MUST remain unchanged from #264 — same "Export Storyboard as briefing zip…" command, same destination prompt, same cancel behaviour, same success notification — and MUST NOT modify the source plot.
- **FR-006**: If vector-tile data for part of the required extent cannot be obtained at export time, the export MUST report the gap explicitly (not silently swallow it) and still produce a usable zip; the uncovered area becomes the SPA's playback placeholder.
- **FR-007**: The export MUST surface progress feedback during basemap assembly so a wide-area export does not appear hung.

**Zip contents (artefact contract)**

- **FR-008**: The briefing zip MUST contain exactly **one** basemap file — not a directory of per-tile files. The per-tile file proliferation of #264 is eliminated.
- **FR-009**: The basemap file MUST be referenced inside the zip by a **relative** path so `index.html` resolves it regardless of the absolute path the zip is unpacked into.
- **FR-010**: For a typical multi-Scene Storyboard, the total briefing-zip size MUST be no larger than — and is expected to be meaningfully smaller than — the raster-tile equivalent for the same Storyboard (see Success Criteria).
- **FR-011**: All other zip contents (`index.html`, bundled SPA assets, `features.geojson`, `item.json`, Scene-thumbnail assets) MUST remain as specified by #264; only the basemap representation changes.

**SPA — basemap rendering (recipient side)**

- **FR-012**: The SPA MUST render the basemap from the single bundled basemap file using **only local resources** — no network request to any external host at any lifecycle point (load, playback, mode toggle, replay).
- **FR-013**: The SPA MUST render the vector basemap at whatever viewport and zoom the shared playback engine drives, with visual fidelity comparable to the authoring environment's basemap (recognisable coastlines, land/sea distinction, and any labelling the basemap provides).
- **FR-014**: The SPA MUST load and render the basemap from `file://` origin in the supported browser matrix (current Chrome and current Edge on desktop) without requiring a local web server.
- **FR-015**: When a playback viewport extends beyond the bundled basemap coverage, the SPA MUST display a non-network placeholder rather than issuing any network request.
- **FR-016**: The basemap swap MUST NOT change any inherited #264 playback behaviour: Scene order, per-Scene viewports, Scene durations, instant-vs-time-range playback, time-driven layer motion, Present/Minimal modes, read-only surface, and replay all behave exactly as before.

**Continuity & compatibility**

- **FR-017**: Each briefing zip MUST remain fully self-contained, carrying its own bundled SPA build; briefing zips exported before this change MUST continue to open and play with their bundled (raster) renderer, with no migration step required.
- **FR-018**: The vector basemap pipeline MUST fully replace the raster tile pipeline for new exports (it is not an analyst-selectable option) — the raster fetch-and-pack path is retired for new briefings.

### Key Entities

- **Single-file vector basemap (PMTiles)**: One file bundled inside the briefing zip that holds vector basemap tiles covering every Scene's viewport extent. Replaces #264's `tiles/{z}/{x}/{y}.png` directory. Read by the SPA from a relative path under `file://`; rendered client-side at arbitrary zoom.
- **Basemap coverage extent**: The union of every Scene's viewport (plus the interpolation path for time-range Scenes) that the export must cover when building the basemap. Conceptually the same coverage the #264 raster computation produced, but expressed as a single vector basemap rather than an enumerated tile set per zoom level.
- **Briefing zip (updated contents)**: The single `.zip` artefact from #264, with the only change being the basemap representation — one vector basemap file in place of the raster tile directory. All other contents are inherited unchanged.
- **`item.json` (attribution)**: Inherited from #264; now records the vector basemap's attribution so the SPA can render it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative wide-area Storyboard that produced a briefing zip near or above the ~50 MB raster ceiling under #264, the vector-basemap zip is small enough to transport as a common email attachment (≤ ~25 MB) — and in general the vector zip is at least 40% smaller than the raster equivalent for the same Storyboard.
- **SC-002**: 100% of the SPA's runtime resource loads — including the basemap — come from inside the zip: **zero** external network requests are observed across load, playback, mode toggle, and replay (the #264 air-gapped guarantee is preserved exactly).
- **SC-003**: The unpacked briefing contains exactly **one** basemap file; the number of individual basemap files in the unpacked artefact drops from the previous many (hundreds-to-thousands of raster tiles, depending on coverage) to one.
- **SC-004**: For a Storyboard whose playback traverses multiple zoom levels, the basemap renders legibly at every zoom the playback reaches within the covered extent — no blurry raster up-scaling and no missing-tile gaps inside coverage — verified by inspection of the playback across the zoom range.
- **SC-005**: The briefing playback observed in the SPA is visually equivalent to #264 for the same Storyboard with respect to Scene order, viewports, time-slider behaviour, and time-driven layer motion — the basemap change is the only visible difference, and only in basemap appearance (vector vs raster), not in playback behaviour.
- **SC-006**: The briefing zip remains playable when copied between machines, operating systems, and to paths containing spaces or non-ASCII characters — `index.html` always resolves the basemap file (inherited #264 SC-007, re-verified for the single-file basemap).

## Assumptions

- The vector basemap is genuinely **vector** tiles (not raster pixels repackaged into a single container). Raster-in-a-single-file would deliver the single-file benefit but not the stated "supports arbitrary zoom without bundling additional levels" benefit, which only vector tiles provide. The two named benefits in the trigger (arbitrary zoom; smaller artefacts) drive the vector interpretation.
- The shared playback engine and the briefing SPA's map surface (`apps/briefing-renderer/src/components/BriefingMap.tsx`) can swap their raster `TileLayer` for a vector renderer without changing the playback engine itself — `flyTo`/viewport control, Scene scoping, time-driven markers, and the `runTimeRangeTween` loop are all basemap-agnostic. Only the basemap layer changes.
- Reading the single basemap file under `file://` on the supported browsers is solvable without a local server. PMTiles is normally read via HTTP range requests, which `file://` restricts on the target browsers; the planning phase must resolve the concrete read strategy (e.g. a `file://`-compatible source adapter, or inlining the basemap bytes) **without** breaking the size benefit (SC-001) or the air-gapped guarantee (SC-002). This is the central technical risk and is explicitly a planning/research concern, not a spec-level decision.
- The supported browser matrix is inherited from #264 R6 unchanged: current Chrome and current Edge on desktop; Firefox, Safari, and mobile browsers remain out of supported scope and continue to receive the boot-time browser-probe banner.
- Vector basemap styling does not need to match the previous raster basemap pixel-for-pixel; it needs to be recognisable and legible (coastlines, land/sea, and any labels the basemap carries) so the briefing audience can orient themselves. A muted, briefing-appropriate basemap style is acceptable.
- Attribution requirements for the chosen vector basemap source are satisfied by recording attribution in `item.json` and rendering it in the SPA, mirroring how #264 handled OSM raster attribution.
- The export's basemap-assembly step may use the network **at export time** on the analyst's machine (exactly as #264's raster fetch did); the air-gapped guarantee applies only to **playback** on the recipient's machine.

## Dependencies

- **#264 — Air-Gapped Briefing Zip — Storyboard Renderer** (shipped): supplies the export command, the briefing SPA (`apps/briefing-renderer/`), the Storyboard scoping algorithm, the `features.geojson` / `item.json` / Scene-thumbnail bundling, the `computeTileCoverage` coverage logic, and the air-gapped/playback/display-mode contracts. This feature replaces only #264's raster tile fetch (`fetchTiles.ts`), packing (`zipAssembler.ts` tile portion), and rendering (`BriefingMap.tsx` `TileLayer`) — everything else is inherited.
- **A `file://`-readable, offline vector basemap source** — see the Open Clarifications below; the exact source of vector-tile data and the export-time mechanism to obtain it is the one open scope decision.
- **The supported-browser matrix and boot-time browser probe** from #264 R6 — inherited unchanged.

## Open Clarifications

- **FR-001 / basemap source — RESOLVED AS BLOCKER (2026-05-26)**: The vector-tile data the export packages into the single PMTiles basemap must come from somewhere, and #264's existing OSM **raster** source does not provide vector tiles. The product owner reviewed the three candidate sources (online extract at export time / pre-staged repo source / operator-provided source) and ruled all three non-viable because an internet connection cannot be guaranteed and analysts have no easy access to a vector tile source. See [Blocked](#blocked). This feature cannot proceed to planning until an easily-accessible, offline-capable vector tile source exists.

## Out of Scope

- Any change to the export command's user-facing surface, the Storyboard scoping algorithm, the Present/Minimal display modes, the read-only nature of the SPA, or the playback engine itself — all inherited unchanged from #264.
- Migrating or re-rendering briefing zips that were already exported under the raster approach (each zip is self-contained; old zips keep working with their bundled renderer).
- Exposing a new manual map-zoom or map-pan control to the recipient. The SPA remains playback-driven; "arbitrary zoom" refers to the basemap rendering crisply at whatever zoom the *playback* reaches, not to adding free user navigation.
- Offering the analyst a raster-vs-vector choice at export time — the vector path replaces the raster path for new exports.
- Live or online basemap features of any kind in the SPA (fresh tiles, online style switching, telemetry) — the SPA stays fully air-gapped at playback.
- A tuned mobile/touch briefing experience (inherited out-of-scope from #264).
</content>
