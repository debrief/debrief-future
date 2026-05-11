

# Slot: ambiguous_bearing 


_Ambiguous bearing (second solution) in degrees_





URI: [debrief:slot/ambiguous_bearing](https://debrief.info/schemas/slot/ambiguous_bearing)
Alias: ambiguous_bearing

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SensorContact](../classes/SensorContact.md) | Single sensor measurement record |  no  |






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
| self | debrief:ambiguous_bearing |
| native | debrief:ambiguous_bearing |




## LinkML Source

<details>
```yaml
name: ambiguous_bearing
description: Ambiguous bearing (second solution) in degrees
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: ambiguous_bearing
owner: SensorContact
domain_of:
- SensorContact
range: float
minimum_value: 0
maximum_value: 360

```
</details>