

# Slot: features 



URI: [debrief:slot/features](https://debrief.info/schemas/slot/features)
Alias: features

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolResultForLog](../classes/ToolResultForLog.md) | Persisted tool-result shape written by the live tool-result logger and read b... |  no  |
| [SessionFile](../classes/SessionFile.md) | Persisted session file format (FR-024) |  no  |
| [SessionState](../classes/SessionState.md) | Root entity containing all session state slices (FR-001, FR-002) |  no  |
| [ToolExecutionResultForReplay](../classes/ToolExecutionResultForReplay.md) | Minimal tool-execution result returned by the Replay Engine's `execute_tool` ... |  no  |
| [RawGeoJSONFeatureCollection](../classes/RawGeoJSONFeatureCollection.md) | Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3 |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:features |
| native | debrief:features |




## LinkML Source

<details>
```yaml
name: features
alias: features
domain_of:
- RawGeoJSONFeatureCollection
- SessionState
- SessionFile
- ToolResultForLog
- ToolExecutionResultForReplay
range: string

```
</details>