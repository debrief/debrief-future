"""
STAC extension property validation tests.

Tests that:
- Valid extension fixtures pass Pydantic validation (US1)
- Invalid extension fixtures fail with expected ValidationErrors (US1)
- Generated exercise fixtures meet distribution requirements (US2)
- Extension properties survive JSON round-trip (US3)

Fixture locations:
- Valid:    shared/schemas/fixtures/stac-browser/valid/
- Invalid:  shared/schemas/fixtures/stac-browser/invalid/
- Exercises: shared/schemas/fixtures/stac-browser/exercise-NNN/item.json
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import PlatformRecord, StacExtensionProperties

STAC_BROWSER_DIR: Path = Path(__file__).parent.parent / "fixtures" / "stac-browser"
VALID_DIR: Path = STAC_BROWSER_DIR / "valid"
INVALID_DIR: Path = STAC_BROWSER_DIR / "invalid"

# Debrief extension property prefix
DEBRIEF_PREFIX: str = "debrief:"

# All extension field names (without prefix)
EXTENSION_FIELDS: list[str] = [
    "platforms",
    "tags",
    "feature_tags",
]

# Duration bucket boundaries in hours
DURATION_BUCKETS: dict[str, tuple[float, float]] = {
    "<6H": (0, 6),
    "<24H": (6, 24),
    "<72H": (24, 72),
    "<10D": (72, 240),
    ">10D": (240, float("inf")),
}

# Geographic region boundaries (latitude, longitude quadrants)
REGION_BOUNDARIES: dict[str, tuple[tuple[float, float], tuple[float, float]]] = {
    "N-Atlantic": ((20, 70), (-80, 0)),
    "S-Atlantic": ((-60, 20), (-80, 0)),
    "N-Pacific": ((20, 70), (100, 180)),
    "S-Pacific": ((-60, 20), (100, 180)),
    "Indian": ((-60, 30), (20, 100)),
    "Mediterranean": ((30, 47), (-6, 42)),
    "Arctic": ((70, 90), (-180, 180)),
    "Antarctic": ((-90, -60), (-180, 180)),
}


def _get_valid_fixtures() -> list[Path]:
    """Collect all valid extension fixture files."""
    if not VALID_DIR.exists():
        return []
    return sorted(VALID_DIR.glob("*.json"))


def _get_invalid_fixtures() -> list[Path]:
    """Collect all invalid extension fixture files."""
    if not INVALID_DIR.exists():
        return []
    return sorted(INVALID_DIR.glob("*.json"))


def _get_exercise_dirs() -> list[Path]:
    """Collect all exercise-NNN directories."""
    if not STAC_BROWSER_DIR.exists():
        return []
    return sorted(
        p for p in STAC_BROWSER_DIR.iterdir() if p.is_dir() and p.name.startswith("exercise-")
    )


def _extract_extension_props(properties: dict[str, object]) -> dict[str, object]:
    """Extract debrief: prefixed properties and map to model field names.

    Reads keys like ``debrief:vessel_classes`` from a STAC item's
    ``properties`` dict and returns ``{"vessel_classes": ...}``.
    """
    result: dict[str, object] = {}
    for field in EXTENSION_FIELDS:
        key = f"{DEBRIEF_PREFIX}{field}"
        if key in properties:
            result[field] = properties[key]
    return result


def _load_exercise_item(exercise_dir: Path) -> dict[str, object]:
    """Load and return the item.json from an exercise directory."""
    item_path = exercise_dir / "item.json"
    return json.loads(item_path.read_text())  # type: ignore[no-any-return]


def _classify_region(lat: float, lon: float) -> str:
    """Classify a lat/lon point into a named geographic region."""
    for name, ((lat_min, lat_max), (lon_min, lon_max)) in REGION_BOUNDARIES.items():
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return name
    return "other"


def _duration_hours(item: dict[str, object]) -> float | None:
    """Compute exercise duration in hours from STAC temporal properties.

    Returns None when the item has no start/end datetime range.
    """
    props: dict[str, object] = item.get("properties", {})  # type: ignore[assignment]
    start_str = props.get("start_datetime")
    end_str = props.get("end_datetime")
    if not start_str or not end_str:
        return None
    start = datetime.fromisoformat(str(start_str).replace("Z", "+00:00"))
    end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
    return (end - start).total_seconds() / 3600.0


def _duration_bucket(hours: float) -> str:
    """Map a duration in hours to one of the five defined buckets."""
    for bucket, (lo, hi) in DURATION_BUCKETS.items():
        if lo <= hours < hi:
            return bucket
    return ">10D"


# ---------------------------------------------------------------------------
# US1 — Golden fixture tests
# ---------------------------------------------------------------------------


class TestValidFixtures:
    """Valid extension fixtures must pass Pydantic validation."""

    @pytest.mark.parametrize(
        "fixture_path",
        _get_valid_fixtures(),
        ids=lambda p: p.name,
    )
    def test_valid_fixtures_pass_validation(self, fixture_path: Path) -> None:
        data: dict[str, object] = json.loads(fixture_path.read_text())
        instance = StacExtensionProperties(**data)  # type: ignore[arg-type]
        assert instance is not None


class TestInvalidFixtures:
    """Invalid extension fixtures must raise ValidationError."""

    @pytest.mark.parametrize(
        "fixture_path",
        _get_invalid_fixtures(),
        ids=lambda p: p.name,
    )
    def test_invalid_fixtures_fail_validation(self, fixture_path: Path) -> None:
        data: dict[str, object] = json.loads(fixture_path.read_text())
        with pytest.raises(ValidationError) as exc_info:
            StacExtensionProperties(**data)  # type: ignore[arg-type]
        assert len(exc_info.value.errors()) > 0

    def test_uppercase_vessel_path_fails(self) -> None:
        """Vessel class paths in platforms must be lowercase."""
        data: dict[str, object] = {
            "platforms": [{"id": "BAD", "vessel_class": "SURFACE/WARSHIP"}],
            "tags": [],
            "feature_tags": [],
        }
        with pytest.raises(ValidationError):
            StacExtensionProperties(**data)  # type: ignore[arg-type]

    def test_non_alpha2_nationality_fails(self) -> None:
        """Nationalities in platforms must be ISO 3166-1 alpha-2 (two uppercase letters)."""
        data: dict[str, object] = {
            "platforms": [{"id": "BAD", "nationality": "Great Britain"}],
            "tags": [],
            "feature_tags": [],
        }
        with pytest.raises(ValidationError):
            StacExtensionProperties(**data)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# US2 — Distribution tests (exercise fixtures)
# ---------------------------------------------------------------------------

_exercise_dirs: list[Path] = _get_exercise_dirs()
_exercises_exist: bool = len(_exercise_dirs) > 0

_skip_no_exercises = pytest.mark.skipif(
    not _exercises_exist,
    reason="No exercise-NNN fixture directories found",
)


@_skip_no_exercises
class TestExerciseFixtureCount:
    """Verify the expected number of exercise fixtures exist."""

    def test_fixture_count(self) -> None:
        assert len(_exercise_dirs) == 100, (
            f"Expected 100 exercise directories, found {len(_exercise_dirs)}"
        )


@_skip_no_exercises
class TestExerciseValidation:
    """All exercise item.json files must pass extension property validation."""

    def test_all_fixtures_valid(self) -> None:
        errors: list[str] = []
        for d in _exercise_dirs:
            item = _load_exercise_item(d)
            props = _extract_extension_props(item.get("properties", {}))  # type: ignore[arg-type]
            try:
                StacExtensionProperties(**props)  # type: ignore[arg-type]
            except ValidationError as e:
                errors.append(f"{d.name}: {e}")
        assert errors == [], "Validation failures:\n" + "\n".join(errors)


@_skip_no_exercises
class TestExerciseDiversity:
    """Exercise fixtures must demonstrate adequate diversity."""

    @pytest.fixture(autouse=True)
    def _load_all_items(self) -> None:
        """Load all exercise items once per test class."""
        self.items: list[dict[str, object]] = [_load_exercise_item(d) for d in _exercise_dirs]
        self.all_props: list[dict[str, object]] = [
            _extract_extension_props(item.get("properties", {}))  # type: ignore[arg-type]
            for item in self.items
        ]

    def test_vessel_class_diversity(self) -> None:
        """At least 5 distinct vessel classes across all exercises."""
        classes: set[str] = set()
        for props in self.all_props:
            for p in props.get("platforms", []):  # type: ignore[union-attr]
                vc = p.get("vessel_class") if isinstance(p, dict) else None  # type: ignore[union-attr]
                if vc:
                    classes.add(str(vc))
        assert len(classes) >= 5, f"Only {len(classes)} distinct vessel classes: {classes}"

    def test_nationality_diversity(self) -> None:
        """At least 6 distinct nationalities, all matching alpha-2 pattern."""
        import re

        alpha2 = re.compile(r"^[A-Z]{2}$")
        nats: set[str] = set()
        for props in self.all_props:
            for p in props.get("platforms", []):  # type: ignore[union-attr]
                nat = p.get("nationality") if isinstance(p, dict) else None  # type: ignore[union-attr]
                if nat:
                    nat_str = str(nat)
                    assert alpha2.match(nat_str), f"Invalid nationality code: {nat_str}"
                    nats.add(nat_str)
        assert len(nats) >= 6, f"Only {len(nats)} distinct nationalities: {nats}"

    def test_geographic_distribution(self) -> None:
        """Items must span at least 4 distinct geographic regions."""
        regions: set[str] = set()
        for item in self.items:
            bbox = item.get("bbox")
            if bbox and len(bbox) >= 4:  # type: ignore[arg-type]
                # Compute bbox center
                lon = (float(bbox[0]) + float(bbox[2])) / 2.0  # type: ignore[index]
                lat = (float(bbox[1]) + float(bbox[3])) / 2.0  # type: ignore[index]
                regions.add(_classify_region(lat, lon))
        assert len(regions) >= 4, f"Only {len(regions)} regions: {regions}"

    def test_duration_buckets(self) -> None:
        """All 5 duration buckets must be represented."""
        buckets: set[str] = set()
        for item in self.items:
            hours = _duration_hours(item)
            if hours is not None:
                buckets.add(_duration_bucket(hours))
        expected = set(DURATION_BUCKETS.keys())
        assert buckets >= expected, f"Missing buckets: {expected - buckets}"

    def test_filter_selectivity(self) -> None:
        """Filtering by any single categorical property returns 3-80% of items.

        Tests tags (list field) and platforms[].vessel_class / platforms[].nationality
        (derived from platforms array). Track names and feature tags are per-item
        unique values so individual value selectivity is not meaningful.
        """
        n = len(self.all_props)

        # Test tags directly
        tag_values: set[str] = set()
        for props in self.all_props:
            for v in props.get("tags", []):  # type: ignore[union-attr]
                tag_values.add(str(v))
        for value in tag_values:
            count = sum(
                1
                for props in self.all_props
                if value in [str(v) for v in props.get("tags", [])]  # type: ignore[union-attr]
            )
            pct = count / n * 100.0
            assert 3 <= pct <= 80, (
                f"Filtering tags={value!r} returns {pct:.1f}% ({count}/{n}), expected 3-80%"
            )

        # Test vessel_class derived from platforms
        vc_values: set[str] = set()
        for props in self.all_props:
            for p in props.get("platforms", []):  # type: ignore[union-attr]
                vc = p.get("vessel_class") if isinstance(p, dict) else None  # type: ignore[union-attr]
                if vc:
                    vc_values.add(str(vc))
        for value in vc_values:
            count = sum(
                1
                for props in self.all_props
                if any(
                    isinstance(p, dict) and p.get("vessel_class") == value  # type: ignore[union-attr]
                    for p in props.get("platforms", [])  # type: ignore[union-attr]
                )
            )
            pct = count / n * 100.0
            assert 3 <= pct <= 80, (
                f"Filtering vessel_class={value!r} returns {pct:.1f}% ({count}/{n}), expected 3-80%"
            )

        # Test nationality derived from platforms
        nat_values: set[str] = set()
        for props in self.all_props:
            for p in props.get("platforms", []):  # type: ignore[union-attr]
                nat = p.get("nationality") if isinstance(p, dict) else None  # type: ignore[union-attr]
                if nat:
                    nat_values.add(str(nat))
        for value in nat_values:
            count = sum(
                1
                for props in self.all_props
                if any(
                    isinstance(p, dict) and p.get("nationality") == value  # type: ignore[union-attr]
                    for p in props.get("platforms", [])  # type: ignore[union-attr]
                )
            )
            pct = count / n * 100.0
            assert 3 <= pct <= 80, (
                f"Filtering nationality={value!r} returns {pct:.1f}% ({count}/{n}), expected 3-80%"
            )


@_skip_no_exercises
class TestExerciseEdgeCases:
    """Exercise fixtures must include specific edge cases."""

    @pytest.fixture(autouse=True)
    def _load_all_items(self) -> None:
        self.items: list[dict[str, object]] = [_load_exercise_item(d) for d in _exercise_dirs]
        self.all_props: list[dict[str, object]] = [
            _extract_extension_props(item.get("properties", {}))  # type: ignore[arg-type]
            for item in self.items
        ]

    def test_edge_cases_zero_tracks(self) -> None:
        """At least 3 items with empty platforms array."""
        count = sum(
            1
            for props in self.all_props
            if len(props.get("platforms", [])) == 0  # type: ignore[arg-type]
        )
        assert count >= 3, f"Only {count} items with zero platforms, expected >= 3"

    def test_edge_cases_dense_tracks(self) -> None:
        """At least 3 items with 5 or more platforms."""
        count = sum(
            1
            for props in self.all_props
            if len(props.get("platforms", [])) >= 5  # type: ignore[arg-type]
        )
        assert count >= 3, f"Only {count} items with 5+ platforms, expected >= 3"

    def test_edge_cases_single_timestamp(self) -> None:
        """At least 3 items with no start_datetime/end_datetime (single timestamp)."""
        count: int = 0
        for item in self.items:
            item_props: dict[str, object] = item.get("properties", {})  # type: ignore[assignment]
            has_start = item_props.get("start_datetime") is not None
            has_end = item_props.get("end_datetime") is not None
            if not has_start and not has_end:
                count += 1
        assert count >= 3, f"Only {count} items without start/end datetime, expected >= 3"


# ---------------------------------------------------------------------------
# US3 — Round-trip tests
# ---------------------------------------------------------------------------


class TestRoundTrip:
    """Extension properties must survive JSON serialization round-trip."""

    def test_round_trip(self) -> None:
        """Serialize to JSON via Pydantic, deserialize back, assert equality."""
        original = StacExtensionProperties(
            platforms=[
                PlatformRecord(
                    id="ARGYLL",
                    name="HMS Argyll",
                    nationality="GB",
                    vessel_class="surface/warship/frigate/type23",
                    vessel_type="type23",
                    vessel_role="frigate",
                    domain="surface",
                ),
                PlatformRecord(
                    id="SC01",
                    name="SUBMERGED CONTACT 01",
                    nationality="US",
                    vessel_class="subsurface/submarine",
                    domain="subsurface",
                ),
            ],
            tags=["ASW", "training"],
            feature_tags=["sonar-contact", "datum"],
        )

        # Serialize to JSON string, then back to dict, then to model
        json_str: str = original.model_dump_json()
        data: dict[str, object] = json.loads(json_str)
        restored = StacExtensionProperties(**data)  # type: ignore[arg-type]

        assert restored.platforms == original.platforms
        assert restored.tags == original.tags
        assert restored.feature_tags == original.feature_tags

    def test_round_trip_empty(self) -> None:
        """Round-trip with all default (empty) values."""
        original = StacExtensionProperties()
        json_str: str = original.model_dump_json()
        data: dict[str, object] = json.loads(json_str)
        restored = StacExtensionProperties(**data)  # type: ignore[arg-type]

        assert restored.platforms == original.platforms
        assert restored.tags == original.tags

    def test_round_trip_from_fixture(self) -> None:
        """Round-trip using the basic valid fixture."""
        fixture_path = VALID_DIR / "extension-basic.json"
        if not fixture_path.exists():
            pytest.skip("Basic fixture not found")
        data: dict[str, object] = json.loads(fixture_path.read_text())
        original = StacExtensionProperties(**data)  # type: ignore[arg-type]
        json_str: str = original.model_dump_json()
        restored = StacExtensionProperties(**json.loads(json_str))  # type: ignore[arg-type]

        assert restored == original


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
