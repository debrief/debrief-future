# Feature Specification: Web-shell STAC write path (IndexedDB-only)

**Feature Branch**: `236-web-shell-stac-writes`
**Created**: 2026-05-01
**Last revised**: 2026-05-01 (pivot — Vite-middleware approach dropped; web-shell stays a static site, persistence moves into IndexedDB)
**Status**: Draft
**Input**: User description: "Web-shell STAC write path. Replace `apps/web-shell/src/mocks/stacService.ts`'s read-only mock with a real STAC write layer (Storyboard captures, metadata patches, GeoJSON writes, new STAC item creation) so web-shell persists captures across reloads. **Web-shell remains a pure static site — no backend, no server-side writes.** Persistence is browser-native via IndexedDB. Both hosts (VS Code, web-shell) route through a single writer interface; VS Code's backend is Node fs (largely existing code), web-shell's backend is IndexedDB. Constitution amendment required — Article IV 'persistence-host abstraction' carve-out, formalising the host-adaptor pattern from #174 and explicitly authorising browser-native persistence behind the unified writer abstraction. Last-write-wins on conflicts. Bundled sample catalog (≈74 items) is read-only demo content; metadata edits and captures land as IndexedDB overlays; new items live entirely in IndexedDB. Closes the FR-WEB-029a session-only badge from #215; depends on the #174 host-adaptor pattern; extends #193's `updateItemMetadata`. Tracking issue: https://github.com/debrief/debrief-future/issues/572. Zip-export of the IndexedDB catalog (round-trip back to VS Code) is deferred to a separate spec."

## Background & Context

The web-shell is the browser-based primary preview surface for the maritime tactical analysis platform. Today it ships as a pure static site (deployable to GitHub Pages), with the catalog served read-only via a `/stac-store/` GET handler in the Vite dev/preview server **and bundled into the build output** for production hosting. When an analyst loads sample data and captures Storyboard scenes, edits item metadata, or draws new tracks, those changes appear in the running session but are **silently discarded on reload** — the underlying STAC catalog mock has no persistence layer.

Today's web-shell badge "Session-only" (FR-WEB-029a, shipped under #215/#235) is the user-visible warning that captures will not survive. This feature replaces the warning with real persistence by adding a browser-native IndexedDB store as the catalog's write layer.

**Constraint**: the web-shell MUST remain a pure static site. No backend, no Node-side write handler, no Vite middleware POST/PUT/PATCH/DELETE, no review-app-only persistence. Static deployment to GitHub Pages MUST continue to work — captures persist there too. This constraint rules out anything that needs a server in the loop and pushes persistence entirely into the browser.

**Phase 1 (this spec)** delivers IndexedDB persistence in the web-shell, plus a unified TypeScript writer interface that both hosts (VS Code and web-shell) implement. VS Code keeps its existing Node-fs writes — they're just refactored to satisfy the shared interface. **Phase 2+ (separate specs)** will tackle catalog zip export, multi-tab coordination beyond best-effort, and any cross-device-sync ambitions. None of those are in this work.

This work also unlocks a structural improvement: today, VS Code's scene-thumbnail and metadata-update paths each have their own host-coupled logic with no parallel in the web-shell. Introducing a shared writer interface — implemented host-locally by Node fs in VS Code and IndexedDB in the browser — gives both hosts the same operation surface and the same atomicity guarantees, scoped to whatever each host's storage backend supports. This convergence is the **technical objective**; the user-visible objective is "captures persist".

The bundled sample catalog (≈74 plot directories under `preview/workspace/samples/local-store/`) is treated as read-only demo content: analysts can capture scenes into bundled items and patch their metadata (the patch lands as an IndexedDB overlay), but cannot delete a bundled item from their view. New items the analyst creates live entirely in IndexedDB. When the bundled catalog is updated upstream and a user has IndexedDB writes against the old version, the IndexedDB writes win silently.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Storyboard captures persist across reloads (Priority: P1)

