

# Slot: storyboard_id 


_Foreign key to parent Storyboard.properties.id (ULID)._





URI: [debrief:slot/storyboard_id](https://debrief.info/schemas/slot/storyboard_id)
Alias: storyboard_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^[0-9A-HJKMNP-TV-Z]{26}$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:storyboard_id |
| native | debrief:storyboard_id |




## LinkML Source

<details>
```yaml
name: storyboard_id
description: Foreign key to parent Storyboard.properties.id (ULID).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: storyboard_id
owner: SceneProperties
domain_of:
- SceneProperties
range: string
required: true
pattern: ^[0-9A-HJKMNP-TV-Z]{26}$

```
</details>