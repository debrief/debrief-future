

# Slot: schemaVersion 


_Schema version for persistence compatibility (FR-026)_





URI: [debrief:slot/schemaVersion](https://debrief.info/schemas/slot/schemaVersion)
Alias: schemaVersion

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SessionState](../classes/SessionState.md) | Root entity containing all session state slices (FR-001, FR-002) |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^\d+\.\d+\.\d+$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:schemaVersion |
| native | debrief:schemaVersion |




## LinkML Source

<details>
```yaml
name: schemaVersion
description: Schema version for persistence compatibility (FR-026)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: schemaVersion
owner: SessionState
domain_of:
- SessionState
range: string
required: true
pattern: ^\d+\.\d+\.\d+$

```
</details>