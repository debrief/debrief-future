

# Slot: contacts 


_Array of sensor measurements_





URI: [debrief:slot/contacts](https://debrief.info/schemas/slot/contacts)
Alias: contacts

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SensorData](../classes/SensorData.md) | Named sensor with contact measurements |  no  |






## Properties

* Range: [SensorContact](../classes/SensorContact.md)

* Multivalued: True

* Required: True




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:contacts |
| native | debrief:contacts |




## LinkML Source

<details>
```yaml
name: contacts
description: Array of sensor measurements
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: contacts
owner: SensorData
domain_of:
- SensorData
range: SensorContact
required: true
multivalued: true
inlined: true
inlined_as_list: true

```
</details>