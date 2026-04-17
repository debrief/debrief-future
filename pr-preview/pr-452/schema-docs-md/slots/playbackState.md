

# Slot: playbackState 


_Current playback state - ephemeral (FR-010)_





URI: [debrief:slot/playbackState](https://debrief.info/schemas/slot/playbackState)
Alias: playbackState

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TemporalSlice](../classes/TemporalSlice.md) | Time-related state including navigation, playback, and filtering |  no  |






## Properties

* Range: [PlaybackStateEnum](../enums/PlaybackStateEnum.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:playbackState |
| native | debrief:playbackState |




## LinkML Source

<details>
```yaml
name: playbackState
description: Current playback state - ephemeral (FR-010)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: playbackState
owner: TemporalSlice
domain_of:
- TemporalSlice
range: PlaybackStateEnum
required: true

```
</details>