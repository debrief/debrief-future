

# Slot: result_layer_ids 


_IDs of the result layers produced by the tool_





URI: [debrief:slot/result_layer_ids](https://debrief.info/schemas/slot/result_layer_ids)
Alias: result_layer_ids

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
| self | debrief:result_layer_ids |
| native | debrief:result_layer_ids |




## LinkML Source

<details>
```yaml
name: result_layer_ids
description: IDs of the result layers produced by the tool
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: result_layer_ids
owner: LastToolExecution
domain_of:
- LastToolExecution
range: string
required: true
multivalued: true

```
</details>