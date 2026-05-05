"""Pairing + orphan unit tests for the scene-thumbnail audit module.

Covers:
  * scene-thumbnail-pair-rule-001 (T022, US2)
  * scene-thumbnail-orphan-rule-001 (T033, US3)

The audit module enforces invariants that JSON Schema cannot express
directly. These tests load the golden fixtures from
``shared/schemas/fixtures/scene-thumbnail-asset/`` and assert the audit
returns the expected Violations with cited rule IDs.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from debrief_stac.scene_thumbnail_audit import (
    ORPHAN_RULE_ID,
    PAIR_RULE_ID,
    Violation,
    audit_scene_thumbnail_orphans,
    audit_scene_thumbnail_pairing,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_DIR = REPO_ROOT / "shared" / "schemas" / "fixtures" / "scene-thumbnail-asset"


def _fixture_assets(name: str) -> dict:
    """Load a fixture as if it were the `assets` map of an Item."""
    raw = json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))
    # Strip _comment metadata that's not part of the on-disk contract.
    raw.pop("_comment", None)
    return raw


def _item(assets: dict) -> dict:
    return {"assets": assets}


# ---------------------------------------------------------------------------
# Pairing audit (T022, US2)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "fixture",
    ["paired-valid.json", "coexists-with-plot-thumbnails-valid.json"],
)
def test_pairing_passes_for_valid_fixtures(fixture: str) -> None:
    item = _item(_fixture_assets(fixture))
    assert audit_scene_thumbnail_pairing(item) == []


def test_pairing_rejects_unpaired_large() -> None:
    item = _item(_fixture_assets("unpaired-large-invalid.json"))
    violations = audit_scene_thumbnail_pairing(item)
    assert len(violations) == 1, violations
    v = violations[0]
    assert v.rule_id == PAIR_RULE_ID
    assert v.asset_key == "scene-thumbnail-01HABC2K8M9N0P1Q2R3S4T5V6W"
    # Message names the absent counterpart
    assert "scene-thumbnail-01HABC2K8M9N0P1Q2R3S4T5V6W-sm" in v.message
    assert PAIR_RULE_ID in v.message


def test_pairing_rejects_unpaired_small() -> None:
    item = _item(_fixture_assets("unpaired-small-invalid.json"))
    violations = audit_scene_thumbnail_pairing(item)
    assert len(violations) == 1, violations
    v = violations[0]
    assert v.rule_id == PAIR_RULE_ID
    assert v.asset_key == "scene-thumbnail-01HDEF3K8M9N0P1Q2R3S4T5V6W-sm"
    # Message names the absent counterpart (the un-suffixed large key)
    assert "scene-thumbnail-01HDEF3K8M9N0P1Q2R3S4T5V6W'" in v.message
    assert PAIR_RULE_ID in v.message


def test_pairing_ignores_unrelated_keys() -> None:
    """Pairing audit ignores plot-level keys (`thumbnail`, `overview`, etc.)."""
    item = _item(
        {
            "thumbnail": {
                "href": "thumbnail.png",
                "type": "image/png",
                "roles": ["thumbnail"],
            },
            "overview": {
                "href": "overview.png",
                "type": "image/png",
                "roles": ["overview"],
            },
        }
    )
    assert audit_scene_thumbnail_pairing(item) == []


def test_pairing_handles_empty_assets() -> None:
    assert audit_scene_thumbnail_pairing({}) == []
    assert audit_scene_thumbnail_pairing({"assets": {}}) == []
    assert audit_scene_thumbnail_pairing({"assets": None}) == []


def test_violation_is_frozen_dataclass() -> None:
    """Violations are frozen so audit consumers can hash / cache them safely."""
    from dataclasses import FrozenInstanceError

    v = Violation(rule_id=PAIR_RULE_ID, message="test", asset_key="k")
    with pytest.raises(FrozenInstanceError):
        v.rule_id = "other"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Orphan audit (T033, US3)
# ---------------------------------------------------------------------------


def test_orphan_audit_passes_when_all_ulids_match_scenes() -> None:
    item = _item(_fixture_assets("paired-valid.json"))
    scene_ids = {"01HXYZ7K8M9N0P1Q2R3S4T5V6W"}
    assert audit_scene_thumbnail_orphans(item, scene_ids) == []


def test_orphan_audit_flags_assets_with_unknown_ulid() -> None:
    """ULID present in assets but not in the Plot's Scene list ⇒ orphan."""
    item = _item(_fixture_assets("paired-valid.json"))
    # Empty Scene list ⇒ both keys (large + sm) are orphaned.
    violations = audit_scene_thumbnail_orphans(item, set())
    assert len(violations) == 2
    for v in violations:
        assert v.rule_id == ORPHAN_RULE_ID
        assert "01HXYZ7K8M9N0P1Q2R3S4T5V6W" in v.message
        assert ORPHAN_RULE_ID in v.message


