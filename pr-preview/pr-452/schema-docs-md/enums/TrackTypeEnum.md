# Enum: TrackTypeEnum 




_Type of track feature_



URI: [debrief:enum/TrackTypeEnum](https://debrief.info/schemas/enum/TrackTypeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| OWNSHIP | None | Own ship track |
| CONTACT | None | Contact/target track |
| REFERENCE | None | Reference track |
| SOLUTION | None | Solution/analysis track |




## Slots

| Name | Description |
| ---  | --- |
| [track_type](../slots/track_type.md) | Type of track |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: TrackTypeEnum
description: Type of track feature
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  OWNSHIP:
    text: OWNSHIP
    description: Own ship track
  CONTACT:
    text: CONTACT
    description: Contact/target track
  REFERENCE:
    text: REFERENCE
    description: Reference track
  SOLUTION:
    text: SOLUTION
    description: Solution/analysis track

```
</details>