# Implement REP file special comments (NARRATIVE, CIRCLE, etc.)

**ID**: 007
**Category**: Enhancement
**Status**: proposed
**Prerequisite**: Item 015 (LinkML schemas for annotation types)

## Problem

The current REP file parser (`services/io/src/debrief_io/handlers/rep.py`) only extracts track position data. REP files also contain rich annotation data via "special comments" — lines beginning with semicolons followed by keywords like `;NARRATIVE:`, `;CIRCLE:`, `;RECT:`, etc.

These annotations are essential for understanding the operational context of exercises:

- **NARRATIVE entries** capture timestamped operator decisions, detections, and events ("POSSUB TRACK 14", "FINEX CALLED, ENTER TRANSITION")
- **Shape annotations** (CIRCLE, RECT, LINE, VECTOR) define reference areas, search patterns, and operational boundaries
- **TEXT annotations** mark waypoints and reference labels

Currently, these are skipped with a TODO comment at line 231:
```python
# TODO: Handle special comments like ;NARRATIVE:, ;CIRCLE:, etc.
```

Without parsing these annotations, analysed exercises lose critical context that operators recorded during the event.

## REP Special Comment Format

Based on `specs/002-debrief-io/research.md`, the supported special comment types are:

| Prefix | Description | Format |
|--------|-------------|--------|
| `;NARRATIVE:` | Timestamped narrative entry | `YYMMDD HHMMSS.SSS TRACKNAME TEXT` |
| `;CIRCLE:` | Circle shape | `SYMBOL LAT LON RADIUS LABEL` |
| `;RECT:` | Rectangle shape | `SYMBOL LAT1 LON1 LAT2 LON2 LABEL` |
| `;LINE:` | Line shape | `SYMBOL LAT1 LON1 LAT2 LON2 LABEL` |
| `;TEXT:` | Text annotation | `SYMBOL LAT LON LABEL` |
| `;VECTOR:` | Vector shape | `SYMBOL LAT LON RANGE BEARING LABEL` |

### Example NARRATIVE Records

From `services/io/tests/fixtures/valid/narrative.rep`:
```
;NARRATIVE: 951212 050000.000 NELSON   COMEX SERIAL 16D
;NARRATIVE: 951212 050100.100 NELSON   INTEND WIDE AREA SEARCH AS PREVIOUS SERIAL
;NARRATIVE: 951212 062200.000 NELSON   POSSUB TRACK 14
;NARRATIVE: 951212 095700.000 COLLINGWOOD   SUSPECTED DETECTION OF RED
```

### Example Shape Records

From `specs/002-debrief-io/research.md`:
```
;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 reference circle
;TEXT: @E 21.7 0 0 N 21.5 0 0 W waypoint alpha
```

## Proposed Solution

Extend the REP handler to parse all special comment types, producing GeoJSON features that conform to the annotation schemas defined in item 015.

### Implementation Approach

1. **Extend REP parser** to recognise special comment prefixes
2. **Create parser functions** for each special comment type:
   - `_parse_narrative()` → NarrativeFeature
   - `_parse_circle()` → CircleFeature
   - `_parse_rect()` → RectangleFeature
   - `_parse_line()` → LineFeature
   - `_parse_text()` → TextAnnotationFeature
   - `_parse_vector()` → VectorFeature
3. **Return mixed feature types** from `ParseResult`:
   - Track features (existing)
   - Annotation features (new)
4. **Validate output** against Pydantic models from item 015

### GeoJSON Mapping

| REP Type | GeoJSON Geometry | Notes |
|----------|------------------|-------|
| NARRATIVE | None (properties only) | Timestamped text, linked to track |
| CIRCLE | Point + radius in properties | Center point with radius |
| RECT | Polygon | Four-corner rectangle |
| LINE | LineString | Two-point line |
| TEXT | Point | Position with label |
| VECTOR | Point + bearing/range | Origin point with vector components |

## Success Criteria

- [ ] REP handler recognises all special comment types
- [ ] NARRATIVE entries parsed with timestamp, track name, and text
- [ ] Circle annotations parsed with center, radius, and label
- [ ] Rectangle annotations parsed with bounds and label
- [ ] Line annotations parsed with endpoints and label
- [ ] Text annotations parsed with position and label
- [ ] Vector annotations parsed with origin, range, bearing, and label
- [ ] All parsed annotations validate against item 015 schemas
- [ ] Existing track parsing unchanged (no regression)
- [ ] Unit tests cover each annotation type (valid and invalid cases)
- [ ] Test fixture expanded with representative special comments

## Constraints

- **Schema-first**: Must wait for item 015 (annotation schemas) before implementation
- **Offline-capable**: Pure transformation, no network dependencies
- **Provenance**: Each annotation must include source file and line number
- **Error recovery**: Invalid annotations logged as warnings, don't fail entire parse

## Out of Scope

- UI rendering of annotations (frontend responsibility)
- STAC storage strategy for annotations
- Annotation editing/creation (parse only)
- Custom/organisation-specific annotation types
- Ellipse type (not documented in REP spec)

## Dependencies

- **Requires**: Item 015 (LinkML schemas for annotation types) — CRITICAL
- **Extends**: Item 002 (debrief-io service)
- **Enables**: Full REP file support in tracer bullet

## Strategic Fit

This enhancement directly supports **Theme 1: Prove the Architecture** by completing REP file support. Annotations are essential for meaningful exercise replay — tracks alone don't tell the operational story.

It also supports **Theme 3: Demonstrate Value for Stakeholder Engagement** by enabling demos that show the full context of naval exercises, not just movement data.

## Technical Notes

### Current Parser Structure

The REP handler uses regex-based line parsing:
```python
# Position pattern (existing)
POSITION_PATTERN = re.compile(r"^\s*(\d{6})\s+...")

# Comment handling (current - skips all)
if line.strip().startswith(";"):
    # TODO: Handle special comments like ;NARRATIVE:, ;CIRCLE:, etc.
    continue
```

### Proposed Extension Point

```python
# Inside parse() method
if line.strip().startswith(";"):
    annotation = self._try_parse_special_comment(line, line_num)
    if annotation:
        annotations.append(annotation)
    continue  # Skip regular comment lines
```

### Coordinate Parsing

The existing `parse_dms_coordinate()` function can be reused for shape coordinates. The DMS format is consistent across all REP record types.

## Interview Summary

This idea file documents an existing backlog item to provide implementation-ready detail. The item was identified during the debrief-io spec work (see `specs/002-debrief-io/research.md`) where the special comment formats were documented but implementation was deferred to keep the tracer bullet scope minimal.
