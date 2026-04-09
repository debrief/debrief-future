# Contract — `flattenFeatures` (extended)

**Feature**: `179-sensor-aware-layers-rendering`
**Phase**: 1 — Design & Contracts
**Module**: `shared/components/src/FeatureList/flattenFeatures.ts`

## Public surface (unchanged)

The exported signature of `flattenFeatures` does not change:

```ts
export function flattenFeatures(
  features: DebriefFeature[],
  expandedIds: Set<string>,
): DisplayItem[];
```

What changes is the **shape of the returned array** when input features contain `props.sensors`, and the **bearing/course format string** inside `DisplayItem.sublabel`.

---

## Contract: four-case dispatcher

**Given** a `TrackFeature` whose expansion state includes the track's own ID (`expandedIds.has(feature.id)`),
**when** `flattenFeatures` is called,
**then** it MUST append rows to the output according to exactly one of the four cases:

| Case | Predicate | Required rows appended (in order) |
|---|---|---|
| **A** | `!hasSensors && segmentCount <= 1` | Position rows as direct children of the track, depth 1, IDs `${featureId}/positions/${index}`. Identical to the pre-change behaviour **except** for the new zero-padded course string in `sublabel` (FR-018). |
| **B** | `!hasSensors && segmentCount > 1` | One `type: 'group'` row with `label = "Track Segments (${segmentCount})"`, `id = ${featureId}/segments`, depth 1. If expanded, follow with the existing `flattenSegments` output, but at one level deeper. |
| **C** | `hasSensors && segmentCount <= 1` | Two `type: 'group'` rows in order: `Positions (${positions.length})` then `Sensors (${sensors.length})`. Both depth 1. Each follows the "expand on demand" rule. |
| **D** | `hasSensors && segmentCount > 1` | Two `type: 'group'` rows in order: `Track Segments (${segmentCount})` then `Sensors (${sensors.length})`. Both depth 1. |

where:
```ts
const hasSensors   = (feature.properties.sensors?.length ?? 0) > 0;
const segmentCount = feature.properties.segments?.length ?? 0;
```

**Ordering guarantee**: within a single expanded track, rows MUST appear in the order: positions/segments first, sensors second. This is stable and testable.

---

## Contract: group row shape

**Given** a group row is emitted,
**then** the `DisplayItem` MUST satisfy:

```ts
{
  type: 'group',
  id: `${featureId}/positions` | `${featureId}/sensors` | `${featureId}/segments`,
  label: `${GroupName} (${count})`,      // e.g. "Sensors (3)"
  sublabel: null,                        // always null for groups
  depth: 1,
  parentId: featureId,
  isExpandable: true,                    // even when count is 0
  feature: null,
  index: null,
}
```

`GroupName` is literally `"Positions"`, `"Sensors"`, or `"Track Segments"`. No i18n in this PR.

---

## Contract: sensor row shape

**Given** the parent `Sensors` group is expanded AND the feature has a non-empty `sensors[]` array,
**then** for each `SensorData` entry, a `DisplayItem` MUST be emitted with:

```ts
{
  type: 'sensor',
  id: `${featureId}/sensors/${sensor.name}`,
  label: sensor.name,
  sublabel: `${sensor.contacts.length} contacts`,  // e.g. "42 contacts"
  depth: 2,
  parentId: `${featureId}/sensors`,
  isExpandable: true,                              // even for zero-contact sensors
  feature: null,
  index: <array index in sensors[]>,
}
```

Sensor rows appear in the order they occur in `SensorData[]` — no sort applied. If two sensors share the same `name` (documented known limitation), their IDs will collide; downstream behaviour is "first match wins" via selection prefix-matching.

---

## Contract: contact row shape

**Given** the parent sensor row is expanded AND its `SensorData.contacts[]` is non-empty,
**then** for each `SensorContact` entry at index `i`, a `DisplayItem` MUST be emitted with:

```ts
{
  type: 'contact',
  id: `${featureId}/sensors/${sensor.name}/contacts/${i}`,
  label: formatTime(contact.time),                 // reuses existing formatTime() helper
  sublabel: formatBearing(contact),                // see below
  depth: 3,
  parentId: `${featureId}/sensors/${sensor.name}`,
  isExpandable: false,
  feature: null,
  index: i,
}
```

Where `formatBearing` is a new helper with contract:

```ts
function formatBearing(contact: SensorContact): string {
  const primary = Math.round(contact.bearing).toString().padStart(3, '0');
  if (contact.ambiguous_bearing !== undefined && contact.ambiguous_bearing !== null) {
    const secondary = Math.round(contact.ambiguous_bearing).toString().padStart(3, '0');
    return `${primary}° / ${secondary}°`;
  }
  return `${primary}°`;
}
```

**Examples**:
- `bearing: 45`  → `"045°"`
- `bearing: 225` → `"225°"`
- `bearing: 359.7, ambiguous_bearing: 179.7` → `"360° / 180°"` (note: `Math.round(359.7) = 360`; this edge case is documented and accepted)
- `bearing: 0` → `"000°"`

