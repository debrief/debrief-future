

# Slot: state_type 


_Discriminator for state variant (temporal, spatial, selection, active_storyboard)_





URI: [debrief:slot/state_type](https://debrief.info/schemas/slot/state_type)
Alias: state_type

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SystemStateProperties](../classes/SystemStateProperties.md) | Properties for SYSTEM features storing application state |  no  |






## Properties

* Range: [SystemStateTypeEnum](../enums/SystemStateTypeEnum.md)

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:state_type |
| native | debrief:state_type |




## LinkML Source

<details>
```yaml
name: state_type
description: Discriminator for state variant (temporal, spatial, selection, active_storyboard)
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: state_type
owner: SystemStateProperties
domain_of:
- SystemStateProperties
range: SystemStateTypeEnum
required: true

```
</details>