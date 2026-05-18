

# Slot: name 



URI: [debrief:slot/name](https://debrief.info/schemas/slot/name)
Alias: name

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ToolParameter](../classes/ToolParameter.md) | A configurable parameter for a tool |  no  |
| [PlatformRecord](../classes/PlatformRecord.md) | Fully-resolved metadata for a single platform within a STAC item |  no  |
| [MCPToolDefinition](../classes/MCPToolDefinition.md) | Static catalogue entry advertised by the MCP server |  no  |
| [LevelDefinition](../classes/LevelDefinition.md) | Named nesting level within a feature hierarchy (Feature 053, FR-010) |  no  |
| [SegmentMetadata](../classes/SegmentMetadata.md) | Per-segment metadata for compound tracks |  no  |
| [StoryboardProperties](../classes/StoryboardProperties.md) | Properties class for a Storyboard parent Feature |  no  |
| [ToolDefinition](../classes/ToolDefinition.md) | Consumer-facing flattened view of a tool catalogue entry |  no  |
| [TUAData](../classes/TUAData.md) | Named TUA solution collection |  no  |
| [DatasetSeries](../classes/DatasetSeries.md) | A named data series within a multi-series dataset |  no  |
| [SensorData](../classes/SensorData.md) | Named sensor with contact measurements |  no  |
| [ReferenceLocationProperties](../classes/ReferenceLocationProperties.md) | Properties for a ReferenceLocation |  no  |
| [PointMetadataEntry](../classes/PointMetadataEntry.md) | Metadata for a single point within a MultiPoint reference set |  no  |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:name |
| native | debrief:name |




## LinkML Source

<details>
```yaml
name: name
alias: name
domain_of:
- SegmentMetadata
- SensorData
- TUAData
- PointMetadataEntry
- ReferenceLocationProperties
- Tool
- ToolParameter
- PlatformRecord
- LevelDefinition
- DatasetSeries
- StoryboardProperties
- MCPToolDefinition
- ToolDefinition
range: string

```
</details>