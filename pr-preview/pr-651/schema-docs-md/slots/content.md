

# Slot: content 


_Ordered list of content items returned by the tool._





URI: [debrief:slot/content](https://debrief.info/schemas/slot/content)
Alias: content

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPToolResponse](../classes/MCPToolResponse.md) | Successful MCP tool response |  no  |






## Properties

* Range: [MCPContentItem](../classes/MCPContentItem.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:content |
| native | debrief:content |




## LinkML Source

<details>
```yaml
name: content
description: Ordered list of content items returned by the tool.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: content
owner: MCPToolResponse
domain_of:
- MCPToolResponse
range: MCPContentItem
required: true
multivalued: true

```
</details>