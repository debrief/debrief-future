

# Slot: document 


_Editor state_





URI: [debrief:slot/document](https://debrief.info/schemas/slot/document)
Alias: document

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SessionState](../classes/SessionState.md) | Root entity containing all session state slices (FR-001, FR-002) |  no  |






## Properties

* Range: [DocumentSlice](../classes/DocumentSlice.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:document |
| native | debrief:document |




## LinkML Source

<details>
```yaml
name: document
description: Editor state
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: document
owner: SessionState
domain_of:
- SessionState
range: DocumentSlice
required: true

```
</details>