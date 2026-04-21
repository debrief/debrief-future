

# Slot: tunable 


_Whether this parameter can be modified during replay._





URI: [debrief:slot/tunable](https://debrief.info/schemas/slot/tunable)
Alias: tunable

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [ParameterValue](../classes/ParameterValue.md) | A typed parameter value with replay metadata |  no  |






## Properties

* Range: [Boolean](../types/Boolean.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:tunable |
| native | debrief:tunable |




## LinkML Source

<details>
```yaml
name: tunable
description: Whether this parameter can be modified during replay.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
ifabsent: 'true'
alias: tunable
owner: ParameterValue
domain_of:
- ParameterValue
range: boolean
required: false

```
</details>