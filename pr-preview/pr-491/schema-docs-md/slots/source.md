

# Slot: source 


_Origin of the edit. MUST equal "user" — Properties Panel edits are human-initiated._

__





URI: [debrief:slot/source](https://debrief.info/schemas/slot/source)
Alias: source

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PropertiesProvenanceEntry](../classes/PropertiesProvenanceEntry.md) | Single entry in item |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^user$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:source |
| native | debrief:source |




## LinkML Source

<details>
```yaml
name: source
description: 'Origin of the edit. MUST equal "user" — Properties Panel edits are human-initiated.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: source
owner: PropertiesProvenanceEntry
domain_of:
- PropertiesProvenanceEntry
range: string
required: true
pattern: ^user$

```
</details>