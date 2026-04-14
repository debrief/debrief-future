"""Tests for the build-time enum-bundle extractor."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import jsonschema
import pytest
from debrief_data import (
    CatalogScanResult,
    build_bundle,
    extract_class_tree,
    load_registry,
    scan_catalog,
    serialize,
)
from debrief_data.enum_bundle import (
    _canonical_key,
    _dedup_preserving_first,
    _parse_exercise_name,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = Path(__file__).parent / "fixtures"
FIXTURE_CATALOG = FIXTURES_DIR / "catalog"
REAL_REGISTRY = Path(__file__).parent.parent / "platform-registry.json"
REAL_CATALOG = REPO_ROOT / "preview/workspace/samples/local-store"
SCHEMA_PATH = (
    REPO_ROOT / "specs/187-build-time-enums/contracts/enum-bundle.schema.json"
)
SCRIPT_PATH = REPO_ROOT / "scripts/extract-enum-bundle.py"


# ---------------------------------------------------------------------------
# Phase 2: Foundational helper tests (T009)
# ---------------------------------------------------------------------------


class TestCanonicalKey:
    def test_strips_whitespace_and_casefolds(self) -> None:
        assert _canonical_key(" Training ") == "training"

    def test_empty_string_stays_empty(self) -> None:
        assert _canonical_key("") == ""

    def test_mixed_case_collapses(self) -> None:
        assert _canonical_key("ASW") == _canonical_key("asw")

    def test_does_not_touch_interior_whitespace(self) -> None:
        assert _canonical_key("Saxon Warrior") == "saxon warrior"


class TestDedupPreservingFirst:
    def test_dedupes_by_canonical_key_preserving_first_casing(self) -> None:
        result = _dedup_preserving_first(["Training", "training", "ASW", "asw"])
        # First-seen casing wins; sorted case-insensitive.
        assert result == ["ASW", "Training"]

    def test_drops_empty_and_whitespace_only(self) -> None:
        result = _dedup_preserving_first(["", "   ", "ASW"])
        assert result == ["ASW"]

    def test_sort_is_case_insensitive(self) -> None:
        result = _dedup_preserving_first(["banana", "Apple", "cherry"])
        assert result == ["Apple", "banana", "cherry"]

    def test_trailing_whitespace_collapses_with_stripped_form(self) -> None:
        # "Training " trims to "Training"; earlier "training" wins first-seen.
        result = _dedup_preserving_first(["training", "Training "])
        assert result == ["training"]


class TestParseExerciseName:
    def test_title_with_separator_returns_prefix(self) -> None:
        assert _parse_exercise_name("Saxon Warrior: Boat1") == "Saxon Warrior"

    def test_title_without_separator_returns_none(self) -> None:
        assert _parse_exercise_name("AIS dropoff 2010") is None

    def test_bare_colon_without_space_returns_none(self) -> None:
        # Conservative rule — requires the literal ": " (colon-space).
        assert _parse_exercise_name("AIS:dropoff") is None

    def test_none_returns_none(self) -> None:
        assert _parse_exercise_name(None) is None

    def test_leading_separator_returns_none(self) -> None:
        assert _parse_exercise_name(": trailing") is None

    def test_prefix_is_trimmed(self) -> None:
        assert _parse_exercise_name("  Saxon Warrior  : Boat1") == "Saxon Warrior"

    def test_multiple_separators_keeps_first(self) -> None:
        assert _parse_exercise_name("Saxon Warrior: Phase 2: Boat1") == "Saxon Warrior"


# ---------------------------------------------------------------------------
# Phase 3: US1 tests (T010–T016)
# ---------------------------------------------------------------------------


class TestExtractClassTree:
    def test_strips_platform_leaves(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        tree = extract_class_tree(registry)
        # Walk down to type23 — the leaf below should be empty after leaves stripped.
        surface = tree["surface"]
        assert isinstance(surface, dict)
        warship = surface["warship"]
        assert isinstance(warship, dict)
        frigate = warship["frigate"]
        assert isinstance(frigate, dict)
        type23 = frigate["type23"]
        assert isinstance(type23, dict)
        # Platform IDs like NELSON, FRIGATE, etc. must be absent.
        assert "NELSON" not in type23
        assert "FRIGATE" not in type23
        assert "OWNSHIP_A" not in type23

    def test_preserves_class_metadata(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        tree = extract_class_tree(registry)
        surface = tree["surface"]
        assert isinstance(surface, dict)
        class_block = surface["_class"]
        assert class_block == {"full_name": "Surface Vessel"}

    def test_preserves_interior_class_nodes(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        tree = extract_class_tree(registry)
        # Every interior node on the path still exists.
        assert "surface" in tree
        surface = tree["surface"]
        assert isinstance(surface, dict)
        assert "warship" in surface
        warship = surface["warship"]
        assert isinstance(warship, dict)
        assert "frigate" in warship
        assert "destroyer" in warship


class TestScanCatalog:
    def test_returns_catalog_scan_result(self) -> None:
        result = scan_catalog(FIXTURE_CATALOG)
        assert isinstance(result, CatalogScanResult)

    def test_deduplicates_and_unions_tags(self) -> None:
        result = scan_catalog(FIXTURE_CATALOG)
        # Fixture has "training", "ASW", "Training " across two items and "MCM" on one.
        # "Training " should collapse into "training".
        assert result.tags == ["ASW", "MCM", "training"]

    def test_deduplicates_feature_tags(self) -> None:
        result = scan_catalog(FIXTURE_CATALOG)
        assert result.feature_tags == [
            "helicopter-ops",
            "radar-detection",
            "sonar-contact",
        ]

    def test_collects_platform_nationalities(self) -> None:
        result = scan_catalog(FIXTURE_CATALOG)
        assert set(result.nationalities) == {"GB", "US"}

    def test_harvests_exercise_names_from_titles(self) -> None:
        result = scan_catalog(FIXTURE_CATALOG)
        assert result.exercise_names == ["Joint Warrior", "Saxon Warrior"]


class TestScanCatalogGracefulFields:
    def _write_item(
        self,
        catalog_dir: Path,
        name: str,
        properties: dict[str, object],
    ) -> None:
        item_dir = catalog_dir / name
        item_dir.mkdir(parents=True)
        (item_dir / "item.json").write_text(
            json.dumps(
                {
                    "type": "Feature",
                    "id": name,
                    "geometry": None,
                    "properties": properties,
                    "links": [],
                    "assets": {},
                }
            ),
            encoding="utf-8",
        )

    def test_missing_tags_does_not_pollute(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        self._write_item(
            catalog,
            "no-tags",
            {"title": "Ex: A", "debrief:feature_tags": ["ft1"]},
        )
        result = scan_catalog(catalog)
        assert result.tags == []
        assert result.feature_tags == ["ft1"]

    def test_missing_feature_tags_does_not_pollute(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        self._write_item(
            catalog,
            "no-ft",
            {"title": "Ex: A", "debrief:tags": ["t1"]},
        )
        result = scan_catalog(catalog)
        assert result.feature_tags == []
        assert result.tags == ["t1"]

    def test_missing_title_contributes_no_exercise(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        self._write_item(catalog, "no-title", {"debrief:tags": ["t"]})
        result = scan_catalog(catalog)
        assert result.exercise_names == []

    def test_missing_platforms_contributes_no_nationality(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        self._write_item(catalog, "no-plat", {"title": "Ex: A"})
        result = scan_catalog(catalog)
        assert result.nationalities == []

    def test_platform_without_nationality_is_skipped(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        self._write_item(
            catalog,
            "mixed",
            {
                "title": "Ex: A",
                "debrief:platforms": [
                    {"id": "A", "name": "Alpha"},
                    {"id": "B", "name": "Bravo", "nationality": "GB"},
                ],
            },
        )
        result = scan_catalog(catalog)
        assert result.nationalities == ["GB"]


class TestBuildBundle:
    def test_has_meta_header(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, FIXTURE_CATALOG)
        meta = bundle["_meta"]
        assert meta["tool"] == "scripts/extract-enum-bundle.py"
        assert meta["generated_from_registry"] == "shared/data/platform-registry.json"
        assert meta["canonicalisation"].startswith("trim + lowercase")

    def test_unions_registry_and_catalog_nationalities(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, FIXTURE_CATALOG)
        # Registry has GB and US (at minimum); fixture catalog has GB and US.
        assert "GB" in bundle["nationalities"]
        assert "US" in bundle["nationalities"]

    def test_contains_all_five_sections(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, FIXTURE_CATALOG)
        for key in ("vessel_class_tree", "nationalities", "exercise_names", "tags", "feature_tags"):
            assert key in bundle


class TestSerializeConformsToSchema:
    def test_fixture_bundle_validates(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, FIXTURE_CATALOG)
        # Serialise + reload so we validate the on-disk shape, not the Python objects.
        reloaded = json.loads(serialize(bundle))
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        jsonschema.validate(reloaded, schema)


class TestBundleSize:
    def test_real_bundle_stays_under_65kib(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, REAL_CATALOG)
        output = serialize(bundle)
        assert len(output.encode("utf-8")) < 65_536, (
            f"Bundle grew to {len(output.encode('utf-8'))} bytes — investigate "
            "before raising the cap."
        )


class TestCliExitCodes:
    def test_missing_registry_exits_code_1(self, tmp_path: Path) -> None:
        output_file = tmp_path / "out.json"
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT_PATH),
                "--registry",
                str(tmp_path / "nope.json"),
                "--catalog",
                str(FIXTURE_CATALOG),
                "--output",
                str(output_file),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 1
        assert "nope.json" in result.stderr

    def test_malformed_registry_exits_code_2(self, tmp_path: Path) -> None:
        bad_registry = tmp_path / "bad.json"
        bad_registry.write_text("{ not json", encoding="utf-8")
        output_file = tmp_path / "out.json"
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT_PATH),
                "--registry",
                str(bad_registry),
                "--catalog",
                str(FIXTURE_CATALOG),
                "--output",
                str(output_file),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 2
        assert "bad.json" in result.stderr or "Invalid registry" in result.stderr


# ---------------------------------------------------------------------------
# Phase 4: US2 determinism + drift-detection tests (T023–T027)
# ---------------------------------------------------------------------------


class TestDeterminism:
    def test_two_runs_byte_identical(self) -> None:
        registry = load_registry(REAL_REGISTRY)
        first = serialize(build_bundle(registry, FIXTURE_CATALOG))
        second = serialize(build_bundle(registry, FIXTURE_CATALOG))
        assert first == second


def _copy_and_mutate_registry(
    tmp_path: Path, mutator: "object"
) -> Path:
    """Copy the real registry to tmp_path and apply a mutation callback."""
    src = REAL_REGISTRY
    dst = tmp_path / "platform-registry.json"
    data = json.loads(src.read_text(encoding="utf-8"))
    assert callable(mutator)
    mutator(data)  # type: ignore[operator]
    dst.write_text(json.dumps(data), encoding="utf-8")
    return dst


class TestDriftDetection:
    def test_new_interior_vessel_class_surfaces(self, tmp_path: Path) -> None:
        def add_cruiser(data: dict[str, object]) -> None:
            vessel_classes = data["vessel_classes"]
            assert isinstance(vessel_classes, dict)
            surface = vessel_classes["surface"]
            assert isinstance(surface, dict)
            warship = surface["warship"]
            assert isinstance(warship, dict)
            warship["cruiser"] = {
                "_class": {"full_name": "Cruiser"},
                "ticonderoga": {
                    "_class": {"full_name": "Ticonderoga-class"},
                    "MOUNT_WHITNEY": {
                        "name": "USS Mount Whitney",
                        "short_name": "MTW",
                        "nationality": "US",
                    },
                },
            }

        mutated = _copy_and_mutate_registry(tmp_path, add_cruiser)
        registry = load_registry(mutated)
        bundle = build_bundle(registry, FIXTURE_CATALOG)
        surface = bundle["vessel_class_tree"]["surface"]
        assert isinstance(surface, dict)
        warship = surface["warship"]
        assert isinstance(warship, dict)
        assert "cruiser" in warship

    def test_new_registry_nationality_surfaces(self, tmp_path: Path) -> None:
        def add_french_frigate(data: dict[str, object]) -> None:
            vessel_classes = data["vessel_classes"]
            assert isinstance(vessel_classes, dict)
            surface = vessel_classes["surface"]
            assert isinstance(surface, dict)
            warship = surface["warship"]
            assert isinstance(warship, dict)
            frigate = warship["frigate"]
            assert isinstance(frigate, dict)
            frigate["fremm"] = {
                "_class": {"full_name": "FREMM-class"},
                "FR_FREMM": {
                    "name": "FS Aquitaine",
                    "short_name": "AQT",
                    "nationality": "FR",
                },
            }

        mutated = _copy_and_mutate_registry(tmp_path, add_french_frigate)
        registry = load_registry(mutated)
        bundle = build_bundle(registry, FIXTURE_CATALOG)
        assert "FR" in bundle["nationalities"]

    def test_new_catalog_tag_surfaces(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        shutil.copytree(FIXTURE_CATALOG, catalog)
        item_path = catalog / "fx--alpha" / "item.json"
        item = json.loads(item_path.read_text(encoding="utf-8"))
        item["properties"]["debrief:tags"].append("brand-new-tag")
        item_path.write_text(json.dumps(item), encoding="utf-8")
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, catalog)
        assert "brand-new-tag" in bundle["tags"]

    def test_new_exercise_prefix_surfaces(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        shutil.copytree(FIXTURE_CATALOG, catalog)
        item_path = catalog / "fx--alpha" / "item.json"
        item = json.loads(item_path.read_text(encoding="utf-8"))
        item["properties"]["title"] = "Dynamic Manta: Alpha"
        item_path.write_text(json.dumps(item), encoding="utf-8")
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, catalog)
        assert "Dynamic Manta" in bundle["exercise_names"]


# ---------------------------------------------------------------------------
# Phase 5: US3 conservative-extraction tests (T028–T030)
# ---------------------------------------------------------------------------


class TestConservativeExtraction:
    def test_unique_tag_surfaces_even_if_only_on_one_item(
        self, tmp_path: Path
    ) -> None:
        catalog = tmp_path / "cat"
        shutil.copytree(FIXTURE_CATALOG, catalog)
        item_path = catalog / "fx--alpha" / "item.json"
        item = json.loads(item_path.read_text(encoding="utf-8"))
        item["properties"]["debrief:tags"].append("typoed-tg")
        item_path.write_text(json.dumps(item), encoding="utf-8")
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, catalog)
        assert "typoed-tg" in bundle["tags"]

    def test_catalog_only_nationality_appears(self, tmp_path: Path) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        item_dir = catalog / "fx--stranger"
        item_dir.mkdir()
        (item_dir / "item.json").write_text(
            json.dumps(
                {
                    "type": "Feature",
                    "id": "fx--stranger",
                    "geometry": None,
                    "properties": {
                        "title": "Ex: Stranger",
                        "debrief:platforms": [
                            {"id": "XX", "name": "Unknown", "nationality": "XX"}
                        ],
                    },
                    "links": [],
                    "assets": {},
                }
            ),
            encoding="utf-8",
        )
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, catalog)
        assert "XX" in bundle["nationalities"]

    def test_title_without_separator_contributes_nothing(
        self, tmp_path: Path
    ) -> None:
        catalog = tmp_path / "cat"
        catalog.mkdir()
        item_dir = catalog / "fx--plain"
        item_dir.mkdir()
        (item_dir / "item.json").write_text(
            json.dumps(
                {
                    "type": "Feature",
                    "id": "fx--plain",
                    "geometry": None,
                    "properties": {
                        "title": "Just a plain title",
                        "debrief:tags": ["x"],
                    },
                    "links": [],
                    "assets": {},
                }
            ),
            encoding="utf-8",
        )
        registry = load_registry(REAL_REGISTRY)
        bundle = build_bundle(registry, catalog)
        assert bundle["exercise_names"] == []


# ---------------------------------------------------------------------------
# Smoke test: entire bundle round-trips through JSON
# ---------------------------------------------------------------------------


def test_bundle_round_trips_as_json() -> None:
    registry = load_registry(REAL_REGISTRY)
    bundle = build_bundle(registry, FIXTURE_CATALOG)
    text = serialize(bundle)
    reloaded = json.loads(text)
    assert reloaded["_meta"]["tool"] == "scripts/extract-enum-bundle.py"


@pytest.fixture(autouse=True)
def _cleanup_catalog_fixture() -> None:
    """No-op fixture placeholder to keep the test file consistent with others."""
    yield
