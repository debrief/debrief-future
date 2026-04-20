

# Slot: featureIds 


_Selected feature paths. Each entry is a forward-slash-separated selection path (e.g. "track-001/positions/4") or a flat feature ID._





URI: [debrief:slot/featureIds](https://debrief.info/schemas/slot/featureIds)
Alias: featureIds

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [FeatureSelection](../classes/FeatureSelection.md) | Set of selected feature identifiers with metadata (FR-017) |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:featureIds |
| native | debrief:featureIds |




## LinkML Source

<details>
```yaml
name: featureIds
description: Selected feature paths. Each entry is a forward-slash-separated selection
  path (e.g. "track-001/positions/4") or a flat feature ID.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: featureIds
owner: FeatureSelection
domain_of:
- FeatureSelection
range: string
required: true
multivalued: true

```
</details>