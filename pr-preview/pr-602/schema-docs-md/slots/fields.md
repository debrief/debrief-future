

# Slot: fields 


_Non-empty list of field names touched in this commit. Sorted alphabetically for deterministic replay._

__





URI: [debrief:slot/fields](https://debrief.info/schemas/slot/fields)
Alias: fields

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PropertiesProvenanceEntry](../classes/PropertiesProvenanceEntry.md) | Single entry in item |  no  |






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
| self | debrief:fields |
| native | debrief:fields |




## LinkML Source

<details>
```yaml
name: fields
description: 'Non-empty list of field names touched in this commit. Sorted alphabetically
  for deterministic replay.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: fields
owner: PropertiesProvenanceEntry
domain_of:
- PropertiesProvenanceEntry
range: string
required: true
multivalued: true
minimum_cardinality: 1

```
</details>