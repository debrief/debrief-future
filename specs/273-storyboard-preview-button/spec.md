# Feature Specification: Storyboard live Preview button + web-shell briefing-zip export parity

**Feature Branch**: `273-storyboard-preview-button`
**Created**: 2026-05-26
**Status**: Draft
**Input**: User description: "Storyboard live Preview button + web-shell briefing-zip export parity (Epic E13; GitHub issue debrief/debrief-future#645)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview the current storyboard before exporting (Priority: P1)

A storyboard author has captured a series of scenes and wants to check how the finished briefing actually looks and plays — the scene transitions, viewport framing, time-range animation, basemap, and chrome — without first producing and unpacking a distribution artefact. From the storyboard panel they click a **Preview** control. The finished-briefing player opens in a new browser tab and plays back the storyboard they are currently working on. They watch it, return to the authoring surface, adjust a scene, and click Preview again to re-check. This works the same way whether they are authoring in the desktop (VS Code) surface or the browser (web-shell) surface.

**Why this priority**: This is the core value of the feature — closing the tight "tweak → verify" authoring loop. Today the only fidelity-accurate playback requires producing a zip, saving it, unzipping it, and double-clicking a file, which is far too heavy for iterative authoring and is unavailable to web-shell authors at all. Without P1 the feature delivers nothing.

**Independent Test**: Open a plot containing at least one storyboard, click Preview, confirm the player opens in a new tab and plays back the active storyboard's scenes (correct order, viewports, time-range motion, basemap) loaded live from the current plot's data — with no zip-packing step in between.

**Acceptance Scenarios**:

1. **Given** a plot with an active storyboard containing two or more scenes, **When** the author clicks Preview, **Then** the finished-briefing player opens in a new browser tab and begins playing back that storyboard's scenes in order.
2. **Given** the author is previewing, **When** they return to the authoring surface, edit a scene, and click Preview again, **Then** the player reflects the latest persisted state of the storyboard.
3. **Given** a plot containing multiple storyboards, **When** the author clicks Preview, **Then** the player shows the storyboard currently selected as active in the panel (not a different one).
4. **Given** the author is working in the desktop surface with no internet connection, **When** they click Preview, **Then** the player still opens and plays back the storyboard (basemap imagery is subject to the same availability as the normal map view).

---

### User Story 2 - Export a briefing zip from the browser surface (Priority: P2)

An author working in the browser (web-shell) surface has finished a storyboard and wants to hand it to a colleague as a self-contained, offline briefing. From the storyboard panel they choose **Export as briefing zip**. The browser produces a downloadable zip identical in behaviour to the one the desktop surface already produces, and the browser offers it to them as a normal file download. The recipient can open it on any machine with no network and no installed software.

**Why this priority**: Brings the browser surface to parity with the desktop surface for the existing, shipped export capability, removing a surprising asymmetry. It is valuable but secondary to the live preview loop (P1), and authors who need a zip today can still produce one from the desktop surface.

**Independent Test**: In the browser surface, open a plot with a storyboard, invoke Export as briefing zip, confirm a zip is offered as a download, then open the downloaded zip offline and confirm it plays back the storyboard correctly.

**Acceptance Scenarios**:

1. **Given** an author in the browser surface with an active storyboard, **When** they invoke Export as briefing zip, **Then** a zip is produced and offered as a browser download.
2. **Given** a downloaded briefing zip from the browser surface, **When** the recipient opens it on a machine with no network, **Then** it plays back the storyboard with the same fidelity as a zip exported from the desktop surface.
3. **Given** the same storyboard exported from both surfaces, **When** the two zips are compared, **Then** their playback behaviour is equivalent (the export logic is shared, not re-implemented).

---

### User Story 3 - Distributed offline briefings keep working unchanged (Priority: P1)

A recipient who was previously sent a briefing zip (or who is sent one after this feature ships) double-clicks its entry file and watches the briefing in their browser with no network, no server, and no installed software — exactly as before. The addition of the new live-preview capability must not change, degrade, or add any network dependency to this self-contained offline playback path.

**Why this priority**: This is a regression-guard story carrying equal weight to P1. The finished-briefing player is deliberately air-gapped, and the offline distribution path is the whole point of the existing briefing zip. Introducing a new way to feed the player data must not compromise that guarantee — a broken offline zip would be a serious regression of shipped behaviour.

**Independent Test**: Take a briefing zip produced before this feature (or a freshly produced one), open it on a fully offline machine, and confirm it plays back identically — no new errors, no attempted network calls for storyboard data.

**Acceptance Scenarios**:

