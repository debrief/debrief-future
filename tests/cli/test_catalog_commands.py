"""Tests for CLI catalog commands."""

import json

import pytest
from click.testing import CliRunner
from debrief_cli.main import cli


@pytest.fixture
def runner():
    """Create a Click test runner."""
    return CliRunner()


@pytest.fixture
def config_with_stores(tmp_path, monkeypatch):
    """Create a config file with test stores."""
    config_dir = tmp_path / ".config" / "debrief"
    config_dir.mkdir(parents=True)
    config_file = config_dir / "config.json"

    config = {
        "stores": {
            "test-store": {"type": "local", "path": "/tmp/test-catalog"},
            "remote-store": {"type": "remote", "url": "https://example.com/stac"},
        }
    }
    config_file.write_text(json.dumps(config))

    # Set XDG_CONFIG_HOME to use our test config
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))

    return config_file


class TestCatalogStores:
    """Tests for 'catalog stores' command."""

    def test_stores_no_config(self, runner, tmp_path, monkeypatch):
        # Use empty config dir
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))

        result = runner.invoke(cli, ["catalog", "stores"])

        assert result.exit_code == 0
        assert "No STAC stores" in result.output or "configured" in result.output.lower()

    def test_stores_with_config(self, runner, config_with_stores):
        result = runner.invoke(cli, ["catalog", "stores"])

        assert result.exit_code == 0
        assert "test-store" in result.output
        assert "remote-store" in result.output

    def test_stores_json(self, runner, config_with_stores):
        result = runner.invoke(cli, ["--json", "catalog", "stores"])

        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "stores" in data
        assert "test-store" in data["stores"]


class TestCatalogList:
    """Tests for 'catalog list' command."""

    def test_list_requires_store(self, runner):
        result = runner.invoke(cli, ["catalog", "list"])

        # Should fail without --store
        assert result.exit_code != 0

    def test_list_unknown_store(self, runner, tmp_path, monkeypatch):
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))

        result = runner.invoke(cli, ["catalog", "list", "--store", "unknown"])

        assert result.exit_code == 5
        assert "not found" in result.output.lower()

    def test_list_known_store(self, runner, config_with_stores):
        result = runner.invoke(cli, ["catalog", "list", "--store", "test-store"])

        assert result.exit_code == 0
        # Note: Full functionality requires debrief-stac
        assert "test-store" in result.output


class TestCatalogGet:
    """Tests for 'catalog get' command."""

    def test_get_requires_store_and_item(self, runner):
        result = runner.invoke(cli, ["catalog", "get"])
        assert result.exit_code != 0

        result = runner.invoke(cli, ["catalog", "get", "--store", "test"])
        assert result.exit_code != 0

    def test_get_unknown_store(self, runner, tmp_path, monkeypatch):
        monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))

        result = runner.invoke(cli, ["catalog", "get", "--store", "unknown", "--item", "test"])

        assert result.exit_code == 5

    def test_get_known_store(self, runner, config_with_stores):
        result = runner.invoke(
            cli, ["catalog", "get", "--store", "test-store", "--item", "item-001"]
        )

        assert result.exit_code == 0
        assert "test-store" in result.output
        assert "item-001" in result.output


class TestCatalogHelp:
    """Tests for catalog --help."""

    def test_catalog_help(self, runner):
        result = runner.invoke(cli, ["catalog", "--help"])

        assert result.exit_code == 0
        assert "stores" in result.output
        assert "list" in result.output
        assert "get" in result.output

    def test_catalog_stores_help(self, runner):
        result = runner.invoke(cli, ["catalog", "stores", "--help"])
        assert result.exit_code == 0

    def test_catalog_list_help(self, runner):
        result = runner.invoke(cli, ["catalog", "list", "--help"])

        assert result.exit_code == 0
        assert "--store" in result.output

    def test_catalog_get_help(self, runner):
        result = runner.invoke(cli, ["catalog", "get", "--help"])

        assert result.exit_code == 0
        assert "--store" in result.output
        assert "--item" in result.output
