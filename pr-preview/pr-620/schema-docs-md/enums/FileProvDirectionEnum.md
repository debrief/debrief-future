# Enum: FileProvDirectionEnum 




_Direction of a branch event._



URI: [debrief:enum/FileProvDirectionEnum](https://debrief.info/schemas/enum/FileProvDirectionEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| source | None | This file is the source of the branch |
| target | None | This file is the target of the branch |




## Slots

| Name | Description |
| ---  | --- |
| [direction](../slots/direction.md) | 'source' or 'target' (for branch events) |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: FileProvDirectionEnum
description: Direction of a branch event.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  source:
    text: source
    description: This file is the source of the branch
  target:
    text: target
    description: This file is the target of the branch

```
</details>