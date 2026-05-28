

# Slot: metadata 


_Axis definitions and display hints_





URI: [debrief:slot/metadata](https://debrief.info/schemas/slot/metadata)
Alias: metadata

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [DatasetEntry](../classes/DatasetEntry.md) | Standard envelope for all tool result datasets, matching the runtime DatasetE... |  no  |






## Properties

* Range: [DatasetMetadata](../classes/DatasetMetadata.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:metadata |
| native | debrief:metadata |




## LinkML Source

<details>
```yaml
name: metadata
description: Axis definitions and display hints
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: metadata
owner: DatasetEntry
domain_of:
- DatasetEntry
range: DatasetMetadata
required: true

```
</details>