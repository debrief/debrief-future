

# Slot: segments 


_Per-segment metadata for compound tracks. When present, geometry MUST be MultiLineString and segments[i] describes coordinates[i]. When absent, geometry is LineString and the flat positions array is used._





URI: [debrief:slot/segments](https://debrief.info/schemas/slot/segments)
Alias: segments

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |






## Properties

* Range: [SegmentMetadata](../classes/SegmentMetadata.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:segments |
| native | debrief:segments |




## LinkML Source

<details>
```yaml
name: segments
description: Per-segment metadata for compound tracks. When present, geometry MUST
  be MultiLineString and segments[i] describes coordinates[i]. When absent, geometry
  is LineString and the flat positions array is used.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: segments
owner: TrackProperties
domain_of:
- TrackProperties
range: SegmentMetadata
multivalued: true
inlined: true
inlined_as_list: true

```
</details>