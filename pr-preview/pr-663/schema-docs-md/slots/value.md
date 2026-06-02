

# Slot: value 



URI: [debrief:slot/value](https://debrief.info/schemas/slot/value)
Alias: value

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolParameterMeta](../classes/ToolParameterMeta.md) | Tunable parameter metadata recorded alongside a tool result for provenance |  no  |
| [ParameterValue](../classes/ParameterValue.md) | A typed parameter value with replay metadata |  no  |
| [TimeStep](../classes/TimeStep.md) | Step size for discrete time navigation (FR-008) |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:value |
| native | debrief:value |




## LinkML Source

<details>
```yaml
name: value
alias: value
domain_of:
- TimeStep
- ParameterValue
- ToolParameterMeta
range: string

```
</details>