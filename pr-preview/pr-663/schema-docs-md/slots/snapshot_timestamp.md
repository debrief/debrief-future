

# Slot: snapshot_timestamp 


_ISO-8601 UTC timestamp recorded when a snapshot asset is written. On-disk key is `debrief:snapshotTimestamp` (colon syntax preserved via slot_uri). Written by `writeSnapshotAsset`._





URI: [debrief:snapshotTimestamp](https://debrief.info/schemas/snapshotTimestamp)
Alias: snapshot_timestamp

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [StacAsset](../classes/StacAsset.md) | A single asset entry within `assets[<key>]` |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:snapshotTimestamp |
| native | debrief:snapshot_timestamp |




## LinkML Source

<details>
```yaml
name: snapshot_timestamp
description: ISO-8601 UTC timestamp recorded when a snapshot asset is written. On-disk
  key is `debrief:snapshotTimestamp` (colon syntax preserved via slot_uri). Written
  by `writeSnapshotAsset`.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
slot_uri: debrief:snapshotTimestamp
alias: snapshot_timestamp
owner: StacAsset
domain_of:
- StacAsset
range: string
required: false

```
</details>