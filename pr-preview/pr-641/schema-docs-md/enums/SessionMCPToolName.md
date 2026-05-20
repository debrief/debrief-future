# Enum: SessionMCPToolName 




_Authoritative list of session-state MCP tool names. Must mirror the `TOOLS` const at services/session-state/src/server/mcp.ts. Research R-001: replaces the TS-only `type ToolName = keyof typeof TOOLS` projection with a cross-language permissible-values enum._



URI: [debrief:enum/SessionMCPToolName](https://debrief.info/schemas/enum/SessionMCPToolName)

## Permissible Values

| Value | Meaning | Description |
| --- | --- | --- |
| session.getState | None |  |
| session.getTemporalState | None |  |
| session.getSpatialState | None |  |
| session.getFeaturesState | None |  |
| session.getDocumentState | None |  |
| session.setCurrentTime | None |  |
| session.setViewport | None |  |
| session.setSelection | None |  |
| session.setHiddenFeatures | None |  |
| session.setPlaybackRate | None |  |
| session.setRotation | None |  |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief






## LinkML Source

<details>
```yaml
name: SessionMCPToolName
description: 'Authoritative list of session-state MCP tool names. Must mirror the
  `TOOLS` const at services/session-state/src/server/mcp.ts. Research R-001: replaces
  the TS-only `type ToolName = keyof typeof TOOLS` projection with a cross-language
  permissible-values enum.'
from_schema: https://debrief.info/schemas/debrief
rank: 1000
permissible_values:
  session.getState:
    text: session.getState
  session.getTemporalState:
    text: session.getTemporalState
  session.getSpatialState:
    text: session.getSpatialState
  session.getFeaturesState:
    text: session.getFeaturesState
  session.getDocumentState:
    text: session.getDocumentState
  session.setCurrentTime:
    text: session.setCurrentTime
  session.setViewport:
    text: session.setViewport
  session.setSelection:
    text: session.setSelection
  session.setHiddenFeatures:
    text: session.setHiddenFeatures
  session.setPlaybackRate:
    text: session.setPlaybackRate
  session.setRotation:
    text: session.setRotation

```
</details>