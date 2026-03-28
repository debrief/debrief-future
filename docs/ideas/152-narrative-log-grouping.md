# Group Narrative Entries into a Narrative Log Container

## Problem

Narrative entries from REP files are stored as individual GeoJSON Features in the FeatureCollection, each with `kind = NARRATIVE`. A single REP file commonly produces 10-20+ narratives that share identical metadata:

- **style** (always default gray circle, radius 3.0, fill #808080)
- **provenance** (same `activity_id`, tool name, tool version on every entry)
- **track_id** (often the same platform for a sequence of entries, e.g. 11 entries for NELSON)
- **symbol** (when present from REP parsing)

This means a file with 19 narratives duplicates style 19 times and provenance 19 times. More importantly, there is no way to treat a set of related narratives as a coherent unit -- you cannot "show NELSON's narrative log" as a single expandable item in the layers panel, or toggle visibility of an entire log at once.

## Existing Precedent in the Schema

The codebase already has two patterns for grouping related entries under a parent feature:

1. **SensorData on TrackFeature** -- a named sensor embeds an array of `SensorContact` entries, sharing `name`, `base_frequency`, and `offset` across all contacts
2. **ReferenceLocation with MultiPoint** -- a single feature holds multiple points with a parallel `point_metadata[]` array, sharing `style`, `location_type`, and `name`

Narratives are structurally similar: a sequence of timestamped entries sharing a source, author context, and display style.

## Proposed Solution

Introduce a `NarrativeLog` feature type (`kind = NARRATIVE_LOG`) that groups related narrative entries under a single GeoJSON Feature:

```yaml
NarrativeLogEntry:
  description: A single narrative entry within a log
  attributes:
    time:
      range: datetime
      required: true
    text:
      required: true
    symbol:
      description: Display symbol code from REP file

NarrativeLogProperties:
  is_a: BaseFeatureProperties
  description: Properties for a grouped narrative log
  attributes:
    kind:
      equals_string: "NARRATIVE_LOG"
    track_id:
      description: Associated track identifier (shared across entries)
    source:
      description: Source identifier (e.g. filename, operator name)
    style:
      range: PointProperties
      required: true
    entries:
      range: NarrativeLogEntry
      multivalued: true
      required: true
      inlined_as_list: true
```

The geometry would be `Point (empty coords)` since narratives are non-spatial, matching the existing `SystemState` pattern.

### Grouping Strategy

During REP import, narratives would be grouped by `track_id`:
- All narratives for NELSON become one `NarrativeLog` feature
- All narratives for COLLINGWOOD become another
- Narratives without a `track_id` go into a single "ungrouped" log

### What This Enables

- **Layers panel**: Show "NELSON Narrative Log (11 entries)" as a single expandable row
- **Visibility toggle**: Hide/show all narratives for a platform at once
- **Reduced duplication**: Style and provenance stored once per log, not per entry
- **Timeline integration**: Log entries still have individual timestamps for time-filtering
- **Future enrichment**: Add shared metadata like author, classification, or source file reference at the log level

## Migration

The existing `NARRATIVE` kind would remain supported for backward compatibility with already-stored plots. New imports would produce `NARRATIVE_LOG` features. A one-time migration tool could consolidate existing narratives (group by `track_id` within each FeatureCollection).

## Success Criteria

- `NarrativeLog` schema added to LinkML with generated Pydantic/TypeScript types
- REP importer groups narratives by `track_id` into `NarrativeLog` features
- Layers panel renders grouped logs as expandable items
- Individual entries remain time-filterable
- Existing `NARRATIVE` features continue to load and display (backward compatible)

## Constraints

- Must conform to GeoJSON spec (Feature with properties, geometry may be null/empty)
- Schema changes require adherence tests before merge (CONSTITUTION Art. II.1)
- Must work offline (CONSTITUTION Art. I.1)

## Out of Scope

- Narrative editing UI (create/modify entries in the log)
- Cross-track narrative logs (grouping narratives from multiple tracks into one log)
- Rich text or markdown in narrative entries
