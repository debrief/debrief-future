# Enum: ParameterTypeEnum 




_Names of available schema-defined parameter types. Referenced by ToolParameter.param_type to link tool parameters to their value enums defined in common.yaml._



URI: [debrief:enum/ParameterTypeEnum](https://debrief.info/schemas/enum/ParameterTypeEnum)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| NamedColor | None | Predefined named colours (maps to NamedColorEnum) |
| MarkerSymbol | None | Marker shapes (maps to MarkerSymbolEnum) |
| CardinalDirection | None | Eight-point compass directions (maps to CardinalDirectionEnum) |
| DurationPreset | None | Common ISO 8601 duration intervals (maps to DurationPresetEnum) |
| NumericPreset | None | Common numeric values (maps to NumericPresetEnum) |
| ReferencePointPattern | None | Reference point generation patterns (maps to ReferencePointPatternEnum) |




## Slots

| Name | Description |
| ---  | --- |
| [param_type](../slots/param_type.md) | References a schema-defined parameter-type enum by name |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ParameterTypeEnum
description: Names of available schema-defined parameter types. Referenced by ToolParameter.param_type
  to link tool parameters to their value enums defined in common.yaml.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  NamedColor:
    text: NamedColor
    description: Predefined named colours (maps to NamedColorEnum)
  MarkerSymbol:
    text: MarkerSymbol
    description: Marker shapes (maps to MarkerSymbolEnum)
  CardinalDirection:
    text: CardinalDirection
    description: Eight-point compass directions (maps to CardinalDirectionEnum)
  DurationPreset:
    text: DurationPreset
    description: Common ISO 8601 duration intervals (maps to DurationPresetEnum)
  NumericPreset:
    text: NumericPreset
    description: Common numeric values (maps to NumericPresetEnum)
  ReferencePointPattern:
    text: ReferencePointPattern
    description: Reference point generation patterns (maps to ReferencePointPatternEnum)

```
</details>