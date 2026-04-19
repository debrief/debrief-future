

# Slot: overrides 


_Flat list of field names on item.properties that the analyst has overridden via the Properties Panel. Auto-derivation routines (e.g. stacService.updateTemporalMetadata) MUST skip any field whose name appears here. Sorted alphabetically on write; deduplicated._

__





URI: [debrief:overrides](https://debrief.info/schemas/overrides)
Alias: overrides

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacExtensionProperties](../classes/StacExtensionProperties.md) | Extension properties added to STAC item |  no  |






## Properties

* Range: [String](../types/String.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:overrides |
| native | debrief:overrides |




## LinkML Source

<details>
```yaml
name: overrides
description: 'Flat list of field names on item.properties that the analyst has overridden
  via the Properties Panel. Auto-derivation routines (e.g. stacService.updateTemporalMetadata)
  MUST skip any field whose name appears here. Sorted alphabetically on write; deduplicated.

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:overrides
alias: overrides
owner: StacExtensionProperties
domain_of:
- StacExtensionProperties
range: string
required: false
multivalued: true

```
</details>