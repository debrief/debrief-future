

# Slot: resource 


_Nested resource descriptor `{ uri, mimeType, text }` when type=resource. Free-form per Article XV.2 (the inner shape is driven by individual tool authors)._





URI: [debrief:slot/resource](https://debrief.info/schemas/slot/resource)
Alias: resource

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [MCPContentItem](../classes/MCPContentItem.md) | A single MCP content item (resource, text, or image) |  no  |






## Properties

* Range: [Any](../classes/Any.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:resource |
| native | debrief:resource |




## LinkML Source

<details>
```yaml
name: resource
description: Nested resource descriptor `{ uri, mimeType, text }` when type=resource.
  Free-form per Article XV.2 (the inner shape is driven by individual tool authors).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: resource
owner: MCPContentItem
domain_of:
- MCPContentItem
range: Any

```
</details>