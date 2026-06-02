# Enum: StacTypeEnum 




_Discriminator for STAC top-level objects. STAC mandates exactly these three values for `type`:_

_  - "Feature"     → StacItem_

_  - "Catalog"     → StacCatalog_

_  - "Collection"  → StacCollection_

_Used with the `equals_string` constraint on each class's `type` slot so the generated TypeScript carries a literal-string discriminator (Research R-001)._



URI: [debrief:enum/StacTypeEnum](https://debrief.info/schemas/enum/StacTypeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| Feature | None |  |
| Catalog | None |  |
| Collection | None |  |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: StacTypeEnum
description: "Discriminator for STAC top-level objects. STAC mandates exactly these\
  \ three values for `type`:\n  - \"Feature\"     → StacItem\n  - \"Catalog\"    \
  \ → StacCatalog\n  - \"Collection\"  → StacCollection\nUsed with the `equals_string`\
  \ constraint on each class's `type` slot so the generated TypeScript carries a literal-string\
  \ discriminator (Research R-001)."
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  Feature:
    text: Feature
  Catalog:
    text: Catalog
  Collection:
    text: Collection

```
</details>