An analyst loads a sample plot in the web-shell, opens the Storyboard panel, captures a scene of the current map view + time, then refreshes the browser. The captured scene is still there.

**Why this priority**: This is the core promise of the feature and the trigger for the entire work item. Until this works, the "Session-only" badge on the web-shell remains, which materially limits the web-shell's credibility as a primary preview surface and blocks its use in Storyboarding demos. Every other persistence story (P2, P3) depends on the same underlying IndexedDB plumbing being in place, so P1 also de-risks them.

**Independent Test**: A reviewer can fully test this by loading the static-built web-shell (or running `pnpm --filter @debrief/web-shell dev`), capturing a scene, hard-reloading the page, and confirming the scene re-appears in the Storyboard panel with its thumbnail intact. No VS Code involvement required.

**Acceptance Scenarios**:

1. **Given** the web-shell is loaded with a sample plot, **When** the analyst captures a Storyboard scene, **Then** the scene's thumbnail bytes and item metadata are committed to IndexedDB and the "Session-only" badge is removed.
2. **Given** the analyst has captured a scene, **When** the analyst reloads the browser tab, **Then** the same scene re-appears in the Storyboard panel with the same thumbnail, time, and viewport.
3. **Given** two browser tabs are open against the same web-shell origin, **When** both capture different scenes within the same Storyboard, **Then** both scenes are present after either tab is reloaded (last-write-wins on the catalog item itself, but distinct scene IDs co-exist).
4. **Given** IndexedDB is unavailable (private/incognito mode, quota exceeded, or browser policy refusal), **When** the analyst attempts to capture, **Then** the "Session-only" badge remains visible and a clear inline error explains that captures will not persist in this browser configuration.

---

### User Story 2 - Item metadata edits persist across reloads (Priority: P2)

An analyst opens the Properties Panel against a STAC item in the web-shell (bundled or IndexedDB-only), edits a metadata field (description, platform array, time bounds, etc.), saves, and reloads. The edited metadata is still there.

**Why this priority**: Metadata persistence is the second visible promise after captures and is the path that #193's `updateItemMetadata` already exercises in VS Code. Sharing the same writer interface means parity comes "for free" once P1 lands. P2 is below P1 only because metadata edits are less common than captures during a working session and have a smaller blast radius if the path were to fail.

**Independent Test**: Open the Properties Panel against a sample item, change a description string, save, reload — the new description is shown.

**Acceptance Scenarios**:

1. **Given** a bundled item is open in the Properties Panel, **When** the analyst edits a metadata field and saves, **Then** the edit is committed as an IndexedDB overlay and visible in subsequent reads (panel re-open, browser reload, second tab).
2. **Given** an IndexedDB-only item is open, **When** the analyst edits and saves, **Then** the edit is committed in place to the IndexedDB record.
3. **Given** two analysts (or two tabs) edit different fields on the same item concurrently, **When** both save, **Then** the last save wins on the conflicting whole-item write, and the catalog remains internally valid (no orphaned asset references, no broken JSON).

---

### User Story 3 - GeoJSON payload writes & new item creation persist (Priority: P3)

An analyst draws a new track on the map, names it, and saves. The new STAC item (with its GeoJSON payload asset) is committed to IndexedDB and survives reload. Equivalently, an existing item's GeoJSON payload (e.g. an edited track) is overwritten in place.

**Why this priority**: New-item creation and GeoJSON payload writes are the third class of write the web-shell needs to mirror VS Code. They reuse the same writer plumbing as P1 and P2 but exercise the "create" and "large-blob overwrite" branches that P1 (asset write + metadata patch) and P2 (metadata-only patch) do not. P3 is lowest priority because the in-web-shell drawing tools are themselves still being polished, so a temporary "captures persist but new tracks don't" state is acceptable for one cycle.

**Independent Test**: Draw a new track, save it, reload — the new item appears in the catalog browser with its drawn geometry.

