# Enum: LineLabelPositionEnum 




_Position along the bearing line where the label is placed_



URI: [debrief:enum/LineLabelPositionEnum](https://debrief.info/schemas/enum/LineLabelPositionEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| START | None | At the origin (sensor location) |
| MIDDLE | None | At the midpoint of the bearing line |
| END | None | At the far end of the bearing line |




## Slots

| Name | Description |
| ---  | --- |
| [put_label_at](../slots/put_label_at.md) | Label position along bearing line |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: LineLabelPositionEnum
description: Position along the bearing line where the label is placed
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  START:
    text: START
    description: At the origin (sensor location)
  MIDDLE:
    text: MIDDLE
    description: At the midpoint of the bearing line
  END:
    text: END
    description: At the far end of the bearing line

```
</details>