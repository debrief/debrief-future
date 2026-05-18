

# Slot: display_mode 


_Time-controller display mode at capture time (full = entire track history; trail = only the tail behind each platform). Reuses DisplayModeEnum from session-state.yaml. Optional for legacy compatibility (Spec #258): readers MUST leave the time controller untouched when this slot is absent (FR-003). Writers populate it from session.displayMode at the moment the scene is created._





URI: [debrief:slot/display_mode](https://debrief.info/schemas/slot/display_mode)
Alias: display_mode

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [DisplayModeEnum](../enums/DisplayModeEnum.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:display_mode |
| native | debrief:display_mode |




## LinkML Source

<details>
```yaml
name: display_mode
description: 'Time-controller display mode at capture time (full = entire track history;
  trail = only the tail behind each platform). Reuses DisplayModeEnum from session-state.yaml.
  Optional for legacy compatibility (Spec #258): readers MUST leave the time controller
  untouched when this slot is absent (FR-003). Writers populate it from session.displayMode
  at the moment the scene is created.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: display_mode
owner: SceneProperties
domain_of:
- SceneProperties
range: DisplayModeEnum
required: false

```
</details>