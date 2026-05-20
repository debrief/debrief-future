

# Slot: is_error 


_Reserved for streaming partial-error responses (additive over the live wire format)._





URI: [debrief:slot/is_error](https://debrief.info/schemas/slot/is_error)
Alias: is_error

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPToolResponse](../classes/MCPToolResponse.md) | Successful MCP tool response |  no  |






## Properties

* Range: [Boolean](../types/Boolean.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:is_error |
| native | debrief:is_error |




## LinkML Source

<details>
```yaml
name: is_error
description: Reserved for streaming partial-error responses (additive over the live
  wire format).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: is_error
owner: MCPToolResponse
domain_of:
- MCPToolResponse
range: boolean

```
</details>