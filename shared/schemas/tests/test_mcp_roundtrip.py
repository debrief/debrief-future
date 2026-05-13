"""
Round-trip and schema-comparison tests for the MCP cluster (#222).

Verifies that Python (Pydantic) ↔ JSON serialisations of the MCP
transport envelopes, discovery shapes, and replay/log shapes all
agree, per FR-006:
- Round-trip: instance → JSON → instance preserves all fields.
- Schema comparison: LinkML JSON Schema ≡ Pydantic model_json_schema.

The TS half of round-trip (Py → JSON → TS → JSON → Py) is verified
by the existing ts/test_*_roundtrip.test.ts vitest suites that
re-import the generated TS types from `@debrief/schemas`. Here we
focus on the Python side and on schema-shape equivalence.

Classes covered grow per priority slice:
- P1 (envelopes): MCPRequest, MCPContentItem, MCPToolResponse,
  MCPErrorResponse.
- P2 (discovery): MCPParamSchema, MCPSelectionRequirement,
  MCPToolDefinition, ToolParameterMeta, ToolDefinition, ToolResult.
- P3 (replay): ToolResultForLog, ToolExecutionResultForReplay,
  ToolsUpdateMessage.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

from debrief_schemas import (  # noqa: E402
    MCPContentItem,
    MCPErrorResponse,
    MCPParamSchema,
    MCPRequest,
    MCPSelectionRequirement,
    MCPToolDefinition,
    MCPToolResponse,
    ToolDefinition,
    ToolParameter,
    ToolParameterMeta,
    ToolResult,
)

FIXTURES_ROOT = Path(__file__).parent.parent / "fixtures" / "mcp"


# --------------------------------------------------------------------------
# P1 — Envelopes
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "model_cls,fixture",
    [
        (MCPRequest, FIXTURES_ROOT / "MCPRequest" / "valid" / "example.json"),
        (MCPContentItem, FIXTURES_ROOT / "MCPContentItem" / "valid" / "text.json"),
        (MCPContentItem, FIXTURES_ROOT / "MCPContentItem" / "valid" / "resource.json"),
        (
            MCPToolResponse,
            FIXTURES_ROOT / "MCPToolResponse" / "valid" / "mixed-content.json",
        ),
        (MCPErrorResponse, FIXTURES_ROOT / "MCPErrorResponse" / "valid" / "example.json"),
    ],
)
def test_envelope_roundtrip(model_cls: type, fixture: Path) -> None:
    """Py → JSON → Py preserves all fields for each envelope class.

    Round-trip semantics: the parsed-and-redumped JSON MUST be
    structurally equal to the original JSON (modulo key ordering).
    """
    raw = json.loads(fixture.read_text())
    instance = model_cls.model_validate(raw)
    dumped = instance.model_dump(exclude_unset=True)

    # Round-trip: re-validate the dump and confirm equality.
    re_instance = model_cls.model_validate(dumped)
    re_dumped = re_instance.model_dump(exclude_unset=True)
    assert dumped == re_dumped, (
        f"Round-trip for {model_cls.__name__} mutated fields: "
        f"original={dumped}, re-dumped={re_dumped}"
    )

    # Every original field MUST survive the round-trip.
    for key, value in raw.items():
        assert key in dumped, f"{model_cls.__name__} dropped slot {key!r} on round-trip"
        assert dumped[key] == value, (
            f"{model_cls.__name__} mutated slot {key!r}: was {value!r}, became {dumped[key]!r}"
        )


# --------------------------------------------------------------------------
# P2 — Discovery
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "model_cls,fixture",
    [
        (MCPParamSchema, FIXTURES_ROOT / "MCPParamSchema" / "valid" / "simple.json"),
        (
            MCPSelectionRequirement,
            FIXTURES_ROOT / "MCPSelectionRequirement" / "valid" / "track.json",
        ),
        (
            MCPSelectionRequirement,
            FIXTURES_ROOT / "MCPSelectionRequirement" / "valid" / "any-count.json",
        ),
        (
            MCPToolDefinition,
            FIXTURES_ROOT / "MCPToolDefinition" / "valid" / "example.json",
        ),
        (ToolParameter, FIXTURES_ROOT / "ToolParameter" / "valid" / "with-choices.json"),
        (ToolParameter, FIXTURES_ROOT / "ToolParameter" / "valid" / "with-param-type.json"),
        (ToolParameterMeta, FIXTURES_ROOT / "ToolParameterMeta" / "valid" / "tunable.json"),
        (ToolDefinition, FIXTURES_ROOT / "ToolDefinition" / "valid" / "track-length.json"),
        (ToolResult, FIXTURES_ROOT / "ToolResult" / "valid" / "success.json"),
    ],
)
def test_discovery_roundtrip(model_cls: type, fixture: Path) -> None:
    """Py → JSON → Py preserves all fields for each discovery class."""
    raw = json.loads(fixture.read_text())
    instance = model_cls.model_validate(raw)
    dumped = instance.model_dump(exclude_unset=True)
    re_instance = model_cls.model_validate(dumped)
    re_dumped = re_instance.model_dump(exclude_unset=True)
    assert dumped == re_dumped, (
        f"Round-trip for {model_cls.__name__} mutated fields: "
        f"original={dumped}, re-dumped={re_dumped}"
    )
    for key, value in raw.items():
        assert key in dumped, f"{model_cls.__name__} dropped slot {key!r} on round-trip"
        assert dumped[key] == value, (
            f"{model_cls.__name__} mutated slot {key!r}: was {value!r}, became {dumped[key]!r}"
        )


def test_discovery_schema_required_slots() -> None:
    """Required-slot set for each discovery class matches the LinkML source."""
    expected_required = {
        MCPParamSchema: set(),
        MCPSelectionRequirement: {"kind", "min"},
        MCPToolDefinition: {"name", "description", "input_schema", "annotations"},
        ToolParameter: {"name", "type", "description"},
        ToolParameterMeta: {"value", "default", "tunable"},
        ToolDefinition: {"id", "name", "description"},
        ToolResult: {"success", "message"},
    }
    for cls, required in expected_required.items():
        schema = cls.model_json_schema()
        actual = set(schema.get("required", []))
        assert actual == required, (
            f"{cls.__name__} required slots: expected {required}, got {actual}"
        )


def test_envelope_schema_comparison() -> None:
    """Pydantic model_json_schema for each envelope class is non-empty.

    The detailed LinkML-vs-Pydantic schema comparison is covered by
    `test_schema_compare.py` for the cluster as a whole; here we
    just sanity-check that each envelope class has a non-trivial
    schema and the expected required slot set.
    """
    expected_required = {
        MCPRequest: {"tool", "input"},
        MCPContentItem: {"type", "annotations"},
        MCPToolResponse: {"content", "duration_ms"},
        MCPErrorResponse: {"error"},
    }
    for cls, required in expected_required.items():
        schema = cls.model_json_schema()
        assert schema.get("required") is not None, (
            f"{cls.__name__} has no 'required' field in its model_json_schema"
        )
        assert set(schema["required"]) == required, (
            f"{cls.__name__} required slots: expected {required}, got {schema['required']}"
        )
