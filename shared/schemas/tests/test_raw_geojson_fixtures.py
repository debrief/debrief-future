"""
Raw-GeoJSON golden-fixture validation for #204.

Exercises `RawGeoJSONFeature` and `RawGeoJSONFeatureCollection` against the
`shared/schemas/fixtures/raw-geojson/` fixture tree. Separate from
`test_golden.py` because the raw-geojson fixtures live outside
`shared/schemas/src/fixtures/` (which is reserved for domain types that
`test_golden.py` discovers by filename prefix).
"""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import RawGeoJSONFeature, RawGeoJSONFeatureCollection

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "raw-geojson"
VALID_DIR = FIXTURES_DIR / "valid"
INVALID_DIR = FIXTURES_DIR / "invalid"


def _select_model(data: dict) -> type:
    return (
        RawGeoJSONFeatureCollection
        if data.get("type") == "FeatureCollection"
        else RawGeoJSONFeature
    )


def _valid_fixtures() -> list[Path]:
    return sorted(VALID_DIR.rglob("*.json")) if VALID_DIR.exists() else []


def _invalid_fixtures() -> list[Path]:
    return sorted(INVALID_DIR.rglob("*.json")) if INVALID_DIR.exists() else []


@pytest.mark.parametrize("fixture_path", _valid_fixtures())
def test_valid_fixture_passes(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    model_class = _select_model(data)
    instance = model_class.model_validate(data)
    assert instance is not None


@pytest.mark.parametrize("fixture_path", _invalid_fixtures())
def test_invalid_fixture_fails(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    model_class = _select_model(data)
    with pytest.raises(ValidationError):
        model_class.model_validate(data)


def test_valid_fixtures_exist() -> None:
    fixtures = _valid_fixtures()
    # 5 feature-level + 7 per-geometry-kind = 12 valid fixtures
    assert len(fixtures) >= 12, f"Expected ≥12 valid fixtures, found {len(fixtures)}"


def test_invalid_fixtures_exist() -> None:
    fixtures = _invalid_fixtures()
    # 5 invalid fixtures (wrong-type, missing-geometry, numeric-type,
    # id-object, unknown-geometry-type)
    assert len(fixtures) >= 5, f"Expected ≥5 invalid fixtures, found {len(fixtures)}"


class TestRoundTrip:
    """Round-trip 3 canonical fixtures through Python → JSON → Python (SC-008).

    A true three-language round-trip additionally passes the Python-dumped
    JSON through TypeScript (JSON.parse → JSON.stringify) and back; that
    portion is handled by `test_crosslang_roundtrip.py` via a sidecar file,
    and this test asserts the Python half of the contract.
    """

    CANONICAL_FIXTURES = [
        "feature-string-id.json",
        "feature-integer-id.json",
        "collection-mixed-ids.json",
    ]

    @pytest.mark.parametrize("fixture_name", CANONICAL_FIXTURES)
    def test_python_roundtrip_preserves_data(self, fixture_name: str) -> None:
        fixture_path = VALID_DIR / fixture_name
        original_data = json.loads(fixture_path.read_text())
        model_class = _select_model(original_data)

        instance = model_class.model_validate(original_data)
        dumped = json.loads(instance.model_dump_json(exclude_none=True, exclude_defaults=True))
        instance2 = model_class.model_validate(dumped)

        assert instance == instance2, (
            f"Round-trip should preserve data for {fixture_name}; "
            f"original={original_data!r}, dumped={dumped!r}"
        )


class TestPerformance:
    """Pydantic validation micro-bench for a 10 000-feature collection.

    Budget: ≤ 500 ms on the CI runner — matches the spec (SC) and comfortably
    accommodates the measured wall-clock (~250 ms for 10 000 features) on
    the un-discriminated union. The `designates_type: true` optimisation
    the spec proposed for this budget triggers a gen-pydantic regression
    (emits `Literal["GeoJSONPoint"]` instead of `Literal["Point"]`, which
    breaks real GeoJSON payloads) and has been deferred; the measured perf
    is nevertheless well under the budget so no optimisation is needed.
    """

    N = 10_000
    BUDGET_SECONDS = 0.5

    def test_10k_feature_collection_validates_within_budget(self) -> None:
        import random
        import time

        random.seed(42)
        geometry_fixtures = [
            json.loads((VALID_DIR / "geometry" / f).read_text())["geometry"]
            for f in (
                "point.json",
                "empty-point.json",
                "linestring.json",
                "polygon.json",
                "multipoint.json",
                "multilinestring.json",
                "multipolygon.json",
            )
        ]
        features = [
            {
                "type": "Feature",
                "id": i,
                "geometry": random.choice(geometry_fixtures),
                "properties": {},
            }
            for i in range(self.N)
        ]
        collection = {"type": "FeatureCollection", "features": features}

        start = time.perf_counter()
        RawGeoJSONFeatureCollection.model_validate(collection)
        elapsed = time.perf_counter() - start

        print(f"\nValidated {self.N} features in {elapsed * 1000:.1f} ms")
        assert elapsed < self.BUDGET_SECONDS, (
            f"10 000-feature validation took {elapsed:.2f}s, exceeds {self.BUDGET_SECONDS}s budget"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
