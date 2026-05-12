"""
Round-trip and schema-comparison tests for the MCP cluster (#222).

Verifies that Python (Pydantic) ↔ JSON ↔ TypeScript serialisations of
the MCP transport envelopes, discovery shapes, and replay/log shapes
all agree, per FR-006:
- Round-trip: instance → JSON → instance preserves all fields.
- Schema comparison: LinkML JSON Schema ≡ Pydantic model_json_schema.
- Negative: invalid fixtures fail validation with field-level errors.

Classes covered are added incrementally per priority slice:
- P1 (envelopes): MCPRequest, MCPContentItem, MCPToolResponse,
  MCPErrorResponse.
- P2 (discovery): MCPParamSchema, MCPSelectionRequirement,
  MCPToolDefinition, ToolParameterMeta, ToolDefinition, ToolResult.
- P3 (replay): ToolResultForLog, ToolExecutionResultForReplay,
  ToolsUpdateMessage.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))


@pytest.mark.xfail(
    reason="Anchor — replaced by concrete assertions once mcp.yaml classes land (T024+).",
    strict=False,
)
def test_mcp_roundtrip_placeholder() -> None:
    """Placeholder so test collection picks up this module pre-implementation."""
    assert False, "Implemented in T024 (P1) / T055 (P2) / T083 (P3)."
