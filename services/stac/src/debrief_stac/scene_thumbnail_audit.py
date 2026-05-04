"""Pairing + orphan audit for per-Scene thumbnail assets.

Enforces invariants that JSON Schema cannot express directly:

  * **scene-thumbnail-pair-rule-001** — every key matching the pattern
    ``^scene-thumbnail-{ULID}$`` in an Item's ``assets`` map MUST have a
    sibling ``scene-thumbnail-{ULID}-sm`` key, and vice versa.
  * **scene-thumbnail-orphan-rule-001** — every captured ULID MUST equal
    the ``properties.id`` of some Scene Feature in the owning Plot's
    ``features.geojson``.

The schema layer (``shared/schemas/contracts/scene-thumbnail-asset.schema.json``)
enforces the value shape and key format only (rule
``scene-thumbnail-key-format-rule-001``).

Schema reference:
    shared/schemas/src/linkml/storyboard.yaml :: SceneThumbnailAssetEntry

See specs/243-scene-asset-contract/ for the migration history.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Match the literal `scene-thumbnail-` prefix, capture the ULID, and an
# optional `-sm` small-variant marker. Keys that start with the prefix but
# fail the full pattern are *not* matched here — those are caught by the
# JSON Schema overlay (key-format-rule-001) before this module runs.
_SCENE_THUMBNAIL_KEY_RE = re.compile(
    r"^scene-thumbnail-(?P<ulid>[0-9A-HJKMNP-TV-Z]{26})(?P<sm>-sm)?$"
)

#: Stable rule IDs, exposed so consumers (CI assertions, evidence captures)
#: can reference them by symbol rather than by literal string.
PAIR_RULE_ID = "scene-thumbnail-pair-rule-001"
ORPHAN_RULE_ID = "scene-thumbnail-orphan-rule-001"


@dataclass(frozen=True)
class Violation:
    """A single audit violation with a stable rule ID and human message."""

    rule_id: str
    message: str
    asset_key: str


def _classify_keys(item: dict) -> dict[str, set[str]]:
    """Group scene-thumbnail asset keys by their ULID.

    Returns a mapping ``{ulid: {variant, ...}}`` where ``variant`` is one
    of ``"large"`` / ``"small"``. Keys that don't match the scene-thumbnail
    pattern are ignored — they're plot-level assets or unrelated entries.
    """
    assets = item.get("assets") or {}
    by_ulid: dict[str, set[str]] = {}
    for key in assets:
        m = _SCENE_THUMBNAIL_KEY_RE.match(key)
        if m is None:
            continue
        variant = "small" if m.group("sm") else "large"
        by_ulid.setdefault(m.group("ulid"), set()).add(variant)
    return by_ulid


def audit_scene_thumbnail_pairing(item: dict) -> list[Violation]:
    """Enforce ``scene-thumbnail-pair-rule-001``.

    Returns one :class:`Violation` per missing counterpart. An Item with a
    well-paired set of scene-thumbnail entries returns ``[]``.
    """
    by_ulid = _classify_keys(item)
    violations: list[Violation] = []
    for ulid in sorted(by_ulid):
        variants = by_ulid[ulid]
        missing = {"large", "small"} - variants
        for variant in sorted(missing):
            other_suffix = "-sm" if variant == "small" else ""
            present_suffix = "" if variant == "small" else "-sm"
            other_key = f"scene-thumbnail-{ulid}{other_suffix}"
            present_key = f"scene-thumbnail-{ulid}{present_suffix}"
            violations.append(
                Violation(
                    rule_id=PAIR_RULE_ID,
                    message=(
                        f"{PAIR_RULE_ID}: missing {variant} counterpart "
                        f"'{other_key}' for asset key '{present_key}'"
                    ),
                    asset_key=present_key,
                )
            )
    return violations


def audit_scene_thumbnail_orphans(
    item: dict, scene_feature_ids: set[str]
) -> list[Violation]:
    """Enforce ``scene-thumbnail-orphan-rule-001``.

    Returns one :class:`Violation` per asset key whose captured ULID does
    not appear in ``scene_feature_ids``. A non-orphan Item returns ``[]``.
    """
    assets = item.get("assets") or {}
    violations: list[Violation] = []
    for key in sorted(assets):
        m = _SCENE_THUMBNAIL_KEY_RE.match(key)
        if m is None:
            continue
        ulid = m.group("ulid")
        if ulid not in scene_feature_ids:
            violations.append(
                Violation(
                    rule_id=ORPHAN_RULE_ID,
                    message=(
                        f"{ORPHAN_RULE_ID}: asset key '{key}' has no matching "
                        f"Scene in the owning Plot (ULID '{ulid}' not found "
                        f"in features.geojson)"
                    ),
                    asset_key=key,
                )
            )
    return violations


__all__ = [
    "PAIR_RULE_ID",
    "ORPHAN_RULE_ID",
    "Violation",
    "audit_scene_thumbnail_pairing",
    "audit_scene_thumbnail_orphans",
]
