# Enum: FeatureKindEnum 




_Discriminator for GeoJSON feature types_



URI: [debrief:enum/FeatureKindEnum](https://debrief.info/schemas/enum/FeatureKindEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| TRACK | None | Vessel track (LineString geometry) |
| POINT | None | Reference point/location (Point geometry) |
| NARRATIVE | None | Timestamped narrative/log entry (no geometry) |
| CIRCLE | None | Circle annotation (Polygon geometry, center+radius in properties) |
| RECTANGLE | None | Rectangle annotation (Polygon geometry) |
| LINE | None | Line annotation (LineString geometry) |
| TEXT | None | Text annotation at a position (Point geometry) |
| VECTOR | None | Vector annotation (LineString geometry, origin+range+bearing in properties) |
| SYSTEM | None | Non-spatial system state (null geometry, reserved state |
| POLY | None | Arbitrary polygon annotation (Polygon geometry) |
| MULTI_POINT | None | Multi-point tool result (MultiPoint geometry) |
| MULTI_POLYGON | None | Multi-polygon tool result (MultiPolygon geometry) |
| SYSTEM_RECORD | None | Plot-level system record (snapshot chain, branches) |
| STORYBOARD | None | Storyboard parent feature (panel-only entity, Polygon hull over child Scene v... |
| STORYBOARD_SCENE | None | Storyboard Scene feature (Polygon viewport bounds, captured moment in a Story... |




## Slots

| Name | Description |
| ---  | --- |
| [kind](../slots/kind.md) | Feature type discriminator |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: FeatureKindEnum
description: Discriminator for GeoJSON feature types
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  TRACK:
    text: TRACK
    description: Vessel track (LineString geometry)
  POINT:
    text: POINT
    description: Reference point/location (Point geometry)
  NARRATIVE:
    text: NARRATIVE
    description: Timestamped narrative/log entry (no geometry)
  CIRCLE:
    text: CIRCLE
    description: Circle annotation (Polygon geometry, center+radius in properties)
  RECTANGLE:
    text: RECTANGLE
    description: Rectangle annotation (Polygon geometry)
  LINE:
    text: LINE
    description: Line annotation (LineString geometry)
  TEXT:
    text: TEXT
    description: Text annotation at a position (Point geometry)
  VECTOR:
    text: VECTOR
    description: Vector annotation (LineString geometry, origin+range+bearing in properties)
  SYSTEM:
    text: SYSTEM
    description: Non-spatial system state (null geometry, reserved state.* IDs)
  POLY:
    text: POLY
    description: Arbitrary polygon annotation (Polygon geometry)
  MULTI_POINT:
    text: MULTI_POINT
    description: Multi-point tool result (MultiPoint geometry)
  MULTI_POLYGON:
    text: MULTI_POLYGON
    description: Multi-polygon tool result (MultiPolygon geometry)
  SYSTEM_RECORD:
    text: SYSTEM_RECORD
    description: Plot-level system record (snapshot chain, branches)
  STORYBOARD:
    text: STORYBOARD
    description: Storyboard parent feature (panel-only entity, Polygon hull over child
      Scene viewports)
  STORYBOARD_SCENE:
    text: STORYBOARD_SCENE
    description: Storyboard Scene feature (Polygon viewport bounds, captured moment
      in a Storyboard)

```
</details>