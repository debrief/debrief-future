

# Slot: collection 


_Parent Collection ID, when the Item belongs to a Collection (STAC 1.1 optional field)._





URI: [debrief:slot/collection](https://debrief.info/schemas/slot/collection)
Alias: collection

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItem](../classes/StacItem.md) | A STAC 1 |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:collection |
| native | debrief:collection |




## LinkML Source

<details>
```yaml
name: collection
description: Parent Collection ID, when the Item belongs to a Collection (STAC 1.1
  optional field).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: collection
owner: StacItem
domain_of:
- StacItem
range: string
required: false

```
</details>