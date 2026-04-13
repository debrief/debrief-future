"""Unit tests for _validate_platform_ids().

Tests cover:
- All registered platforms produce no warnings
- Unregistered platforms produce correct warnings
- Empty and whitespace-only platform IDs are skipped
- Duplicate platform IDs produce only one warning
- Case-sensitive lookup
- Features with no platform_id property are skipped
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pytest
from debrief_data import PlatformRegistry, load_registry

from debrief_io.import_catalog import _validate_platform_ids

if TYPE_CHECKING:
    from debrief_io.models import ImportWarning


@pytest.fixture
def registry() -> PlatformRegistry:
    """Load the real platform registry."""
    return load_registry()


def _make_feature(platform_id: str | None = None) -> dict[str, Any]:
    """Create a minimal GeoJSON feature dict with optional platform_id."""
    props: dict[str, Any] = {"kind": "TRACK"}
    if platform_id is not None:
        props["platform_id"] = platform_id
    return {"type": "Feature", "properties": props, "geometry": None}


class TestValidatePlatformIds:
    """Unit tests for _validate_platform_ids()."""

    def test_all_registered_no_warnings(self, registry: PlatformRegistry) -> None:
        """Features with all registered platform IDs produce no warnings."""
        features = [_make_feature("NELSON"), _make_feature("COLLINGWOOD")]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 0

    def test_unregistered_platform_produces_warning(self, registry: PlatformRegistry) -> None:
        """An unregistered platform ID produces a warning with correct code and message."""
        features = [_make_feature("PHANTOM")]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "data/exercise.rep", registry, warnings)
        assert len(warnings) == 1
        assert warnings[0].code == "UNREGISTERED_PLATFORM"
        assert warnings[0].file == "data/exercise.rep"
        assert "PHANTOM" in warnings[0].message

    def test_empty_platform_id_skipped(self, registry: PlatformRegistry) -> None:
        """Empty string platform IDs are skipped without warning."""
        features = [_make_feature("")]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 0

    def test_whitespace_platform_id_skipped(self, registry: PlatformRegistry) -> None:
        """Whitespace-only platform IDs are skipped without warning."""
        features = [_make_feature("   "), _make_feature("\t")]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 0

    def test_duplicate_ids_produce_one_warning(self, registry: PlatformRegistry) -> None:
        """Multiple features with the same unregistered ID produce one warning."""
        features = [
            _make_feature("UNKNOWN_VESSEL"),
            _make_feature("UNKNOWN_VESSEL"),
            _make_feature("UNKNOWN_VESSEL"),
        ]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 1
        assert "UNKNOWN_VESSEL" in warnings[0].message

    def test_case_sensitive_lookup(self, registry: PlatformRegistry) -> None:
        """Lowercase 'nelson' is unregistered even though 'NELSON' is registered."""
        features = [_make_feature("nelson")]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 1
        assert "nelson" in warnings[0].message

    def test_no_platform_id_property_skipped(self, registry: PlatformRegistry) -> None:
        """Features without a platform_id property are skipped gracefully."""
        features = [_make_feature(None)]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 0

    def test_mixed_registered_and_unregistered(self, registry: PlatformRegistry) -> None:
        """Only unregistered platforms produce warnings."""
        features = [
            _make_feature("NELSON"),
            _make_feature("PHANTOM"),
            _make_feature("COLLINGWOOD"),
            _make_feature("GHOST"),
        ]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 2
        codes = {w.message for w in warnings}
        assert any("PHANTOM" in m for m in codes)
        assert any("GHOST" in m for m in codes)

    def test_warnings_sorted_by_platform_id(self, registry: PlatformRegistry) -> None:
        """Warnings are emitted in sorted order by platform ID."""
        features = [_make_feature("ZULU"), _make_feature("ALPHA")]
        warnings: list[ImportWarning] = []
        _validate_platform_ids(features, "test.rep", registry, warnings)
        assert len(warnings) == 2
        assert "ALPHA" in warnings[0].message
        assert "ZULU" in warnings[1].message
