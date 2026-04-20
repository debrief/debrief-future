

# Slot: param_type 


_References a schema-defined parameter-type enum by name. When set, the client resolves enum values from generated types rather than using inline choices._





URI: [debrief:slot/param_type](https://debrief.info/schemas/slot/param_type)
Alias: param_type

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolParameter](../classes/ToolParameter.md) | A configurable parameter for a tool |  no  |






## Properties

* Range: [ParameterTypeEnum](../enums/ParameterTypeEnum.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:param_type |
| native | debrief:param_type |




## LinkML Source

<details>
```yaml
name: param_type
description: References a schema-defined parameter-type enum by name. When set, the
  client resolves enum values from generated types rather than using inline choices.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: param_type
owner: ToolParameter
domain_of:
- ToolParameter
range: ParameterTypeEnum
required: false

```
</details>