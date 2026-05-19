# Enum: ArrayCentreModeEnum 




_Array centre calculation mode for towed array sensors_



URI: [debrief:enum/ArrayCentreModeEnum](https://debrief.info/schemas/enum/ArrayCentreModeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| PLAIN | None | Simple backtrack along vessel heading |
| WORM | None | Follow vessel track path backwards |
| MEASURED | None | Use actual measured array positions |




## Slots

| Name | Description |
| ---  | --- |
| [array_centre_mode](../slots/array_centre_mode.md) | How bearing line origin is calculated relative to host platform |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ArrayCentreModeEnum
description: Array centre calculation mode for towed array sensors
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  PLAIN:
    text: PLAIN
    description: Simple backtrack along vessel heading
  WORM:
    text: WORM
    description: Follow vessel track path backwards
  MEASURED:
    text: MEASURED
    description: Use actual measured array positions

```
</details>