# Contract sketch: shared/schemas/src/linkml/mcp.yaml
#
# This is NOT the final implementation file — it is a contract sketch
# showing class-level structure and slot ranges. The /speckit.implement
# phase produces the real `mcp.yaml` from this sketch; deviations MUST
# be justified in the PR description and round-tripped through the
# schema-comparison test (FR-006).
#
# Conventions:
# - All class names match the audit's TS names verbatim.
# - Inline comments cite the spec section, the Article XV exception,
#   or the audit row being closed.

```yaml
id: https://debrief.info/schemas/mcp
name: mcp
title: Debrief MCP Transport Envelopes
description: >-
  LinkML schema for MCP / tool-system transport envelopes between
  Python services and TypeScript consumers. Resolves audit #206 §3.1
  cluster attributed to #222 — 17 hand-typed declarations across
  six source files. Article XV exception: several free-form payload
  fields retain `range: Any` — see spec.md §Edge Cases #3 and the
  `raw-geojson.yaml` `JsonObject` precedent.

prefixes:
  linkml: https://w3id.org/linkml/
  debrief: https://debrief.info/schemas/

default_prefix: debrief
default_range: string

imports:
  - linkml:types
  - tool          # for ToolCategoryEnum

# ============================================================================
# Enums
# ============================================================================

enums:

  SessionMCPToolName:
    description: >-
      Authoritative list of session-state MCP tool names. Must mirror
      the `TOOLS` const at services/session-state/src/server/mcp.ts.
    permissible_values:
      session.getState: {}
      session.getTemporalState: {}
      session.getSpatialState: {}
      session.getFeaturesState: {}
      session.getDocumentState: {}
      session.setCurrentTime: {}
      session.setViewport: {}
      session.setSelection: {}
      session.setHiddenFeatures: {}
      session.setPlaybackRate: {}
      session.setRotation: {}

  MCPContentItemTypeEnum:
    description: Discriminator for MCPContentItem variants.
    permissible_values:
      text: {}
      resource_link: {}
      image: {}
      structured: {}

  MCPParamTypeEnum:
    description: JSON-Schema-compatible primitive types for tool parameters.
    permissible_values:
      string: {}
      number: {}
      integer: {}
      boolean: {}
      array: {}
      object: {}

  ReplayStatusEnum:
    description: Outcome of resolving a logged tool invocation at replay time.
    permissible_values:
      unchanged: {}
      version_drift: {}
      tool_removed: {}

# ============================================================================
# Group 1 — Envelopes (P1)
# ============================================================================

classes:

  MCPRequest:
    description: Closes audit §3.1 row 13.
    attributes:
      tool:
        range: SessionMCPToolName
        required: true
      input:
        range: Any   # Article XV.2 exception.
        required: true

  MCPContentItem:
    description: Closes audit §3.1 row 15.
    attributes:
      type:
        range: MCPContentItemTypeEnum
        required: true
      text:
        range: string
      resource:
        range: string
      mime_type:
        range: string
      data:
        range: string
      structured_content:
        range: Any   # Article XV.2 exception.

  MCPToolResponse:
    description: Closes audit §3.1 row 16.
    attributes:
      content:
        range: MCPContentItem
        multivalued: true
        required: true
      is_error:
        range: boolean
      structured_content:
        range: Any   # Article XV.2 exception.

  MCPErrorResponse:
    description: Closes audit §3.1 row 17.
    attributes:
      code:
        range: integer
        required: true
      message:
        range: string
        required: true
      data:
        range: Any   # Article XV.2 exception.

# ============================================================================
# Group 2 — Discovery (P2)
# ============================================================================

  MCPParamSchema:
    description: Closes audit §3.1 rows 1 and 27 (two-site drift collapsed).
    attributes:
      type:
        range: MCPParamTypeEnum
        required: true
      description:
        range: string
      enum_values:
        range: string
        multivalued: true
      items:
        range: MCPParamSchema   # recursive
      default:
        range: Any

  MCPSelectionRequirement:
    description: Closes audit §3.1 row 18.
    attributes:
      feature_type:
        range: string
        required: true
      min_count:
        range: integer
      max_count:
        range: integer

  MCPToolDefinition:
    description: Closes audit §3.1 row 19.
    attributes:
      name:
        range: string
        required: true
      description:
        range: string
      input_schema:
        range: MCPParamSchema
      selection_requirement:
        range: MCPSelectionRequirement
        multivalued: true
      category:
        range: ToolCategoryEnum
      version:
        range: string

  ToolParameter:
    description: Closes audit §3.2 drift rows 37 and 86.
    attributes:
      name:
        range: string
        required: true
      label:
        range: string
      param_schema:
        range: MCPParamSchema
        required: true
      required:
        range: boolean

  ToolParameterMeta:
    description: Closes audit §3.1 row 21.
    attributes:
      name:
        range: string
        required: true
      display_label:
        range: string
      validation_hint:
        range: string
      placeholder:
        range: string

  ToolDefinition:
    description: Closes audit §3.1 row 22.
    attributes:
      name:
        range: string
        required: true
      description:
        range: string
      parameters:
        range: ToolParameter
        multivalued: true
        required: true
      parameter_meta:
        range: ToolParameterMeta
        multivalued: true
      category:
        range: ToolCategoryEnum

  ToolResult:
    description: Closes audit §3.1 row 20.
    attributes:
      success:
        range: boolean
        required: true
      output:
        range: Any   # Article XV.2 exception.
      error:
        range: string

# ============================================================================
# Group 3 — Replay / Logging (P3)
# ============================================================================

  ToolResultForLog:
    description: Closes audit §3.1 row 4. Pydantic model_validator enforces result XOR error.
    attributes:
      tool_id:
        range: string
        required: true
      tool_version:
        range: string
      feature_ids:
        range: string
        multivalued: true
        required: true
      params:
        range: Any   # Article XV.2 exception.
        required: true
      result:
        range: MCPToolResponse
      error:
        range: MCPErrorResponse
      timestamp:
        range: datetime
        required: true
      input_hash:
        range: string

  ToolExecutionResultForReplay:
    is_a: ToolResultForLog
    description: Closes audit §3.1 row 6.
    attributes:
      resolved_tool_version:
        range: string
      replay_status:
        range: ReplayStatusEnum
        required: true

  ToolsUpdateMessage:
    description: Closes audit §3.1 row 28.
    attributes:
      type:
        range: string
        required: true
        equals_string: tools:update
      tools:
        range: MCPToolDefinition
        multivalued: true
        required: true
      epoch:
        range: integer
```
