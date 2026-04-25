"""
Tool.category round-trip test for Feature 207 (FR-001).

Verifies lossless round-trip of `ToolCategoryEnum` values through:

  Python (Pydantic) → JSON → JSON Schema validation → Pydantic

Each of the five canonical values plus `None` (omitted field) is exercised.
This is the Article II SC-001 gate for the new enum — any drift introduced
by the LinkML Pydantic generator or the JSON Schema generator breaks this
test.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import Tool, ToolCategoryEnum

JSON_SCHEMA_PATH = (
    Path(__file__).parent.parent
    / "src"
    / "generated"
    / "json-schema"
    / "Tool.schema.json"
)


@pytest.fixture(scope="module")
def tool_validator() -> Draft202012Validator:
    schema = json.loads(JSON_SCHEMA_PATH.read_text())
    return Draft202012Validator(schema)


@pytest.mark.parametrize("category", list(ToolCategoryEnum))
def test_round_trip_declared_category(
    category: ToolCategoryEnum, tool_validator: Draft202012Validator
) -> None:
    """Each canonical value survives Python → JSON → JSON-Schema → Python.

    Note: the generated `ConfiguredBaseModel` sets `use_enum_values=True`, so
    Pydantic stores the category as its string value after construction —
    `reparsed.category` is a `str`, not a `ToolCategoryEnum` instance. The
    round-trip property we care about is value fidelity (string-equals-string
    across the pipeline), not identity of the enum type.
    """
    original = Tool(
        id=f"round-trip-{category.value}",
        name=f"Round-trip {category.value}",
        description="Round-trip test tool",
        version="1.0.0",
        category=category,
    )

    # 1. Python → JSON
    json_text = original.model_dump_json(exclude_none=True)
    parsed = json.loads(json_text)
    assert parsed["category"] == category.value

    # 2. JSON → JSON Schema validation
    tool_validator.validate(parsed)

    # 3. JSON → Python (Pydantic re-parse)
    reparsed = Tool.model_validate(parsed)
    # StrEnum equals-to-string works regardless of storage form.
    assert reparsed.category == category.value

    # 4. Second dump must be byte-identical
    assert reparsed.model_dump_json(exclude_none=True) == json_text


def test_round_trip_omitted_category(tool_validator: Draft202012Validator) -> None:
    """`None` / omitted category survives round trip."""
    original = Tool(
        id="round-trip-none",
        name="Round-trip without category",
        description="Category intentionally omitted",
    )

    json_text = original.model_dump_json(exclude_none=True)
    parsed = json.loads(json_text)
    assert "category" not in parsed

    tool_validator.validate(parsed)

    reparsed = Tool.model_validate(parsed)
    assert reparsed.category is None


def test_invalid_category_rejected_by_pydantic() -> None:
    """Non-canonical string rejected at Python construction time."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Tool.model_validate(
            {
                "id": "bad-category",
                "name": "Bad",
                "category": "geometry",  # not in ToolCategoryEnum
            }
        )


def test_invalid_category_rejected_by_json_schema(
    tool_validator: Draft202012Validator,
) -> None:
    """Non-canonical string rejected by the generated JSON Schema."""
    from jsonschema import ValidationError as JSONSchemaValidationError

    with pytest.raises(JSONSchemaValidationError):
        tool_validator.validate(
            {
                "id": "bad-category",
                "name": "Bad",
                "category": "geometry",
            }
        )
