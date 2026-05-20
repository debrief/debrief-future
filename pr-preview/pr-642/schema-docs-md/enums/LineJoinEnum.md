# Enum: LineJoinEnum 




_How line segment joints are rendered (SVG/CSS standard)_



URI: [debrief:enum/LineJoinEnum](https://debrief.info/schemas/enum/LineJoinEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| miter | None | Sharp corner (default) |
| round | None | Rounded corner |
| bevel | None | Flat corner |




## Slots

| Name | Description |
| ---  | --- |
| [line_join](../slots/line_join.md) | Line join style |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: LineJoinEnum
description: How line segment joints are rendered (SVG/CSS standard)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  miter:
    text: miter
    description: Sharp corner (default)
  round:
    text: round
    description: Rounded corner
  bevel:
    text: bevel
    description: Flat corner

```
</details>