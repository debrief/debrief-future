

# Slot: temporal 



URI: [debrief:slot/temporal](https://debrief.info/schemas/slot/temporal)
Alias: temporal

<!-- no inheritance hierarchy -->





## Applicable Classes

| Name | Description | Modifies Slot |
| --- | --- | --- |
| [SessionFile](../classes/SessionFile.md) | Persisted session file format (FR-024) |  no  |
| [StacExtent](../classes/StacExtent.md) | Spatial + temporal extent on a Collection |  no  |
| [SessionState](../classes/SessionState.md) | Root entity containing all session state slices (FR-001, FR-002) |  no  |






## Properties

* Range: [String](../types/String.md)




## Identifier and Mapping Information







## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:temporal |
| native | debrief:temporal |




## LinkML Source

<details>
```yaml
name: temporal
alias: temporal
domain_of:
- StacExtent
- SessionState
- SessionFile
range: string

```
</details>