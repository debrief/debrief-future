

# Slot: payload 


_Nested payload `{ tools, hasToolInventory?, hasSelection? }`. Free-form per Article XV.2._





URI: [debrief:slot/payload](https://debrief.info/schemas/slot/payload)
Alias: payload

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolsUpdateMessage](../classes/ToolsUpdateMessage.md) | Push notification from the extension host to the activity-panel webview when ... |  no  |






## Properties

* Range: [Any](../classes/Any.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:payload |
| native | debrief:payload |




## LinkML Source

<details>
```yaml
name: payload
description: Nested payload `{ tools, hasToolInventory?, hasSelection? }`. Free-form
  per Article XV.2.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: payload
owner: ToolsUpdateMessage
domain_of:
- ToolsUpdateMessage
range: Any
required: true

```
</details>