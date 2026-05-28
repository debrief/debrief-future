

# Slot: provenance_log 


_Per-commit provenance entries written by the Properties Panel. Bounded at 500 entries per item; overflow rotates to sibling provenance_log_archive.jsonl in the item directory. Append-only (Article III.3 — audit trail immutable)._

__





URI: [debrief:provenance_log](https://debrief.info/schemas/provenance_log)
Alias: provenance_log

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacItemProperties](../classes/StacItemProperties.md) | STAC Item `properties` block |  no  |
| [StacExtensionProperties](../classes/StacExtensionProperties.md) | Extension properties added to STAC item |  no  |






## Properties

* Range: [PropertiesProvenanceEntry](../classes/PropertiesProvenanceEntry.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:provenance_log |
| native | debrief:provenance_log |




## LinkML Source

<details>
```yaml
name: provenance_log
description: 'Per-commit provenance entries written by the Properties Panel. Bounded
  at 500 entries per item; overflow rotates to sibling provenance_log_archive.jsonl
  in the item directory. Append-only (Article III.3 — audit trail immutable).

  '
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:provenance_log
alias: provenance_log
owner: StacExtensionProperties
domain_of:
- StacExtensionProperties
range: PropertiesProvenanceEntry
required: false
multivalued: true
inlined: true
inlined_as_list: true

```
</details>