

# Slot: unit 


_Unit of the step_





URI: [debrief:slot/unit](https://debrief.info/schemas/slot/unit)
Alias: unit

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TimeStep](../classes/TimeStep.md) | Step size for discrete time navigation (FR-008) |  no  |






## Properties

* Range: [TimeUnitEnum](../enums/TimeUnitEnum.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:unit |
| native | debrief:unit |




## LinkML Source

<details>
```yaml
name: unit
description: Unit of the step
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: unit
owner: TimeStep
domain_of:
- TimeStep
range: TimeUnitEnum
required: true

```
</details>