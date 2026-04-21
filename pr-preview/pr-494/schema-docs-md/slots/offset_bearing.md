

# Slot: offset_bearing 


_Bearing offset in degrees (RELATIVE_TMA)_





URI: [debrief:slot/offset_bearing](https://debrief.info/schemas/slot/offset_bearing)
Alias: offset_bearing

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Minimum Value: 0

* Maximum Value: 360




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:offset_bearing |
| native | debrief:offset_bearing |




## LinkML Source

<details>
```yaml
name: offset_bearing
description: Bearing offset in degrees (RELATIVE_TMA)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: offset_bearing
owner: SegmentMetadata
domain_of:
- SegmentMetadata
range: float
minimum_value: 0
maximum_value: 360

```
</details>