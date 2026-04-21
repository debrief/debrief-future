

# Slot: rotation 


_Map rotation in degrees 0-360 (FR-013)_





URI: [debrief:slot/rotation](https://debrief.info/schemas/slot/rotation)
Alias: rotation

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SpatialSlice](../classes/SpatialSlice.md) | Geographic view state for the map display |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Required: True

* Minimum Value: 0

* Maximum Value: 360




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:rotation |
| native | debrief:rotation |




## LinkML Source

<details>
```yaml
name: rotation
description: Map rotation in degrees 0-360 (FR-013)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: rotation
owner: SpatialSlice
domain_of:
- SpatialSlice
range: float
required: true
minimum_value: 0
maximum_value: 360

```
</details>