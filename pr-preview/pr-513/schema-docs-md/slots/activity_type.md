

# Slot: activity_type 


_Semantic kind of this provenance record. Optional; absent records are treated as `tool` by consumers. Introduced by feature 208 so future entry types (manual checkpoint, standalone tune, manual rationale) can be distinguished without overloading visual tool-category. See `shared/components/src/LogPanel/types.ts` `TimelineEntryKind` for the UI-side mirror._





URI: [debrief:slot/activity_type](https://debrief.info/schemas/slot/activity_type)
Alias: activity_type

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






## Properties

* Range: [ActivityType](../enums/ActivityType.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:activity_type |
| native | debrief:activity_type |




## LinkML Source

<details>
```yaml
name: activity_type
description: Semantic kind of this provenance record. Optional; absent records are
  treated as `tool` by consumers. Introduced by feature 208 so future entry types
  (manual checkpoint, standalone tune, manual rationale) can be distinguished without
  overloading visual tool-category. See `shared/components/src/LogPanel/types.ts`
  `TimelineEntryKind` for the UI-side mirror.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: activity_type
owner: LogEntry
domain_of:
- LogEntry
range: ActivityType
required: false

```
</details>