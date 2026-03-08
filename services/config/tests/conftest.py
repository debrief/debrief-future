"""Shared pytest fixtures for debrief-config tests."""

import json
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def isolated_config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolate config to a temp directory for all tests.

    Monkeypatches get_config_dir/get_config_file/get_lock_file everywhere
    they're imported so that all config operations use a temp directory.
    (macOS ignores XDG_CONFIG_HOME via platformdirs, so env var alone
    doesn't work.)
    """
    config_dir = tmp_path / "config" / "debrief"
    config_dir.mkdir(parents=True, exist_ok=True)

    config_file = config_dir / "config.json"
    lock_file = config_file.with_suffix(".lock")

    # Patch the canonical definitions in paths module.
    # Note: test_paths.py tests that do `from .paths import get_config_dir`
    # bind at import time, so they may see original or patched depending on
    # import order. This is fine — the critical isolation is for storage.py.
    import debrief_config.paths
    monkeypatch.setattr(debrief_config.paths, "get_config_dir", lambda ensure_exists=True: config_dir)
    monkeypatch.setattr(debrief_config.paths, "get_config_file", lambda ensure_dir_exists=True: config_file)
    monkeypatch.setattr(debrief_config.paths, "get_lock_file", lambda: lock_file)

    # Patch the bound references in modules that do `from .paths import ...`
    import debrief_config
    monkeypatch.setattr(debrief_config, "get_config_dir", lambda ensure_exists=True: config_dir)
    monkeypatch.setattr(debrief_config, "get_config_file", lambda ensure_dir_exists=True: config_file)

    import debrief_config.storage
    monkeypatch.setattr(debrief_config.storage, "get_config_file", lambda ensure_dir_exists=True: config_file)
    monkeypatch.setattr(debrief_config.storage, "get_lock_file", lambda: lock_file)

    return config_dir


@pytest.fixture
def temp_config_dir(isolated_config: Path) -> Path:
    """Create a temporary config directory."""
    isolated_config.mkdir(parents=True, exist_ok=True)
    return isolated_config


@pytest.fixture
def temp_config_file(temp_config_dir: Path) -> Path:
    """Create a temporary config file with defaults."""
    config_file = temp_config_dir / "config.json"
    config_file.write_text(json.dumps({"version": "1.0.0", "stores": [], "preferences": {}}))
    return config_file


@pytest.fixture
def sample_stac_catalog(tmp_path: Path) -> Path:
    """Create a sample STAC catalog for testing."""
    catalog_dir = tmp_path / "sample-catalog"
    catalog_dir.mkdir(parents=True, exist_ok=True)

    catalog_json = catalog_dir / "catalog.json"
    catalog_json.write_text(
        json.dumps(
            {
                "type": "Catalog",
                "stac_version": "1.0.0",
                "id": "sample-catalog",
                "description": "A sample STAC catalog for testing",
                "links": [],
            }
        )
    )

    return catalog_dir


@pytest.fixture
def invalid_stac_catalog(tmp_path: Path) -> Path:
    """Create an invalid STAC catalog (missing required fields)."""
    catalog_dir = tmp_path / "invalid-catalog"
    catalog_dir.mkdir(parents=True, exist_ok=True)

    catalog_json = catalog_dir / "catalog.json"
    catalog_json.write_text(
        json.dumps(
            {
                "type": "Feature",  # Wrong type
                "id": "invalid",
            }
        )
    )

    return catalog_dir