**Acceptance Scenarios**:

1. **Given** an open plot with drawing tools active, **When** the analyst draws and saves a new track, **Then** a new IndexedDB-only STAC item is created with its GeoJSON payload as a sibling asset blob, and both persist across reload.
2. **Given** an existing item, **When** the analyst edits its geometry and saves, **Then** the GeoJSON payload is overwritten in IndexedDB and the item's metadata (e.g. updated time bounds) is patched atomically with respect to the geometry write — a reader never observes new geometry alongside stale metadata.

---

### Edge Cases

- **IndexedDB unavailable** (private/incognito, browser policy, blocked by extension): the writer's capability check fails at startup; the "Session-only" badge stays visible; capture/edit attempts fail loudly with a clear error message; no silent data loss.
- **Storage quota exceeded** (`QuotaExceededError`): the writer surfaces a structured error; the UI shows a clear "browser storage full" message with guidance to clear unused captures or export. No silent failure.
- **Storage eviction** (browser auto-evicts unpartitioned storage after long inactivity): the writer requests `navigator.storage.persist()` on first successful write; if the request is denied, a one-shot UI banner warns the analyst that persistence is best-effort.
- **Bundled catalog upstream drift**: a user has IndexedDB overlays for `exercise-alpha`, then the bundled `exercise-alpha/item.json` changes upstream (new sample shipped). On reload, the IndexedDB overlay wins silently — the user never sees the upstream change for the fields they overwrote, but new fields the upstream added are visible (overlay is a shallow merge, not a wholesale replacement). Documented behaviour, not a bug.
- **Concurrent two-tab writes to the same item**: last-write-wins on the IndexedDB record. Both writes individually succeed at the IndexedDB transaction layer; the surviving state is whichever ordered last. A `BroadcastChannel`-based notification re-syncs the losing tab's view (best-effort — if the tab is hidden when the message fires, it picks up the update on next visibility-change).
- **Asset orphaning**: a thumbnail blob is written but the item-create transaction fails. IndexedDB transactions are atomic across object stores by design — partial commits cannot happen for a single transaction. The writer always groups asset blobs + item-record updates into one transaction, so this edge case is impossible by construction.
- **VS Code session writing to its filesystem catalog while the web-shell has IndexedDB writes against the same logical item**: the two hosts' stores diverge silently. There is no Phase 1 sync between them. (Phase 2+ "zip export and re-import" is the planned bridge.)
- **Browser without IndexedDB v3 / large-blob support** (very old browsers, or mobile Safari with restrictive policies): caught by the capability check; falls back to "Session-only" badge with a more specific error code.

## Requirements *(mandatory)*

### Functional Requirements

**Persistence behaviour (web-shell visible)**

