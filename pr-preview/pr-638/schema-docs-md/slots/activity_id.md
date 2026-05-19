

# Slot: activity_id 



URI: [debrief:slot/activity_id](https://debrief.info/schemas/slot/activity_id)
Alias: activity_id

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [PropertiesProvenanceEntry](../classes/PropertiesProvenanceEntry.md) | Single entry in item |  no  |
| [FileProvEntry](../classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |  no  |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:activity_id |
| native | debrief:activity_id |




## LinkML Source

<details>
```yaml
name: activity_id
alias: activity_id
domain_of:
- LogEntry
- FileProvEntry
- PropertiesProvenanceEntry
range: string

```
</details>