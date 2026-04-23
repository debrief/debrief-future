

# Slot: savedAt 


_When the session was saved (ISO 8601)_





URI: [debrief:slot/savedAt](https://debrief.info/schemas/slot/savedAt)
Alias: savedAt

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SessionFile](../classes/SessionFile.md) | Persisted session file format (FR-024) |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:savedAt |
| native | debrief:savedAt |




## LinkML Source

<details>
```yaml
name: savedAt
description: When the session was saved (ISO 8601)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: savedAt
owner: SessionFile
domain_of:
- SessionFile
range: string
required: true

```
</details>