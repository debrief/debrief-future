

# Slot: version 


_Tool version string for provenance tracking. Follows semantic versioning (e.g., "1.0.0")._





URI: [debrief:slot/version](https://debrief.info/schemas/slot/version)
Alias: version

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:version |
| native | debrief:version |




## LinkML Source

<details>
```yaml
name: version
description: Tool version string for provenance tracking. Follows semantic versioning
  (e.g., "1.0.0").
from_schema: https://debrief.info/schemas/debrief
rank: 1000
alias: version
owner: Tool
domain_of:
- Tool
range: string
required: false

```
</details>