1. **Given** a briefing zip, **When** it is opened on an offline machine, **Then** it plays back the storyboard with no attempt to fetch storyboard data over the network.
2. **Given** the player receives no externally-supplied data location, **When** it starts, **Then** it uses its self-contained bundled data exactly as it did before this feature.

### Edge Cases

- **No storyboard yet**: If the active plot has no storyboard (or the selected storyboard has zero scenes), the Preview control is unavailable (disabled with explanatory tooltip) rather than opening an empty or broken player.
- **Single-scene storyboard**: Preview opens and shows the single scene's framed viewport (no transition to animate); this is valid, not an error.
- **Unsaved captures**: If the author has captured or edited scenes that are not yet persisted, Preview reflects the currently-persisted state. The author is informed when a save is needed so the preview matches their latest edits (see Assumptions).
- **Storyboard data cannot be loaded for preview**: If the player is given a data location it cannot read or fetch, it shows a clear, human-readable error state (not a blank screen or silent failure), consistent with the player's existing error surfaces.
- **Popup/new-tab blocked**: If the surface cannot open a new browser tab (e.g. blocked by the browser), the author is told why and how to proceed rather than the click silently doing nothing.
- **Repeated Preview clicks**: Clicking Preview multiple times does not accumulate stale tabs/windows (see Assumptions on tab reuse).
- **Time-range scenes**: Storyboards mixing instant and time-range scenes preview with the correct per-scene motion, matching exported-zip behaviour.

## Requirements *(mandatory)*

### Functional Requirements

#### Preview (both surfaces)

