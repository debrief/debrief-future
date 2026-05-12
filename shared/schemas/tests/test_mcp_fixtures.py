"""
Golden + negative fixture tests for the MCP cluster (#222).

Discovers JSON fixtures under shared/schemas/fixtures/mcp/<ClassName>/
{valid,invalid}/ and asserts validation outcomes against the generated
Pydantic class.

- valid/*.json   → must validate.
- invalid/*.json → must FAIL validation with a field-level error.

Class coverage grows per slice (P1 → P2 → P3) as fixtures are added.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))


@pytest.mark.xfail(
    reason="Anchor — replaced by parameterised fixture cases once mcp.yaml classes land (T025+).",
    strict=False,
)
def test_mcp_fixtures_placeholder() -> None:
    """Placeholder so test collection picks up this module pre-implementation."""
    assert False, "Implemented in T025 (P1) / T056 (P2) / T084 (P3)."
