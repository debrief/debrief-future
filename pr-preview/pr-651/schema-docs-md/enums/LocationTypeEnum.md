# Enum: LocationTypeEnum 




_Type of reference location_



URI: [debrief:enum/LocationTypeEnum](https://debrief.info/schemas/enum/LocationTypeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| WAYPOINT | None | Navigation waypoint |
| EXERCISE_AREA | None | Exercise area boundary |
| DANGER_AREA | None | Danger/exclusion zone |
| ANCHORAGE | None | Anchorage location |
| PORT | None | Port/harbor |
| REFERENCE | None | Generic reference point |




## Slots

| Name | Description |
| ---  | --- |
| [location_type](../slots/location_type.md) | Type of reference |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: LocationTypeEnum
description: Type of reference location
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  WAYPOINT:
    text: WAYPOINT
    description: Navigation waypoint
  EXERCISE_AREA:
    text: EXERCISE_AREA
    description: Exercise area boundary
  DANGER_AREA:
    text: DANGER_AREA
    description: Danger/exclusion zone
  ANCHORAGE:
    text: ANCHORAGE
    description: Anchorage location
  PORT:
    text: PORT
    description: Port/harbor
  REFERENCE:
    text: REFERENCE
    description: Generic reference point

```
</details>