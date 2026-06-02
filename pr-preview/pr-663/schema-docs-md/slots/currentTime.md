

# Slot: currentTime 


_Current playback/display time (FR-005)_





URI: [debrief:slot/currentTime](https://debrief.info/schemas/slot/currentTime)
Alias: currentTime

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TemporalSlice](../classes/TemporalSlice.md) | Time-related state including navigation, playback, and filtering |  no  |






## Properties

* Range: [TimeInstant](../classes/TimeInstant.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:currentTime |
| native | debrief:currentTime |




## LinkML Source

<details>
```yaml
name: currentTime
description: Current playback/display time (FR-005)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: currentTime
owner: TemporalSlice
domain_of:
- TemporalSlice
range: TimeInstant

```
</details>