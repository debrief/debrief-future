

# Slot: direction 


_'source' or 'target' (for branch events)._





URI: [debrief:slot/direction](https://debrief.info/schemas/slot/direction)
Alias: direction

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [FileProvEntry](../classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |  no  |






## Properties

* Range: [FileProvDirectionEnum](../enums/FileProvDirectionEnum.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:direction |
| native | debrief:direction |




## LinkML Source

<details>
```yaml
name: direction
description: '''source'' or ''target'' (for branch events).'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: direction
owner: FileProvEntry
domain_of:
- FileProvEntry
range: FileProvDirectionEnum
required: false

```
</details>