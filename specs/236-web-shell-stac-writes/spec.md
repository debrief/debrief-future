# Feature Specification: Web-shell STAC write path (phase 1)

**Feature Branch**: `236-web-shell-stac-writes`
**Created**: 2026-05-01
**Status**: Draft
**Input**: User description: "Web-shell STAC write path — Vite middleware POST/PUT (phase 1) + IndexedDB browser persistence (phase 2). Replace `apps/web-shell/src/mocks/stacService.ts`'s read-only mock with a real STAC write layer (Storyboard captures, metadata patches, GeoJSON writes, new STAC item creation) so web-shell persists captures across reloads. Phase 1 (this spec, 5–8 dev-days): extend the `/stac-store/` Vite middleware with PUT/PATCH/POST/DELETE backed by a host-agnostic STAC asset writer shared with VS Code's `sceneThumbnailService`. Phase 2 (separate follow-up): IndexedDB-only browser persistence + 'export catalog as zip'. Constitution amendment required — Article IV 'persistence-host abstraction' carve-out, formalising #215's host-adaptor exception. Last-write-wins conflict model (mirrors current VS Code behaviour). Closes the FR-WEB-029a session-only badge from #215; depends on the #174 host-adaptor pattern; extends #193's `updateItemMetadata`. Tracking issue: https://github.com/debrief/debrief-future/issues/572"

## Background & Context

The web-shell is the browser-based primary preview surface for the maritime tactical analysis platform. Today, when an analyst loads sample data, captures Storyboard scenes, edits item metadata, or draws new tracks, those changes appear in the running session but are **silently discarded on reload** — the underlying STAC catalog mock is read-only.

Today's web-shell badge "Session-only" (FR-WEB-029a from feature #215) is the user-visible warning that captures will not survive. This feature replaces the warning with real persistence by upgrading the in-process catalog from a read-only mock into a write-capable layer that mirrors the VS Code host's behaviour.

**Phase 1 (this spec)** delivers durable writes against the dev-time catalog directory shared with VS Code (e.g. `preview/workspace/samples/local-store/`). **Phase 2 (separate follow-up)** will move that durability into the browser itself (IndexedDB) for analysts running the web-shell against a static-hosted preview without a Node server. Phase 2 is explicitly **out of scope** here.

This work also unlocks a structural improvement: today, VS Code's scene-thumbnail and metadata-update paths each have their own host-coupled logic. By introducing a host-agnostic STAC asset writer shared between the two hosts, both paths converge on a single tested implementation. This convergence is the **technical objective**; the user-visible objective is "captures persist".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Storyboard captures persist across reloads (Priority: P1)

An analyst loads a sample plot in the web-shell, opens the Storyboard panel, captures a scene of the current map view + time, then refreshes the browser. The captured scene is still there.

**Why this priority**: This is the core promise of the feature and the trigger for the entire work item. Until this works, the "Session-only" badge on the web-shell remains, which materially limits the web-shell's credibility as a primary preview surface and blocks its use in Storyboarding demos. Every other persistence story (P2, P3) depends on the same underlying writer plumbing being in place, so P1 also de-risks them.

**Independent Test**: A reviewer can fully test this by running the web-shell against a checked-out workspace, capturing a scene, hard-reloading the page, and confirming the scene re-appears in the Storyboard panel with its thumbnail intact. No VS Code involvement required.

**Acceptance Scenarios**:

1. **Given** the web-shell is running with a sample catalog and an open plot, **When** the analyst captures a Storyboard scene, **Then** the scene's thumbnail asset and item metadata are committed to the catalog and the "Session-only" badge is removed.
2. **Given** the analyst has captured a scene, **When** the analyst reloads the browser tab, **Then** the same scene re-appears in the Storyboard panel with the same thumbnail, time, and viewport.
3. **Given** two browser tabs are open against the same web-shell catalog, **When** both capture different scenes within the same Storyboard, **Then** both scenes are present after either tab is reloaded (last-write-wins on the catalog item itself, but distinct scene IDs co-exist).

---

### User Story 2 - Item metadata edits persist across reloads (Priority: P2)

