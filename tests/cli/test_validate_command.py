"""Tests for CLI validate command."""

import json
from pathlib import Path

import pytest
from click.testing import CliRunner

from debrief_cli.main import cli


@pytest.fixture
def runner() -> CliRunner:
    """Create a Click test runner."""
    return CliRunner()


@pytest.fixture
def valid_geojson_path() -> Path:
    """Path to valid GeoJSON fixture."""
    return (
        Path(__file__).parent.parent.parent
        / "services"
        / "calc"
        / "tests"
        / "fixtures"
        / "track-single.geojson"
    )


@pytest.fixture
def invalid_json_file(tmp_path: Path) -> Path:
    """Create a file with invalid JSON."""
    file_path = tmp_path / "invalid.json"
    file_path.write_text("not valid json {")
    return file_path


@pytest.fixture
def invalid_geojson_file(tmp_path: Path) -> Path:
    """Create a file with invalid GeoJSON structure."""
    file_path = tmp_path / "invalid_geojson.json"
    file_path.write_text(json.dumps({"not": "geojson"}))
    return file_path


@pytest.fixture
def feature_without_kind(tmp_path: Path) -> Path:
    """Create a valid GeoJSON Feature without kind attribute."""
    file_path = tmp_path / "no_kind.geojson"
    file_path.write_text(
        json.dumps({"type": "Feature", "properties": {"name": "test"}, "geometry": None})
    )
    return file_path


class TestValidateCommand:
    """Tests for 'validate' command."""

    def test_validate_valid_file(self, runner: CliRunner, valid_geojson_path: Path) -> None:
        result = runner.invoke(cli, ["validate", str(valid_geojson_path)])

        assert result.exit_code == 0
        assert "passed" in result.output.lower()

    def test_validate_valid_file_json(self, runner: CliRunner, valid_geojson_path: Path) -> None:
        result = runner.invoke(cli, ["--json", "validate", str(valid_geojson_path)])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["status"] == "passed"

    def test_validate_invalid_json(self, runner: CliRunner, invalid_json_file: Path) -> None:
        result = runner.invoke(cli, ["validate", str(invalid_json_file)])

        assert result.exit_code == 3
        assert "invalid" in result.output.lower() or "error" in result.output.lower()

    def test_validate_invalid_geojson(self, runner: CliRunner, invalid_geojson_file: Path) -> None:
        result = runner.invoke(cli, ["validate", str(invalid_geojson_file)])

        assert result.exit_code == 3

    def test_validate_strict_mode_fails_without_kind(
        self, runner: CliRunner, feature_without_kind: Path
    ) -> None:
        result = runner.invoke(cli, ["validate", "--strict", str(feature_without_kind)])

        assert result.exit_code == 3
        assert "kind" in result.output.lower()

    def test_validate_non_strict_passes_without_kind(
        self, runner: CliRunner, feature_without_kind: Path
    ) -> None:
        result = runner.invoke(cli, ["validate", str(feature_without_kind)])

        # Should pass without --strict flag
        assert result.exit_code == 0

    def test_validate_nonexistent_file(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["validate", "/nonexistent/file.json"])

        assert result.exit_code != 0


class TestValidateHelp:
    """Tests for validate --help."""

    def test_validate_help(self, runner: CliRunner) -> None:
        result = runner.invoke(cli, ["validate", "--help"])

        assert result.exit_code == 0
        assert "Validate" in result.output
        assert "--strict" in result.output
