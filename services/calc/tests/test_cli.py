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

    def test_track_stats_single_feature(self):
        """CLI returns success for a valid single-track tool invocation."""
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[-1.0, 50.0], [-1.1, 50.1], [-1.2, 50.2]],
            },
            "properties": {
                "id": "track-1",
                "name": "Test Track",
                "kind": "track",
                "times": [
                    "2024-01-01T00:00:00Z",
                    "2024-01-01T01:00:00Z",
                    "2024-01-01T02:00:00Z",
                ],
            },
        }
        output = run_cli({"tool": "track-stats", "features": [feature], "params": {}})
        assert output["success"] is True
        assert isinstance(output["features"], list)
        assert output["duration_ms"] >= 0

    def test_unknown_tool(self):
        """CLI returns error for unknown tool name."""
        output = run_cli({"tool": "nonexistent-tool", "features": [], "params": {}})
        assert output["success"] is False
        assert "error" in output

    def test_range_bearing_two_tracks(self):
        """CLI returns success for range-bearing with two tracks."""
        base_coords = [[-1.0, 50.0], [-1.1, 50.1]]
        times = ["2024-01-01T00:00:00Z", "2024-01-01T01:00:00Z"]
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": base_coords},
                "properties": {
                    "id": f"track-{i}",
                    "name": f"Track {i}",
                    "kind": "track",
                    "times": times,
                },
            }
            for i in range(2)
        ]
        output = run_cli({"tool": "range-bearing", "features": features, "params": {}})
        assert output["success"] is True
        assert isinstance(output["features"], list)

    def test_malformed_json_returns_error(self):
        """CLI handles malformed stdin gracefully."""
        result = subprocess.run(
            [sys.executable, "-m", "debrief_calc.cli"],
            input="not valid json",
            capture_output=True,
            text=True,
        )
        output = json.loads(result.stdout)
        assert output["success"] is False
        assert output["error"]["code"] == "CLI_ERROR"
