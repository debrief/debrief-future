

# Slot: default 


_Whether this is the default value._





URI: [debrief:slot/default](https://debrief.info/schemas/slot/default)
Alias: default

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
| self | debrief:default |
| native | debrief:default |




## LinkML Source

<details>
```yaml
name: default
description: Whether this is the default value.
from_schema: https://debrief.info/schemas/debrief
rank: 1000
ifabsent: 'false'
alias: default
owner: ParameterValue
domain_of:
- ParameterValue
range: boolean
required: false

```
</details>