Contacts appear in `contacts[]` order — no sort applied.

---

## Contract: zero-contact sensor placeholder

**Given** a sensor has `contacts.length === 0` AND its row is expanded,
**then** exactly one placeholder row MUST be emitted:

```ts
{
  type: 'contact',
  id: `${featureId}/sensors/${sensor.name}/contacts/empty`,
  label: 'No contacts',
  sublabel: null,
  depth: 3,
  parentId: `${featureId}/sensors/${sensor.name}`,
  isExpandable: false,
  feature: null,
  index: null,
}
```

Rationale: explicit "empty state" row mirrors the existing `"No child items"` placeholder pattern (see `flattenTrackChildren` at `flattenFeatures.ts:148`).

---

## Contract: `getPositionSublabel` format change (FR-018)

**Before**:
```ts
function getPositionSublabel(position: TimestampedPosition): string | null {
  const parts: string[] = [];
  if (position.course !== undefined && position.course !== null) {
    parts.push(`${Math.round(position.course)}\u00B0`);    // "45°"
  }
  // ...
}
```

**After**:
```ts
function getPositionSublabel(position: TimestampedPosition): string | null {
  const parts: string[] = [];
  if (position.course !== undefined && position.course !== null) {
    parts.push(`${Math.round(position.course).toString().padStart(3, '0')}\u00B0`);  // "045°"
  }
  // ...
}
```

**Observable change**: every position row whose `course` is defined will show a three-digit zero-padded value instead of its natural width. E.g.:

| `position.course` | Before | After |
|---|---|---|
| 45 | `"45°"` | `"045°"` |
| 90 | `"90°"` | `"090°"` |
| 135 | `"135°"` | `"135°"` |
| 5 | `"5°"` | `"005°"` |
| 360 | `"360°"` | `"360°"` |

Existing unit tests that assert on course format MUST be updated as part of this change. This is the one accepted departure from FR-008 (Case-A regression guard).

---

## Contract: purity

`flattenFeatures` MUST remain a pure function:

- No mutations to the input `features` array or any nested object (including `sensors[]` or `contacts[]`).
- No side effects (no `console.log`, no `window` access, no I/O).
- No `Date.now()`, `Math.random()`, or other non-deterministic calls.
- Same inputs ⇒ same output (referential transparency).

This invariant is enforced by existing unit tests and must not be weakened by the new code paths.

---

## Verification contract

Each of the following MUST have at least one automated test:

| Contract | Test file | Test name (suggested) |
|---|---|---|
| Case A: Simple track renders unchanged structure (except course padding) | `flattenFeatures.test.ts` | `case A - simple track with positions` |
| Case B: Compound track gets Track Segments group | `flattenFeatures.test.ts` | `case B - compound track with Track Segments wrapper` |
| Case C: Simple track with sensors gets Positions + Sensors | `flattenFeatures.test.ts` | `case C - track with sensors gets Positions and Sensors groups` |
| Case D: Compound track with sensors gets Track Segments + Sensors | `flattenFeatures.test.ts` | `case D - compound track with sensors` |
| Group row label includes count | `flattenFeatures.test.ts` | `group rows include count in label` |
| Group row clicking adds single ID | `FeatureList.test.tsx` | `clicking a group row selects only the group path` |
| Sensor row label is name, sublabel is count | `flattenFeatures.test.ts` | `sensor rows use name/count label pattern` |
| Contact row bearings are zero-padded | `flattenFeatures.test.ts` | `contact rows show zero-padded bearings` |
| Ambiguous bearings render as single row with slash separator | `flattenFeatures.test.ts` | `ambiguous bearings render as single contact row` |
| Zero-contact sensor shows placeholder | `flattenFeatures.test.ts` | `zero-contact sensor shows No contacts placeholder` |
| Sensor-name stability on reorder | `flattenFeatures.test.ts` | `sensor row IDs stable under SensorData[] reordering` |
| Contact input order respected (no sort) | `flattenFeatures.test.ts` | `contacts render in input order, no sort applied` |
| Empty sensors array treated as no sensors | `flattenFeatures.test.ts` | `track with empty sensors array falls through to Case A` |
| `hasChildSelected` works for contact → sensor → track | `flattenFeatures.test.ts` | `hasChildSelected propagates through sensor paths` |
| `getPositionSublabel` zero-pads course | `flattenFeatures.test.ts` | `getPositionSublabel zero-pads course to 3 digits` |
| Large contact count doesn't break virtualisation | `FeatureList.test.tsx` | `10,000 contacts do not exceed virtualiser budget` |
| Contact-row info icon plumbed through | `FeatureList.test.tsx` | `contact row click fires onChildInfoClick with displayItem` |
| Sensor rows do NOT show info icon | `FeatureList.test.tsx` | `sensor rows do not surface info icon` |