An analyst opens the Properties Panel against a STAC item in the web-shell, edits a metadata field (description, platform array, time bounds, etc.), saves, and reloads. The edited metadata is still there.

**Why this priority**: Metadata persistence is the second visible promise after captures and is the path that #193's `updateItemMetadata` already exercises in VS Code. Sharing the same writer means parity comes "for free" once P1 lands. P2 is below P1 only because metadata edits are less common than captures during a working session and have a smaller blast radius if the path were to fail.

**Independent Test**: Open the Properties Panel against a sample item, change a description string, save, reload — the new description is shown.

**Acceptance Scenarios**:

1. **Given** an item is open in the Properties Panel, **When** the analyst edits a metadata field and saves, **Then** the edit is committed to the catalog and visible in subsequent reads (panel re-open, browser reload, second tab).
2. **Given** two analysts (or two tabs) edit different fields on the same item concurrently, **When** both save, **Then** the last save wins on the conflicting whole-item write, and the catalog remains internally valid (no corrupt JSON, no orphan assets).

---

### User Story 3 - GeoJSON payload writes & new item creation persist (Priority: P3)

An analyst draws a new track on the map, names it, and saves. The new STAC item (with its GeoJSON payload asset) is committed to the catalog and survives reload. Equivalently, an existing item's GeoJSON payload (e.g. an edited track) is overwritten in place.

**Why this priority**: New-item creation and GeoJSON payload writes are the third class of write the webshell needs to mirror VS Code. They reuse the same writer plumbing as P1 and P2 but exercise the "create" and "large-blob overwrite" branches of the writer that P1 (asset write + metadata write) and P2 (metadata-only patch) do not. P3 is lowest priority because the in-web-shell drawing tools are themselves still being polished, so a temporary "captures persist but new tracks don't" state is acceptable for one cycle.

**Independent Test**: Draw a new track, save it, reload — the new item appears in the catalog browser with its drawn geometry.

**Acceptance Scenarios**:

1. **Given** an open plot with drawing tools active, **When** the analyst draws and saves a new track, **Then** a new STAC item is created in the catalog with its GeoJSON payload as a sibling asset, and both persist across reload.
2. **Given** an existing track item, **When** the analyst edits its geometry and saves, **Then** the GeoJSON payload is overwritten in place and the item's metadata (e.g. updated time bounds) is patched atomically with respect to the geometry write — a reader never observes new geometry alongside stale metadata.

---

### Edge Cases

- **Path traversal attempt**: a write request targets a path outside the configured catalog root (e.g. `../../etc/passwd`). The system MUST reject the request and write nothing.
- **Disk-full / write failure**: the underlying filesystem write fails partway through a multi-asset capture (thumbnail succeeds, metadata patch fails, or vice versa). The catalog MUST NOT be left in a partially-updated state where assets exist without metadata referencing them, or vice versa, in a way that breaks subsequent reads.
- **Concurrent writes to the same item from two tabs**: last-write-wins on the item's metadata document (mirrors VS Code). Both writes may individually succeed; the surviving state is whichever ordered last at the writer.
- **Read-only catalog directory** (e.g. running web-shell against a directory mounted read-only): writes MUST fail loudly with a clear error surfaced to the UI, and the "Session-only" badge MUST remain visible to the analyst.
- **Phase 2 host (IndexedDB-only)**: when this spec ships, web-shells served from a static host with no write-capable backing have no usable write path. The "Session-only" badge MUST remain in that configuration. Phase 2 will close that gap.
- **Cross-host concurrent writes** (web-shell tab + VS Code session writing to the same catalog directory): both hosts use the same shared writer with last-write-wins semantics; no new conflict-resolution machinery is introduced.
- **Asset orphaning**: a thumbnail asset is written but the item-create call fails. The system MUST either roll the asset back, or expose enough information in error responses for a manual operator cleanup; silent orphaning is unacceptable.

## Requirements *(mandatory)*

### Functional Requirements

**Persistence behaviour (web-shell visible)**

