

# Slot: iso 


_ISO 8601 UTC format string_





URI: [debrief:slot/iso](https://debrief.info/schemas/slot/iso)
Alias: iso

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [TimeInstant](../classes/TimeInstant.md) | A point in time with dual representations (FR-032, FR-033) |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:iso |
| native | debrief:iso |




## LinkML Source

<details>
```yaml
name: iso
description: ISO 8601 UTC format string
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: iso
owner: TimeInstant
domain_of:
- TimeInstant
range: string
required: true
pattern: ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$

```
</details>