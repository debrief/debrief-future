# Feature Specification: Sensor-Aware Track Rendering in the Layers Panel

**Feature Branch**: `179-sensor-aware-layers-rendering`
**Created**: 2026-04-08
**Status**: Draft
**Input**: User description: "[E07] Sensor-aware track rendering in Layers panel — extend FeatureList to show `Positions`/`Sensors`/`Track Segments` grouping rows under tracks with embedded sensors; each named sensor expands to its contacts (requires #116)"

## Context

This feature is part of **Epic E07 — Sensor Data Pipeline**. E07 #116 (sensor schema overhaul) has already shipped the `SensorData` and `SensorContact` types and added `sensors?: SensorData[]` to `TrackProperties`. Once the REP sensor import (#117) is complete, analysts will have tracks on disk that carry sensor measurements — but today the Layers panel (`FeatureList`) gives them no way to verify from the UI that a track carries sensor data at all, which named sensors exist, or how many contacts each holds.

This feature closes that verification gap by extending the `FeatureList` row-flattening logic (`shared/components/src/FeatureList/flattenFeatures.ts`) to recognise `props.sensors` and render a sensor sub-tree under each track, while also introducing an equivalent `Positions` / `Track Segments` grouping row so all four cases expand symmetrically.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyst verifies a freshly imported track carries sensor data (Priority: P1)

An analyst has just imported a legacy REP file containing `SENSOR` records. They open the Layers panel, expand the host track, and need to confirm at a glance that the sensor data loaded correctly — including which named sensors are present and roughly how many contacts each one contains.

**Why this priority**: This is the primary driver for the feature. Without it, the analyst has no UI-level proof that sensor import succeeded; they would have to open the underlying JSON file to inspect `track.properties.sensors`. This blocks the "verify loaded data" step that the E07 pipeline depends on.

**Independent Test**: Load a track fixture with two named sensors (e.g. `TOWED_ARRAY` with 42 contacts and `HULL_ARRAY` with 17 contacts) into the `FeatureList` Storybook story. Expand the track. Confirm two group rows (`Positions` and `Sensors`) appear. Expand `Sensors`. Confirm two sensor rows appear, each labelled with the sensor name and a `"N contacts"` sublabel.

**Acceptance Scenarios**:

1. **Given** a track with a non-empty `sensors` array, **When** the analyst expands the track in the Layers panel, **Then** two grouping rows appear as direct children: `Positions` and `Sensors`, both collapsed by default.
2. **Given** the `Sensors` group row is visible, **When** the analyst expands it, **Then** one row appears per named sensor, with the sensor name as label and `"N contacts"` as sublabel.
3. **Given** an expanded named sensor row, **When** the analyst expands it, **Then** one row appears per contact, with the formatted time as label and bearing in whole degrees as sublabel.
4. **Given** a track whose `sensors` array is missing, empty, or absent, **When** the analyst expands the track, **Then** the panel renders exactly as it does today (no `Sensors` group row appears).

---

### User Story 2 - Analyst selects a named sensor and its contacts together (Priority: P2)

The analyst wants to select all contacts belonging to a single sensor (e.g. every `TOWED_ARRAY` bearing) so downstream views (map, charts) can highlight just that subset. Clicking the sensor row selects the sensor as a unit; clicking an individual contact selects that contact alone; clicking a contact while its parent sensor row is collapsed should still mark the parent as "has child selected".

**Why this priority**: Selection fan-out is already how position rows work (`hasChildSelected` prefix matching). Extending it to sensors and contacts gives analysts consistent behaviour and feeds directly into the map rendering work in #118 (a sensor selected in the Layers panel should light up its bearing lines on the map).

**Independent Test**: In a Storybook story with a sensor that has 3 contacts, click the sensor row and assert `selectedIds` contains exactly the sensor row's path. Click one contact row and assert `selectedIds` contains only that contact's path. Collapse the sensor row and assert the sensor row still shows its "has child selected" highlight.

