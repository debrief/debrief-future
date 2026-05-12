

# Slot: parameters 


_Full resolved parameter set. Keys are parameter names, values are ParameterValue objects. May be empty dict._





URI: [debrief:slot/parameters](https://debrief.info/schemas/slot/parameters)
Alias: parameters

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [WasGeneratedBy](../classes/WasGeneratedBy.md) | Identifies the tool and its parameters for a specific invocation |  no  |






## Properties

* Range: [ParameterValue](../classes/ParameterValue.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:parameters |
| native | debrief:parameters |




## LinkML Source

<details>
```yaml
name: parameters
description: Full resolved parameter set. Keys are parameter names, values are ParameterValue
  objects. May be empty dict.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: parameters
owner: WasGeneratedBy
domain_of:
- WasGeneratedBy
range: ParameterValue
required: true
multivalued: true
inlined: true

```
</details>