# Enum: PointShapeEnum 




_Valid shapes for point markers_



URI: [debrief:enum/PointShapeEnum](https://debrief.info/schemas/enum/PointShapeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| circle | None | Filled/stroked circle (default marker) |
| square | None | Filled/stroked square (reference points) |
| triangle | None | Filled/stroked triangle (directional indicators) |
| diamond | None | Diamond shape |
| cross | None | Cross/plus shape |




## Slots

| Name | Description |
| ---  | --- |
| [shape](../slots/shape.md) | Marker shape |
| [symbol](../slots/symbol.md) | Shape to use for position symbols |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: PointShapeEnum
description: Valid shapes for point markers
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  circle:
    text: circle
    description: Filled/stroked circle (default marker)
  square:
    text: square
    description: Filled/stroked square (reference points)
  triangle:
    text: triangle
    description: Filled/stroked triangle (directional indicators)
  diamond:
    text: diamond
    description: Diamond shape
  cross:
    text: cross
    description: Cross/plus shape

```
</details>