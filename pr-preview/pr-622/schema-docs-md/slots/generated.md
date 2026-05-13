

# Slot: generated 


_Feature IDs or versioned asset paths of outputs. May be empty for in-place modifications._





URI: [debrief:slot/generated](https://debrief.info/schemas/slot/generated)
Alias: generated

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






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
| self | debrief:generated |
| native | debrief:generated |




## LinkML Source

<details>
```yaml
name: generated
description: Feature IDs or versioned asset paths of outputs. May be empty for in-place
  modifications.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: generated
owner: LogEntry
domain_of:
- LogEntry
range: string
required: true
multivalued: true

```
</details>