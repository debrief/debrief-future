

# Slot: stepSize 


_Step size for discrete navigation (FR-008)_





URI: [debrief:slot/stepSize](https://debrief.info/schemas/slot/stepSize)
Alias: stepSize

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TemporalSlice](../classes/TemporalSlice.md) | Time-related state including navigation, playback, and filtering |  no  |






## Properties

* Range: [TimeStep](../classes/TimeStep.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:stepSize |
| native | debrief:stepSize |




## LinkML Source

<details>
```yaml
name: stepSize
description: Step size for discrete navigation (FR-008)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: stepSize
owner: TemporalSlice
domain_of:
- TemporalSlice
range: TimeStep
required: true

```
</details>