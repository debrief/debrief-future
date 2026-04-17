# Enum: SegmentTypeEnum 




_Discriminator for track segment types within compound tracks_



URI: [debrief:enum/SegmentTypeEnum](https://debrief.info/schemas/enum/SegmentTypeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| TRACK | None | Plain recorded track segment |
| ABSOLUTE_TMA | None | Target Motion Analysis leg with absolute geographic coordinates |
| RELATIVE_TMA | None | Target Motion Analysis leg relative to ownship position |
| DYNAMIC_INFILL | None | Interpolated segment between TMA legs |




## Slots

| Name | Description |
| ---  | --- |
| [segment_type](../slots/segment_type.md) | Segment type discriminator |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: SegmentTypeEnum
description: Discriminator for track segment types within compound tracks
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  TRACK:
    text: TRACK
    description: Plain recorded track segment
  ABSOLUTE_TMA:
    text: ABSOLUTE_TMA
    description: Target Motion Analysis leg with absolute geographic coordinates
  RELATIVE_TMA:
    text: RELATIVE_TMA
    description: Target Motion Analysis leg relative to ownship position
  DYNAMIC_INFILL:
    text: DYNAMIC_INFILL
    description: Interpolated segment between TMA legs

```
</details>