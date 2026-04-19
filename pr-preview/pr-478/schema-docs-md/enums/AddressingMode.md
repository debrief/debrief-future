# Enum: AddressingMode 




_How addresses in a selection path level are interpreted (Feature 053)_



URI: [debrief:enum/AddressingMode](https://debrief.info/schemas/enum/AddressingMode)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| id | None | Address is a string identifier |
| index | None | Address is a numeric position index |




## Slots

| Name | Description |
| ---  | --- |
| [addressingMode](../slots/addressingMode.md) | How addresses at this level are interpreted |





## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: AddressingMode
description: How addresses in a selection path level are interpreted (Feature 053)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  id:
    text: id
    description: Address is a string identifier
  index:
    text: index
    description: Address is a numeric position index

```
</details>