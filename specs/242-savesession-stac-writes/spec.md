# Feature Specification: saveSession Thumbnail Writes — STAC Service Migration

**Feature Branch**: `242-savesession-stac-writes`  
**Created**: 2026-05-05  
**Status**: Draft  
**Input**: Backlog item 242 — migrate `saveSession.ts` thumbnail writes to a service-side path

## Background

Spec 241 migrated `saveSession.ts` to delegate thumbnail asset writes through a typed TypeScript surface rather than calling file-system primitives directly. That change closed the immediate architectural violation (frontends must never persist — Constitution Article IV.1), but the typed surface still executes inside the VS Code extension process. This feature completes the migration: thumbnail asset writes must be fully mediated by the STAC service so that every persistence operation, regardless of host, crosses the same service boundary.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Service Handles Thumbnail Persistence (Priority: P1)

A developer calls "Save Session" from inside VS Code. Thumbnails for the current scene are captured and delivered to the system for storage. The system stores them through the STAC service boundary — the extension process has no direct knowledge of where or how the bytes land on disk.

**Why this priority**: This is the core architectural obligation. Everything else is contingent on this boundary being in place.

**Independent Test**: Can be tested by verifying that after "Save Session" completes, no file-write calls originate from inside the extension process — only a service call is made — and the thumbnail appears in the STAC catalog at the expected path.

**Acceptance Scenarios**:

1. **Given** a VS Code session with a loaded scene, **When** the user saves the session, **Then** the STAC service receives a write request carrying the thumbnail data and the extension process performs no direct file-system writes for that asset.
2. **Given** a successful service write, **When** the session save completes, **Then** the thumbnail asset is present in the STAC catalog with correct metadata (asset key, media type, roles) identical to what the previous shim produced.
3. **Given** a session with no captured thumbnail, **When** the user saves the session, **Then** the service is not called for that asset and the catalog entry is written without a thumbnail reference.

---

### User Story 2 — Write Failures Surface to the Caller (Priority: P2)

A developer calls "Save Session" but the STAC service is unavailable or rejects the write. The extension reports a clear failure rather than silently producing a partial catalog entry.

**Why this priority**: Silent partial writes (catalog without thumbnail, or thumbnail without catalog update) corrupt the catalog state and are harder to debug than an explicit failure.

**Independent Test**: Can be tested by simulating a service-side write failure and verifying the extension surfaces an error and does not commit a partial catalog entry.

**Acceptance Scenarios**:

1. **Given** the STAC service returns an error for the thumbnail write, **When** the session save is attempted, **Then** the session save operation fails with a user-visible error message and no partial catalog entry is committed.
2. **Given** the STAC service is temporarily unavailable, **When** the session save is retried after the service recovers, **Then** the save succeeds and the catalog entry is complete.

---

### User Story 3 — Catalog Parity with Previous Shim (Priority: P3)

A catalog produced by this new service path is indistinguishable, in structure and content, from one produced by the previous typed-shim path. No downstream reader (STAC browser, Playwright test, spec-navigator) requires changes.

**Why this priority**: Regression safety — the migration must not silently alter catalog shape.

**Independent Test**: Can be tested by running the existing golden-fixture comparison suite against a catalog produced by both paths and confirming the outputs are byte-equivalent (modulo timestamps).

**Acceptance Scenarios**:

1. **Given** a catalog produced by the service path, **When** compared against the golden fixture produced by the shim path, **Then** all STAC Item fields, asset keys, roles, and media-type annotations match.
2. **Given** the Playwright end-to-end suite that reads thumbnail assets from the catalog, **When** run against a session saved via the service path, **Then** all existing assertions pass without modification.

---

### Edge Cases

- What happens when the thumbnail payload exceeds the service's maximum accepted size?
- How does the system handle a write that partially succeeds (catalog item written, thumbnail asset not confirmed)?
- What happens when two concurrent "Save Session" calls race for the same catalog entry?
- How does the system behave when the service returns a success but the written asset fails a post-write integrity check?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST route all thumbnail asset writes for `saveSession` through the STAC service boundary; no direct file-system writes for thumbnail assets may originate inside the extension process.
- **FR-002**: The system MUST preserve catalog structure parity — STAC Item fields, asset keys, roles, and media-type annotations produced by the service path MUST be identical to those produced by the previous shim path.
- **FR-003**: The system MUST surface service write failures as explicit errors to the caller; silent partial catalog writes are not permitted.
- **FR-004**: The system MUST handle sessions with no captured thumbnail gracefully — the service call is skipped and the catalog entry is written without a thumbnail reference.
- **FR-005**: The system MUST NOT require changes to any downstream STAC consumer (browser, Playwright tests, spec-navigator) as a result of this migration.
- **FR-006**: The service MUST accept thumbnail asset payloads and store them at the path dictated by the catalog's asset-key convention, returning a confirmation to the caller.
- **FR-007**: The system MUST pass all existing golden-fixture and end-to-end tests without modification to those tests.

### Key Entities

- **Thumbnail Asset**: A captured PNG or equivalent image representing a scene at a point in time; identified by an asset key within a STAC Item.
- **STAC Item**: The catalog record for a session; contains metadata and a map of asset keys to asset objects (including the thumbnail).
- **Service Boundary**: The interface through which the extension process requests persistence operations; the extension may not bypass this interface to write directly.
- **Write Request**: A structured payload sent from the extension to the STAC service, carrying the asset key, media type, and binary content of the thumbnail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the migration, zero direct file-system write calls for thumbnail assets originate inside the VS Code extension process, as verified by a static analysis or instrumented test run.
- **SC-002**: All existing STAC golden-fixture comparison tests pass against catalogs produced by the new service path, with no fixture updates required.
- **SC-003**: All existing Playwright end-to-end tests that read thumbnail assets pass without modification to the test code.
- **SC-004**: A session save with the new path completes within the same elapsed time as the previous shim path (no measurable regression in save duration under normal conditions).

## Assumptions

- The STAC service MCP surface is being extended (or is already capable of being extended) to accept binary asset write requests; this feature is planned alongside the next significant change to `services/stac/` MCP surface area (per backlog item 242).
- The existing `@debrief/stac-writer` shim or equivalent typed surface provides the call-site the service will expose; the specific wire protocol (MCP tool call, HTTP, IPC) is an implementation detail.
- Thumbnail capture itself remains inside the extension process; only the persistence step moves to the service.
- The golden-fixture suite from spec 241 covers the catalog shape sufficiently to detect regressions without additional fixtures.

## Dependencies

- **Spec 241** — established the typed TS surface that this feature supersedes; the new service path replaces that surface.
- **services/stac MCP iteration** — the service must expose a write endpoint before this feature can be implemented; this work is scoped to land alongside that iteration.
