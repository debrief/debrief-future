

# Slot: used 


_Feature IDs of inputs. May be empty for operations with no explicit inputs._





URI: [debrief:slot/used](https://debrief.info/schemas/slot/used)
Alias: used

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
| self | debrief:used |
| native | debrief:used |




## LinkML Source

<details>
```yaml
name: used
description: Feature IDs of inputs. May be empty for operations with no explicit inputs.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: used
owner: LogEntry
domain_of:
- LogEntry
range: string
required: true
multivalued: true

```
</details>