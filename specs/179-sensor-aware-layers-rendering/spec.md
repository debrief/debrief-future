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

### User Story 2 - Analyst selects a named sensor, contact, or whole collection (Priority: P2)

The analyst wants to select a single sensor (e.g. every `TOWED_ARRAY` bearing as a unit), or a single contact, or the entire `Sensors` collection, so downstream views (map, charts) can highlight just that subset. Clicking the sensor row selects the sensor as a unit; clicking an individual contact selects that contact alone; clicking a group row selects the group's ID as a unit (no fan-out). All three cases mark ancestor rows as "has child selected" via the existing prefix-matching logic.

**Why this priority**: Selection fan-out is already how position rows work (`hasChildSelected` prefix matching). Extending it to sensors, contacts, and group rows gives analysts consistent behaviour and feeds directly into the map rendering work in #118 (a sensor selected in the Layers panel should light up its bearing lines on the map). A group-row selection (e.g. `${featureId}/sensors`) is a compact way for the analyst to say "highlight this whole collection" without needing the panel to emit N sibling IDs.

**Independent Test**: In a Storybook story with a sensor that has 3 contacts, click the sensor row and assert `selectedIds` contains exactly the sensor row's path. Click one contact row and assert `selectedIds` contains only that contact's path. Click the `Sensors` group row and assert `selectedIds` contains only the group-row path (no fan-out). Collapse the sensor row and assert the sensor row still shows its "has child selected" highlight when a descendant is selected.

**Acceptance Scenarios**:

1. **Given** a sensor row with contacts, **When** the analyst clicks the sensor row's label, **Then** the sensor row's path becomes the only entry in `selectedIds`.
2. **Given** a contact row is visible, **When** the analyst clicks it, **Then** that contact's path becomes the only entry in `selectedIds`, and the parent sensor row (if collapsed) visually marks as "has child selected".
3. **Given** a `Sensors` group row is visible, **When** the analyst clicks the group row's label, **Then** `selectedIds` contains exactly one entry — the group row's own path (`${featureId}/sensors`) — with no fan-out to child sensors or contacts. The parent track row marks as "has child selected".
4. **Given** a sensor row is selected, **When** the analyst collapses and re-expands it, **Then** the selection state is preserved.

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
- **Case-A regression guard** — Case A (simple track, no sensors, single or no segments) is the dominant existing case. Its rendering MUST be visually and behaviourally identical to the pre-change baseline **except** for the deliberate course-formatting change in FR-018 (position-row courses now render zero-padded to three digits, e.g. `45°` → `045°`). All other aspects (row structure, chevron behaviour, selection, hidden state, hover, row height) remain unchanged. Verification is via a flatten-output snapshot test plus refreshed Storybook screenshots so reviewers can confirm the only visible change is the padding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `flattenFeatures` MUST introduce three new `DisplayItem.type` values: `'group'` (for `Positions` / `Sensors` / `Track Segments` wrappers), `'sensor'` (for named-sensor rows), and `'contact'` (for individual sensor contacts).
- **FR-002**: When a track is expanded, the panel MUST select one of the four layouts (A/B/C/D) defined in the Edge Cases table above, based on the predicates `hasSensors = (props.sensors?.length ?? 0) > 0` and `segmentCount = props.segments?.length ?? 0`.
- **FR-003**: Group rows (`Positions`, `Sensors`, `Track Segments`) MUST default to **collapsed** when their parent track is first expanded. Expansion state is stored in the existing `expandedIds` set using the same add/remove rules as other expandable rows.
- **FR-004**: Group row IDs MUST follow the path scheme `${featureId}/positions`, `${featureId}/sensors`, and `${featureId}/segments`. Sensor row IDs MUST follow `${featureId}/sensors/${sensorName}`. Contact row IDs MUST follow `${featureId}/sensors/${sensorName}/contacts/${index}`.
- **FR-005**: Sensor rows MUST display the sensor `name` as label and `"N contacts"` as sublabel (where N is `contacts.length`).
- **FR-006**: Contact rows MUST display the contact's formatted time (via the existing `formatTime()` helper) as label and the bearing zero-padded to three digits with a degree symbol as sublabel (e.g. `045°`, `225°`, `359°`). Formatting uses `Math.round(bearing).toString().padStart(3, '0') + '°'`.
- **FR-007**: When a contact has an `ambiguous_bearing` value, the contact row MUST render a single row with a slash-separated sublabel showing both bearings zero-padded (e.g. `"045° / 225°"`) rather than two sibling rows.
- **FR-008**: Case A (no sensors, single or no segments) MUST render identically to the pre-change baseline **except** for the course-formatting change introduced by FR-015 (position-row courses now render zero-padded to three digits). No other position-row output changes.
- **FR-009**: The existing `hasChildSelected` prefix-matching logic MUST continue to work for the new row kinds without modification — this is guaranteed by FR-004's path scheme.
- **FR-010**: The existing `hiddenIds` and visibility-toggle behaviour MUST extend to the new row kinds without component-code changes — granted by the same path-matching mechanism.
- **FR-011**: The panel MUST preserve its virtualisation contract — row height remains constant across all row kinds so `useVirtualizer`'s `estimateSize` continues to return a single value.
- **FR-012**: Sensor row labels MUST remain stable under `SensorData[]` reordering — the sensor `name` is the identity, not the array index.
- **FR-013**: Group rows MUST be **selectable as a unit**. Clicking the label of a group row adds the group's path ID (`${featureId}/positions`, `${featureId}/sensors`, or `${featureId}/segments`) to `selectedIds` as a **single entry** — no fan-out to descendants. Clicking the chevron toggles expansion independently. Downstream consumers (map rendering, charts) MAY interpret a group-row ID as "the whole collection" at their discretion. The existing `hasChildSelected` prefix-matching will correctly mark the parent track row as having a selected child (because `${featureId}/sensors` starts with `${featureId}/`).
- **FR-014**: The FeatureList Storybook story MUST include fixtures for all four cases (A/B/C/D) and a fifth fixture with the edge cases covered above (empty sensors, zero-contact sensor, ambiguous bearing).
- **FR-015**: Group row labels MUST include a count in parentheses: `Positions (${positions.length})`, `Sensors (${sensors.length})`, `Track Segments (${segments.length})`. Group row sublabel is `null`. This convention applies only to group rows; sensor rows continue to use the `label = name`, `sublabel = "N contacts"` pattern from FR-005.
- **FR-016**: Contact rows MUST render in the order they appear in `SensorData.contacts[]`. `flattenFeatures` MUST NOT sort contacts at render time. Time-ordering is an importer/generator contract (upheld by #117 REP sensor import and any tool that mutates contacts). This protects the virtualisation budget for large sensor arrays (≥10,000 contacts).
- **FR-017**: Contact rows MUST be eligible for the existing `showInfoIcon` / `onChildInfoClick` hook so the host app can surface a popover with optional `SensorContact` fields (`range`, `frequency`, `label`, `comment`, `ambiguous_bearing`). `flattenFeatures` marks contact rows as info-icon-eligible; the popover UI itself lives in the host app and is out of scope for `@debrief/components` in this PR. Sensor rows MUST NOT surface the info icon in this PR — that is deferred to a follow-up feature.
- **FR-018**: The existing `getPositionSublabel()` helper in `flattenFeatures.ts` MUST be updated to zero-pad the course value to three digits, matching the bearing format used by contact rows (FR-006). This is a deliberate visual change to every position-row course label (e.g. `45° 12.0kts` → `045° 12.0kts`) and is the one accepted departure from the FR-008 Case-A regression guard. Snapshot/visual baselines for existing stories MUST be refreshed as part of this change.

### Out of Scope

- **Map rendering of sensors** — owned by #118.
- **Array offset calculations** — owned by #119.
- **Sensor editing UI** (create/delete/rename sensors, edit contacts).
- **Sensor filtering by time range** in the Layers panel — time filtering is the Time Controller's job.
- **Changes to the `NarrativeLog` container pattern** from #152 — that is a separate grouping concern.
- **Inline display of optional `SensorContact` fields** (`range`, `frequency`, `contact.label`, `contact.comment`) on contact rows — they surface via the info icon popover (FR-017), not on the row itself.
- **Info icon on sensor rows** — plumbing the info icon to sensor rows (to show `base_frequency`, `offset`, `worm_in_hole`, etc.) is explicitly deferred to a follow-up feature. Only contact rows get the info icon in this PR.
- **Default popover UI in `@debrief/components`** — the contact-row info popover is wired via the host-supplied `onChildInfoClick` handler. `@debrief/components` does not ship a built-in popover component in this PR.

### Key Entities

- **SensorData** (already defined in `@debrief/schemas`): Named sensor embedded in `TrackProperties.sensors[]`. Fields: `name: string`, `contacts: SensorContact[]`, plus optional `base_frequency`, `offset`, `worm_in_hole`.
- **SensorContact** (already defined): A single measurement. Fields: `time: string`, `bearing: number`, optional `range`, `frequency`, `ambiguous_bearing`, `label`, `comment`.
- **DisplayItem** (extended in this feature): Gains three new `type` values (`group`, `sensor`, `contact`). Existing fields (`id`, `label`, `sublabel`, `depth`, `parentId`, `isExpandable`, `feature`, `index`) are reused. Contact-row `DisplayItem`s are also marked as info-icon-eligible (via whatever mechanism the FeatureList component currently uses to gate the info icon on child rows — likely the `type` discriminator plus the host's `showInfoIcon` prop). No new fields are added to `DisplayItem`; all new state rides on the existing shape.

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
- **SC-002**: Case A (no sensors, no segments) is visually identical to the pre-change baseline **except** for the deliberate course-formatting change in FR-018. All other aspects (row structure, selection highlight, hidden state, chevron behaviour, row height, hover state) remain byte-for-byte identical. Verification: (a) snapshot-test comparison of the Case-A flattened-output array against a fixture captured on `main`, tolerant only to the course string change; (b) refreshed Storybook screenshots of the Case-A story committed alongside this change so reviewers can visually confirm the only difference is the `045°` padding.
- **SC-003**: A track with ≥10,000 sensor contacts can be expanded without breaking virtualisation — scroll FPS remains within 10% of the pre-change baseline, measured in a Storybook performance test.
- **SC-004**: The existing `FeatureList` unit test suite passes (with course-format assertions updated per FR-018) for any track that lacks `props.sensors` — no regressions to the legacy path beyond the documented course padding.
- **SC-005**: New unit tests cover all four cases (A/B/C/D) plus the edge cases (empty sensors, zero-contact sensor, ambiguous bearing, large contact count) in `flattenFeatures.test.ts`.
- **SC-006**: Selection prefix-matching (`hasChildSelected`) works for sensor, contact, and group rows without modification — verified by tests that (a) select a contact and assert the parent sensor row reports `hasChildSelected = true`, and (b) select a `Sensors` group row and assert the parent track row reports `hasChildSelected = true`.
- **SC-007**: An analyst who has just imported a REP file with two sensors can confirm from the Layers panel — without opening the JSON — within 5 seconds, that both sensors loaded and how many contacts each contains. (The contact counts are visible on the `Sensors (2)` group row label and on each sensor row's sublabel `"N contacts"`.)
- **SC-008**: Clicking the label of a group row (`Positions (1023)`, `Sensors (3)`, `Track Segments (5)`) adds exactly one entry to `selectedIds` — the group's own path ID — and does not fan out to descendants. Verified by a unit test per group type.
- **SC-009**: Contact rows are eligible for the `showInfoIcon` / `onChildInfoClick` hook, verified by a Storybook story that supplies an `onChildInfoClick` handler and asserts the click reaches the handler with the contact's `DisplayItem`. Sensor rows do NOT surface the info icon — verified by a negative assertion in the same story.
