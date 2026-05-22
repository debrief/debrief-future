

# Slot: parameters 



URI: [debrief:slot/parameters](https://debrief.info/schemas/slot/parameters)
Alias: parameters

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResult](../classes/ToolResult.md) | Logical tool invocation result as seen by the consumer (after the MCP layer h... |  no  |
| [WasGeneratedBy](../classes/WasGeneratedBy.md) | Identifies the tool and its parameters for a specific invocation |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:parameters |
| native | debrief:parameters |




## LinkML Source

<details>
```yaml
name: parameters
alias: parameters
domain_of:
- WasGeneratedBy
- ToolResult
range: string

```
</details>