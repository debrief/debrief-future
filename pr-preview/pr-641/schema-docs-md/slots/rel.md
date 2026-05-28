

# Slot: rel 


_Link relation (`self`, `root`, `parent`, `item`, `child`, `derived_from`, etc.)._





URI: [debrief:slot/rel](https://debrief.info/schemas/slot/rel)
Alias: rel

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacLink](../classes/StacLink.md) | A single link entry within `links[]` |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:rel |
| native | debrief:rel |




## LinkML Source

<details>
```yaml
name: rel
description: Link relation (`self`, `root`, `parent`, `item`, `child`, `derived_from`,
  etc.).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: rel
owner: StacLink
domain_of:
- StacLink
range: string
required: true

```
</details>