

# Slot: execution_duration 


_Wall-clock execution time in ISO 8601 duration format (e.g., PT0.3S)._





URI: [debrief:slot/execution_duration](https://debrief.info/schemas/slot/execution_duration)
Alias: execution_duration

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^PT[0-9]+(\.[0-9]+)?S$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:execution_duration |
| native | debrief:execution_duration |




## LinkML Source

<details>
```yaml
name: execution_duration
description: Wall-clock execution time in ISO 8601 duration format (e.g., PT0.3S).
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: execution_duration
owner: LogEntry
domain_of:
- LogEntry
range: string
required: true
pattern: ^PT[0-9]+(\.[0-9]+)?S$

```
</details>