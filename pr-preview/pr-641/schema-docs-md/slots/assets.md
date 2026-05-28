

# Slot: assets 


_Asset map keyed by arbitrary string (`features`, `thumbnail`, `overview`, `source-<id>`, `scene-thumbnail-<id>`). Open-record per Research R-002 — modelled as `range: Any` here because the STAC wire format is a dict, not a list. The generator post-processor rewrites this to `dict[str, StacAsset]` (Pydantic) and `Record<string, StacAsset>` (TypeScript)._





URI: [debrief:slot/assets](https://debrief.info/schemas/slot/assets)
Alias: assets

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItem](../classes/StacItem.md) | A STAC 1 |  no  |






## Properties

* Range: [Any](../classes/Any.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:assets |
| native | debrief:assets |




## LinkML Source

<details>
```yaml
name: assets
description: 'Asset map keyed by arbitrary string (`features`, `thumbnail`, `overview`,
  `source-<id>`, `scene-thumbnail-<id>`). Open-record per Research R-002 — modelled
  as `range: Any` here because the STAC wire format is a dict, not a list. The generator
  post-processor rewrites this to `dict[str, StacAsset]` (Pydantic) and `Record<string,
  StacAsset>` (TypeScript).'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: assets
owner: StacItem
domain_of:
- StacItem
range: Any
required: true

```
</details>