def test_orphan_audit_ignores_unrelated_keys() -> None:
    item = _item(
        {
            "thumbnail": {"href": "t.png", "type": "image/png", "roles": ["thumbnail"]},
            "features": {
                "href": "features.geojson",
                "type": "application/geo+json",
                "roles": ["data"],
            },
        }
    )
    assert audit_scene_thumbnail_orphans(item, set()) == []


def test_orphan_fixture_bundle_flagged() -> None:
    """T031/T033 — orphan-asset-invalid bundle: ULID 01HORPH... is NOT in
    features.geojson Scene IDs ⇒ two Violations (large + sm)."""
    bundle_dir = FIXTURE_DIR / "orphan-asset-invalid"
    item = json.loads((bundle_dir / "item.json").read_text())
    features = json.loads((bundle_dir / "features.geojson").read_text())
    scene_ids = {
        f["properties"]["id"]
        for f in features["features"]
        if f["properties"].get("kind") == "STORYBOARD_SCENE"
    }
    violations = audit_scene_thumbnail_orphans(item, scene_ids)
    assert len(violations) == 2, violations
    for v in violations:
        assert v.rule_id == ORPHAN_RULE_ID
        assert "01HZZZZZ8M9N0P1Q2R3S4T5V6W" in v.message
        assert ORPHAN_RULE_ID in v.message  # rule cited in message


def test_non_orphan_fixture_bundle_passes() -> None:
    """T032/T033 — non-orphan-valid bundle: matching Scene exists ⇒ []."""
    bundle_dir = FIXTURE_DIR / "non-orphan-valid"
    item = json.loads((bundle_dir / "item.json").read_text())
    features = json.loads((bundle_dir / "features.geojson").read_text())
    scene_ids = {
        f["properties"]["id"]
        for f in features["features"]
        if f["properties"].get("kind") == "STORYBOARD_SCENE"
    }
    assert audit_scene_thumbnail_orphans(item, scene_ids) == []


def test_orphan_audit_partial_match() -> None:
    """One ULID known, one ULID orphan ⇒ two violations for the orphan pair."""
    known_ulid = "01HXYZ7K8M9N0P1Q2R3S4T5V6W"
    orphan_ulid = "01HABC2K8M9N0P1Q2R3S4T5V6W"
    item = _item(
        {
            f"scene-thumbnail-{known_ulid}": {
                "href": "a.png",
                "type": "image/png",
                "roles": ["thumbnail"],
            },
            f"scene-thumbnail-{known_ulid}-sm": {
                "href": "a-sm.png",
                "type": "image/png",
                "roles": ["thumbnail"],
            },
            f"scene-thumbnail-{orphan_ulid}": {
                "href": "b.png",
                "type": "image/png",
                "roles": ["thumbnail"],
            },
            f"scene-thumbnail-{orphan_ulid}-sm": {
                "href": "b-sm.png",
                "type": "image/png",
                "roles": ["thumbnail"],
            },
        }
    )
    violations = audit_scene_thumbnail_orphans(item, {known_ulid})
    assert len(violations) == 2
    assert all(orphan_ulid in v.message for v in violations)
    assert all(v.rule_id == ORPHAN_RULE_ID for v in violations)
