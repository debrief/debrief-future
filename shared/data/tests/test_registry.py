"""Tests for the platform registry loader."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from debrief_data import PlatformRegistry, RegistryError, load_registry

FIXTURES_DIR = Path(__file__).parent / "fixtures"
GOLDEN_FIXTURE = FIXTURES_DIR / "expected-platforms.json"
REGISTRY_PATH = Path(__file__).parent.parent / "platform-registry.json"


@pytest.fixture()
def registry() -> PlatformRegistry:
    return load_registry(REGISTRY_PATH)


@pytest.fixture()
def golden_platforms() -> list[dict[str, str | None]]:
    return json.loads(GOLDEN_FIXTURE.read_text(encoding="utf-8"))


# --- User Story 1: Resolve Platform Identity ---


class TestResolve:
    def test_known_platform(self, registry: PlatformRegistry) -> None:
        result = registry.resolve("NELSON")
        assert result is not None
        assert result.id == "NELSON"
        assert result.name == "HMS Nelson"
        assert result.short_name == "NLSN"
        assert result.nationality == "GB"
        assert result.vessel_class == "surface/warship/frigate/type23"
        assert result.vessel_type == "type23"
        assert result.vessel_role == "frigate"
        assert result.domain == "surface"

    def test_unknown_platform(self, registry: PlatformRegistry) -> None:
        assert registry.resolve("UNKNOWN_SHIP") is None

    def test_empty_string(self, registry: PlatformRegistry) -> None:
        assert registry.resolve("") is None

    def test_whitespace_only(self, registry: PlatformRegistry) -> None:
        assert registry.resolve("   ") is None

    def test_case_sensitive(self, registry: PlatformRegistry) -> None:
        assert registry.resolve("nelson") is None
        assert registry.resolve("Nelson") is None

    def test_subsurface_platform(self, registry: PlatformRegistry) -> None:
        result = registry.resolve("SUBJECT")
        assert result is not None
        assert result.domain == "subsurface"
        assert result.vessel_role == "ssn"
        assert result.vessel_type == "astute"
        assert result.vessel_class == "subsurface/submarine/ssn/astute"

    def test_us_platform(self, registry: PlatformRegistry) -> None:
        result = registry.resolve("OWNSHIP_B")
        assert result is not None
        assert result.nationality == "US"
        assert result.name == "USS Mason"


# --- User Story 2: Enumerate All Platforms + Cross-Language Parity ---


class TestListPlatforms:
    def test_returns_all_10(self, registry: PlatformRegistry) -> None:
        platforms = registry.list_platforms()
        assert len(platforms) == 10

    def test_sorted_by_id(self, registry: PlatformRegistry) -> None:
        platforms = registry.list_platforms()
        ids = [p.id for p in platforms]
        assert ids == sorted(ids)

    def test_includes_surface_and_subsurface(self, registry: PlatformRegistry) -> None:
        platforms = registry.list_platforms()
        domains = {p.domain for p in platforms}
        assert domains == {"surface", "subsurface"}

    def test_golden_fixture_parity(
        self,
        registry: PlatformRegistry,
        golden_platforms: list[dict[str, str | None]],
    ) -> None:
        """Verify every resolved platform matches the golden fixture field-by-field."""
        platforms = registry.list_platforms()
        assert len(platforms) == len(golden_platforms)

        for platform, expected in zip(platforms, golden_platforms, strict=True):
            assert platform.id == expected["id"]
            assert platform.name == expected["name"]
            assert platform.short_name == expected.get("short_name")
            assert platform.nationality == expected["nationality"]
            assert platform.vessel_class == expected["vessel_class"]
            assert platform.vessel_type == expected["vessel_type"]
            assert platform.vessel_role == expected["vessel_role"]
            assert platform.domain == expected["domain"]

    def test_all_have_required_fields(self, registry: PlatformRegistry) -> None:
        for p in registry.list_platforms():
            assert p.id
            assert p.name
            assert p.nationality
            assert p.vessel_class
            assert p.vessel_type
            assert p.domain


# --- User Story 3: Navigate Vessel Class Taxonomy Tree ---


class TestFindByClass:
    def test_by_domain_surface(self, registry: PlatformRegistry) -> None:
        results = registry.find_by_class("surface")
        assert len(results) == 7
        assert all(p.domain == "surface" for p in results)

    def test_by_domain_subsurface(self, registry: PlatformRegistry) -> None:
        results = registry.find_by_class("subsurface")
        assert len(results) == 3
        assert all(p.domain == "subsurface" for p in results)

    def test_by_role_frigate(self, registry: PlatformRegistry) -> None:
        results = registry.find_by_class("surface/warship/frigate")
        ids = {p.id for p in results}
        assert ids == {"NELSON", "FRIGATE", "SENSOR", "OWNSHIP_A"}
        assert all(p.vessel_role == "frigate" for p in results)

    def test_by_role_destroyer(self, registry: PlatformRegistry) -> None:
        results = registry.find_by_class("surface/warship/destroyer")
        ids = {p.id for p in results}
        assert ids == {"COLLINGWOOD", "OWNSHIP", "OWNSHIP_B"}

    def test_by_type(self, registry: PlatformRegistry) -> None:
        results = registry.find_by_class("surface/warship/frigate/type23")
        ids = {p.id for p in results}
        assert ids == {"NELSON", "FRIGATE", "SENSOR", "OWNSHIP_A"}

    def test_sorted_by_id(self, registry: PlatformRegistry) -> None:
        results = registry.find_by_class("surface")
        ids = [p.id for p in results]
        assert ids == sorted(ids)

    def test_invalid_path(self, registry: PlatformRegistry) -> None:
        assert registry.find_by_class("nonexistent") == []

    def test_empty_string(self, registry: PlatformRegistry) -> None:
        assert registry.find_by_class("") == []


class TestIsValidClass:
    def test_valid_domain(self, registry: PlatformRegistry) -> None:
        assert registry.is_valid_class("surface") is True

    def test_valid_deep_path(self, registry: PlatformRegistry) -> None:
        assert registry.is_valid_class("surface/warship/frigate/type23") is True

    def test_invalid_path(self, registry: PlatformRegistry) -> None:
        assert registry.is_valid_class("nonexistent") is False

    def test_empty_string(self, registry: PlatformRegistry) -> None:
        assert registry.is_valid_class("") is False

    def test_partial_valid_path(self, registry: PlatformRegistry) -> None:
        assert registry.is_valid_class("surface/warship/frigate/nonexistent") is False

    def test_class_with_no_platforms(self, registry: PlatformRegistry) -> None:
        """A class node is valid even if it contains no direct platforms."""
        assert registry.is_valid_class("subsurface/submarine") is True


# --- Load-Time Validation ---


class TestValidation:
    def test_missing_file(self) -> None:
        with pytest.raises(FileNotFoundError, match="Registry file not found"):
            load_registry("/tmp/nonexistent-registry.json")

    def test_invalid_json(self, tmp_path: Path) -> None:
        bad_file = tmp_path / "bad.json"
        bad_file.write_text("not json at all", encoding="utf-8")
        with pytest.raises(RegistryError, match="Invalid registry format"):
            load_registry(bad_file)

    def test_missing_vessel_classes_root(self, tmp_path: Path) -> None:
        bad_file = tmp_path / "no-root.json"
        bad_file.write_text('{"platforms": {}}', encoding="utf-8")
        with pytest.raises(RegistryError, match="vessel_classes"):
            load_registry(bad_file)

    def test_duplicate_platform_id(self, tmp_path: Path) -> None:
        data = {
            "vessel_classes": {
                "surface": {
                    "branch_a": {
                        "DUPE": {"name": "First", "nationality": "GB"},
                    },
                    "branch_b": {
                        "DUPE": {"name": "Second", "nationality": "GB"},
                    },
                },
            },
        }
        bad_file = tmp_path / "dupes.json"
        bad_file.write_text(json.dumps(data), encoding="utf-8")
        with pytest.raises(RegistryError, match="Duplicate platform ID 'DUPE'"):
            load_registry(bad_file)

    def test_missing_name(self, tmp_path: Path) -> None:
        data = {
            "vessel_classes": {
                "surface": {
                    "type_a": {
                        "NONAME": {"nationality": "GB"},
                    },
                },
            },
        }
        bad_file = tmp_path / "no-name.json"
        bad_file.write_text(json.dumps(data), encoding="utf-8")
        with pytest.raises(RegistryError, match="missing required field 'name'"):
            load_registry(bad_file)

    def test_missing_nationality(self, tmp_path: Path) -> None:
        data = {
            "vessel_classes": {
                "surface": {
                    "type_a": {
                        "NONAT": {"name": "Some Ship"},
                    },
                },
            },
        }
        bad_file = tmp_path / "no-nat.json"
        bad_file.write_text(json.dumps(data), encoding="utf-8")
        with pytest.raises(RegistryError, match="missing required field 'nationality'"):
            load_registry(bad_file)

    def test_default_path_loads(self) -> None:
        """The bundled registry at the default path loads without error."""
        registry = load_registry()
        assert len(registry.list_platforms()) == 10
