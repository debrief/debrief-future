

# Slot: interval 


_List of `[start_datetime, end_datetime]` pairs. Either side may be null (unbounded)._





URI: [debrief:slot/interval](https://debrief.info/schemas/slot/interval)
Alias: interval

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacTemporalExtent](../classes/StacTemporalExtent.md) | Temporal extent on a Collection |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:interval |
| native | debrief:interval |




## LinkML Source

<details>
```yaml
name: interval
description: List of `[start_datetime, end_datetime]` pairs. Either side may be null
  (unbounded).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: interval
owner: StacTemporalExtent
domain_of:
- StacTemporalExtent
range: string
required: true
multivalued: true

```
</details>