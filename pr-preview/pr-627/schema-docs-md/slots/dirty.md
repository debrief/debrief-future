

# Slot: dirty 


_Unsaved changes exist - ephemeral (FR-020)_





URI: [debrief:slot/dirty](https://debrief.info/schemas/slot/dirty)
Alias: dirty

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [DocumentSlice](../classes/DocumentSlice.md) | Editor lifecycle state including dirty tracking and undo history |  no  |






## Properties

* Range: [Boolean](../types/Boolean.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:dirty |
| native | debrief:dirty |




## LinkML Source

<details>
```yaml
name: dirty
description: Unsaved changes exist - ephemeral (FR-020)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: dirty
owner: DocumentSlice
domain_of:
- DocumentSlice
range: boolean
required: true

```
</details>