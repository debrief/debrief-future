

# Slot: timestamp 



URI: [debrief:slot/timestamp](https://debrief.info/schemas/slot/timestamp)
Alias: timestamp

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |
| [FeatureSelection](../classes/FeatureSelection.md) | Set of selected feature identifiers with metadata (FR-017) |  no  |
| [TuneAnnotation](../classes/TuneAnnotation.md) | Records a parameter modification (appended, not replacing original) |  no  |
| [SceneProperties](../classes/SceneProperties.md) | Properties class for a Scene child Feature |  no  |
| [PropertiesProvenanceEntry](../classes/PropertiesProvenanceEntry.md) | Single entry in item |  no  |
| [FileProvEntry](../classes/FileProvEntry.md) | File-level provenance event (snapshot or branch creation) |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:timestamp |
| native | debrief:timestamp |




## LinkML Source

<details>
```yaml
name: timestamp
alias: timestamp
domain_of:
- LogEntry
- TuneAnnotation
- FileProvEntry
- PropertiesProvenanceEntry
- FeatureSelection
- SceneProperties
range: string

```
</details>