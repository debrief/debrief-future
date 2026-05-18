

# Slot: category 


_Visual category for Log Panel icon rendering. Null / absent tools render with the neutral-grey "Other" icon. First-party tools MUST declare a value (enforced by test policy; see specs/207-tool-manifest-categories/research.md §R5). Feature 207._





URI: [debrief:slot/category](https://debrief.info/schemas/slot/category)
Alias: category

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |






## Properties

* Range: [ToolCategoryEnum](../enums/ToolCategoryEnum.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:category |
| native | debrief:category |




## LinkML Source

<details>
```yaml
name: category
description: Visual category for Log Panel icon rendering. Null / absent tools render
  with the neutral-grey "Other" icon. First-party tools MUST declare a value (enforced
  by test policy; see specs/207-tool-manifest-categories/research.md §R5). Feature
  207.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: category
owner: Tool
domain_of:
- Tool
range: ToolCategoryEnum
required: false

```
</details>