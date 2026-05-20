

# Slot: schema_version 


_Schema version. Bumped to 2 by #259 (relax timestamp uniqueness + add `SceneProperties.creation_order`). Pre-#259 plots carrying `schema_version: 1` are rejected at load with `UnsupportedSchemaVersionError` — no in-place migration is provided (Article XIV pre-release freedom; FR-010 in #259 spec). Monotonically non-decreasing across edits; bumped only by migrations or breaking schema changes._





URI: [debrief:slot/schema_version](https://debrief.info/schemas/slot/schema_version)
Alias: schema_version

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |






## Properties

* Range: [Integer](../types/Integer.md)

* Required: True

* Minimum Value: 2




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:schema_version |
| native | debrief:schema_version |




## LinkML Source

<details>
```yaml
name: schema_version
description: 'Schema version. Bumped to 2 by #259 (relax timestamp uniqueness + add
  `SceneProperties.creation_order`). Pre-#259 plots carrying `schema_version: 1` are
  rejected at load with `UnsupportedSchemaVersionError` — no in-place migration is
  provided (Article XIV pre-release freedom; FR-010 in #259 spec). Monotonically non-decreasing
  across edits; bumped only by migrations or breaking schema changes.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: schema_version
owner: StoryboardProperties
domain_of:
- StoryboardProperties
range: integer
required: true
minimum_value: 2

```
</details>