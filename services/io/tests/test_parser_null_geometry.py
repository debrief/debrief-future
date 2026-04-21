"""Null-geometry ingress coercion tests.

Covers review decision 5-alt for spec #204: `services/io.parser` converts
null/missing geometry to a `GeoJSONEmptyPoint` so downstream consumers
never see a null geometry. This eliminates the silent-drop pattern that
previously lived at `apps/vscode/src/webview/mapPanel.ts` by moving the
conversion to the ingress boundary.
"""

from __future__ import annotations

import pytest

from debrief_io.parser import _coerce_null_geometry


class TestCoerceNullGeometry:
    """Direct tests for the `_coerce_null_geometry` shim."""

    def test_null_geometry_becomes_empty_point(self) -> None:
        feature: dict[str, object] = {
            "type": "Feature",
            "id": "has-null-geom",
            "geometry": None,
            "properties": {"kind": "SYSTEM"},
        }
        result = _coerce_null_geometry(feature)

        assert result["geometry"] == {"type": "Point", "coordinates": []}
        # Feature shape is otherwise preserved
        assert result["type"] == "Feature"
        assert result["id"] == "has-null-geom"
        assert result["properties"] == {"kind": "SYSTEM"}

    def test_missing_geometry_becomes_empty_point(self) -> None:
        feature: dict[str, object] = {
            "type": "Feature",
            "id": "no-geom-key",
            "properties": {},
        }
        result = _coerce_null_geometry(feature)

        assert result["geometry"] == {"type": "Point", "coordinates": []}

    def test_valid_geometry_preserved(self) -> None:
        feature: dict[str, object] = {
            "type": "Feature",
            "id": "has-point",
            "geometry": {"type": "Point", "coordinates": [1.0, 2.0]},
            "properties": {},
        }
        result = _coerce_null_geometry(feature)

        assert result["geometry"] == {"type": "Point", "coordinates": [1.0, 2.0]}

    @pytest.mark.parametrize(
        "geom_type,coords",
        [
            ("LineString", [[0, 0], [1, 1]]),
            ("Polygon", [[[0, 0], [1, 0], [1, 1], [0, 0]]]),
            ("MultiPoint", [[0, 0], [1, 1]]),
        ],
    )
    def test_various_valid_geometries_preserved(
        self, geom_type: str, coords: list
    ) -> None:
        feature: dict[str, object] = {
            "type": "Feature",
            "geometry": {"type": geom_type, "coordinates": coords},
        }
        result = _coerce_null_geometry(feature)

        assert result["geometry"] == {"type": geom_type, "coordinates": coords}

    def test_idempotent_on_already_coerced(self) -> None:
        feature: dict[str, object] = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": []},
            "properties": None,
        }
        result = _coerce_null_geometry(feature)
        result2 = _coerce_null_geometry(result)

        assert result == result2
