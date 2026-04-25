"""
ToolCategoryEnum golden-fixture validation for Feature 207 (FR-001, FR-008 / SC-002).

Exercises `Tool` with the canonical permissible values of `ToolCategoryEnum`
against the `shared/schemas/fixtures/tool/` fixture tree — same layout
pattern as `test_temporal_enum_fixtures.py` established by #205.
"""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import Tool, ToolCategoryEnum

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "tool"
VALID_DIR = FIXTURES_DIR / "valid"
INVALID_DIR = FIXTURES_DIR / "invalid"

CANONICAL_CATEGORY_VALUES = {"import", "style", "calc", "filter", "snapshot"}


def _valid_fixtures() -> list[Path]:
    return sorted(VALID_DIR.rglob("*.json")) if VALID_DIR.exists() else []


def _invalid_fixtures() -> list[Path]:
    return sorted(INVALID_DIR.rglob("*.json")) if INVALID_DIR.exists() else []


@pytest.mark.parametrize("fixture_path", _valid_fixtures())
def test_valid_fixture_passes(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    instance = Tool.model_validate(data)
    assert instance is not None
    assert instance.id == data["id"]
    # Category is optional; if declared it must be a canonical value.
    declared_category = data.get("category")
    if declared_category is not None:
        assert declared_category in CANONICAL_CATEGORY_VALUES
        # `ConfiguredBaseModel` uses `use_enum_values=True` so the stored
        # attribute is the string value, not the enum instance. Compare
        # directly as strings.
        assert instance.category == declared_category
    else:
        assert instance.category is None


@pytest.mark.parametrize("fixture_path", _invalid_fixtures())
def test_invalid_fixture_fails(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    with pytest.raises(ValidationError):
        Tool.model_validate(data)


def test_valid_fixtures_cover_every_permissible_value() -> None:
    """FR-001: one valid fixture per canonical category + one for the omitted/null case."""
    fixtures = _valid_fixtures()
    assert len(fixtures) >= 6, (
        f"Expected ≥6 valid fixtures (five categories + one without), found {len(fixtures)}"
    )

    seen_categories: set[str | None] = set()
    for fp in fixtures:
        data = json.loads(fp.read_text())
        seen_categories.add(data.get("category"))

    assert seen_categories >= CANONICAL_CATEGORY_VALUES, (
        f"Missing coverage for category values; seen: {seen_categories}"
    )
    assert None in seen_categories, (
        "At least one fixture must omit the category field to exercise the null / grey-fallback path"
    )


def test_invalid_fixtures_exist() -> None:
    """FR-008: at least one invalid fixture covering a typo / bespoke value."""
    assert _invalid_fixtures(), "At least one invalid fixture required"


def test_tool_category_enum_has_exactly_five_members() -> None:
    """Guard: the canonical set must not drift silently — a sixth bucket is a separate conversation (spec A2)."""
    values = {m.value for m in ToolCategoryEnum}
    assert values == CANONICAL_CATEGORY_VALUES, (
        f"ToolCategoryEnum drifted from canonical 5 values: got {values}"
    )
