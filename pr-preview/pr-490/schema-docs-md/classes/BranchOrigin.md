

# Class: BranchOrigin 


_Reverse link on a branch plot's system record, pointing to the source plot._





URI: [debrief:class/BranchOrigin](https://debrief.info/schemas/class/BranchOrigin)






```mermaid
 classDiagram
    class BranchOrigin
    click BranchOrigin href "../../classes/BranchOrigin/"
      BranchOrigin : branch_id
        
      BranchOrigin : branched_at
        
      BranchOrigin : branched_from
        
      BranchOrigin : source_asset
        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [source_asset](../slots/source_asset.md) | 1 <br/> [String](../types/String.md) | Relative path to the source plot file | direct |
| [branched_from](../slots/branched_from.md) | 1 <br/> [String](../types/String.md) | Activity ID of the branch point | direct |
| [branched_at](../slots/branched_at.md) | 1 <br/> [datetime](../slots/datetime.md) | When the branch was created (ISO 8601 with timezone) | direct |
| [branch_id](../slots/branch_id.md) | 1 <br/> [String](../types/String.md) | Branch identifier matching the source BranchRecord | direct |





## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [SystemRecordProperties](../classes/SystemRecordProperties.md) | [branch_origin](../slots/branch_origin.md) | range | [BranchOrigin](../classes/BranchOrigin.md) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:BranchOrigin |
| native | debrief:BranchOrigin |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: BranchOrigin
description: Reverse link on a branch plot's system record, pointing to the source
  plot.
from_schema: https://debrief.info/schemas/debrief
attributes:
  source_asset:
    name: source_asset
    description: Relative path to the source plot file.
    from_schema: https://debrief.info/schemas/system-record
    rank: 1000
    domain_of:
    - BranchOrigin
    range: string
    required: true
  branched_from:
    name: branched_from
    description: Activity ID of the branch point.
    from_schema: https://debrief.info/schemas/system-record
    domain_of:
    - BranchRecord
    - BranchOrigin
    range: string
    required: true
  branched_at:
    name: branched_at
    description: When the branch was created (ISO 8601 with timezone).
    from_schema: https://debrief.info/schemas/system-record
    domain_of:
    - BranchRecord
    - BranchOrigin
    range: datetime
    required: true
  branch_id:
    name: branch_id
    description: Branch identifier matching the source BranchRecord.
    from_schema: https://debrief.info/schemas/system-record
    domain_of:
    - BranchRecord
    - BranchOrigin
    - FileProvEntry
    range: string
    required: true

```
</details>

### Induced

<details>
```yaml
name: BranchOrigin
description: Reverse link on a branch plot's system record, pointing to the source
  plot.
from_schema: https://debrief.info/schemas/debrief
attributes:
  source_asset:
    name: source_asset
    description: Relative path to the source plot file.
    from_schema: https://debrief.info/schemas/system-record
    rank: 1000
    alias: source_asset
    owner: BranchOrigin
    domain_of:
    - BranchOrigin
    range: string
    required: true
  branched_from:
    name: branched_from
    description: Activity ID of the branch point.
    from_schema: https://debrief.info/schemas/system-record
    alias: branched_from
    owner: BranchOrigin
    domain_of:
    - BranchRecord
    - BranchOrigin
    range: string
    required: true
  branched_at:
    name: branched_at
    description: When the branch was created (ISO 8601 with timezone).
    from_schema: https://debrief.info/schemas/system-record
    alias: branched_at
    owner: BranchOrigin
    domain_of:
    - BranchRecord
    - BranchOrigin
    range: datetime
    required: true
  branch_id:
    name: branch_id
    description: Branch identifier matching the source BranchRecord.
    from_schema: https://debrief.info/schemas/system-record
    alias: branch_id
    owner: BranchOrigin
    domain_of:
    - BranchRecord
    - BranchOrigin
    - FileProvEntry
    range: string
    required: true

```
</details>