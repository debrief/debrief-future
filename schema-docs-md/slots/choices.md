

# Slot: choices 


_Explicit choice list for enum-typed parameters when the client cannot (or chooses not to) resolve a schema-defined `param_type`. Used by both the ToolMatch picker (shared/components) and the VS Code activity-panel adapter (apps/vscode/src/services/mcpToolAdapter.ts). Added under spec 222 (P2) to collapse the drift cluster attributed to ToolParameter (audit §3.2 rows 37 and 86)._





URI: [debrief:slot/choices](https://debrief.info/schemas/slot/choices)
Alias: choices

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolParameter](../classes/ToolParameter.md) | A configurable parameter for a tool |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:choices |
| native | debrief:choices |




## LinkML Source

<details>
```yaml
name: choices
description: Explicit choice list for enum-typed parameters when the client cannot
  (or chooses not to) resolve a schema-defined `param_type`. Used by both the ToolMatch
  picker (shared/components) and the VS Code activity-panel adapter (apps/vscode/src/services/mcpToolAdapter.ts).
  Added under spec 222 (P2) to collapse the drift cluster attributed to ToolParameter
  (audit §3.2 rows 37 and 86).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: choices
owner: ToolParameter
domain_of:
- ToolParameter
range: string
required: false
multivalued: true

```
</details>