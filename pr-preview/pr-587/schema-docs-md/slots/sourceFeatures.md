

# Slot: sourceFeatures 


_IDs of input features used to generate this result_





URI: [debrief:sourceFeatures](https://debrief.info/schemas/sourceFeatures)
Alias: sourceFeatures

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultAnnotations](../classes/ToolResultAnnotations.md) | Annotations for MCP tool result content items |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:sourceFeatures |
| native | debrief:sourceFeatures |




## LinkML Source

<details>
```yaml
name: sourceFeatures
description: IDs of input features used to generate this result
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:sourceFeatures
alias: sourceFeatures
owner: ToolResultAnnotations
domain_of:
- ToolResultAnnotations
range: string
required: true
multivalued: true
minimum_cardinality: 1

```
</details>