- **FR-001**: The web-shell MUST persist Storyboard scene captures (thumbnail asset + item metadata patch) such that they survive a browser reload of the same web-shell process.
- **FR-002**: The web-shell MUST persist item metadata edits (e.g. description, platform fields, time bounds) such that they survive a browser reload.
- **FR-003**: The web-shell MUST persist new STAC item creation, including any GeoJSON payload sibling asset, such that the new item appears in subsequent catalog listings after reload.
- **FR-004**: The web-shell MUST persist in-place overwrites of existing GeoJSON payload assets (e.g. edited tracks) such that subsequent reads return the updated geometry.
- **FR-005**: The web-shell MUST remove the "Session-only" badge (FR-WEB-029a from #215) whenever the active host configuration supports the write path defined in FR-001..FR-004.
- **FR-006**: The web-shell MUST retain the "Session-only" badge when the active host configuration cannot support those writes (e.g. static-hosted web-shell with no write-capable backing — Phase 2 territory).

**Catalog write API (host-agnostic surface)**

- **FR-007**: The catalog MUST accept create operations for new STAC items, returning the canonical item identifier on success.
- **FR-008**: The catalog MUST accept whole-document replacement of an existing STAC item's metadata.
- **FR-009**: The catalog MUST accept partial-field patching of an existing STAC item's metadata (the operation surface used by `updateItemMetadata` from #193).
- **FR-010**: The catalog MUST accept binary asset writes (thumbnails, GeoJSON payloads) as siblings of an item, addressed by item ID + asset role.
- **FR-011**: The catalog MUST accept delete operations for individual assets and whole items, used by edit/undo flows.
- **FR-012**: The catalog MUST reject any write targeting a path outside the configured catalog root with a clear validation error and no side effects.

**Conflict & integrity**

- **FR-013**: The catalog MUST use a last-write-wins conflict model on whole-item writes (mirrors current VS Code behaviour). No optimistic locking, no version vectors, no merge UI in this phase.
- **FR-014**: The catalog MUST guarantee that a successful capture (thumbnail + metadata patch) leaves the catalog in a state where any subsequent reader observing the new item also observes its referenced thumbnail asset — i.e. asset-then-metadata ordering, no dangling-asset references in metadata.
- **FR-015**: On any write failure, the catalog MUST surface a structured error to the calling host (web-shell or VS Code) carrying enough information for the host to display a user-actionable message (e.g. "disk full", "read-only directory", "path rejected").

**Host abstraction (shared with VS Code)**

- **FR-016**: A single host-agnostic STAC asset writer MUST be the production code path for both web-shell captures and VS Code's existing `sceneThumbnailService` capture path. After this feature ships, capture-time logic in `sceneThumbnailService` MUST delegate to the shared writer rather than implementing its own filesystem operations.
- **FR-017**: The shared writer MUST be addressable by host-agnostic operations (create item, replace item, patch item, write asset, delete asset, delete item) without exposing host-specific concerns (Vite middleware, VS Code workspace APIs) at the operation surface.
- **FR-018**: Each host (web-shell, VS Code) MUST be responsible only for translating its host-native call into the writer's operation set, plus any host-specific transport plumbing (HTTP for web-shell; in-process call for VS Code).

**Constitutional change**

- **FR-019**: The project constitution MUST be amended to formalise Article IV's "persistence-host abstraction" carve-out, explicitly permitting the host-adaptor pattern introduced in #174 and used here. The amendment MUST be merged before, or as part of, this feature's implementation PR.

### Key Entities

- **STAC Item**: the catalog's fundamental unit of content. Has an identifier, a metadata document (JSON), and zero or more named assets (thumbnail, GeoJSON payload, etc.). Persisted as a directory-shaped record in the catalog root.
- **STAC Asset**: a binary or JSON sibling file owned by an Item, addressed by Item ID + asset role (e.g. `thumbnail`, `geojson`).
- **Catalog Root**: the configured filesystem directory (or, in Phase 2, IndexedDB partition) that holds the entire writeable STAC tree. The single boundary that all writes must stay within (FR-012).
- **STAC Asset Writer**: the host-agnostic component responsible for executing the catalog's write operations against the configured root. Single source of truth for ordering, validation, and error reporting (FR-014..FR-018).
- **Host Adaptor**: the per-host shim that translates host-native call sites (web-shell capture button → HTTP request; VS Code `sceneThumbnailService.capture()` → in-process call) into Asset Writer operations.
- **Storyboard Scene**: a captured map state (thumbnail + viewport + time) belonging to a Storyboard. Created by the P1 path. Out of scope to redefine here — see #215.
- **Catalog Configuration**: declares the catalog root and whether the active host supports writes. Drives FR-005/FR-006 badge behaviour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature ships, a fresh web-shell session that captures a Storyboard scene and reloads recovers 100% of captured scenes (thumbnail + metadata both intact, no manual recovery).
- **SC-002**: The web-shell's "Session-only" badge is no longer visible in any host configuration where writes are supported, in 100% of Storyboard, Properties Panel, and drawing-tool flows that previously displayed it.
- **SC-003**: The VS Code `sceneThumbnailService` capture path executes through the shared host-agnostic writer in 100% of captures after this feature ships, with no remaining duplicate filesystem-write code paths in either host.
- **SC-004**: All previously-passing web-shell and VS Code integration tests covering capture, metadata edit, and new-item creation pass against the unified writer with no behavioural regression visible to test fixtures.
- **SC-005**: Phase 1 ships in 5–8 developer-days of effort against the agreed scope (excludes Phase 2 IndexedDB work and any item beyond create/replace/patch/asset/delete).
- **SC-006**: A path-traversal write attempt targeting any path outside the catalog root is rejected with no filesystem side effects, in 100% of test cases covering relative-path escapes, absolute-path escapes, and symlink-based escapes.
- **SC-007**: An interrupted multi-step write (asset succeeds, metadata fails) leaves the catalog in a state where 0% of subsequent reads observe metadata referencing a missing asset.

## Assumptions

The following defaults were applied during specification authoring. Each is a reasonable industry-standard choice that was not explicitly called out in the original work item; flag any that need to change before `/speckit.plan`:

- **Authentication**: the catalog write surface in Phase 1 has no authentication. The web-shell's dev-time deployment model is local-only (developer machine or per-PR Heroku Review App) and the surface is bound to the same trust boundary as the existing read-only mock.
- **CORS**: writes accept same-origin requests only. No cross-origin write support in Phase 1.
- **Catalog scope**: writes are confined to the configured catalog root. Multi-catalog routing, federation, and remote STAC publication are out of scope.
- **Schema validation**: write operations validate against existing LinkML/STAC schemas already enforced on read; no new validation rules introduced here.
- **Phase 2 (IndexedDB)**: explicitly out of scope. Anything touching browser-only persistence, "export catalog as zip", or static-hosted-without-Node-backing scenarios is deferred.
- **Atomic-write strategy**: implementation may use temp-file-then-rename or equivalent OS-level atomicity primitives — exact mechanism is an implementation detail, but FR-014 requires the observable invariant.
- **Test strategy**: integration tests against a temp catalog directory are sufficient; no new orchestration-layer tests required beyond exercising the shared writer from both host adaptors.

## Dependencies

- **#174 host-adaptor pattern** — the host abstraction this feature formalises. Must be in place (it is, as of 2026-04 main).
- **#193 `updateItemMetadata`** — the metadata-patch operation (FR-009) reuses and extends this. Must be in place.
- **#215 Storyboarding schema** — defines the Storyboard Scene entity captured in P1. Must be in place. This feature closes its FR-WEB-029a "Session-only" badge.
- **Constitution amendment (Article IV)** — must be drafted and merged in lockstep with this feature's implementation PR (FR-019).

## Out of Scope (Phase 2 follow-up)

The following items are explicitly **deferred** to a separate spec, not addressed here:

- IndexedDB-only browser persistence (web-shell on a static host with no Node backing)
- "Export catalog as zip" download flow
- Conflict resolution beyond last-write-wins (e.g. optimistic locking, three-way merge)
- Cross-host write coordination richer than the shared writer (no leases, no event broadcasting)
- Multi-user write coordination (no auth, no per-user write tracking)
