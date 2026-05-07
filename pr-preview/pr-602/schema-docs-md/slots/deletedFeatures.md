

# Slot: deletedFeatures 


_IDs of features removed (REQUIRED for deletions)_





URI: [debrief:deletedFeatures](https://debrief.info/schemas/deletedFeatures)
Alias: deletedFeatures

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultAnnotations](../classes/ToolResultAnnotations.md) | Annotations for MCP tool result content items |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:deletedFeatures |
| native | debrief:deletedFeatures |




## LinkML Source

<details>
```yaml
name: deletedFeatures
description: IDs of features removed (REQUIRED for deletions)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:deletedFeatures
alias: deletedFeatures
owner: ToolResultAnnotations
domain_of:
- ToolResultAnnotations
range: string
multivalued: true
minimum_cardinality: 1

```
</details>