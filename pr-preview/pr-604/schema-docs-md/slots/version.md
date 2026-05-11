

# Slot: version 



URI: [debrief:slot/version](https://debrief.info/schemas/slot/version)
Alias: version

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [Tool](../classes/Tool.md) | An analysis operation with a name, description, version, and selection requir... |  no  |
| [SessionFile](../classes/SessionFile.md) | Persisted session file format (FR-024) |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:version |
| native | debrief:version |




## LinkML Source

<details>
```yaml
name: version
alias: version
domain_of:
- Tool
- SessionFile
range: string

```
</details>