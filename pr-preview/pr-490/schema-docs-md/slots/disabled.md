

# Slot: disabled 


_Whether this entry is skipped during replay. Toggled via the flip-card edit face._





URI: [debrief:slot/disabled](https://debrief.info/schemas/slot/disabled)
Alias: disabled

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






## Properties

* Range: [Boolean](../types/Boolean.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:disabled |
| native | debrief:disabled |




## LinkML Source

<details>
```yaml
name: disabled
description: Whether this entry is skipped during replay. Toggled via the flip-card
  edit face.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
ifabsent: 'false'
alias: disabled
owner: LogEntry
domain_of:
- LogEntry
range: boolean
required: false

```
</details>