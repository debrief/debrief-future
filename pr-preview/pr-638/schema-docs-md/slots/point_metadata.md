

# Slot: point_metadata 


_Per-point metadata array, parallel to MultiPoint coordinates. Each entry contains at minimum an index and name. Downstream tools extend entries with zone/color fields._





URI: [debrief:slot/point_metadata](https://debrief.info/schemas/slot/point_metadata)
Alias: point_metadata

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |






## Properties

* Range: [PointMetadataEntry](../classes/PointMetadataEntry.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:point_metadata |
| native | debrief:point_metadata |




## LinkML Source

<details>
```yaml
name: point_metadata
description: Per-point metadata array, parallel to MultiPoint coordinates. Each entry
  contains at minimum an index and name. Downstream tools extend entries with zone/color
  fields.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: point_metadata
owner: ReferenceLocationProperties
domain_of:
- ReferenceLocationProperties
range: PointMetadataEntry
multivalued: true
inlined: true
inlined_as_list: true

```
</details>