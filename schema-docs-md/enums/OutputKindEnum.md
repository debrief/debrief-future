# Enum: OutputKindEnum 




_Canonical output kind identifiers for tool result features. Set on feature.properties.kind by the executor after tool execution. Values use slash-delimited hierarchical paths matching domain/subtype. Both Python and TypeScript executors MUST use these values — no hand-authored kind strings in tool implementations._



URI: [debrief:enum/OutputKindEnum](https://debrief.info/schemas/enum/OutputKindEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| track/statistics | None | Track statistics summary (point count, distance, speed, duration) |
| dataset/range_bearing_series | None | Range-bearing time-series dataset between two features |
| region/statistics | None | Region/area statistics summary (extent, area, dimensions) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: OutputKindEnum
description: Canonical output kind identifiers for tool result features. Set on feature.properties.kind
  by the executor after tool execution. Values use slash-delimited hierarchical paths
  matching domain/subtype. Both Python and TypeScript executors MUST use these values
  — no hand-authored kind strings in tool implementations.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  track/statistics:
    text: track/statistics
    description: Track statistics summary (point count, distance, speed, duration)
  dataset/range_bearing_series:
    text: dataset/range_bearing_series
    description: Range-bearing time-series dataset between two features
  region/statistics:
    text: region/statistics
    description: Region/area statistics summary (extent, area, dimensions)

```
</details>