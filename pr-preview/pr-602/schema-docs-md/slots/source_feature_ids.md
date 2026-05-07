

# Slot: source_feature_ids 


_IDs of the source features the tool operated on_





URI: [debrief:slot/source_feature_ids](https://debrief.info/schemas/slot/source_feature_ids)
Alias: source_feature_ids

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LastToolExecution](../classes/LastToolExecution.md) | Record of the last tool execution, enabling single-step undo |  no  |






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
| self | debrief:source_feature_ids |
| native | debrief:source_feature_ids |




## LinkML Source

<details>
```yaml
name: source_feature_ids
description: IDs of the source features the tool operated on
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: source_feature_ids
owner: LastToolExecution
domain_of:
- LastToolExecution
range: string
required: true
multivalued: true

```
</details>