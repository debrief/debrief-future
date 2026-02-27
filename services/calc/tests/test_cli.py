"""Tests for the CLI runner."""

import json
import subprocess
import sys


def run_cli(input_data: dict) -> dict:
    """Run cli.py with JSON input and return parsed output."""
    result = subprocess.run(
        [sys.executable, "-m", "debrief_calc.cli"],
        input=json.dumps(input_data),
        capture_output=True,
        text=True,
        cwd=None,
    )
    return json.loads(result.stdout)


class TestCli:
    """Tests for debrief_calc.cli module."""

    def test_track_stats_single_feature(self) -> None:
        """CLI returns MCP content for a valid single-track tool invocation."""
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[-1.0, 50.0], [-1.1, 50.1], [-1.2, 50.2]],
            },
            "properties": {
                "id": "track-1",
                "name": "Test Track",
                "kind": "TRACK",
                "times": [
                    1704067200000,
                    1704070800000,
                    1704074400000,
                ],
            },
        }
        output = run_cli({"tool": "track-stats", "features": [feature], "params": {}})
        assert "content" in output
        assert isinstance(output["content"], list)
        assert len(output["content"]) > 0
        assert output["duration_ms"] >= 0

        # Verify MCP content item structure
        item = output["content"][0]
        assert item["type"] == "resource"
        assert "resource" in item
        assert item["resource"]["mimeType"] == "application/geo+json"
        assert "annotations" in item
        assert item["annotations"]["debrief:resultType"] == "addition/track/statistics"
        assert item["annotations"]["debrief:sourceFeatures"] == ["track-1"]
        assert item["annotations"]["debrief:label"] == "track-stats results"

    def test_unknown_tool(self) -> None:
        """CLI returns MCP error for unknown tool name."""
        output = run_cli({"tool": "nonexistent-tool", "features": [], "params": {}})
        assert "error" in output
        assert "code" in output["error"]
        assert "message" in output["error"]
        assert "data" in output["error"]

    def test_range_bearing_two_tracks(self) -> None:
        """CLI returns artifact MCP content for range-bearing with two tracks."""
        base_coords = [[-1.0, 50.0], [-1.1, 50.1]]
        times = [1704067200000, 1704070800000]
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": base_coords},
                "properties": {
                    "id": f"track-{i}",
                    "name": f"Track {i}",
                    "kind": "TRACK",
                    "times": times,
                },
            }
            for i in range(2)
        ]
        output = run_cli({"tool": "range-bearing", "features": features, "params": {}})
        assert "content" in output
        assert isinstance(output["content"], list)
        assert len(output["content"]) == 1

        # Check artifact format
        item = output["content"][0]
        assert item["annotations"]["debrief:resultType"] == "artifact/dataset/range_bearing_series"
        assert "track-0" in item["annotations"]["debrief:sourceFeatures"]
        assert "track-1" in item["annotations"]["debrief:sourceFeatures"]
        assert "debrief:href" in item["annotations"]
        assert item["annotations"]["debrief:href"].endswith(".json")

        # Check resource contains valid JSON time-series
        assert item["type"] == "resource"
        import json

        series_data = json.loads(item["resource"]["text"])
        assert series_data["type"] == "range-bearing-series"
        assert len(series_data["entries"]) == 2

    def test_malformed_json_returns_error(self) -> None:
        """CLI handles malformed stdin gracefully."""
        result = subprocess.run(
            [sys.executable, "-m", "debrief_calc.cli"],
            input="not valid json",
            capture_output=True,
            text=True,
        )
        output = json.loads(result.stdout)
        assert "error" in output
        assert output["error"]["code"] == -32000
        assert "data" in output["error"]
        assert output["error"]["data"]["debrief:errorCategory"] == "algorithm_failure"
