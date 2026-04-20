# Enum: ResultCategoryEnum 




_Top-level result type categories per TOOL-RESULTS.md. Used as prefix for debrief:resultType annotations._



URI: [debrief:enum/ResultCategoryEnum](https://debrief.info/schemas/enum/ResultCategoryEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| mutation | None | Modifies existing feature(s) in the FeatureCollection |
| addition | None | Creates new GeoJSON feature(s) |
| deletion | None | Removes feature(s) from the FeatureCollection |
| artifact | None | Creates non-GeoJSON output (image, report, dataset) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ResultCategoryEnum
description: Top-level result type categories per TOOL-RESULTS.md. Used as prefix
  for debrief:resultType annotations.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  mutation:
    text: mutation
    description: Modifies existing feature(s) in the FeatureCollection
  addition:
    text: addition
    description: Creates new GeoJSON feature(s)
  deletion:
    text: deletion
    description: Removes feature(s) from the FeatureCollection
  artifact:
    text: artifact
    description: Creates non-GeoJSON output (image, report, dataset)

```
</details>