

# Slot: path 


_Full hierarchical path_





URI: [debrief:slot/path](https://debrief.info/schemas/slot/path)
Alias: path

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ResultTypePath](../classes/ResultTypePath.md) | Slash-delimited hierarchical type path |  no  |






## Properties

* Range: [String](../types/String.md)

* Required: True

* Regex pattern: `^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$`




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:path |
| native | debrief:path |




## LinkML Source

<details>
```yaml
name: path
description: Full hierarchical path
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: path
owner: ResultTypePath
domain_of:
- ResultTypePath
range: string
required: true
pattern: ^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$

```
</details>