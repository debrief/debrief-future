

# Slot: playbackRate 


_Playback speed multiplier 0.1-100x (FR-009)_





URI: [debrief:slot/playbackRate](https://debrief.info/schemas/slot/playbackRate)
Alias: playbackRate

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TemporalSlice](../classes/TemporalSlice.md) | Time-related state including navigation, playback, and filtering |  no  |






## Properties

* Range: [Float](../types/Float.md)

* Required: True

* Minimum Value: 0

* Maximum Value: 100




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:playbackRate |
| native | debrief:playbackRate |




## LinkML Source

<details>
```yaml
name: playbackRate
description: Playback speed multiplier 0.1-100x (FR-009)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: playbackRate
owner: TemporalSlice
domain_of:
- TemporalSlice
range: float
required: true
minimum_value: 0.1
maximum_value: 100.0

```
</details>