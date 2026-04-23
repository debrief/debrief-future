

# Slot: schema_version 


_Schema version. Starts at 1. Monotonically non-decreasing across edits; bumped only by migrations._





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

* Minimum Value: 1




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
description: Schema version. Starts at 1. Monotonically non-decreasing across edits;
  bumped only by migrations.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: schema_version
owner: StoryboardProperties
domain_of:
- StoryboardProperties
range: integer
required: true
minimum_value: 1

```
</details>