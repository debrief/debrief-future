

# Slot: agent 


_Human actor (e.g. analyst username) who triggered the operation. Added by #215 for Storyboarding CRUD provenance; optional and useful to any tool emitting LogEntry records._





URI: [debrief:slot/agent](https://debrief.info/schemas/slot/agent)
Alias: agent

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:agent |
| native | debrief:agent |




## LinkML Source

<details>
```yaml
name: agent
description: 'Human actor (e.g. analyst username) who triggered the operation. Added
  by #215 for Storyboarding CRUD provenance; optional and useful to any tool emitting
  LogEntry records.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: agent
owner: LogEntry
domain_of:
- LogEntry
range: string
required: false

```
</details>