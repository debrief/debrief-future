

# Slot: time_range 


_For instant Scenes (#215 default): MUST be absent. For time-range Scenes (#263): a TimeRange sub-record. When present, the Scene is the time-range flavour and `viewport_end` MUST also be present. See cross-field rule `scene-flavour-xor-rule`._





URI: [debrief:slot/time_range](https://debrief.info/schemas/slot/time_range)
Alias: time_range

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [TimeRange](../classes/TimeRange.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:time_range |
| native | debrief:time_range |




## LinkML Source

<details>
```yaml
name: time_range
description: 'For instant Scenes (#215 default): MUST be absent. For time-range Scenes
  (#263): a TimeRange sub-record. When present, the Scene is the time-range flavour
  and `viewport_end` MUST also be present. See cross-field rule `scene-flavour-xor-rule`.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: time_range
owner: SceneProperties
domain_of:
- SceneProperties
range: TimeRange
required: false

```
</details>