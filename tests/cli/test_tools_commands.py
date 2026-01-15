"""Tests for CLI tools commands."""

import json
from pathlib import Path

import pytest
from click.testing import CliRunner
from debrief_cli.main import cli


@pytest.fixture
def runner():
    """Create a Click test runner."""
    return CliRunner()


@pytest.fixture
def single_track_path():
    """Path to single track fixture."""
    return Path(__file__).parent.parent / "calc" / "fixtures" / "track-single.geojson"


@pytest.fixture
def tracks_pair_path():
    """Path to tracks pair fixture."""
    return Path(__file__).parent.parent / "calc" / "fixtures" / "tracks-pair.geojson"


class TestToolsList:
    """Tests for 'tools list' command."""

    def test_list_all_tools(self, runner):
        result = runner.invoke(cli, ["tools", "list"])

        assert result.exit_code == 0
        assert "track-stats" in result.output
        assert "range-bearing" in result.output
        assert "area-summary" in result.output

    def test_list_tools_json(self, runner):
        result = runner.invoke(cli, ["--json", "tools", "list"])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "tools" in data
        assert len(data["tools"]) >= 3

    def test_list_tools_filtered_by_input(self, runner, single_track_path):
        result = runner.invoke(cli, ["tools", "list", "--input", str(single_track_path)])

        assert result.exit_code == 0
        # track-stats accepts track kind
        assert "track-stats" in result.output


class TestToolsDescribe:
    """Tests for 'tools describe' command."""

    def test_describe_tool(self, runner):
        result = runner.invoke(cli, ["tools", "describe", "track-stats"])

        assert result.exit_code == 0
        assert "track-stats" in result.output
        assert "single" in result.output.lower()
        assert "track" in result.output

    def test_describe_tool_json(self, runner):
        result = runner.invoke(cli, ["--json", "tools", "describe", "track-stats"])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["name"] == "track-stats"
        assert data["context_type"] == "single"

    def test_describe_nonexistent_tool(self, runner):
        result = runner.invoke(cli, ["tools", "describe", "nonexistent"])

        assert result.exit_code == 4
        assert "not found" in result.output.lower()


class TestToolsRun:
    """Tests for 'tools run' command."""

    def test_run_track_stats(self, runner, single_track_path):
        result = runner.invoke(cli, [
            "tools", "run", "track-stats",
            "--input", str(single_track_path)
        ])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 1
        assert data["features"][0]["properties"]["kind"] == "track-statistics"

    def test_run_range_bearing(self, runner, tracks_pair_path):
        result = runner.invoke(cli, [
            "tools", "run", "range-bearing",
            "--input", str(tracks_pair_path)
        ])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 3  # start, mid, end

    def test_run_with_parameters(self, runner, tracks_pair_path):
        result = runner.invoke(cli, [
            "tools", "run", "range-bearing",
            "--input", str(tracks_pair_path),
            "-p", "sample_points", "midpoint"
        ])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert len(data["features"]) == 1

    def test_run_nonexistent_tool(self, runner, single_track_path):
        result = runner.invoke(cli, [
            "tools", "run", "nonexistent",
            "--input", str(single_track_path)
        ])

        assert result.exit_code == 4

    def test_run_wrong_context(self, runner, tracks_pair_path):
        # track-stats requires SINGLE, but tracks-pair has 2 features
        result = runner.invoke(cli, [
            "tools", "run", "track-stats",
            "--input", str(tracks_pair_path)
        ])

        assert result.exit_code == 2
        assert "feature" in result.output.lower()


class TestHelpText:
    """Tests for --help on all commands."""

    def test_main_help(self, runner):
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "Debrief CLI" in result.output
        assert "Exit codes" in result.output

    def test_tools_help(self, runner):
        result = runner.invoke(cli, ["tools", "--help"])
        assert result.exit_code == 0
        assert "list" in result.output
        assert "describe" in result.output
        assert "run" in result.output

    def test_tools_list_help(self, runner):
        result = runner.invoke(cli, ["tools", "list", "--help"])
        assert result.exit_code == 0
        assert "--input" in result.output

    def test_tools_run_help(self, runner):
        result = runner.invoke(cli, ["tools", "run", "--help"])
        assert result.exit_code == 0
        assert "--input" in result.output
        assert "--param" in result.output
