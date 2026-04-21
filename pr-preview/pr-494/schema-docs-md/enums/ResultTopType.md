# Enum: ResultTopType 




_Top-level result type categories_



URI: [debrief:enum/ResultTopType](https://debrief.info/schemas/enum/ResultTopType)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| mutation | None | Modification of existing features (e |
| addition | None | Creation of new features (e |
| deletion | None | Removal of features (e |
| artifact | None | Non-GeoJSON outputs (e |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ResultTopType
description: Top-level result type categories
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  mutation:
    text: mutation
    description: Modification of existing features (e.g., track smoothing)
  addition:
    text: addition
    description: Creation of new features (e.g., analysis results)
  deletion:
    text: deletion
    description: Removal of features (e.g., outlier deletion)
  artifact:
    text: artifact
    description: Non-GeoJSON outputs (e.g., plots, reports)

```
</details>