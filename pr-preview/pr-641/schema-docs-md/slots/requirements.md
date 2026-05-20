

# Slot: requirements 


_List of selection requirements. Tool is active when ALL requirements are satisfied by the current selection. Empty list means tool accepts any selection._





URI: [debrief:slot/requirements](https://debrief.info/schemas/slot/requirements)
Alias: requirements

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |






## Properties

* Range: [SelectionRequirement](../classes/SelectionRequirement.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:requirements |
| native | debrief:requirements |




## LinkML Source

<details>
```yaml
name: requirements
description: List of selection requirements. Tool is active when ALL requirements
  are satisfied by the current selection. Empty list means tool accepts any selection.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: requirements
owner: Tool
domain_of:
- Tool
range: SelectionRequirement
required: false
multivalued: true
inlined: true
inlined_as_list: true

```
</details>