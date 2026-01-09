# Feature Specification: debrief-config

**Feature Branch**: `003-debrief-config`
**Created**: 2026-01-09
**Status**: Draft
**Input**: Tracer Bullet Delivery Plan - Stage 3
**Dependencies**: None (independent of Stages 0-2)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register STAC Store (Priority: P1)

An analyst registers a local STAC catalog location so it appears in the loader and VS Code
extension. The registration persists across application restarts.

**Why this priority**: Without registered stores, the loader cannot show available catalogs and
users cannot select where to save data.

**Independent Test**: Call `register_store(path, name)` from Python, verify store appears in
config file and subsequent `list_stores()` call.

**Acceptance Scenarios**:

1. **Given** a valid catalog path, **When** `register_store()` is called with path and display
   name, **Then** store is persisted to config file.
2. **Given** a registered store, **When** `list_stores()` is called, **Then** store appears in
   returned list with path and name.
3. **Given** a path that is not a valid STAC catalog, **When** `register_store()` is called,
   **Then** raises InvalidCatalogError.

---

### User Story 2 - List Known Stores (Priority: P1)

The loader app reads the list of known STAC stores to populate a dropdown for catalog selection.
This works from both Python and TypeScript.

**Why this priority**: Core to the loader workflow — users must be able to select destination
catalog.

**Independent Test**: Register 3 stores from Python, read list from TypeScript, verify all 3
present with correct paths and names.

**Acceptance Scenarios**:

1. **Given** multiple registered stores, **When** `list_stores()` is called, **Then** all stores
   returned with path, name, and last-accessed timestamp.
2. **Given** no registered stores, **When** `list_stores()` is called, **Then** empty list returned.
3. **Given** stores registered from Python, **When** list is read from TypeScript, **Then** same
   stores appear.

---

### User Story 3 - Remove Store Registration (Priority: P2)

An analyst removes a store that is no longer needed or has moved. The catalog itself is not
deleted, only the registration.

**Why this priority**: Useful for maintenance but not critical for tracer bullet demo.

**Independent Test**: Register store, remove it, verify it no longer appears in `list_stores()`.

**Acceptance Scenarios**:

1. **Given** a registered store, **When** `remove_store(path)` is called, **Then** store no
   longer appears in list.
2. **Given** a non-existent store path, **When** `remove_store()` is called, **Then** raises
   StoreNotFoundError.
3. **Given** store removal, **When** underlying catalog directory checked, **Then** catalog
   files are unchanged (only registration removed).

---

### User Story 4 - Cross-Platform Config Location (Priority: P1)

Config file is stored in the appropriate XDG/platform location:
- Linux: `~/.config/debrief/config.json`
- macOS: `~/Library/Application Support/debrief/config.json`
- Windows: `%APPDATA%\debrief\config.json`

**Why this priority**: Constitution Article I requires offline operation, which means local config.
Platform-correct paths are expected by users.

**Independent Test**: Run on each platform, verify config file created in correct location.

**Acceptance Scenarios**:

1. **Given** Linux environment, **When** config is first accessed, **Then** created at
   `~/.config/debrief/config.json`.
2. **Given** macOS environment, **When** config is first accessed, **Then** created at
   `~/Library/Application Support/debrief/config.json`.
3. **Given** Windows environment, **When** config is first accessed, **Then** created at
   `%APPDATA%\debrief\config.json`.
4. **Given** `XDG_CONFIG_HOME` set, **When** on Linux, **Then** uses `$XDG_CONFIG_HOME/debrief/`.

---

### User Story 5 - TypeScript Config Access (Priority: P1)

The Electron loader reads config using a TypeScript library that mirrors the Python API. Both
languages read/write the same config file format.

**Why this priority**: Loader is TypeScript; it must read stores registered from Python services.

**Independent Test**: Write config from Python, read from TypeScript library, verify identical data.

**Acceptance Scenarios**:

1. **Given** TypeScript config library, **When** `listStores()` is called, **Then** returns same
   data as Python `list_stores()`.
2. **Given** TypeScript library, **When** `registerStore()` is called, **Then** store is readable
   from Python.
3. **Given** concurrent access from Python and TypeScript, **When** both read config, **Then**
   no corruption or data loss.

---

### User Story 6 - User Preferences (Priority: P3)

The config stores user preferences such as default store, UI settings, and locale preferences.
These are separate from store registrations.

**Why this priority**: Nice to have but not required for tracer bullet workflow.

**Independent Test**: Set preference, restart app, verify preference persisted.

**Acceptance Scenarios**:

1. **Given** a preference key and value, **When** `set_preference()` is called, **Then** value
   is persisted to config.
2. **Given** a stored preference, **When** `get_preference()` is called, **Then** correct value
   returned.
3. **Given** unknown preference key, **When** `get_preference()` is called, **Then** returns
   None or specified default.

---

### Edge Cases

- What happens when config file is corrupted (invalid JSON)?
- How does system handle config file with unknown fields (forward compatibility)?
- What happens when two processes write to config simultaneously?
- How are paths with special characters handled (spaces, unicode)?
- What happens when config directory is not writable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store config in platform-appropriate XDG location.
- **FR-002**: System MUST register STAC store paths with display names.
- **FR-003**: System MUST list all registered stores with path, name, and last-accessed time.
- **FR-004**: System MUST remove store registrations without affecting underlying catalogs.
- **FR-005**: System MUST provide identical API in Python and TypeScript.
- **FR-006**: System MUST validate that registered paths point to valid STAC catalogs.
- **FR-007**: System MUST handle config file creation on first access.
- **FR-008**: System MUST support user preferences as key-value pairs.
- **FR-009**: Config format MUST be JSON for cross-language compatibility.
- **FR-010**: System MUST handle missing or corrupted config gracefully (recreate with defaults).

### Key Entities

- **Config**: Root configuration object containing stores list and preferences map.
- **StoreRegistration**: Entry for a known STAC store — path, display name, last accessed
  timestamp, optional notes.
- **Preferences**: Key-value map for user settings — default store, locale, UI preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Config file created in correct platform-specific location on Linux, macOS, Windows.
- **SC-002**: Can register store from Python, read from TypeScript (and vice versa).
- **SC-003**: Store registration validates catalog existence before persisting.
- **SC-004**: Config survives corruption — invalid JSON triggers reset to defaults with warning.
- **SC-005**: Unit tests cover all platform paths with mocked filesystem.
- **SC-006**: Integration test: register store (Python) → list stores (TypeScript) → remove
   store (TypeScript) → verify removed (Python).
- **SC-007**: TypeScript and Python libraries maintain API parity (same function names, same
   parameters, same return types).
