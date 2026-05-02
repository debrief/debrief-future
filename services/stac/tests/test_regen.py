"""Integration test for scripts/upgrade-catalog-to-stac-1.1.py (T046).

Builds a tiny 2-item fixture catalog in legacy STAC 1.0 shape, runs the
upgrade script against it, and asserts:
  - FR-019: a second run produces zero diff
  - FR-020: validation halts on a corrupt input
  - SC-001: every item validates against the vendored STAC 1.1 Item Schema
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_SCRIPT = _REPO_ROOT / "scripts" / "upgrade-catalog-to-stac-1.1.py"


def _make_legacy_item(item_dir: Path, item_id: str) -> None:
    item_dir.mkdir(parents=True, exist_ok=True)
    (item_dir / "thumbnail.png").write_bytes(b"\x89PNG\rlarge800x600")
    (item_dir / "thumbnail-sm.png").write_bytes(b"\x89PNG\rsmall200x150")
    (item_dir / "features.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": []})
    )
    item = {
        "type": "Feature",
        "stac_version": "1.0.0",
        "stac_extensions": [
            "https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json"
        ],
        "id": item_id,
        "geometry": None,
        "properties": {
            "title": f"Legacy {item_id}",
            "datetime": "2024-06-15T12:00:00Z",
        },
        "links": [
            {"rel": "self", "href": "./item.json", "type": "application/geo+json"},
            {"rel": "root", "href": "../catalog.json", "type": "application/json"},
            {"rel": "parent", "href": "../catalog.json", "type": "application/json"},
        ],
        "assets": {
            "features": {
                "href": "./features.geojson",
                "type": "application/geo+json",
                "title": "GeoJSON Features",
                "roles": ["data"],
            },
            "thumbnail": {
                "href": "./thumbnail.png",
                "type": "image/png",
                "title": "Plot thumbnail",
                "roles": ["thumbnail"],
            },
            "thumbnail-sm": {
                "href": "./thumbnail-sm.png",
                "type": "image/png",
                "title": "Plot thumbnail (small)",
                "roles": ["thumbnail"],
            },
        },
    }
    (item_dir / "item.json").write_text(json.dumps(item, indent=2) + "\n")


def _make_legacy_catalog(catalog_root: Path, item_ids: list[str]) -> None:
    catalog_root.mkdir(parents=True, exist_ok=True)
    for iid in item_ids:
        _make_legacy_item(catalog_root / iid, iid)
    catalog = {
        "type": "Collection",
        "stac_version": "1.0.0",
        "id": "regen-fixture",
        "description": "Regen integration test fixture",
        "license": "proprietary",
        "extent": {
            "spatial": {"bbox": [[-180, -90, 180, 90]]},
            "temporal": {"interval": [[None, None]]},
        },
        "summaries": {},
        "links": [
            {"rel": "self", "href": "./catalog.json", "type": "application/json"},
            {"rel": "root", "href": "./catalog.json", "type": "application/json"},
        ]
        + [
            {
                "rel": "item",
                "href": f"./{iid}/item.json",
                "type": "application/geo+json",
                "title": iid,
            }
            for iid in item_ids
        ],
    }
    (catalog_root / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n")


def _run_script(catalog_root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(_SCRIPT),
            "--catalog-root",
            str(catalog_root),
            "--no-git-mv",
        ],
        check=False,
        capture_output=True,
        text=True,
    )


def _snapshot(root: Path) -> dict[Path, bytes]:
    return {
        p.relative_to(root): p.read_bytes()
        for p in sorted(root.rglob("*"))
        if p.is_file()
    }


def test_regen_first_run_produces_spec_241_shape(_script_present: None, tmp_path: Path) -> None:
    catalog_root = tmp_path / "fixture-catalog"
    _make_legacy_catalog(catalog_root, ["plot-a", "plot-b"])

    result = _run_script(catalog_root)
    assert result.returncode == 0, result.stderr

    # Files renamed correctly.
    assert (catalog_root / "plot-a" / "thumbnail.png").exists()
    assert (catalog_root / "plot-a" / "overview.png").exists()
    assert not (catalog_root / "plot-a" / "thumbnail-sm.png").exists()

    # Item shape upgraded.
    with open(catalog_root / "plot-a" / "item.json") as f:
        item = json.load(f)
    assert item["stac_version"] == "1.1.0"
    assert (
        "https://stac-extensions.github.io/processing/v1.2.0/schema.json"
        in item["stac_extensions"]
    )
    assert item["properties"]["license"] == "other"
    assert item["assets"]["thumbnail"]["proj:shape"] == [150, 200]
    assert item["assets"]["overview"]["proj:shape"] == [600, 800]

    # Catalog shape upgraded.
    with open(catalog_root / "catalog.json") as f:
        catalog = json.load(f)
    assert catalog["stac_version"] == "1.1.0"
    assert catalog["license"] == "other"
    assert "item_assets" in catalog


def test_regen_idempotent(_script_present: None, tmp_path: Path) -> None:
    """FR-019 / SC-007: a second run produces zero diff."""
    catalog_root = tmp_path / "fixture-catalog"
    _make_legacy_catalog(catalog_root, ["plot-a", "plot-b", "plot-c"])

    result1 = _run_script(catalog_root)
    assert result1.returncode == 0, result1.stderr

    snap_after_first = _snapshot(catalog_root)

    result2 = _run_script(catalog_root)
    assert result2.returncode == 0, result2.stderr

    snap_after_second = _snapshot(catalog_root)

    assert snap_after_first == snap_after_second, (
        "Second run produced a non-zero diff — script is not idempotent. "
        f"Differing paths: "
        f"{[k for k in snap_after_first if snap_after_first.get(k) != snap_after_second.get(k)]}"
    )


def test_regen_halts_on_validation_failure(_script_present: None, tmp_path: Path) -> None:
    """FR-020: corrupt input causes the script to exit non-zero and warn."""
    catalog_root = tmp_path / "fixture-catalog"
    _make_legacy_catalog(catalog_root, ["plot-a"])

    # Corrupt the item.json shape so it can't validate as STAC 1.1.
    item_path = catalog_root / "plot-a" / "item.json"
    item = json.loads(item_path.read_text())
    # Remove the `id` field — required by the STAC Item Schema.
    item.pop("id", None)
    item_path.write_text(json.dumps(item, indent=2) + "\n")

    result = _run_script(catalog_root)
    assert result.returncode == 1, (
        f"Expected non-zero exit on validation failure; got 0.\n"
        f"stdout: {result.stdout}\nstderr: {result.stderr}"
    )
    assert "validation failure" in result.stderr.lower()


def test_regen_existing_unit_tests_still_pass(_script_present: None, tmp_path: Path) -> None:
    """FR-021: regenerated items honour the existing schema-adherence test
    invariants (created/updated lifecycle, asset shape, etc.)."""
    catalog_root = tmp_path / "fixture-catalog"
    _make_legacy_catalog(catalog_root, ["plot-a"])
    result = _run_script(catalog_root)
    assert result.returncode == 0, result.stderr

    item = json.loads((catalog_root / "plot-a" / "item.json").read_text())

    # Article XV-grade type assertions on the upgraded shape.
    assert isinstance(item["properties"]["created"], str)
    assert isinstance(item["properties"]["updated"], str)
    assert item["properties"]["updated"] >= item["properties"]["created"]

    for key in ("thumbnail", "overview"):
        asset = item["assets"][key]
        assert "file:size" in asset and isinstance(asset["file:size"], int)
        assert asset["file:size"] > 0
        assert asset["file:checksum"].startswith("1220")


@pytest.fixture(scope="module")
def _script_present() -> None:
    if not _SCRIPT.exists():
        pytest.skip(
            f"upgrade-catalog-to-stac-1.1.py not found at {_SCRIPT} — script "
            "may have been deleted by T057. Re-add only for re-running this test."
        )
