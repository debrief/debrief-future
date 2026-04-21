"""
Temporal-enum golden-fixture validation for Feature 205 (FR-008 / SC-005).

Exercises `TemporalSlice` with the canonical permissible values of both
`PlaybackStateEnum` and `DisplayModeEnum` against the
`shared/schemas/fixtures/temporal-enums/` fixture tree. Separate from
`test_golden.py` because the temporal-enum fixtures live outside
`shared/schemas/src/fixtures/` (which is reserved for domain types that
`test_golden.py` discovers by filename prefix) — same pattern as
`test_raw_geojson_fixtures.py` established by #204.
"""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import DisplayModeEnum, PlaybackStateEnum, TemporalSlice

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "temporal-enums"
VALID_DIR = FIXTURES_DIR / "valid"
INVALID_DIR = FIXTURES_DIR / "invalid"


def _valid_fixtures() -> list[Path]:
    return sorted(VALID_DIR.rglob("*.json")) if VALID_DIR.exists() else []


def _invalid_fixtures() -> list[Path]:
    return sorted(INVALID_DIR.rglob("*.json")) if INVALID_DIR.exists() else []


@pytest.mark.parametrize("fixture_path", _valid_fixtures())
def test_valid_fixture_passes(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    instance = TemporalSlice.model_validate(data)
    assert instance is not None
    assert instance.playbackState in PlaybackStateEnum
    assert instance.displayMode in DisplayModeEnum


@pytest.mark.parametrize("fixture_path", _invalid_fixtures())
def test_invalid_fixture_fails(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    with pytest.raises(ValidationError):
        TemporalSlice.model_validate(data)


def test_valid_fixtures_cover_every_permissible_value() -> None:
    """FR-008: one valid fixture per permissible value (5 total — 3 playback states + 2 display modes)."""
    fixtures = _valid_fixtures()
    assert len(fixtures) >= 5, (
        f"Expected ≥5 valid fixtures (one per permissible value), found {len(fixtures)}"
    )

    seen_playback_states: set[str] = set()
    seen_display_modes: set[str] = set()
    for fp in fixtures:
        data = json.loads(fp.read_text())
        seen_playback_states.add(data["playbackState"])
        seen_display_modes.add(data["displayMode"])

    assert seen_playback_states >= {
        "stopped",
        "playing",
        "paused",
    }, f"Missing coverage for playback states; seen: {seen_playback_states}"
    assert seen_display_modes >= {
        "full",
        "trail",
    }, f"Missing coverage for display modes; seen: {seen_display_modes}"


def test_invalid_fixtures_exist() -> None:
    """FR-008: at least one invalid fixture per enum covering legacy / typo values."""
    fixtures = _invalid_fixtures()
    assert len(fixtures) >= 2, f"Expected ≥2 invalid fixtures (one per enum), found {len(fixtures)}"


class TestRoundTrip:
    """Round-trip every permissible value through Python → JSON → Python (SC-008, Python half).

    The TypeScript half of the three-language round-trip is covered by
    test_crosslang_roundtrip.py (if a companion fixture list is wired in
    there) or by manual verification via the acceptance-check grep suite.
    """

    CANONICAL_FIXTURES = [
        "playback-state-stopped.json",
        "playback-state-playing.json",
        "playback-state-paused.json",
        "display-mode-full.json",
        "display-mode-trail.json",
    ]

    @pytest.mark.parametrize("fixture_name", CANONICAL_FIXTURES)
    def test_python_roundtrip_preserves_enum_values(self, fixture_name: str) -> None:
        fixture_path = VALID_DIR / fixture_name
        original_data = json.loads(fixture_path.read_text())

        instance = TemporalSlice.model_validate(original_data)
        dumped = json.loads(instance.model_dump_json(exclude_none=True, exclude_defaults=True))
        instance2 = TemporalSlice.model_validate(dumped)

        assert instance == instance2, (
            f"Round-trip should preserve data for {fixture_name}; "
            f"original={original_data!r}, dumped={dumped!r}"
        )
        # The two enum-typed fields MUST survive the round trip byte-identically.
        assert dumped["playbackState"] == original_data["playbackState"]
        assert dumped["displayMode"] == original_data["displayMode"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
