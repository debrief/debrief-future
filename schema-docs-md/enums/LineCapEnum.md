# Enum: LineCapEnum 




_How line endpoints are rendered (SVG/CSS standard)_



URI: [debrief:enum/LineCapEnum](https://debrief.info/schemas/enum/LineCapEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| butt | None | Flat edge at endpoint |
| round | None | Semicircle at endpoint |
| square | None | Square projection beyond endpoint |




## Slots

| Name | Description |
| ---  | --- |
| [line_cap](../slots/line_cap.md) | Line endpoint style |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: LineCapEnum
description: How line endpoints are rendered (SVG/CSS standard)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  butt:
    text: butt
    description: Flat edge at endpoint
  round:
    text: round
    description: Semicircle at endpoint
  square:
    text: square
    description: Square projection beyond endpoint

```
</details>