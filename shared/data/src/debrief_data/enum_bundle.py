"""Build-time enum-bundle extractor.

Pure functions that walk the platform registry and a STAC sample catalog to
produce a compact, deterministic controlled-vocabulary bundle for use in the
LLM system prompt built by item #188.

The module intentionally has no filesystem side effects beyond reading
catalog files; writing the bundle to disk is the CLI script's responsibility
(``scripts/extract-enum-bundle.py``).
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import TYPE_CHECKING, TypedDict, cast

if TYPE_CHECKING:
    from pathlib import Path

    from debrief_data.registry import PlatformRegistry

# --- Constants ----------------------------------------------------------------

EXERCISE_SEPARATOR = ": "
"""Literal separator used to parse an exercise-name prefix from an item title."""

_BUNDLE_META_DEFAULTS: "BundleMeta" = {  # noqa: UP037 -- BundleMeta defined below
    "tool": "scripts/extract-enum-bundle.py",
    "generated_from_registry": "shared/data/platform-registry.json",
    "generated_from_catalog": "preview/workspace/samples/local-store",
    "exercise_parse_rule": "title prefix before ': '",
    "canonicalisation": "trim + lowercase dedup, first-seen casing preserved",
}
"""Default values for the bundle's ``_meta`` block.

The paths are deliberately relative to the repository root so the committed
bundle does not leak absolute developer paths.
"""


# --- Public types -------------------------------------------------------------


class BundleMeta(TypedDict):
    """Provenance metadata written to the bundle's ``_meta`` block."""

    tool: str
    generated_from_registry: str
    generated_from_catalog: str
    exercise_parse_rule: str
    canonicalisation: str


class EnumBundle(TypedDict):
    """The compact enum bundle emitted by :func:`build_bundle`.

    ``vessel_class_tree`` is modelled as ``dict[str, object]`` because
    ``TypedDict`` cannot express the recursive ``ClassTreeNode`` shape; the
    recursive contract is enforced by the JSON schema and tests.
    """

    _meta: BundleMeta
    vessel_class_tree: dict[str, object]
    nationalities: list[str]
    exercise_names: list[str]
    tags: list[str]
    feature_tags: list[str]


@dataclass(frozen=True)
class CatalogScanResult:
    """Intermediate result of scanning the sample catalog.

    All lists are deduplicated (canonical key collision collapses to the
    first-seen casing) and sorted alphabetically case-insensitive.
    """

    nationalities: list[str]
    exercise_names: list[str]
    tags: list[str]
    feature_tags: list[str]


# --- Private helpers ----------------------------------------------------------


def _canonical_key(value: str) -> str:
    """Return the deduplication key for a value.

    The rule is documented in the bundle's ``_meta.canonicalisation`` field:
    leading/trailing whitespace is stripped and the remainder is casefolded.
    Two values that differ only by whitespace or case therefore collapse to a
    single entry; any other difference is preserved as a distinct value.
    """
    return value.strip().casefold()


def _dedup_preserving_first(values: Iterable[str]) -> list[str]:
    """Deduplicate an iterable of strings and return them sorted.

    - Empty/whitespace-only values are dropped.
    - Canonical-key collisions keep the **first-seen** trimmed casing.
    - The output is sorted case-insensitively for human readability.
    """
    first_seen: dict[str, str] = {}
    for raw in values:
        trimmed = raw.strip()
        if not trimmed:
            continue
        key = _canonical_key(trimmed)
        if key not in first_seen:
            first_seen[key] = trimmed
    return sorted(first_seen.values(), key=lambda v: v.casefold())


def _parse_exercise_name(title: str | None) -> str | None:
    """Extract the exercise-name prefix from an item title.

    Returns the substring before the first occurrence of ``": "`` (literal
    colon-space). Returns ``None`` if ``title`` is falsy, not a string, or
    contains no ``": "``. The extracted prefix is trimmed; an empty prefix
    (e.g. a title like ``": trailing"``) is treated as absent.
    """
    if not isinstance(title, str):
        return None
    separator_index = title.find(EXERCISE_SEPARATOR)
    if separator_index <= 0:
        # No separator, or separator at index 0 (empty prefix) → no contribution.
        return None
    prefix = title[:separator_index].strip()
    return prefix or None


# --- Public functions (Phase 3 implementations) -------------------------------


def extract_class_tree(registry: PlatformRegistry) -> dict[str, object]:
    """Project the registry's vessel-class tree with platform leaves stripped.

    A node is a **platform leaf** when it is a dict containing a ``name`` key
    (matching the ``_is_platform_entry`` predicate used by
    :mod:`debrief_data.registry`). Such nodes are removed entirely. All other
    interior nodes are preserved — including their ``_class`` blocks — so the
    LLM can still reason about class-level queries (e.g. "frigates").
    """
    tree = registry._tree  # internal by convention — loader reuse is explicit per research.md Decision 2
    return _project_tree(tree)


