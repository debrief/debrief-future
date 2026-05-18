# Enum: ToolCategoryEnum 




_Visual category for Log Panel icon rendering. Declared by the tool at registration; consumed by frontends to colour tool-icon glyphs. See docs/log-panel-ux-srd.md §5._

_This enum defines only the declarable values. The neutral-grey "unknown" state shown by the Log Panel when a tool has no declared category is NOT a value of this enum — it is a rendering-layer fallback produced when the attribute is null or absent._



URI: [debrief:enum/ToolCategoryEnum](https://debrief.info/schemas/enum/ToolCategoryEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| import | None | File / data ingestion tools (e |
| style | None | Appearance-changing tools (e |
| calc | None | Analytical computation tools (e |
| filter | None | Tools that narrow the dataset (time filter, spatial filter, trim) |
| snapshot | None | Tools that export or capture state (export-png, export-csv, export-geojson) |




## Slots

| Name | Description |
| ---  | --- |
| [category](../slots/category.md) | Visual category for Log Panel icon rendering |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ToolCategoryEnum
description: 'Visual category for Log Panel icon rendering. Declared by the tool at
  registration; consumed by frontends to colour tool-icon glyphs. See docs/log-panel-ux-srd.md
  §5.

  This enum defines only the declarable values. The neutral-grey "unknown" state shown
  by the Log Panel when a tool has no declared category is NOT a value of this enum
  — it is a rendering-layer fallback produced when the attribute is null or absent.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  import:
    text: import
    description: File / data ingestion tools (e.g., REP loader, DPF parser, CSV import)
  style:
    text: style
    description: Appearance-changing tools (e.g., set-track-color, symbol style, label
      interval)
  calc:
    text: calc
    description: Analytical computation tools (e.g., range-bearing, course/speed,
      statistics)
  filter:
    text: filter
    description: Tools that narrow the dataset (time filter, spatial filter, trim)
  snapshot:
    text: snapshot
    description: Tools that export or capture state (export-png, export-csv, export-geojson)

```
</details>