

# Slot: metadata_expression 


_Serialised CQL2 filter expression from the filter bar, stored as an opaque JSON object (Record<string, unknown>). Absent/null means no filter is active. Stored for debugging and round-trip serialisation._

__





URI: [debrief:slot/metadata_expression](https://debrief.info/schemas/slot/metadata_expression)
Alias: metadata_expression

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [BrowserFilterSlice](../classes/BrowserFilterSlice.md) | Multi-axis filter state for the STAC browser panel |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:metadata_expression |
| native | debrief:metadata_expression |




## LinkML Source

<details>
```yaml
name: metadata_expression
description: 'Serialised CQL2 filter expression from the filter bar, stored as an
  opaque JSON object (Record<string, unknown>). Absent/null means no filter is active.
  Stored for debugging and round-trip serialisation.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: metadata_expression
owner: BrowserFilterSlice
domain_of:
- BrowserFilterSlice
range: string
required: false

```
</details>