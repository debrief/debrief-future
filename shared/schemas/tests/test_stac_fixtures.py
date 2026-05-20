"""
Fixture-corpus tests for the STAC catalog cluster (#223).

The strongest evidence of migration correctness (FR-006, FR-011): every
committed ``item.json`` / ``catalog.json`` / ``collection.json`` under
``preview/workspace/samples/local-store/`` and
``apps/vscode/test-data/local-store/`` MUST load through the generated
Pydantic classes without coercion. If a fixture fails, the schema is
widened — never the fixture rewritten.

The test corpus has two tiers (per Decision 3A):

1. **Loads-only** — every item / catalog in the live store loads
   successfully (validates against the generated class). Coverage:
   73 items + 1 Collection in ``preview/workspace/samples/local-store/``
   plus 2 items + 1 Catalog in ``apps/vscode/test-data/local-store/``.

2. **Golden round-trip** — a curated subset of 3 fixtures additionally
   asserts byte-equivalent Py → JSON → Py round-trip via
   sorted-keys-recursive equality, demonstrating no field loss.

Plus golden + negative fixtures under
``shared/schemas/fixtures/stac/<ClassName>/{valid,invalid}/`` covered by
the test_stac_roundtrip module — this module focuses on the on-disk
production corpus.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

from debrief_schemas import (  # noqa: E402
    StacCatalog,
    StacCollection,
    StacItem,
)

# Walk up from shared/schemas/tests/ to the repo root.
REPO_ROOT = Path(__file__).resolve().parents[3]
PREVIEW_STORE = REPO_ROOT / "preview" / "workspace" / "samples" / "local-store"
VSCODE_STORE = REPO_ROOT / "apps" / "vscode" / "test-data" / "local-store"


def _collect_items() -> list[Path]:
    """Discover every committed ``item.json`` across both stores."""
    paths: list[Path] = []
    for root in (PREVIEW_STORE, VSCODE_STORE):
        if not root.exists():
            continue
        paths.extend(sorted(root.rglob("item.json")))
    return paths


def _collect_catalogs() -> list[tuple[str, Path]]:
    """Discover every committed ``catalog.json`` and return (kind, path).

    ``kind`` is ``"Catalog"`` or ``"Collection"`` based on the file's
    ``type`` field. Used to dispatch the correct generated class.
    """
    results: list[tuple[str, Path]] = []
    for root in (PREVIEW_STORE, VSCODE_STORE):
        if not root.exists():
            continue
        for path in sorted(root.rglob("catalog.json")):
            try:
                data = json.loads(path.read_text())
                results.append((data.get("type", "Catalog"), path))
            except json.JSONDecodeError:
                # Malformed JSON is itself a test failure — surface it
                # via the parametrised test below by including the path.
                results.append(("MALFORMED", path))
    return results


ITEM_PATHS = _collect_items()
CATALOG_PATHS = _collect_catalogs()


# --------------------------------------------------------------------------
# Loads-only corpus — every fixture validates against the generated class
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "item_path",
    ITEM_PATHS,
    ids=[str(p.relative_to(REPO_ROOT)) for p in ITEM_PATHS],
)
def test_committed_item_loads(item_path: Path) -> None:
    """Every committed item.json MUST validate as StacItem (FR-011)."""
    data = json.loads(item_path.read_text())
    StacItem.model_validate(data)


@pytest.mark.parametrize(
    "kind,catalog_path",
    CATALOG_PATHS,
    ids=[f"{kind}/{p.relative_to(REPO_ROOT)}" for kind, p in CATALOG_PATHS],
)
def test_committed_catalog_loads(kind: str, catalog_path: Path) -> None:
    """Every committed catalog.json MUST validate as the correct class."""
    if kind == "MALFORMED":
        pytest.fail(f"Catalog JSON is malformed: {catalog_path}")
    data = json.loads(catalog_path.read_text())
    if kind == "Collection":
        StacCollection.model_validate(data)
    elif kind == "Catalog":
        StacCatalog.model_validate(data)
    else:
        pytest.fail(
            f"Unexpected catalog 'type' value: {kind!r} at {catalog_path}"
        )


def test_item_corpus_non_empty() -> None:
    """Sanity check: the test discovers at least 70 items.

    Guards against a misconfigured path or an empty store leading the
    parametrised corpus tests to silently pass with no coverage.
    """
    assert len(ITEM_PATHS) >= 70, (
        f"Expected at least 70 STAC items in the test corpus, found "
        f"{len(ITEM_PATHS)}. Check that PREVIEW_STORE / VSCODE_STORE "
        f"resolve correctly."
    )


def test_catalog_corpus_non_empty() -> None:
    """Sanity check: the test discovers at least two catalogs."""
    assert len(CATALOG_PATHS) >= 2, (
        f"Expected at least 2 STAC catalogs (1 preview Collection + 1 "
        f"vscode Catalog), found {len(CATALOG_PATHS)}."
    )


# --------------------------------------------------------------------------
# Golden round-trip — curated subset round-trips byte-equivalent
# --------------------------------------------------------------------------


def _sort_keys_recursive(node: object) -> object:
    """Recursively sort dict keys for deterministic byte-equivalent
    comparison."""
    if isinstance(node, dict):
        return {k: _sort_keys_recursive(node[k]) for k in sorted(node.keys())}
    if isinstance(node, list):
        return [_sort_keys_recursive(x) for x in node]
    return node


GOLDEN_ITEMS = [
    PREVIEW_STORE / "core--boat1" / "item.json",
    PREVIEW_STORE / "core--analysis2-track1" / "item.json",
]
GOLDEN_COLLECTION = PREVIEW_STORE / "catalog.json"


@pytest.mark.parametrize(
    "item_path",
    GOLDEN_ITEMS,
    ids=[str(p.name) for p in GOLDEN_ITEMS],
)
def test_golden_item_byte_equivalent_roundtrip(item_path: Path) -> None:
    """A curated golden item round-trips through Pydantic without loss.

    Sorts keys recursively to canonicalise dict ordering (Pydantic and
    JSON have different insertion semantics) and asserts the
    sorted-key form is byte-identical.
    """
    if not item_path.exists():
        pytest.skip(f"Golden fixture not present in tree: {item_path}")
    original = json.loads(item_path.read_text())
    item = StacItem.model_validate(original)
    dumped = item.model_dump(mode="json", by_alias=True, exclude_none=True)
    assert _sort_keys_recursive(dumped) == _sort_keys_recursive(original), (
        f"Golden round-trip lost / mutated fields for {item_path.name}"
    )


def test_golden_collection_byte_equivalent_roundtrip() -> None:
    """The preview-store root Collection round-trips byte-equivalent."""
    if not GOLDEN_COLLECTION.exists():
        pytest.skip(f"Golden Collection not present: {GOLDEN_COLLECTION}")
    original = json.loads(GOLDEN_COLLECTION.read_text())
    coll = StacCollection.model_validate(original)
    dumped = coll.model_dump(mode="json", by_alias=True, exclude_none=True)
    assert _sort_keys_recursive(dumped) == _sort_keys_recursive(original), (
        "Golden Collection round-trip lost or mutated fields"
    )
