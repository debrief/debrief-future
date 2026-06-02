# Enum: SystemStateTypeEnum 




_Discriminator for system state variants_



URI: [debrief:enum/SystemStateTypeEnum](https://debrief.info/schemas/enum/SystemStateTypeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| temporal | None | Time viewport state (start/end times) |
| spatial | None | Map viewport state (ViewportPolygon) |
| selection | None | Feature selection state (selected IDs) |
| active_storyboard | None | Per-plot active-Storyboard pin (#237) |




## Slots

| Name | Description |
| ---  | --- |
| [state_type](../slots/state_type.md) | Discriminator for state variant (temporal, spatial, selection, active_storybo... |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: SystemStateTypeEnum
description: Discriminator for system state variants
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  temporal:
    text: temporal
    description: Time viewport state (start/end times)
  spatial:
    text: spatial
    description: Map viewport state (ViewportPolygon)
  selection:
    text: selection
    description: Feature selection state (selected IDs)
  active_storyboard:
    text: active_storyboard
    description: Per-plot active-Storyboard pin (#237)

```
</details>