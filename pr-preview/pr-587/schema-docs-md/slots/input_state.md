

# Slot: input_state 


_Pre-operation feature states for coordinate-mutating tools. Captures geometry and spatial properties as they were immediately before the operation, enabling correct replay with modified parameters. Null for non-mutation tools._





URI: [debrief:slot/input_state](https://debrief.info/schemas/slot/input_state)
Alias: input_state

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [LogEntry](../classes/LogEntry.md) | A PROV-aligned provenance record stored on GeoJSON features |  no  |






## Properties

* Range: [InputFeatureState](../classes/InputFeatureState.md)

* Multivalued: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:input_state |
| native | debrief:input_state |




## LinkML Source

<details>
```yaml
name: input_state
description: Pre-operation feature states for coordinate-mutating tools. Captures
  geometry and spatial properties as they were immediately before the operation, enabling
  correct replay with modified parameters. Null for non-mutation tools.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: input_state
owner: LogEntry
domain_of:
- LogEntry
range: InputFeatureState
required: false
multivalued: true
inlined: true
inlined_as_list: true

```
</details>