

# Slot: store_id 


_Parent store identifier (needed for URI construction)_





URI: [debrief:slot/store_id](https://debrief.info/schemas/slot/store_id)
Alias: store_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItemSummary](../classes/StacItemSummary.md) | Minimal STAC Item projection for browser tree display and metadata filtering |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:store_id |
| native | debrief:store_id |




## LinkML Source

<details>
```yaml
name: store_id
description: Parent store identifier (needed for URI construction)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: store_id
owner: StacItemSummary
domain_of:
- StacItemSummary
range: string
required: true

```
</details>