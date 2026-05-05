

# Slot: displayMode 


_Track visualization mode (FR-011)_





URI: [debrief:slot/displayMode](https://debrief.info/schemas/slot/displayMode)
Alias: displayMode

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TemporalSlice](../classes/TemporalSlice.md) | Time-related state including navigation, playback, and filtering |  no  |






## Properties

* Range: [DisplayModeEnum](../enums/DisplayModeEnum.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:displayMode |
| native | debrief:displayMode |




## LinkML Source

<details>
```yaml
name: displayMode
description: Track visualization mode (FR-011)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: displayMode
owner: TemporalSlice
domain_of:
- TemporalSlice
range: DisplayModeEnum
required: true

```
</details>