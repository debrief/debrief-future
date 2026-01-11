"""Tests for path resolution module."""

import sys
from pathlib import Path

import pytest
from debrief_config.paths import get_config_dir, get_config_file, get_lock_file


class TestGetConfigDir:
    """Tests for get_config_dir function."""

    def test_returns_path_object(self) -> None:
        """Should return a Path object."""
        result = get_config_dir()
        assert isinstance(result, Path)

    def test_creates_directory_when_ensure_exists_true(self) -> None:
        """Should create directory when ensure_exists=True."""
        result = get_config_dir(ensure_exists=True)
        assert result.exists()
        assert result.is_dir()

    def test_linux_xdg_config_home(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Should respect XDG_CONFIG_HOME on Linux."""
        if sys.platform != "linux":
            pytest.skip("Linux-only test")

        custom_config = tmp_path / "custom_config"
        monkeypatch.setenv("XDG_CONFIG_HOME", str(custom_config))

        # Force reimport to pick up new env var
        import importlib

        import debrief_config.paths
        importlib.reload(debrief_config.paths)

        result = debrief_config.paths.get_config_dir(ensure_exists=True)
        assert "debrief" in str(result)


class TestGetConfigFile:
    """Tests for get_config_file function."""

    def test_returns_config_json_path(self) -> None:
        """Should return path ending with config.json."""
        result = get_config_file()
        assert result.name == "config.json"


class TestGetLockFile:
    """Tests for get_lock_file function."""

    def test_returns_lock_file_path(self) -> None:
        """Should return path ending with .lock."""
        result = get_lock_file()
        assert result.suffix == ".lock"
        assert result.stem == "config"


class TestPlatformPaths:
    """Tests for platform-specific path behavior."""

    def test_config_dir_exists_after_get(self) -> None:
        """Config directory should exist after get_config_dir(ensure_exists=True)."""
        result = get_config_dir(ensure_exists=True)
        assert result.exists()
        assert result.is_dir()

    def test_config_file_in_config_dir(self) -> None:
        """Config file should be inside config directory."""
        config_dir = get_config_dir()
        config_file = get_config_file()
        assert config_file.parent == config_dir
