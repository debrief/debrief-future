"""
Properties Panel schema additions — round-trip test.

Covers the two LinkML additions landed by #193:
1. debrief:overrides — array of field names
2. debrief:provenance_log — array of PropertiesProvenanceEntry

Asserts that golden fixtures round-trip through Pydantic without data loss
(Article II.2 — schema tests gate merges).
"""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import PropertiesProvenanceEntry, StacExtensionProperties

FIXTURES_DIR: Path = (
    Path(__file__).parent.parent / "fixtures" / "stac-extension"
)


class TestOverridesFixture:
    def test_overrides_valid_fixture_roundtrip(self) -> None:
        data: dict[str, object] = json.loads(
            (FIXTURES_DIR / "overrides-valid.json").read_text()
        )
        original = StacExtensionProperties(**data)  # type: ignore[arg-type]
        json_str: str = original.model_dump_json()
        restored = StacExtensionProperties(**json.loads(json_str))  # type: ignore[arg-type]
        assert restored.overrides == original.overrides
        assert restored.overrides == ["start_datetime"]


class TestProvenanceLogFixture:
    def test_provenance_log_valid_fixture_roundtrip(self) -> None:
        data: dict[str, object] = json.loads(
            (FIXTURES_DIR / "provenance-log-valid.json").read_text()
        )
        original = StacExtensionProperties(**data)  # type: ignore[arg-type]
        json_str: str = original.model_dump_json()
        restored = StacExtensionProperties(**json.loads(json_str))  # type: ignore[arg-type]
        assert restored.provenance_log is not None
        assert len(restored.provenance_log) == 2
        assert restored.provenance_log == original.provenance_log
        entry = restored.provenance_log[0]
        assert entry.tool == "debrief.propertiesPanel"
        assert entry.method.startswith("properties-panel@")
        assert entry.source == "user"
        assert len(entry.fields) >= 1


class TestProvenanceLogInvariants:
    def test_empty_fields_list_rejected(self) -> None:
        """A provenance entry with empty fields[] must fail validation."""
        data: dict[str, object] = json.loads(
            (FIXTURES_DIR / "provenance-log-empty-fields-invalid.json").read_text()
        )
        with pytest.raises(ValidationError):
            StacExtensionProperties(**data)  # type: ignore[arg-type]

    def test_bad_tool_sentinel_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PropertiesProvenanceEntry(
                activity_id="01HXK5G8P0Q1R2S3T4U5V6W7X8",
                timestamp="2026-04-17T10:00:00Z",
                tool="someOtherTool",
                method="properties-panel@1.0.0",
                fields=["debrief:tags"],
                source="user",
            )

    def test_bad_method_prefix_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PropertiesProvenanceEntry(
                activity_id="01HXK5G8P0Q1R2S3T4U5V6W7X8",
                timestamp="2026-04-17T10:00:00Z",
                tool="debrief.propertiesPanel",
                method="wrong-prefix@1.0.0",
                fields=["debrief:tags"],
                source="user",
            )

    def test_bad_source_rejected(self) -> None:
        with pytest.raises(ValidationError):
            PropertiesProvenanceEntry(
                activity_id="01HXK5G8P0Q1R2S3T4U5V6W7X8",
                timestamp="2026-04-17T10:00:00Z",
                tool="debrief.propertiesPanel",
                method="properties-panel@1.0.0",
                fields=["debrief:tags"],
                source="system",
            )


class TestPropertiesPanelRoundTrip:
    def test_combined_overrides_and_provenance_roundtrip(self) -> None:
        """Instance-construction round-trip covering both new fields."""
        original = StacExtensionProperties(
            tags=["atlantic"],
            overrides=["start_datetime"],
            provenance_log=[
                PropertiesProvenanceEntry(
                    activity_id="01HXK5G8P0Q1R2S3T4U5V6W7X8",
                    timestamp="2026-04-17T10:00:00Z",
                    tool="debrief.propertiesPanel",
                    method="properties-panel@1.0.0",
                    fields=["debrief:tags"],
                    source="user",
                )
            ],
        )
        json_str: str = original.model_dump_json()
        restored = StacExtensionProperties(**json.loads(json_str))  # type: ignore[arg-type]
        assert restored == original


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
