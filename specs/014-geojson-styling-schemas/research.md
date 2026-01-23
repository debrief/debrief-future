# Research: GeoJSON Styling Properties Schemas

**Feature**: 014-geojson-styling-schemas
**Date**: 2026-01-20

## Research Questions

1. What are the Leaflet Path options naming conventions?
2. How should styling schemas integrate with existing feature schemas?
3. What constraints are needed for numeric properties?
4. How should TrackStyle composite work for dual line/point styling?

---

## Decision 1: Leaflet Path Options Property Names

**Decision**: Use Leaflet Path options naming with camelCase adaptation for LinkML compatibility.

**Rationale**: Leaflet is the de facto standard for web mapping and the VS Code extension uses it. Matching their naming ensures frontends can apply styling directly without translation. LinkML prefers snake_case but can generate camelCase output.

**Mapping from Leaflet to LinkML**:

| Leaflet Property | LinkML Attribute | Type | Default |
|------------------|------------------|------|---------|
| `stroke` | `stroke` | boolean | true |
| `color` | `color` | CSSColor | required |
| `weight` | `weight` | float | 3 |
| `opacity` | `opacity` | float | 1.0 |
| `lineCap` | `line_cap` | LineCapEnum | "round" |
| `lineJoin` | `line_join` | LineJoinEnum | "round" |
| `dashArray` | `dash_array` | string | null |
| `fill` | `fill` | boolean | false (lines), true (polygons) |
| `fillColor` | `fill_color` | CSSColor | same as color |
| `fillOpacity` | `fill_opacity` | float | 0.2 |

**Alternatives Considered**:
- SVG attribute names (`stroke-width`, `stroke-opacity`) - Rejected: requires hyphenation, less familiar to Leaflet users
- Custom Debrief naming - Rejected: reinventing the wheel, poor ecosystem compatibility
- MapLibre GL JS naming - Rejected: more complex expression-based system, overkill for static styling

---

## Decision 2: Schema Composition Strategy

**Decision**: Create standalone styling schemas that feature Properties classes reference via a `style` attribute.

**Rationale**:
- Clean separation between domain properties (platform_id, track_type) and styling properties
- Styling schemas are reusable across feature types
- Matches how frontends consume the data (extract style, apply to renderer)

**Structure**:
```
TrackProperties:
  - kind: TRACK (domain)
  - platform_id (domain)
  - ...
  - style: TrackStyle (styling)
    - line: LineProperties
    - point: PointProperties

ReferenceLocationProperties:
  - kind: POINT (domain)
  - name (domain)
  - ...
  - style: PointProperties (styling)
```

**Alternatives Considered**:
- Inline styling properties in each Properties class - Rejected: duplicates definitions, inconsistent across types
- Mixin/inheritance approach - Rejected: LinkML mixin support is limited, adds complexity
- External stylesheet reference - Rejected: violates offline-first principle, adds runtime dependency

---

## Decision 3: Numeric Constraints

**Decision**: Apply reasonable constraints matching rendering semantics.

| Property | Type | Min | Max | Notes |
|----------|------|-----|-----|-------|
| `weight` | float | 0 | - | 0 = invisible line (valid) |
| `opacity` | float | 0 | 1 | Standard alpha range |
| `fill_opacity` | float | 0 | 1 | Standard alpha range |
| `radius` | float | 0 | - | 0 = invisible marker (valid) |

**Rationale**:
- Zero values are valid (invisible rendering) - don't reject
- Opacity must be 0-1 per CSS/SVG standard
- No maximum on weight/radius - renderer handles large values
- Negative values rejected - no physical meaning

**Alternatives Considered**:
- Stricter minimums (weight > 0) - Rejected: valid use case for invisible lines
- Integer-only weight - Rejected: sub-pixel rendering benefits from floats
- Percentage opacity (0-100) - Rejected: CSS standard is 0-1

---

## Decision 4: TrackStyle Composite Structure

**Decision**: TrackStyle contains separate `line` and `point` properties, both required.

```yaml
TrackStyle:
  attributes:
    line:
      range: LineProperties
      required: true
    point:
      range: PointProperties
      required: true
```

**Rationale**:
- Tracks render as both a line path AND individual position markers
- User note explicitly requested: "Track features support both LineProperties and PointProperties"
- Having both required ensures tracks always have complete styling
- Frontends can choose to hide points (via point.fill_opacity: 0) but schema guarantees structure

**Alternatives Considered**:
- Single merged style with all properties - Rejected: confusing which apply to line vs point
- Optional point styling - Rejected: inconsistent rendering if omitted
- Array of styles - Rejected: overcomplicated, only need exactly 2

---

## Decision 5: Dash Array Representation

**Decision**: Use string type for `dash_array` matching SVG stroke-dasharray format.

**Examples**:
- `"5, 10"` - 5px dash, 10px gap
- `"5, 10, 2, 10"` - alternating dash pattern
- `null` or omit - solid line

**Rationale**:
- Leaflet accepts SVG dasharray strings directly
- More flexible than numeric array for complex patterns
- Easier to represent in JSON Schema
- Matches CSS/SVG standards

**Alternatives Considered**:
- Array of numbers - Rejected: LinkML array handling is complex, string is simpler
- Named patterns (dashed, dotted) - Rejected: not expressive enough for tactical displays
- Separate dash/gap properties - Rejected: can't represent complex alternating patterns

---

## Decision 6: Point Shape Enum

**Decision**: Define PointShapeEnum with three initial values: `circle`, `square`, `triangle`.

**Rationale**:
- Covers basic tactical symbology needs (circle for contacts, triangle for directional indicators)
- Explicitly scoped in spec: "icons and military symbols are explicitly deferred"
- Enum is extensible - can add more shapes later without breaking changes

**Alternatives Considered**:
- More shapes (diamond, star, cross) - Deferred: add when needed
- SVG path string for arbitrary shapes - Rejected: too complex, poor validation
- Numeric shape codes - Rejected: less readable, harder to debug

---

## Decision 7: Migration of Existing `color` Properties

**Decision**: Remove ad-hoc `color` properties from feature schemas; styling must use `style` object.

**Migration Path**:
1. Add `style` property to all feature Properties classes
2. Remove existing `color` attributes from TrackProperties, ReferenceLocationProperties, and annotation properties
3. Update all golden fixtures to include `style` objects
4. Update test infrastructure to validate new structure

**Rationale**:
- Clean break - no legacy/compatibility complexity
- Pre-v4.0.0 freedom (Constitution XIV) permits breaking changes
- Single location for all styling reduces confusion

**Alternatives Considered**:
- Keep `color` as alias/shorthand - Rejected: dual paths cause confusion
- Deprecation period - Rejected: pre-release, no external consumers yet
- Optional `style` with `color` fallback - Rejected: inconsistent data model

---

## Summary

| Topic | Decision |
|-------|----------|
| Property naming | Leaflet Path options (camelCase in output) |
| Schema composition | Standalone styling schemas referenced by `style` attribute |
| Numeric constraints | Opacity 0-1, weight/radius >= 0 |
| TrackStyle | Composite with required `line` and `point` |
| Dash array | String type matching SVG format |
| Point shapes | Enum: circle, square, triangle |
| Migration | Remove `color`, require `style` on all features |