- **FR-001**: Both the desktop and the browser authoring surfaces MUST present a **Preview** control in the storyboard panel header, alongside the existing Capture and Export controls.
- **FR-002**: Activating Preview MUST open the finished-briefing player in a new browser tab/window showing the **currently active** storyboard of the current plot.
- **FR-003**: The player MUST obtain the storyboard's data for preview by loading the current plot's feature data **live from a location supplied to it at launch** — it MUST NOT require a packed briefing zip to be produced first.
- **FR-004**: Preview playback MUST reproduce the same author-visible behaviour as the exported briefing for the same storyboard: scene order, per-scene viewport framing, instant vs. time-range scene motion, display mode (full/trail), and basemap backdrop.
- **FR-005**: Preview MUST reflect the **currently-persisted** state of the active storyboard at the moment it is launched, so that edits made and persisted since the last preview are visible on the next preview.
- **FR-006**: In the desktop surface, Preview MUST function with no external network connection — both the player and the storyboard data MUST be served locally. (Basemap imagery availability follows the same rules as the normal map view and is out of this requirement's scope.)
- **FR-007**: The Preview control MUST be unavailable (disabled, with an explanatory tooltip) when there is no active storyboard or the active storyboard has no scenes.
- **FR-008**: If the player cannot load the supplied storyboard data, it MUST present a clear, human-readable error state rather than a blank screen or silent failure.
- **FR-009**: If a new tab/window cannot be opened, the surface MUST inform the author of the reason rather than failing silently.

#### Offline briefing integrity (regression guard)

- **FR-010**: The finished-briefing player's existing self-contained offline startup path (used by distributed briefing zips) MUST remain behaviourally unchanged — when no external data location is supplied, the player MUST use its bundled, self-contained data exactly as before.
- **FR-011**: Opening a distributed briefing zip on an offline machine MUST NOT trigger any network request for storyboard data.
- **FR-012**: The two ways the player obtains data (self-contained bundled data vs. a supplied live location) MUST be cleanly separated so that the live-preview capability cannot affect offline playback.

#### Browser-surface export parity

- **FR-013**: The browser authoring surface MUST offer the same **Export as briefing zip** capability that the desktop surface already provides, for the active storyboard.
- **FR-014**: A briefing zip exported from the browser surface MUST be offered to the author as a downloadable file.
- **FR-015**: A briefing zip exported from the browser surface MUST be functionally equivalent to one exported from the desktop surface for the same storyboard (same offline playback fidelity).
- **FR-016**: The zip-production logic MUST be shared across both surfaces rather than independently re-implemented, so the two surfaces cannot drift.

#### Cross-cutting

- **FR-017**: Preview and Export MUST operate on the storyboard the author currently has active; when a plot contains multiple storyboards, neither action may act on a different storyboard than the one selected.
- **FR-018**: Both Preview and the browser-surface Export MUST be covered by automated end-to-end tests that exercise the real player (live-preview launch path and the browser export), in line with the project's testing requirements.

### Key Entities *(include if feature involves data)*

- **Storyboard**: The author's ordered set of scenes for a plot. A plot may contain more than one; exactly one is "active" at a time in the panel. Preview and Export always target the active storyboard.
- **Scene**: A single captured moment or time-range within a storyboard, carrying viewport framing, timing, and display-mode information used to drive playback.
- **Plot feature data**: The current plot's feature collection, which already embeds the storyboard and scene definitions. This is the data the player loads (live, for preview) or that is bundled (for an exported zip).
- **Finished-briefing player**: The distraction-free playback experience an author/recipient watches. It can start either from self-contained bundled data (offline zip) or from a supplied live data location (preview).
- **Briefing zip**: A self-contained, offline-playable package of a single storyboard, produced by the Export capability on either surface.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Let a storyboard author verify how their briefing looks and plays, and (on the browser surface) produce a shareable offline briefing — both directly from the authoring panel.
- **Key Decision(s)**:
  1. "Is my storyboard ready / does it look right?" — answered by watching the live Preview.
  2. "Should I now hand this off?" — answered by exporting a briefing zip.
- **Decision Inputs**: The storyboard panel shows the active storyboard and its scene list; the Preview and Export controls sit in the panel header next to Capture, so the author acts in the same place they author.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Storyboard panel, active storyboard with scenes | Click **Preview** | New browser tab opens; finished-briefing player loads the active storyboard live and begins playback |
| 2 | Finished-briefing player (new tab) | Watch playback / use transport controls | Author evaluates fidelity (transitions, framing, timing, basemap) |
| 3 | Back on authoring surface | Edit a scene, persist, click **Preview** again | Player reflects the updated, persisted storyboard |
| 4 | Storyboard panel (browser surface) | Choose **Export as briefing zip** | A briefing zip is produced and offered as a browser download for hand-off |

### UI States

- **Empty State**: No active storyboard or no scenes → Preview (and Export) disabled with a tooltip explaining a storyboard with at least one scene is required.
- **Loading State**: After clicking Preview, the new tab shows the player's normal "loading briefing…" state until the live data is read.
- **Error State**: If the supplied storyboard data cannot be loaded, the player shows its human-readable error surface; if a new tab cannot be opened, the authoring surface surfaces the reason.
- **Success State**: The player plays back the active storyboard; for Export, the browser presents the downloaded zip.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the storyboard panel, an author can go from "I want to check this" to watching live playback of the active storyboard in a single click, with no intermediate file-saving or unpacking step.
- **SC-002**: The Preview control is available in **both** the desktop and browser authoring surfaces, and behaves equivalently in each.
- **SC-003**: A live preview reproduces the same scene order, viewport framing, instant/time-range motion, display mode, and basemap as the exported briefing for the same storyboard — verified by automated end-to-end playback.
- **SC-004**: A previously-distributed briefing zip opened on a fully offline machine plays back with zero behavioural change and makes zero network requests for storyboard data after this feature ships (verified by an offline playback test).
- **SC-005**: An author on the browser surface can produce a downloadable briefing zip whose offline playback is equivalent to one produced on the desktop surface.
- **SC-006**: A returning author re-runs Preview after editing and persisting a scene and sees the change reflected on the next preview.

## Assumptions

- **A-1 (active storyboard)**: "The current storyboard" means the storyboard currently selected as active in the panel. Selecting which storyboard is active is existing behaviour and out of scope here.
- **A-2 (persisted state)**: Preview loads the currently-persisted plot data. Where the author has unsaved captures/edits, the surface either persists them as part of launching Preview or prompts the author to save first, so the preview matches their latest intended state. The exact save-vs-prompt choice is an implementation/UX-polish detail for planning, provided the author is never silently shown stale data without indication.
- **A-3 (tab reuse)**: Repeated Preview activations reuse a single preview tab/window per plot where the browser permits, to avoid tab proliferation; if reuse is not possible, a fresh tab is acceptable.
- **A-4 (basemap availability)**: Live preview relies on the same basemap source as the normal map view; offline basemap availability is governed by existing map behaviour and is not changed by this feature.
- **A-5 (single storyboard per preview/zip)**: As with the existing export, each preview and each zip targets exactly one storyboard.
- **A-6 (no durable preview link)**: The preview is a transient author-verification aid. Producing a shareable/persistent preview URL as a distribution artefact is explicitly out of scope.

## Out of Scope

- Vector / PMTiles basemaps to shrink briefing zips (tracked separately as #272).
- MP4 / GIF video export of a storyboard traversal (tracked separately as #265).
- Persisting or sharing a preview location as a durable distribution channel (preview is transient verification only).
- Per-user storyboard view memory or active-storyboard persistence across sessions (#237, #251).

## Dependencies

- Builds on the shipped briefing-zip export and finished-briefing player (#264), the shared playback engine (#217), display-mode capture (#258), time-range scene interpolation (#263), and the browser-surface persistence layer (#236) — all complete.
