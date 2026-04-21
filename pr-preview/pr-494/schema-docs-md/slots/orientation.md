

# Slot: orientation 


_Ellipse orientation from north in degrees_





URI: [debrief:slot/orientation](https://debrief.info/schemas/slot/orientation)
Alias: orientation

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TUASolution](../classes/TUASolution.md) | Single Target Uncertainty Area estimate |  no  |






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
| self | debrief:orientation |
| native | debrief:orientation |




## LinkML Source

<details>
```yaml
name: orientation
description: Ellipse orientation from north in degrees
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: orientation
owner: TUASolution
domain_of:
- TUASolution
range: float
minimum_value: 0
maximum_value: 360

```
</details>