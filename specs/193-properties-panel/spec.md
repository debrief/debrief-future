# Feature Specification: Properties Panel for STAC Plot & Catalog Metadata

**Feature Branch**: `193-properties-panel`
**Created**: 2026-04-17
**Status**: Draft (post `/speckit.review` revision)
**Input**: User description: "Add Properties Panel for editing STAC plot & catalog metadata (backlog #191, GitHub #447). Context-sensitive panel: 4th ActivityPanel section edits the open plot; StacBrowser side panel edits item.json when no plot is open; schema-driven form from LinkML-generated JSON Schema (complementary to #135)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit open plot metadata from the ActivityPanel (Priority: P1)

An analyst has a plot open and realises the current `debrief:tags` or description no longer reflects what the plot actually contains (e.g. a filter surfaced the wrong items, or the plot was reshaped during analysis). They open a Properties section in the existing ActivityPanel and adjust tags, description, platforms, or feature tags inline. Each edit commits on blur or Enter and persists immediately to `item.json`, appending a provenance entry. No separate Save step is required.

**Why this priority**: This is the common case — analysts spend most of their time with a plot open. Fixing bad metadata on the active plot is the most visible failure mode today (filters return the wrong plots, colleagues can't find work). Per-commit persistence matches the existing codebase pattern — data changes go through services, session-state stays UI-only. Without this, the feature delivers no perceived value.

**Independent Test**: Open a plot whose `debrief:tags` are wrong; open the ActivityPanel Properties section; change a tag value and press Enter (or blur); verify `item.json` on disk now holds the new value; verify a provenance entry was appended to `item.properties["debrief:provenance_log"]`; reload the plot and confirm the new value survives.

**Acceptance Scenarios**:

1. **Given** a plot is open and its Properties section shows current metadata, **When** the analyst edits a field and commits (blur/Enter), **Then** the value persists to `item.json` within ~100 ms and the panel shows the saved value with no dirty indicator on that field.
2. **Given** the analyst is typing in a text field, **When** they have not yet blurred or pressed Enter, **Then** no disk write occurs and no provenance entry is recorded — pending keystrokes remain local to the form until the commit event fires.
3. **Given** any committed edit, **Then** exactly one provenance entry is appended to `item.properties["debrief:provenance_log"]` naming the tool (`debrief.propertiesPanel`), the versioned method, the timestamp, and the list of fields touched by that single commit.
4. **Given** an edit fails schema validation on commit, **When** the analyst commits an invalid value, **Then** the value is not written to disk, the panel surfaces an inline error next to the offending field, and no provenance entry is recorded.
5. **Given** a plot is open with no selection active, **When** the analyst views the ActivityPanel, **Then** the Properties section shows plot-level metadata (not feature-level — feature-level is deferred to #192).

---

### User Story 2 - Edit catalog item metadata from the StacBrowser (no plot open) (Priority: P2)

An analyst is browsing the STAC catalog, notices an item's nationality or platform tags are wrong, and wants to fix it without opening the plot. They select the item in the `StacBrowser` tree; a stacked Properties area appears under the existing `ThumbnailPreview`. Edits commit per-field (blur or Enter) and persist directly to `item.json` through the same service path the ActivityPanel uses.

**Why this priority**: This matters for bulk triage and after-the-fact cleanup (e.g. noticing a misspelled platform across many items while scrolling the catalog). It's second priority because the active-plot case (Story 1) covers the more frequent daily editing need, and this case can be worked around by opening the plot.

**Independent Test**: With no plot open, click an item in `StacBrowser`; confirm a Properties area appears under the thumbnail with the item's metadata; edit a field and commit; confirm the change persists to `item.json` immediately; reload the catalog browser and confirm the change survives.

**Acceptance Scenarios**:

1. **Given** no plot is open and an item is selected in `StacBrowser`, **When** the Properties area renders, **Then** it shows the same schema-driven field set as the ActivityPanel Properties section.
2. **Given** a catalog item is selected and the Properties area shows its metadata, **When** the analyst edits a field and commits, **Then** `item.json` on disk is updated directly and a provenance entry is appended — by the same service method the ActivityPanel uses.
3. **Given** a plot is open in the editor **and** the StacBrowser is open on a different item, **When** the analyst looks at the StacBrowser, **Then** the Properties area for that item is visible and editable independently of the ActivityPanel surface — both paths use the same service, so the routing is never ambiguous.
4. **Given** the StacBrowser Properties area has a pending concurrent edit (another process modified `item.json` since the panel loaded it), **When** the analyst commits, **Then** the commit is rejected with a clearly-explained stale-edit error and the panel reloads from disk — the analyst's edit is not silently lost.

---

### User Story 3 - Auto-derived fields are visible but overrideable (Priority: P3)

Some metadata fields are auto-derived today — `start_datetime`, `end_datetime`, and `datetime` are computed from feature timestamps by `stacService.updateTemporalMetadata`. When the analyst opens the Properties Panel, they see these fields clearly marked as auto-derived. If the analyst commits an override value, auto-derivation routines must respect that override and not stomp the user value on a subsequent features-changed event.

**Why this priority**: This is a correctness and trust requirement, not a primary editing flow. Without it, the feature would either silently overwrite user edits (unacceptable — Article I.3 "no silent failures") or hide derivation behaviour from the analyst (confusing). It's P3 because it's cheaper to ship after Stories 1 and 2 once the core editing surface is in place.

**Independent Test**: Edit `start_datetime` on a plot with timestamped features; verify the value persists and the field is marked as an override; trigger an action that would normally re-run `updateTemporalMetadata` (e.g. reload features); confirm the override survives on disk with no change.

**Acceptance Scenarios**:

1. **Given** a field is auto-derived today (`start_datetime`, `end_datetime`, `datetime`), **When** the Properties Panel displays it, **Then** the UI signals "auto-derived" state distinctly from user-edited state.
2. **Given** the analyst commits an override on an auto-derived field, **When** any subsequent auto-derivation pass runs (today: `updateTemporalMetadata`), **Then** the field is skipped and the analyst's value survives; the panel continues to show the field with an "override" chip.
3. **Given** a field has been overridden, **When** the analyst views it later, **Then** the Properties Panel shows it is an override (so the analyst understands why the derivation isn't running for it).

---

### Edge Cases

- **New schema field added in LinkML**: the Properties Panel surfaces a new input for that field on the next build/reload without any panel-component code change. Fields with no matching schema entry are not shown.
- **Required field cleared or invalid value committed**: the commit is rejected, the panel surfaces an inline error next to the offending field, `item.json` is unchanged, and no provenance entry is recorded.
- **Offline edit with catalog source read-only**: if the underlying `item.json` is on a read-only filesystem or inside a read-only catalog, the panel disables editing and explains why, rather than silently failing on commit.
- **Concurrent external edit of `item.json`** (same analyst with another editor, another process, another surface of the same app): commit detects the stale read (mtime check) and rejects with a stale-edit error — the loser is informed, their edit is not silently dropped (FR-014).
- **Empty plot or empty catalog item**: the Properties Panel still renders all schema fields with empty values and allows the analyst to populate them.
- **Field value too long / too many tags**: the Properties Panel respects the schema's bounds (if any) and surfaces the limit inline at commit time.
- **Provenance log archive rotation** (long-lived plot accumulates hundreds of edits): entries beyond the per-item cap rotate into a sibling `provenance_log_archive.jsonl` file; the active log stays bounded so reads remain O(cap) rather than O(N).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a Properties surface as a 4th section within the existing ActivityPanel (alongside TimeController, Tools, Layers) that edits the currently open plot's STAC metadata.
- **FR-002**: The system MUST provide a Properties area stacked under `ThumbnailPreview` in the `StacBrowser` that edits the metadata of the catalog item currently selected in the browser.
- **FR-003**: The Properties surface MUST render its form from the LinkML-generated JSON Schema for the STAC item type — adding a new field in LinkML MUST surface a new input on the next build without editing the panel component.
- **FR-004**: Per-field commits (on blur or Enter) MUST persist directly to `item.json` via a single service method (`stacService.updateItemMetadata`). There MUST NOT be any session-state staging layer for Properties edits on either surface — this matches the existing codebase pattern (session-state is UI-only; data changes go through services).
- **FR-005**: The write path MUST be atomic from the analyst's perspective: write-to-temp + rename on success, temp file discarded on failure. Partial writes to `item.json` MUST NOT be observable.
- **FR-006**: The system MUST record exactly one provenance entry per committed edit in `item.properties["debrief:provenance_log"]`, naming the tool (`debrief.propertiesPanel`), the versioned method (`properties-panel@<version>`), the ISO timestamp, and the list of field names touched — consistent with Article III of the project constitution.
- **FR-007**: The `StacBrowser` surface MUST introduce a surface-local `BrowserSelection` React context (no new global session-state selection store) holding the currently selected item path so the Properties area and other sibling panels can subscribe to it.
- **FR-008**: The Properties surface MUST display fields that are auto-derived by `stacService.updateTemporalMetadata` (and any future #135 auto-derivation) and MUST mark them visually as "auto-derived" until the analyst overrides them, at which point they MUST be marked as "override".
- **FR-009**: The system MUST respect schema validation constraints (required, enum, format, bounds) before committing — invalid state MUST surface inline against the offending field and MUST NOT be persisted.
- **FR-010**: The entire Properties Panel workflow MUST work offline — no network round-trips are required for rendering the form, validating edits, or persisting changes. A test harness MUST assert this by patching `fetch` / `XMLHttpRequest` in unit tests.
- **FR-011**: Form widget style and interaction MUST follow the `ParameterEditor` pattern (`shared/components/src/LogPanel/ParameterEditor.tsx`) — single commit event on blur or Enter (scalar inputs), explicit add/remove commits for array widgets, no new form library for v1.
- **FR-012**: `stacService.updateTemporalMetadata` MUST be extended to read `item.properties["debrief:overrides"]` and skip any listed field, replacing the current unconditional-stomp behaviour. The method MUST also be idempotent (no-op when the derived value equals the current value) to avoid spurious dirty-marks.
- **FR-013**: The plot-level Properties surface MUST show plot-level metadata only; feature-level and sub-feature-level editing are explicitly out of scope for this feature (deferred to #192).
- **FR-014**: Concurrent modifications of `item.json` MUST be detected: `updateItemMetadata` MUST re-check the file mtime (or equivalent fingerprint) immediately before write; a changed mtime MUST cause the commit to throw a stale-edit error that the UI surfaces to the analyst — no last-write-wins.
- **FR-015**: The `debrief:provenance_log` array on `item.properties` MUST be bounded in size per item. When the cap is reached, the oldest entries MUST rotate into a sibling `provenance_log_archive.jsonl` file in the same item directory, preserving the full audit trail (Article III.3).

### Key Entities *(include if feature involves data)*

- **STAC Item metadata**: the `item.json` document representing a single catalog entry, including standard STAC fields (id, bbox, datetime, etc.) and the `debrief:*` extension fields. The Properties Panel reads from and writes to this document.
- **LinkML-generated JSON Schema**: the source of truth for which fields are editable, their types, and their validation constraints. The panel introspects this schema to render the form.
- **`debrief:overrides`**: new array on `item.properties` listing field names the analyst has overridden. Auto-derivation routines MUST skip any field present in this array.
- **`debrief:provenance_log`**: new array on `item.properties` holding per-edit provenance entries for Properties Panel saves. Bounded in size; overflow rotates to a sibling JSONL archive.
- **`BrowserSelection` context**: a new React context inside `StacBrowser` holding the currently selected item path. Scoped to the StacBrowser surface — not added to the global Zustand store (which remains UI-only).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Correct or refine the metadata of a STAC plot/item so that the catalog, filters, and downstream tools see an accurate description of what's there.
- **Key Decision(s)**:
  1. Which field(s) are wrong and what their correct values should be.
  2. Whether to override an auto-derived value (once, per field) or leave derivation in control for that field.
- **Decision Inputs**: Current value of each field; whether a field is auto-derived or a user override; the schema's allowed values/constraints (enum dropdowns, min/max bounds, required markers); inline validation errors on commit.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Plot open, ActivityPanel visible | Click Properties section header | Properties form expands showing plot metadata |
| 2 | Properties form shown with current values | Edit a field, then blur or press Enter | Value persists immediately to `item.json`; provenance entry appended; "saved" microstate |
| 3 | Invalid value committed | Commit an out-of-bounds / bad-pattern value | Inline error appears; disk unchanged; no provenance entry |
| 4 | No plot open, StacBrowser visible | Select an item in the browser tree | Properties area appears under the thumbnail with the item's metadata |
| 5 | Properties area shown (no plot) | Edit a field and commit | `item.json` written directly; provenance appended; panel reflects saved state |
| 6 | Auto-derived field visible | Observe the "auto-derived" chip next to `start_datetime` | Chip explains that the field is computed from features |
| 7 | Auto-derived field overridden | Commit a manual value on an auto-derived field | Chip changes to "override"; subsequent auto-derivation skips the field |

### UI States

- **Empty State**: when a field has no value, the form shows the field's label, its editor (text input, dropdown, chip list, etc.), and any placeholder or "not set" cue from the schema.
- **Loading State**: while the Properties Panel loads schema + current values (plot open, catalog item change-over), a skeleton/loading state is shown in place of the form — not a blocking spinner on the whole ActivityPanel.
- **Validation-error State**: inline error renders next to the offending field; commit was rejected; `item.json` unchanged.
- **Write-error State** (read-only disk, stale-edit, schema violation at merge time): banner explains the failure; the form retains the user's rejected value so the analyst can retry or discard.
- **Success State**: on successful commit, the field briefly signals "saved" and the form returns to a clean state (no dirty indicator at the section level).
- **Auto-derived State**: fields auto-derived by `updateTemporalMetadata` (today) or future #135 routines are visually distinguished (subdued style + "auto-derived" chip) so the analyst knows editing them creates an override.
- **Override State**: a field the analyst has overridden shows an "override" chip so it's obvious why the auto-derivation isn't running for it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can correct a wrong `debrief:tags` value on an open plot and persist the fix in under 15 seconds from noticing the problem (open Properties section, edit, commit — no explicit save).
- **SC-002**: At least 95% of filter-mismatch reports attributable to bad metadata are resolvable from inside the app (no shell-out to a text editor against `item.json`) once this feature ships.
- **SC-003**: Adding a new extension field in LinkML surfaces an editable input in the Properties Panel on the next build with zero changes to the panel component — verified by an automated CI test that regenerates from a fixture LinkML schema and asserts the new input renders.
- **SC-004**: 100% of committed Properties edits produce exactly one provenance entry in `debrief:provenance_log` naming the tool, versioned method, timestamp, and edited fields — verified by automated test coverage of the commit path.
- **SC-005**: The Properties Panel's full workflow completes without any network request — verified by a vitest harness that patches `fetch` / `XMLHttpRequest` to throw, and asserts all scenarios still pass.
- **SC-006**: No saved Properties edit is silently overwritten by auto-derivation — verified by editing `start_datetime`, triggering `updateTemporalMetadata`, and asserting the override value survives on disk.
- **SC-007**: No concurrent external edit of `item.json` causes silent data loss — verified by a unit test that modifies the file between read and write and asserts `updateItemMetadata` throws a stale-edit error.

## Assumptions

- `stacService` on the extension side is the single gatekeeper for all `item.json` writes (Article IV.2) — this feature extends it with `updateItemMetadata` and edits `updateTemporalMetadata`, but introduces no parallel write path.
- The session-state (Zustand) store is for UI state only; data changes flow through services. This feature honours that boundary — no `PropertiesSlice` is introduced.
- The LinkML-generated JSON Schema is available as a compile-time import from `@debrief/schemas` for both the ActivityPanel and `StacBrowser` webview bundles.
- The `ParameterEditor` pattern from `shared/components/src/LogPanel/ParameterEditor.tsx` is sufficient for scalar widgets; the feature adds sibling widgets (array, datetime, bbox, platform-array) that follow the same `onCommit(name, value)` lifecycle.
- Backlog #135 (additional auto-derivation) is not yet live. This feature introduces `debrief:overrides` now — scoped to the auto-derivation that exists today (`updateTemporalMetadata`) — and #135 will plug into the same override list when it lands.
- Feature-level metadata editing (per-feature `debrief:feature_tags`), sub-feature/track-point editing, bulk edits across multiple items, and "revert single field to its auto-derived value" are all explicitly deferred to follow-up work (#192 and later).
- The `StacBrowser` selection is hoisted into a surface-local React context by this feature — no global selection store is added.
- The per-item provenance log cap and archive-file shape are design inputs to the implementation, not runtime-configurable settings in v1.
