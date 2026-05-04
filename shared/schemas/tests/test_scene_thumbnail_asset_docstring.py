"""Docstring-flow-through tests for SceneThumbnailAssetEntry.

Guards FR-014 + spec.md §SC-005: the LinkML class docstring (the durable
contributor-facing documentation) must reach Pydantic, JSON Schema, and
TypeScript outputs intact, and must answer the four diagnostic questions
plus reference the named rule IDs.

Spec mapping: User Story 1 / FR-001, FR-002, FR-014.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
GEN_PYTHON = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "python"
    / "debrief_schemas"
    / "__init__.py"
)
GEN_JSON_SCHEMA = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "json-schema"
    / "debrief.schema.json"
)
GEN_TYPESCRIPT = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "typescript"
    / "types.ts"
)

# This phrase is unique to the SceneThumbnailAssetEntry class docstring and
# anchors the docstring-flow-through assertions across all three outputs.
SIGNATURE_PHRASE = "Always appears as part of a"

# Named-rule IDs that must reach the docstring (US3 + cross-link guarantee).
PAIR_RULE_ID = "scene-thumbnail-pair-rule-001"
ORPHAN_RULE_ID = "scene-thumbnail-orphan-rule-001"
KEY_FORMAT_RULE_ID = "scene-thumbnail-key-format-rule-001"


def _read(path: Path) -> str:
    assert path.exists(), f"missing generated artefact: {path}"
    return path.read_text(encoding="utf-8")


def test_docstring_in_jsonschema_description() -> None:
    """T010 — JSON Schema $defs/SceneThumbnailAssetEntry.description carries the docstring."""
    schema = json.loads(_read(GEN_JSON_SCHEMA))
    entry = schema["$defs"]["SceneThumbnailAssetEntry"]
    description = entry["description"]
    assert SIGNATURE_PHRASE in description, (
        f"signature phrase missing from JSON Schema description; got: {description!r}"
    )
    assert PAIR_RULE_ID in description
    assert ORPHAN_RULE_ID in description
    assert KEY_FORMAT_RULE_ID in description


def test_docstring_in_pydantic_class_doc() -> None:
    """T011 — Pydantic generated class docstring carries the docstring."""
    source = _read(GEN_PYTHON)
    # The class definition lives in the generated all-in-one file; its
    # docstring follows the `class SceneThumbnailAssetEntry(...)` line.
    marker = "class SceneThumbnailAssetEntry(ConfiguredBaseModel):"
    idx = source.find(marker)
    assert idx >= 0, "class SceneThumbnailAssetEntry not found in generated Pydantic"
    body = source[idx : idx + 4000]
    assert SIGNATURE_PHRASE in body
    assert PAIR_RULE_ID in body
    assert ORPHAN_RULE_ID in body
    assert KEY_FORMAT_RULE_ID in body


def test_docstring_in_typescript_tsdoc() -> None:
    """T012 — TypeScript interface TSDoc above the declaration carries the docstring."""
    source = _read(GEN_TYPESCRIPT)
    marker = "export interface SceneThumbnailAssetEntry"
    idx = source.find(marker)
    assert idx >= 0, "interface SceneThumbnailAssetEntry not found in generated TS"
    # Walk backwards from the marker to find the preceding TSDoc block (`/** ... */`).
    head = source[:idx]
    block_close = head.rfind("*/")
    assert block_close > 0, "no preceding TSDoc block found before interface"
    block_open = head.rfind("/**", 0, block_close)
    assert block_open >= 0, "no opening /** found for preceding TSDoc block"
    block = head[block_open : block_close + 2]
    assert SIGNATURE_PHRASE in block, (
        f"signature phrase missing from TSDoc; got: {block!r}"
    )
    assert PAIR_RULE_ID in block
    assert ORPHAN_RULE_ID in block
    assert KEY_FORMAT_RULE_ID in block


@pytest.mark.parametrize(
    "rule_id",
    [PAIR_RULE_ID, ORPHAN_RULE_ID, KEY_FORMAT_RULE_ID],
)
def test_named_rule_ids_present_in_jsonschema(rule_id: str) -> None:
    """T034 cross-link assertion — every named rule ID appears in the JSON
    Schema description so a CI failure citing the ID can be resolved by
    grep/search inside the schema bundle."""
    schema = json.loads(_read(GEN_JSON_SCHEMA))
    entry = schema["$defs"]["SceneThumbnailAssetEntry"]
    assert rule_id in entry["description"]
