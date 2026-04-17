

# Slot: position_style_overrides 


_Parallel array of per-position style overrides. Same length as positions array. Use null entries for positions without custom styling._





URI: [debrief:slot/position_style_overrides](https://debrief.info/schemas/slot/position_style_overrides)
Alias: position_style_overrides

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TrackProperties](../classes/TrackProperties.md) | Properties for a TrackFeature |  no  |






## Properties

* Range: [PositionStyleOverride](../classes/PositionStyleOverride.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:position_style_overrides |
| native | debrief:position_style_overrides |




## LinkML Source

<details>
```yaml
name: position_style_overrides
description: Parallel array of per-position style overrides. Same length as positions
  array. Use null entries for positions without custom styling.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: position_style_overrides
owner: TrackProperties
domain_of:
- TrackProperties
range: PositionStyleOverride
multivalued: true

```
</details>