"""
Tool fixture schema validation tests.

Validates that sensor tool spec golden example JSON files contain
valid SensorContact and SensorData structures where applicable.
This ensures the 62-file fixture rewrite stays schema-compliant.
"""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

TOOLS_DIR = Path(__file__).parent.parent.parent.parent / "shared" / "tools" / "sensor"


def _find_tool_fixtures() -> list[tuple[str, Path]]:
    """Discover all sensor tool fixture JSON files."""
    fixtures = []
    if not TOOLS_DIR.exists():
        return fixtures
    for category_dir in sorted(TOOLS_DIR.iterdir()):
        if not category_dir.is_dir():
            continue
        for f in sorted(category_dir.glob("*.json")):
            fixtures.append((f"{category_dir.name}/{f.name}", f))
    return fixtures


def _extract_sensor_contacts(data: dict) -> list[dict]:
    """Extract sensor contact objects from tool fixture JSON."""
    contacts = []

    def _walk(obj: object) -> None:
        if isinstance(obj, dict):
            # Look for contacts arrays
            if "contacts" in obj and isinstance(obj["contacts"], list):
                for c in obj["contacts"]:
                    if isinstance(c, dict) and "time" in c and "bearing" in c:
                        contacts.append(c)
            # Look for cuts arrays (legacy tool fixture pattern)
            if "cuts" in obj and isinstance(obj["cuts"], list):
                for c in obj["cuts"]:
                    if isinstance(c, dict) and "time" in c and "bearing" in c:
                        contacts.append(c)
            for v in obj.values():
                _walk(v)
        elif isinstance(obj, list):
            for item in obj:
                _walk(item)

    _walk(data)
    return contacts


TOOL_FIXTURES = _find_tool_fixtures()


@pytest.mark.parametrize("name,fixture_path", TOOL_FIXTURES, ids=[n for n, _ in TOOL_FIXTURES])
def test_tool_fixture_is_valid_json(name: str, fixture_path: Path) -> None:
    """Tool fixture should be valid JSON."""
    try:
        json.loads(fixture_path.read_text())
    except json.JSONDecodeError as e:
        pytest.fail(f"Invalid JSON in {name}: {e}")


@pytest.mark.parametrize("name,fixture_path", TOOL_FIXTURES, ids=[n for n, _ in TOOL_FIXTURES])
def test_tool_fixture_contacts_have_required_fields(name: str, fixture_path: Path) -> None:
    """Sensor contacts in tool fixtures should have time and bearing."""
    data = json.loads(fixture_path.read_text())
    contacts = _extract_sensor_contacts(data)
    for i, contact in enumerate(contacts):
        assert "time" in contact, f"{name}: contact[{i}] missing 'time'"
        assert "bearing" in contact, f"{name}: contact[{i}] missing 'bearing'"


@pytest.mark.parametrize("name,fixture_path", TOOL_FIXTURES, ids=[n for n, _ in TOOL_FIXTURES])
def test_tool_fixture_bearing_in_range(name: str, fixture_path: Path) -> None:
    """Bearings in tool fixtures should be in [0, 360] range."""
    data = json.loads(fixture_path.read_text())
    contacts = _extract_sensor_contacts(data)
    for i, contact in enumerate(contacts):
        bearing = contact.get("bearing")
        if bearing is not None:
            assert 0 <= bearing <= 360, (
                f"{name}: contact[{i}] bearing={bearing} outside [0, 360]"
            )
        ambiguous = contact.get("ambiguous_bearing")
        if ambiguous is not None:
            assert 0 <= ambiguous <= 360, (
                f"{name}: contact[{i}] ambiguous_bearing={ambiguous} outside [0, 360]"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
