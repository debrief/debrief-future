"""
Golden + negative fixture tests for the MCP cluster (#222).

Discovers JSON fixtures under shared/schemas/fixtures/mcp/<ClassName>/
{valid,invalid}/ and asserts validation outcomes against the
generated Pydantic class.

- valid/*.json   → must validate.
- invalid/*.json → must FAIL validation with a Pydantic ValidationError.

Class coverage grows per slice (P1 → P2 → P3) as fixtures are added.
"""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

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

# Map fixture-directory name → generated Pydantic class.
# Expanded across phases as new classes land.
CLASS_MAP: dict[str, type] = {
    # P1 — Envelopes
    "MCPRequest": MCPRequest,
    "MCPContentItem": MCPContentItem,
    "MCPToolResponse": MCPToolResponse,
    "MCPErrorResponse": MCPErrorResponse,
    # P2 — Discovery
    "MCPParamSchema": MCPParamSchema,
    "MCPSelectionRequirement": MCPSelectionRequirement,
    "MCPToolDefinition": MCPToolDefinition,
    "ToolParameter": ToolParameter,
    "ToolParameterMeta": ToolParameterMeta,
    "ToolDefinition": ToolDefinition,
    "ToolResult": ToolResult,
}


def _discover(kind: str) -> list[tuple[str, Path, type]]:
    """Discover (id, path, class) tuples for fixtures of the given kind ('valid' / 'invalid')."""
    cases: list[tuple[str, Path, type]] = []
    if not FIXTURES_ROOT.exists():
        return cases
    for class_dir in sorted(FIXTURES_ROOT.iterdir()):
        if not class_dir.is_dir():
            continue
        cls = CLASS_MAP.get(class_dir.name)
        if cls is None:
            continue  # not yet wired up for this phase
        kind_dir = class_dir / kind
        if not kind_dir.exists():
            continue
        for fixture in sorted(kind_dir.glob("*.json")):
            cases.append((f"{class_dir.name}/{kind}/{fixture.name}", fixture, cls))
    return cases


VALID_CASES = _discover("valid")
INVALID_CASES = _discover("invalid")


@pytest.mark.parametrize(
    "name,fixture,cls",
    VALID_CASES,
    ids=[c[0] for c in VALID_CASES],
)
def test_valid_fixture_validates(name: str, fixture: Path, cls: type) -> None:
    """Every valid/*.json MUST round-trip through the Pydantic class."""
    raw = json.loads(fixture.read_text())
    cls.model_validate(raw)  # raises ValidationError on failure


@pytest.mark.parametrize(
    "name,fixture,cls",
    INVALID_CASES,
    ids=[c[0] for c in INVALID_CASES],
)
def test_invalid_fixture_fails(name: str, fixture: Path, cls: type) -> None:
    """Every invalid/*.json MUST fail validation with a field-level error."""
    raw = json.loads(fixture.read_text())
    with pytest.raises(ValidationError) as excinfo:
        cls.model_validate(raw)
    # Sanity: at least one validation error reported.
    assert excinfo.value.error_count() >= 1, (
        f"{name}: invalid fixture raised ValidationError with no errors"
    )