def _project_tree(node: Mapping[str, object]) -> dict[str, object]:
    projected: dict[str, object] = {}
    for key in sorted(node.keys()):
        value = node[key]
        if key == "_class":
            # Preserve _class metadata verbatim.
            if isinstance(value, Mapping):
                projected[key] = {str(k): value[k] for k in sorted(value.keys())}
            continue
        if key.startswith("_"):
            # Any other underscore-prefixed keys are registry internals; skip.
            continue
        if not isinstance(value, Mapping):
            # Scalar/list under an interior key would be malformed; skip defensively.
            continue
        if "name" in value:
            # Platform-instance leaf — strip.
            continue
        projected[key] = _project_tree(value)
    return projected


def scan_catalog(catalog_dir: Path) -> CatalogScanResult:
    """Walk ``<catalog_dir>/*/item.json`` and harvest controlled vocabularies.

    The walk is deterministic (directories visited in sorted order). Missing
    optional fields are skipped without crashing; see Decision 10 in
    ``research.md`` for the walk-scope rationale.
    """
    tags: list[str] = []
    feature_tags: list[str] = []
    nationalities: list[str] = []
    exercise_names: list[str] = []

    if not catalog_dir.is_dir():
        raise FileNotFoundError(f"Catalog directory not found: {catalog_dir}")

    for child in sorted(catalog_dir.iterdir(), key=lambda p: p.name):
        if not child.is_dir():
            continue
        item_path = child / "item.json"
        if not item_path.is_file():
            continue
        _harvest_item(item_path, tags, feature_tags, nationalities, exercise_names)

    return CatalogScanResult(
        nationalities=_dedup_preserving_first(nationalities),
        exercise_names=_dedup_preserving_first(exercise_names),
        tags=_dedup_preserving_first(tags),
        feature_tags=_dedup_preserving_first(feature_tags),
    )


def _harvest_item(
    item_path: Path,
    tags: list[str],
    feature_tags: list[str],
    nationalities: list[str],
    exercise_names: list[str],
) -> None:
    """Append harvested values from a single ``item.json`` to the accumulators."""
    text = item_path.read_text(encoding="utf-8")
    data = json.loads(text)
    if not isinstance(data, Mapping):
        return
    properties_obj = data.get("properties")
    if not isinstance(properties_obj, Mapping):
        return

    # Tags.
    tags_value = properties_obj.get("debrief:tags")
    if isinstance(tags_value, list):
        for entry in tags_value:
            if isinstance(entry, str):
                tags.append(entry)

    # Feature tags.
    feature_tags_value = properties_obj.get("debrief:feature_tags")
    if isinstance(feature_tags_value, list):
        for entry in feature_tags_value:
            if isinstance(entry, str):
                feature_tags.append(entry)

    # Platform nationalities.
    platforms_value = properties_obj.get("debrief:platforms")
    if isinstance(platforms_value, list):
        for platform in platforms_value:
            if not isinstance(platform, Mapping):
                continue
            nationality = platform.get("nationality")
            if isinstance(nationality, str):
                nationalities.append(nationality)

    # Exercise name (parsed from title).
    title_value = properties_obj.get("title")
    title_str = title_value if isinstance(title_value, str) else None
    exercise = _parse_exercise_name(title_str)
    if exercise is not None:
        exercise_names.append(exercise)


def build_bundle(registry: PlatformRegistry, catalog_dir: Path) -> EnumBundle:
    """Compose a full :class:`EnumBundle` from a registry and a catalog dir.

    The bundle's ``nationalities`` list is the union of registry platform
    nationalities and catalog-item nationalities (deduplicated case-
    insensitively). All other list sections come directly from the catalog
    scan. The ``_meta`` block is populated from :data:`_BUNDLE_META_DEFAULTS`.
    """
    catalog_scan = scan_catalog(catalog_dir)
    registry_nationalities = [platform.nationality for platform in registry.list_platforms()]
    unioned_nationalities = _dedup_preserving_first(
        [*registry_nationalities, *catalog_scan.nationalities]
    )
    meta: BundleMeta = {
        "tool": _BUNDLE_META_DEFAULTS["tool"],
        "generated_from_registry": _BUNDLE_META_DEFAULTS["generated_from_registry"],
        "generated_from_catalog": _BUNDLE_META_DEFAULTS["generated_from_catalog"],
        "exercise_parse_rule": _BUNDLE_META_DEFAULTS["exercise_parse_rule"],
        "canonicalisation": _BUNDLE_META_DEFAULTS["canonicalisation"],
    }
    bundle: EnumBundle = {
        "_meta": meta,
        "vessel_class_tree": extract_class_tree(registry),
        "nationalities": unioned_nationalities,
        "exercise_names": catalog_scan.exercise_names,
        "tags": catalog_scan.tags,
        "feature_tags": catalog_scan.feature_tags,
    }
    return bundle


def serialize(bundle: EnumBundle) -> str:
    """Serialise the bundle to a deterministic, reviewable JSON string.

    Uses two-space indentation, ``sort_keys=True`` and ``ensure_ascii=False``
    so diffs stay readable and non-ASCII tag values survive verbatim. A
    trailing newline is appended so the file ends cleanly under POSIX
    conventions.
    """
    # ``bundle`` is a ``TypedDict`` and ``json.dumps`` expects ``object``; the
    # cast narrows the structural typing without introducing ``Any``.
    payload = cast("object", bundle)
    return json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
