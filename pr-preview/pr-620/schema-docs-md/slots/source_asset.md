

# Slot: source_asset 


_Relative path to the source plot file._





URI: [debrief:slot/source_asset](https://debrief.info/schemas/slot/source_asset)
Alias: source_asset

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [BranchOrigin](../classes/BranchOrigin.md) | Reverse link on a branch plot's system record, pointing to the source plot |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:source_asset |
| native | debrief:source_asset |




## LinkML Source

<details>
```yaml
name: source_asset
description: Relative path to the source plot file.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: source_asset
owner: BranchOrigin
domain_of:
- BranchOrigin
range: string
required: true

```
</details>