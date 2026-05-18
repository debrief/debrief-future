

# Slot: input 


_Free-form per-tool input payload (Article XV.2 exception — narrowed by per-tool Pydantic input model at dispatch)._





URI: [debrief:slot/input](https://debrief.info/schemas/slot/input)
Alias: input

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPRequest](../classes/MCPRequest.md) | MCP tool invocation envelope |  no  |






## Properties

* Range: [Any](../classes/Any.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:input |
| native | debrief:input |




## LinkML Source

<details>
```yaml
name: input
description: Free-form per-tool input payload (Article XV.2 exception — narrowed by
  per-tool Pydantic input model at dispatch).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: input
owner: MCPRequest
domain_of:
- MCPRequest
range: Any
required: true

```
</details>