**Acceptance Scenarios**:

1. **Given** a sensor row with contacts, **When** the analyst clicks the sensor row, **Then** the sensor row's path becomes the only entry in `selectedIds`.
2. **Given** a contact row is visible, **When** the analyst clicks it, **Then** that contact's path becomes the only entry in `selectedIds`, and the parent sensor row (if collapsed) visually marks as "has child selected".
3. **Given** a sensor row is selected, **When** the analyst collapses and re-expands it, **Then** the selection state is preserved.

---

### User Story 3 - Analyst toggles visibility of individual sensors (Priority: P2)

The analyst wants to hide a single sensor (e.g. to declutter the map rendering) without affecting the other sensors or the track itself. The existing `hiddenIds` mechanism on `FeatureList` must extend to sensor rows so the per-row eye-slash icon works on them for free.

**Why this priority**: Per-sensor visibility is a prerequisite for #118 (map rendering) — the map must render only sensors that are visible in the Layers panel. Contact-level visibility is also useful, but the primary unit of control is the sensor.

**Independent Test**: In a Storybook story, add a sensor row's path to the `hiddenIds` prop. Verify the sensor row renders with the hidden (eye-slash) visual state. The track row and other sensors remain visible.

**Acceptance Scenarios**:

1. **Given** a sensor row, **When** its path is present in `hiddenIds`, **Then** the sensor row renders with the existing hidden-state visual (eye-slash icon, dimmed label) — no new component code required.
2. **Given** a contact row, **When** its path is present in `hiddenIds`, **Then** the contact row renders with the hidden state. (Contact-level hiding is granted "for free" by the path-based `hiddenIds` mechanism.)

---

### User Story 4 - Compound-track analyst sees symmetric grouping with segments + sensors (Priority: P3)

An analyst working with a compound track (multiple segments) that also carries sensor data expects the Layers panel to show `Track Segments` and `Sensors` as sibling group rows — so the visual hierarchy is consistent with the simpler cases.

**Why this priority**: Compound tracks with sensors are less common than simple tracks, but the four cases (A/B/C/D) must all render coherently so there is no "missing symmetry" in the panel. Case B (no sensors, multiple segments) also needs the new `Track Segments` wrapper so simple tracks and compound tracks expand in the same shape.

**Independent Test**: Feed the Storybook story four fixtures corresponding to cases A/B/C/D (see Edge Cases below). Expand each track. Verify each renders the grouping described in the Proposed Behaviour table below.

**Acceptance Scenarios**:

1. **Given** a track with `sensors.length > 0` and `segments.length > 1`, **When** the analyst expands the track, **Then** two sibling group rows appear: `Track Segments` and `Sensors` — both collapsed by default.
2. **Given** a track with no sensors and `segments.length > 1`, **When** the analyst expands the track, **Then** a single `Track Segments` group row appears (the current segment-list-as-direct-children behaviour is replaced with the wrapper).
3. **Given** a track with no sensors and no segments (the dominant legacy case), **When** the analyst expands the track, **Then** position rows appear as direct children — visually unchanged from today.

---

### Edge Cases

The feature must select one of four layouts based on `(hasSensors, segmentCount)`:

| Case | hasSensors | segments | Behaviour |
|------|------------|----------|-----------|
| **A** | false | 0 or 1 | Positions as direct children (**unchanged from today**) |
| **B** | false | >1 | Single `Track Segments` group row wrapping the existing segment sub-tree |
| **C** | true | 0 or 1 | Two group rows: `Positions` and `Sensors` |
| **D** | true | >1 | Two group rows: `Track Segments` and `Sensors` |

Additional edge cases:

