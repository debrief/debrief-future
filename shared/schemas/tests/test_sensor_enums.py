"""
Enum exhaustiveness tests for sensor-related enumerations.

Validates every permissible value of ArrayCentreModeEnum, LineStyleEnum,
LabelLocationEnum, and LineLabelPositionEnum is accepted by the schema.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

JSONSCHEMA_DIR = Path(__file__).parent.parent / "src" / "generated" / "json-schema"


def _get_enum_values(enum_name: str) -> list[str]:
    """Extract enum values from generated JSON Schema."""
    main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
    enum_def = main_schema.get("$defs", {}).get(enum_name, {})
    return enum_def.get("enum", [])


class TestArrayCentreModeEnum:
    """ArrayCentreModeEnum exhaustiveness."""

    EXPECTED = ["PLAIN", "WORM", "MEASURED"]

    def test_all_values_present(self) -> None:
        values = _get_enum_values("ArrayCentreModeEnum")
        assert set(values) == set(self.EXPECTED), (
            f"ArrayCentreModeEnum mismatch: {values} vs {self.EXPECTED}"
        )

    @pytest.mark.parametrize("value", EXPECTED)
    def test_value_accepted(self, value: str) -> None:
        from debrief_schemas import SensorContact, SensorData

        sensor = SensorData(
            name="TEST",
            array_centre_mode=value,  # type: ignore[arg-type]  # Pydantic coerces str→enum
            contacts=[
                SensorContact(time="2026-01-09T10:00:00Z", bearing=45.0),  # type: ignore[arg-type]
            ],
        )
        assert sensor.array_centre_mode == value


class TestLineStyleEnum:
    """LineStyleEnum exhaustiveness."""

    EXPECTED = ["SOLID", "DASHED", "DOT", "DASH_DOT"]

    def test_all_values_present(self) -> None:
        values = _get_enum_values("LineStyleEnum")
        assert set(values) == set(self.EXPECTED), (
            f"LineStyleEnum mismatch: {values} vs {self.EXPECTED}"
        )

    @pytest.mark.parametrize("value", EXPECTED)
    def test_value_accepted(self, value: str) -> None:
        from debrief_schemas import SensorContact

        contact = SensorContact(
            time="2026-01-09T10:00:00Z",
            bearing=45.0,
            line_style=value,  # type: ignore[arg-type]
        )
        assert contact.line_style == value


class TestLabelLocationEnum:
    """LabelLocationEnum exhaustiveness."""

    EXPECTED = ["LEFT", "CENTER", "RIGHT"]

    def test_all_values_present(self) -> None:
        values = _get_enum_values("LabelLocationEnum")
        assert set(values) == set(self.EXPECTED), (
            f"LabelLocationEnum mismatch: {values} vs {self.EXPECTED}"
        )

    @pytest.mark.parametrize("value", EXPECTED)
    def test_value_accepted(self, value: str) -> None:
        from debrief_schemas import SensorContact

        contact = SensorContact(
            time="2026-01-09T10:00:00Z",
            bearing=45.0,
            label_location=value,  # type: ignore[arg-type]
        )
        assert contact.label_location == value


class TestLineLabelPositionEnum:
    """LineLabelPositionEnum exhaustiveness."""

    EXPECTED = ["START", "MIDDLE", "END"]

    def test_all_values_present(self) -> None:
        values = _get_enum_values("LineLabelPositionEnum")
        assert set(values) == set(self.EXPECTED), (
            f"LineLabelPositionEnum mismatch: {values} vs {self.EXPECTED}"
        )

    @pytest.mark.parametrize("value", EXPECTED)
    def test_value_accepted(self, value: str) -> None:
        from debrief_schemas import SensorContact

        contact = SensorContact(
            time="2026-01-09T10:00:00Z",
            bearing=45.0,
            put_label_at=value,  # type: ignore[arg-type]
        )
        assert contact.put_label_at == value


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
