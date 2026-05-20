# Enum: ErrorCategory 




_Categories of tool execution errors_



URI: [debrief:enum/ErrorCategory](https://debrief.info/schemas/enum/ErrorCategory)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| invalid_input | None | User-provided input failed validation |
| algorithm_failure | None | Algorithm encountered unrecoverable error |
| resource_not_found | None | Required feature or data not found |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: ErrorCategory
description: Categories of tool execution errors
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  invalid_input:
    text: invalid_input
    description: User-provided input failed validation
  algorithm_failure:
    text: algorithm_failure
    description: Algorithm encountered unrecoverable error
  resource_not_found:
    text: resource_not_found
    description: Required feature or data not found

```
</details>