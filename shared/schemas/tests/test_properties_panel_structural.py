"""
Properties Panel schema additions — structural comparison.

Asserts that gen-pydantic and gen-jsonschema outputs agree on:
- overrides is an optional array of strings on StacExtensionProperties
- provenance_log is an optional array of PropertiesProvenanceEntry
- PropertiesProvenanceEntry has the six required fields in snake_case
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import PropertiesProvenanceEntry, StacExtensionProperties

GENERATED_DIR: Path = (
    Path(__file__).parent.parent / "src" / "generated" / "json-schema"
)


def _load_schema(name: str) -> dict[str, object]:
    """Load a class schema from the combined debrief.schema.json $defs block."""
    path = GENERATED_DIR / "debrief.schema.json"
    if not path.exists():
        pytest.skip(f"Generated JSON Schema not found: {path}")
    data: dict[str, object] = json.loads(path.read_text())
    defs: dict[str, object] = data.get("$defs", {})  # type: ignore[assignment]
    if name not in defs:
        pytest.skip(f"{name} not found in $defs")
    return defs[name]  # type: ignore[return-value]


class TestStacExtensionPropertiesNewFields:
    def test_overrides_field_present_in_pydantic(self) -> None:
        fields = StacExtensionProperties.model_fields
        assert "overrides" in fields
        assert not fields["overrides"].is_required()

    def test_provenance_log_field_present_in_pydantic(self) -> None:
        fields = StacExtensionProperties.model_fields
        assert "provenance_log" in fields
        assert not fields["provenance_log"].is_required()

    def test_overrides_field_present_in_jsonschema(self) -> None:
        schema = _load_schema("StacExtensionProperties")
        properties: dict[str, object] = schema.get("properties", {})  # type: ignore[assignment]
        assert "overrides" in properties
        overrides_schema: dict[str, object] = properties["overrides"]  # type: ignore[assignment]
        items: dict[str, object] = overrides_schema.get("items", {})  # type: ignore[assignment]
        type_val = overrides_schema.get("type")
        assert type_val == "array" or (isinstance(type_val, list) and "array" in type_val)
        item_type = items.get("type")
        assert item_type == "string" or (
            isinstance(item_type, list) and "string" in item_type
        )

    def test_provenance_log_field_present_in_jsonschema(self) -> None:
        schema = _load_schema("StacExtensionProperties")
        properties: dict[str, object] = schema.get("properties", {})  # type: ignore[assignment]
        assert "provenance_log" in properties
        prov_schema: dict[str, object] = properties["provenance_log"]  # type: ignore[assignment]
        type_val = prov_schema.get("type")
        assert type_val == "array" or (isinstance(type_val, list) and "array" in type_val)


class TestPropertiesProvenanceEntryStructure:
    def test_all_required_fields_in_pydantic(self) -> None:
        required = {
            "activity_id",
            "timestamp",
            "tool",
            "method",
            "fields",
            "source",
        }
        fields = PropertiesProvenanceEntry.model_fields
        for name in required:
            assert name in fields, f"Missing field: {name}"
            assert fields[name].is_required(), f"Field {name} should be required"

    def test_jsonschema_has_all_required_fields(self) -> None:
        schema = _load_schema("PropertiesProvenanceEntry")
        required: list[str] = schema.get("required", [])  # type: ignore[assignment]
        for name in (
            "activity_id",
            "timestamp",
            "tool",
            "method",
            "fields",
            "source",
        ):
            assert name in required, f"JSON Schema missing required field: {name}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
