# Enum: DisplayModeEnum 




_Track visualization display mode. `full` renders the entire track regardless of current time; `trail` renders a snail-trail from track start up to current time._



URI: [debrief:enum/DisplayModeEnum](https://debrief.info/schemas/enum/DisplayModeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| full | None | Render the entire track regardless of current time |
| trail | None | Render a snail-trail from track start up to current time |




## Slots

| Name | Description |
| ---  | --- |
| [displayMode](../slots/displayMode.md) | Track visualization mode (FR-011) |
| [display_mode](../slots/display_mode.md) | Time-controller display mode at capture time (full = entire track history; tr... |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: DisplayModeEnum
description: Track visualization display mode. `full` renders the entire track regardless
  of current time; `trail` renders a snail-trail from track start up to current time.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  full:
    text: full
    description: Render the entire track regardless of current time
  trail:
    text: trail
    description: Render a snail-trail from track start up to current time

```
</details>