- **Empty sensors array (`sensors: []`)** — behaves as if `sensors` were absent; no `Sensors` group row is shown. Case A/B applies.
- **Sensor with zero contacts** — the sensor row still renders with `"0 contacts"` as sublabel; expanding it shows a "No contacts" placeholder row (consistent with the existing "No child items" pattern for empty features).
- **Ambiguous bearings** — when a contact has `ambiguous_bearing` set, it renders as a **single row** with a slash-separated sublabel (e.g. `"045° / 225°"`), **not** two sibling rows.
- **Very large contact counts (≥10,000)** — the panel must continue to meet its virtualisation contract; scroll performance must not degrade when all sensor rows are expanded.
- **Sensor name collisions** — if two `SensorData` entries share the same `name`, the path-based IDs will collide. The generator (#117) is responsible for uniqueness; the panel will render whichever appears first and the ID collision will be caught by the existing selection machinery. This is tracked as a known limitation, not a hard error.
- **Case-A regression guard** — Case A (simple track, no sensors, single or no segments) is the dominant existing case. Its rendering **must** be visually and behaviourally identical to today. This is verified by a visual regression baseline captured from the current Storybook story before the change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `flattenFeatures` MUST introduce three new `DisplayItem.type` values: `'group'` (for `Positions` / `Sensors` / `Track Segments` wrappers), `'sensor'` (for named-sensor rows), and `'contact'` (for individual sensor contacts).
- **FR-002**: When a track is expanded, the panel MUST select one of the four layouts (A/B/C/D) defined in the Edge Cases table above, based on the predicates `hasSensors = (props.sensors?.length ?? 0) > 0` and `segmentCount = props.segments?.length ?? 0`.
- **FR-003**: Group rows (`Positions`, `Sensors`, `Track Segments`) MUST default to **collapsed** when their parent track is first expanded. Expansion state is stored in the existing `expandedIds` set using the same add/remove rules as other expandable rows.
- **FR-004**: Group row IDs MUST follow the path scheme `${featureId}/positions`, `${featureId}/sensors`, and `${featureId}/segments`. Sensor row IDs MUST follow `${featureId}/sensors/${sensorName}`. Contact row IDs MUST follow `${featureId}/sensors/${sensorName}/contacts/${index}`.
- **FR-005**: Sensor rows MUST display the sensor `name` as label and `"N contacts"` as sublabel (where N is `contacts.length`).
- **FR-006**: Contact rows MUST display the contact's formatted time (via the existing `formatTime()` helper) as label and the bearing (rounded to whole degrees, with degree symbol) as sublabel.
- **FR-007**: When a contact has an `ambiguous_bearing` value, the contact row MUST render a single row with a slash-separated sublabel (e.g. `"045° / 225°"`) rather than two sibling rows.
- **FR-008**: Case A (no sensors, single or no segments) MUST render identically to the current implementation. The change MUST NOT alter the position-row output for any track that lacks sensor data.
- **FR-009**: The existing `hasChildSelected` prefix-matching logic MUST continue to work for the new row kinds without modification — this is guaranteed by FR-004's path scheme.
- **FR-010**: The existing `hiddenIds` and visibility-toggle behaviour MUST extend to the new row kinds without component-code changes — granted by the same path-matching mechanism.
- **FR-011**: The panel MUST preserve its virtualisation contract — row height remains constant across all row kinds so `useVirtualizer`'s `estimateSize` continues to return a single value.
- **FR-012**: Sensor row labels MUST remain stable under `SensorData[]` reordering — the sensor `name` is the identity, not the array index.
- **FR-013**: Group rows MUST be non-selectable headers. Clicking the chevron toggles expansion; clicking the row label has no selection effect (or selects the group ID as a unit — clarified in `/speckit.clarify`).
- **FR-014**: The FeatureList Storybook story MUST include fixtures for all four cases (A/B/C/D) and a fifth fixture with the edge cases covered above (empty sensors, zero-contact sensor, ambiguous bearing).

### Out of Scope

- **Map rendering of sensors** — owned by #118.
- **Array offset calculations** — owned by #119.
- **Sensor editing UI** (create/delete/rename sensors, edit contacts).
- **Sensor filtering by time range** in the Layers panel — time filtering is the Time Controller's job.
- **Changes to the `NarrativeLog` container pattern** from #152 — that is a separate grouping concern.
- **Inline display of optional fields** (`range`, `frequency`, `contact.label`, `contact.comment`) — these belong in an info popover if needed and are deferred to a follow-up.

### Key Entities

- **SensorData** (already defined in `@debrief/schemas`): Named sensor embedded in `TrackProperties.sensors[]`. Fields: `name: string`, `contacts: SensorContact[]`, plus optional `base_frequency`, `offset`, `worm_in_hole`.
- **SensorContact** (already defined): A single measurement. Fields: `time: string`, `bearing: number`, optional `range`, `frequency`, `ambiguous_bearing`, `label`, `comment`.
- **DisplayItem** (extended in this feature): Gains three new `type` values (`group`, `sensor`, `contact`). Existing fields (`id`, `label`, `sublabel`, `depth`, `parentId`, `isExpandable`, `feature`, `index`) are reused with no schema changes.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: The analyst wants to **verify** what sensor data loaded under a track, and **select** or **hide** sensors / contacts for downstream views.
- **Key Decision(s)**:
  1. Does this track carry sensor data? (answered at a glance by the presence of the `Sensors` group row)
  2. Which named sensors are loaded, and how many contacts each has? (answered by expanding `Sensors`)
  3. Which individual contacts are interesting? (answered by expanding a sensor)
- **Decision Inputs**: Sensor name, contact count, per-contact time and bearing.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Track row collapsed | Click chevron | Track expands, shows `Positions` + `Sensors` group rows (Case C) or `Track Segments` + `Sensors` (Case D) |
| 2 | `Sensors` group row visible, collapsed | Click chevron | `Sensors` expands, shows one row per named sensor (e.g. `TOWED_ARRAY` / `42 contacts`) |
| 3 | Sensor row visible, collapsed | Click chevron | Sensor expands, shows one row per contact (time + bearing) |
| 4 | Contact row visible | Click row | Contact is selected; parent sensor row shows `hasChildSelected` if collapsed |

### UI States

- **Track has no sensors** — Case A/B. No `Sensors` group row appears. Panel is visually unchanged from today.
- **Track has empty sensors array** — Same as "no sensors" (FR-004 predicate treats `[]` as absent).
- **Sensor has zero contacts** — Sensor row shows `"0 contacts"`; expanding it shows a "No contacts" placeholder.
- **Very large contact count** — Rows render via the existing virtualiser; scroll performance must not degrade.
- **Collision: two sensors with the same name** — Only the first is renderable (known limitation; uniqueness is the import-side responsibility).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four cases (A/B/C/D) render correctly in `FeatureList.stories.tsx` — verified by Storybook visual-regression screenshots captured in all three themes (light / dark / vscode).
- **SC-002**: Case A (no sensors, no segments) is visually identical to the pre-change baseline — verified by a byte-for-byte Storybook screenshot comparison against a baseline captured on `main` before the change.
- **SC-003**: A track with ≥10,000 sensor contacts can be expanded without breaking virtualisation — scroll FPS remains within 10% of the pre-change baseline, measured in a Storybook performance test.
- **SC-004**: The existing `FeatureList` unit test suite passes unchanged for any track that lacks `props.sensors` — no regressions to the legacy path.
- **SC-005**: New unit tests cover all four cases (A/B/C/D) plus the edge cases (empty sensors, zero-contact sensor, ambiguous bearing, large contact count) in `flattenFeatures.test.ts`.
- **SC-006**: Selection prefix-matching (`hasChildSelected`) works for sensor and contact rows without modification — verified by a test that selects a contact and asserts the parent sensor row reports `hasChildSelected = true`.
- **SC-007**: An analyst who has just imported a REP file with two sensors can confirm from the Layers panel — without opening the JSON — within 5 seconds, that both sensors loaded and how many contacts each contains.
