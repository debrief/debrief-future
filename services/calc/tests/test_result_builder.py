"""Tests for MCP result builder functions."""

import base64
import json

import pytest
from debrief_calc.result_builder import (
    build_addition,
    build_artifact,
    build_deletion,
    build_error,
    build_mutation,
    build_response,
)


def _make_feature(fid: str, kind: str = "track") -> dict:
    return {
        "type": "Feature",
        "id": fid,
        "geometry": {"type": "Point", "coordinates": [0, 0]},
        "properties": {"kind": kind, "name": fid},
    }


class TestBuildMutation:
    def test_single_feature(self) -> None:
        f = _make_feature("track_a")
        items = build_mutation([f], "track/smoothed", ["track_a"], "Smoothed Track A")
        assert len(items) == 1
        item = items[0]
        assert item["type"] == "resource"
        assert item["resource"]["uri"] == "feature://track_a"
        assert item["resource"]["mimeType"] == "application/geo+json"
        assert json.loads(item["resource"]["text"])["id"] == "track_a"
        assert item["annotations"]["debrief:resultType"] == "mutation/track/smoothed"
        assert item["annotations"]["debrief:sourceFeatures"] == ["track_a"]
        assert item["annotations"]["debrief:label"] == "Smoothed Track A"

    def test_multiple_features(self) -> None:
        items = build_mutation(
            [_make_feature("a"), _make_feature("b")],
            "track/smoothed",
            ["a", "b"],
            "Smoothed tracks",
        )
        assert len(items) == 2

    def test_empty_features_raises(self) -> None:
        with pytest.raises(ValueError, match="features must not be empty"):
            build_mutation([], "track/smoothed", ["a"], "label")

    def test_invalid_subtype_raises(self) -> None:
        with pytest.raises(ValueError):
            build_mutation([_make_feature("a")], "", ["a"], "label")


class TestBuildAddition:
    def test_single_feature(self) -> None:
        f = _make_feature("cpa_001", "analysis")
        items = build_addition([f], "analysis/cpa_point", ["track_a", "track_b"], "CPA")
        assert len(items) == 1
        assert items[0]["annotations"]["debrief:resultType"] == "addition/analysis/cpa_point"
        assert items[0]["annotations"]["debrief:sourceFeatures"] == ["track_a", "track_b"]

    def test_empty_features_raises(self) -> None:
        with pytest.raises(ValueError):
            build_addition([], "analysis/cpa", ["a"], "label")


class TestBuildDeletion:
    def test_basic_deletion(self) -> None:
        item = build_deletion(["c1", "c2", "c3"], "sensor", ["track_a"], "Removed contacts")
        assert item["type"] == "text"
        assert "3" in item["text"]
        assert item["annotations"]["debrief:resultType"] == "deletion/sensor"
        assert item["annotations"]["debrief:deletedFeatures"] == ["c1", "c2", "c3"]
        assert item["annotations"]["debrief:sourceFeatures"] == ["track_a"]
        assert item["annotations"]["debrief:label"] == "Removed contacts"

    def test_empty_deleted_ids_raises(self) -> None:
        with pytest.raises(ValueError, match="deleted_feature_ids must not be empty"):
            build_deletion([], "sensor", ["a"], "label")


class TestBuildArtifact:
    def test_image_artifact(self) -> None:
        data = b"\x89PNG\r\n"
        item = build_artifact(
            data, "image/png", "image/bt_plot", ["track_a"], "BT Plot", "./results/bt.png"
        )
        assert item["type"] == "image"
        assert item["data"] == base64.b64encode(data).decode("ascii")
        assert item["mimeType"] == "image/png"
        assert item["annotations"]["debrief:resultType"] == "artifact/image/bt_plot"
        assert item["annotations"]["debrief:href"] == "./results/bt.png"

    def test_non_image_artifact(self) -> None:
        data = b'{"report": true}'
        item = build_artifact(
            data, "application/json", "report/summary", ["a"], "Report", "./results/report.json"
        )
        assert item["type"] == "resource"
        assert item["resource"]["mimeType"] == "application/json"

    def test_empty_data_raises(self) -> None:
        with pytest.raises(ValueError, match="data must not be empty"):
            build_artifact(b"", "image/png", "image/plot", ["a"], "label", "./results/x.png")

    def test_empty_href_raises(self) -> None:
        with pytest.raises(ValueError, match="href must not be empty"):
            build_artifact(b"data", "image/png", "image/plot", ["a"], "label", "")


class TestBuildError:
    def test_basic_error(self) -> None:
        err = build_error("Not enough data", "invalid_input", ["track_a"])
        assert err["code"] == -32000
        assert err["message"] == "Not enough data"
        assert err["data"]["debrief:errorCategory"] == "invalid_input"
        assert err["data"]["debrief:affectedFeatures"] == ["track_a"]

    def test_custom_code(self) -> None:
        err = build_error("msg", "algorithm_failure", [], code=-32001)
        assert err["code"] == -32001

    def test_all_valid_categories(self) -> None:
        for cat in ["invalid_input", "algorithm_failure", "resource_not_found"]:
            err = build_error("msg", cat, [])
            assert err["data"]["debrief:errorCategory"] == cat

    def test_invalid_category_raises(self) -> None:
        with pytest.raises(ValueError, match="category must be one of"):
            build_error("msg", "bad_category", [])


class TestBuildResponse:
    def test_single_item(self) -> None:
        item = build_deletion(["c1"], "sensor", ["a"], "label")
        resp = build_response([item])
        assert resp["content"] == [item]

    def test_multi_item(self) -> None:
        items = build_mutation([_make_feature("a")], "track/smoothed", ["a"], "label")
        deletion = build_deletion(["c1"], "sensor", ["a"], "label")
        resp = build_response(items + [deletion])
        assert len(resp["content"]) == 2

    def test_empty_raises(self) -> None:
        with pytest.raises(ValueError, match="content_items must not be empty"):
            build_response([])
