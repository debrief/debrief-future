"""Structural check: the tier map covers every top-level source directory (T013)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
TIER_MAP = REPO_ROOT / ".claude/review/tier-map.yaml"

# Top-level directories that contain reviewable source. Non-source dirs
# (.git, node_modules, .specify, docs, specs, evidence, tests) are out of scope.
SOURCE_DIRS = {"apps", "services", "shared", "scripts", "tools", "preview", "docker"}


def _load() -> dict[str, Any]:
    with TIER_MAP.open(encoding="utf-8") as handle:
        doc: dict[str, Any] = yaml.safe_load(handle)
    return doc


def _mapped_top_level() -> set[str]:
    doc = _load()
    tops: set[str] = set()
    for entries in doc["tiers"].values():
        for entry in entries:
            tops.add(Path(entry["path"]).parts[0])
    return tops


def test_tiers_are_1_2_3() -> None:
    doc = _load()
    assert set(doc["tiers"].keys()) == {1, 2, 3}


def test_every_source_dir_is_covered() -> None:
    mapped = _mapped_top_level()
    missing = SOURCE_DIRS - mapped
    assert not missing, f"tier map omits source dirs: {missing}"


def test_no_unknown_top_level_paths() -> None:
    # Every mapped top-level path must actually be a known source dir (no typos).
    unknown = _mapped_top_level() - SOURCE_DIRS - {"contrib"}
    assert not unknown, f"tier map references unknown top-level dirs: {unknown}"


def test_every_mapped_path_has_a_note() -> None:
    doc = _load()
    for entries in doc["tiers"].values():
        for entry in entries:
            assert entry.get("note"), f"{entry['path']} missing a note"