- **FR-001**: The web-shell MUST persist Storyboard scene captures (thumbnail blob pair + item metadata patch) such that they survive a browser reload of the same origin.
- **FR-002**: The web-shell MUST persist item metadata edits (e.g. description, platform fields, time bounds) such that they survive a browser reload — both for bundled items (as overlays) and for IndexedDB-only items (in place).
- **FR-003**: The web-shell MUST persist new STAC item creation, including any GeoJSON payload sibling asset, such that the new item appears in subsequent catalog listings after reload.
- **FR-004**: The web-shell MUST persist in-place overwrites of existing GeoJSON payload assets (e.g. edited tracks) such that subsequent reads return the updated geometry.
- **FR-005**: The web-shell MUST remove the "Session-only" badge (FR-WEB-029a from #215) whenever the IndexedDB writer reports a healthy capability check.
- **FR-006**: The web-shell MUST retain the "Session-only" badge (with a more specific message) when the IndexedDB writer cannot persist (private mode, quota exceeded, browser refusal). No silent data loss.

**Bundled-catalog overlay semantics**

- **FR-007**: Bundled catalog items (under `preview/workspace/samples/local-store/`) MUST be treated as read-only demo content. The writer MUST NOT delete a bundled item, MUST NOT modify the bundled `item.json` on disk, and MUST NOT prevent the analyst from layering an IndexedDB overlay on top.
- **FR-008**: When reading an item, the catalog read path MUST return the IndexedDB overlay (if any) merged on top of the bundled item, with overlay fields winning. New IndexedDB-only items MUST appear in catalog listings alongside bundled items.
- **FR-009**: When the bundled `item.json` for an item changes upstream (new sample release, schema migration), and the user has an IndexedDB overlay against the old version, the IndexedDB overlay MUST continue to apply on top of the new bundled version. Field-level conflict resolution (overlay wins) is silent — no UI prompt.

**Catalog write API (host-agnostic interface)**

- **FR-010**: The catalog MUST accept create operations for new STAC items, returning the canonical item identifier on success.
- **FR-011**: The catalog MUST accept whole-document replacement of an existing IndexedDB-only STAC item's metadata. Bundled items reject whole-replacement (use patch instead).
- **FR-012**: The catalog MUST accept partial-field patching of an existing STAC item's metadata (the operation surface used by `updateItemMetadata` from #193). Patches against bundled items land as overlays; patches against IndexedDB-only items modify the record in place.
- **FR-013**: The catalog MUST accept binary asset writes (thumbnails, GeoJSON payloads) as siblings of an item, addressed by item ID + asset role. Asset bytes are stored as blobs in IndexedDB.
- **FR-014**: The catalog MUST accept delete operations for individual IndexedDB-only assets and IndexedDB-only items. Bundled items and their bundled assets are immutable (FR-007).

**Conflict & integrity**

- **FR-015**: The catalog MUST use a last-write-wins conflict model on whole-item writes (mirrors current VS Code behaviour).
- **FR-016**: Atomicity for compound operations (capture = two thumbnail blobs + item-record patch) MUST be guaranteed by a single IndexedDB transaction in the web-shell, and by the existing temp+rename sequence in VS Code. After this feature ships, no successful capture can leave the catalog in a state where item metadata references a missing asset blob.
- **FR-017**: On any write failure, the catalog MUST surface a structured error to the UI carrying enough information for the user to act (`StorageQuotaExceeded`, `IndexedDBUnavailable`, `BundledItemReadOnly`, etc.) — no silent failures (Article I.3).

**Host abstraction (shared interface)**

- **FR-018**: A single host-agnostic TypeScript `StacWriter` interface MUST be the production code path for both web-shell captures and VS Code's existing scene-thumbnail and metadata-update paths. Each host implements the interface against its native backend (Node fs in VS Code, IndexedDB in web-shell).
- **FR-019**: VS Code's `sceneThumbnailService.writeSceneThumbnail` and `stacService.updateItemMetadata` MUST be refactored to delegate to the new `StacWriter` interface. Behavioural parity verified by existing test suites.
- **FR-020**: Each host adaptor MUST be the only point at which storage-backend-specific code lives. The interface itself MUST NOT expose Node-fs or IndexedDB types at its surface.

**Capability check & UX**

- **FR-021**: The web-shell MUST run a capability check on first load that probes IndexedDB availability and write-readiness. The result drives the "Session-only" badge (FR-005/FR-006).
- **FR-022**: On first successful write, the web-shell MUST request `navigator.storage.persist()` to reduce the chance of silent eviction. If the request is denied, the UI MUST surface a one-shot banner explaining that persistence is best-effort.
- **FR-023**: The web-shell MUST broadcast item-change events across same-origin browser tabs (via `BroadcastChannel`) so a tab's view stays consistent with concurrent writes from a sibling tab.

**Constitutional change**

- **FR-024**: The project constitution MUST be amended (Article IV.4) to formalise the persistence-host abstraction: frontends may persist data only via the unified writer interface, and browser-native stores (IndexedDB, OPFS, File System Access API) qualify as a persistence backend only when accessed through that abstraction. The amendment MUST be merged before, or as part of, this feature's implementation PR.
- **FR-025**: ESLint rules MUST machine-enforce Article IV.4. Specifically: (a) `node:fs`/`fs` imports MUST be forbidden under `apps/web-shell/**`; (b) the globals `indexedDB`, `localStorage`, `sessionStorage`, and `caches` MUST be forbidden outside the host-adaptor files (`apps/web-shell/src/services/stacWriterIdb.ts` and `apps/web-shell/src/services/stacWriterCapability.ts`). The rule MUST live in `shared/eslint-rules/` and run as part of the existing `task lint` step. PRs that violate the rule MUST fail CI.

### Key Entities

- **STAC Item**: the catalog's fundamental unit of content. Has an identifier, a metadata document (JSON), and zero or more named assets (thumbnail, GeoJSON payload, etc.). In the web-shell, an item is either a *bundled item* (read-only static) or an *IndexedDB-only item* (created by the user). A bundled item may have an *IndexedDB overlay* of metadata and additional assets.
- **STAC Asset**: a binary or JSON sibling owned by an Item, addressed by Item ID + asset role (`thumbnail`, `geojson`, `scene-thumbnail-<id>`). Stored as a `Blob` in IndexedDB or as a file in the VS Code catalog directory.
- **Catalog View** (web-shell): the merged, read-side projection of bundled items + IndexedDB overlays + IndexedDB-only items, presented to the UI as a single homogeneous list.
- **STAC Writer**: the host-agnostic TypeScript interface defining the catalog's write operations. Each host implements it once; everything else in the system depends only on the interface.
- **Host Adaptor**: the per-host implementation of `StacWriter`. VS Code's adaptor wraps Node fs (largely existing code from `sceneThumbnailService.ts` and the write sections of `stacService.ts`). The web-shell's adaptor wraps IndexedDB.
- **Storyboard Scene**: a captured map state (thumbnail + viewport + time) belonging to a Storyboard. Created by the P1 path. Out of scope to redefine here — see #215.
- **Capability Report**: the result of the web-shell's startup probe — `{ available: boolean, reason?: 'unavailable' | 'quota' | 'denied', persistent: boolean }`. Drives the "Session-only" badge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature ships, a fresh web-shell session that captures a Storyboard scene and reloads recovers 100% of captured scenes (thumbnail + metadata both intact, no manual recovery), in browsers that report a healthy IndexedDB capability.
- **SC-002**: The web-shell's "Session-only" badge is no longer visible in any browser configuration where the capability check passes, in 100% of Storyboard, Properties Panel, and drawing-tool flows that previously displayed it.
- **SC-003**: The VS Code `sceneThumbnailService` capture path and the `updateItemMetadata` patch path execute through the shared `StacWriter` interface in 100% of operations after this feature ships, with no remaining duplicate write code paths in either host.
- **SC-004**: All previously-passing web-shell and VS Code unit/integration tests covering capture, metadata edit, and new-item creation pass against the unified writer interface with no behavioural regression visible to test fixtures.
- **SC-005**: Phase 1 ships in 5–8 developer-days of effort against the agreed scope (excludes catalog zip export, multi-tab coordination beyond best-effort, and any cross-device sync).
- **SC-006**: A capture-then-reload Playwright test passes in 100% of CI runs against the web-shell static build (no Vite middleware involved at test time — proves the static-deployment promise).
- **SC-007**: No successful capture can leave the catalog in a state where the item record references a missing asset blob, in 100% of IndexedDB transaction failure modes simulated in tests.
- **SC-008**: When IndexedDB is unavailable (simulated by stubbing `indexedDB` to `undefined` in tests, and verified manually against a private-mode browser session), the "Session-only" badge is visible 100% of the time and capture attempts fail with a structured `IndexedDBUnavailable` error — never silently lose data.

## Assumptions

The following defaults were applied during specification authoring. Each is a reasonable industry-standard choice that was not explicitly called out in the original work item; flag any that need to change before `/speckit.plan` re-runs:

- **Storage quotas**: IndexedDB's per-origin quota is browser-controlled. Phase 1 does not introduce explicit quota management beyond surfacing `QuotaExceededError` to the UI. Quota awareness UX is a Phase 2 problem.
- **Storage persistence**: requesting `navigator.storage.persist()` on first write is best-effort; some browsers grant it silently, others prompt the user, others deny. The "Session-only" badge does NOT appear on a denied persistence grant alone — it appears only when IndexedDB itself is unavailable. A separate one-shot banner warns about denied persistence.
- **Cross-tab coordination**: `BroadcastChannel`-based "item changed" notifications are sufficient for Phase 1. No CRDT, no operational transform, no leases.
- **Cross-host coordination** (web-shell ↔ VS Code on the same machine): explicitly out of scope. The two hosts' stores are independent.
- **Bundled-catalog drift**: silent overlay-wins (per Q2 decision A). No UI prompt when a user's IndexedDB overlay diverges from a refreshed bundled version.
- **Bundled-item immutability**: bundled items cannot be deleted (per Q1 decision A). Overlay edits are unbounded; create/delete of the underlying bundled item is not permitted.
- **Schema validation**: write operations validate against the existing LinkML/STAC schemas already enforced on read; no new validation rules introduced here.
- **Zip-export round-trip**: explicitly deferred (per Q3 decision A) to a separate spec. Captures live in IndexedDB only until that spec ships — acceptable for Phase 1.
- **Atomic-write strategy in VS Code**: implementation continues to use temp-file-then-rename; exact mechanism unchanged from #174 / #193.
- **Test strategy**: shared parametrised test suite runs the same operation matrix against the VS Code (Node fs) adaptor and the web-shell (IndexedDB) adaptor; both must pass.

## Dependencies

- **#174 host-adaptor pattern** — the host abstraction this feature formalises into a constitutional principle. Must be in place (it is, as of 2026-04 main).
- **#193 `updateItemMetadata`** — the metadata-patch operation (FR-012) reuses and extends this. Must be in place.
- **#215 Storyboarding schema** — defines the Storyboard Scene entity captured in P1. Must be in place. This feature closes its FR-WEB-029a "Session-only" badge.
- **#235 Storyboard capture UX** — currently owns `webSceneThumbnailAdapter`'s session-only Map and the badge. This feature replaces the Map with the IndexedDB-backed adaptor.
- **Constitution amendment (Article IV.4)** — must be drafted and merged in lockstep with this feature's implementation PR (FR-024).

## Out of Scope (Phase 2+ follow-ups)

The following items are explicitly **deferred** to separate specs, not addressed here:

- **Catalog zip export** ("take your captures with you" — round-trip back to VS Code or share with a colleague). This is the largest deferred item and the natural Phase 2 follow-up.
- **OPFS / File System Access API** — newer browser-native filesystem APIs that could complement or replace IndexedDB for asset bytes. Worth evaluating if IndexedDB blob-storage performance becomes a bottleneck. Not in Phase 1.
- **Cross-device sync** — IndexedDB is per-origin per-device. Multi-device sync (e.g. via a server) is a separate problem.
- **Conflict resolution beyond last-write-wins** — optimistic locking, three-way merge, write leases. None of these in Phase 1.
- **Multi-user write coordination** — no auth, no per-user write tracking. Phase 1 assumes single-user, multi-tab.
- **Quota-management UX** — proactive warnings when storage is filling up, "delete oldest unused capture" prompts, etc. Phase 1 only surfaces the raw `QuotaExceededError`.
- **VS Code ↔ web-shell sync** — divergence between the two hosts' catalogs is silent in Phase 1.
- **Vite middleware POST/PUT/PATCH/DELETE** — the original Phase 1 plan, dropped in this revision. The web-shell remains a pure static site.
