

# Slot: error 


_Nested error object `{ code, message, data: { debrief:errorCategory, debrief:affectedFeatures } }`. Free-form per Article XV.2 because the inner `data` map uses colon-bearing keys outside LinkML slot syntax._





URI: [debrief:slot/error](https://debrief.info/schemas/slot/error)
Alias: error

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPErrorResponse](../classes/MCPErrorResponse.md) | MCP error response envelope |  no  |






## Properties

* Range: [Any](../classes/Any.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:error |
| native | debrief:error |




## LinkML Source

<details>
```yaml
name: error
description: 'Nested error object `{ code, message, data: { debrief:errorCategory,
  debrief:affectedFeatures } }`. Free-form per Article XV.2 because the inner `data`
  map uses colon-bearing keys outside LinkML slot syntax.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: error
owner: MCPErrorResponse
domain_of:
- MCPErrorResponse
range: Any
required: true

```
</details>