

# Slot: offset_range 


_Range offset in metres (RELATIVE_TMA)_





URI: [debrief:slot/offset_range](https://debrief.info/schemas/slot/offset_range)
Alias: offset_range

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Minimum Value: 0




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:offset_range |
| native | debrief:offset_range |




## LinkML Source

<details>
```yaml
name: offset_range
description: Range offset in metres (RELATIVE_TMA)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: offset_range
owner: SegmentMetadata
domain_of:
- SegmentMetadata
range: float
minimum_value: 0

```
</details>