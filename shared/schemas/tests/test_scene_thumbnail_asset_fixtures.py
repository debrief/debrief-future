"""Adherence tests for the scene-thumbnail asset overlay.

Loads `shared/schemas/contracts/scene-thumbnail-asset.schema.json`,
resolves its `$ref` to the LinkML-generated SceneThumbnailAssetEntry via a
referencing.Registry, and runs the golden fixtures from
`shared/schemas/fixtures/scene-thumbnail-asset/`.

Spec mapping: User Story 2 / FR-003, FR-005, FR-008, FR-010, FR-011; T021.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

REPO_ROOT = Path(__file__).resolve().parents[3]
OVERLAY_PATH = (
    REPO_ROOT / "shared" / "schemas" / "contracts" / "scene-thumbnail-asset.schema.json"
)
BUNDLE_PATH = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "json-schema"
    / "debrief.schema.json"
)
FIXTURE_DIR = (
    REPO_ROOT / "shared" / "schemas" / "fixtures" / "scene-thumbnail-asset"
)


@pytest.fixture(scope="module")
def overlay_validator() -> Draft202012Validator:
    overlay = json.loads(OVERLAY_PATH.read_text(encoding="utf-8"))
    bundle = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
    # Use the bundle's $id as the base URI for the registry; the overlay $ref
    # `https://debrief.info/schemas/debrief-jsonschema#/$defs/...` resolves
    # against this.
    registry = Registry().with_resources(
        [
            (bundle["$id"], Resource.from_contents(bundle)),
            (overlay["$id"], Resource.from_contents(overlay)),
        ]
    )
    return Draft202012Validator(overlay, registry=registry)


def _load(name: str) -> dict:
    return json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "name",
    [
        "paired-valid.json",
        "coexists-with-plot-thumbnails-valid.json",
    ],
)
def test_valid_fixture_passes(
    overlay_validator: Draft202012Validator, name: str
) -> None:
    """T021 — valid fixtures must validate against the overlay."""
    overlay_validator.validate(_load(name))


@pytest.mark.parametrize(
    "name",
    [
        "unpaired-large-invalid.json",
        "unpaired-small-invalid.json",
    ],
)
def test_unpaired_fixtures_pass_overlay(
    overlay_validator: Draft202012Validator, name: str
) -> None:
    """Unpaired fixtures pass the schema overlay — pair-rule-001 is enforced
    by the audit module, not the JSON Schema. This test documents the layer
    boundary."""
    overlay_validator.validate(_load(name))


def test_malformed_ulid_rejected(
    overlay_validator: Draft202012Validator,
) -> None:
    """T021 — `scene-thumbnail-foo` (non-ULID suffix) is rejected by
    scene-thumbnail-key-format-rule-001 via the propertyNames if/then.
    """
    errs = list(
        overlay_validator.iter_errors(_load("malformed-ulid-invalid.json"))
    )
    assert errs, (
        "expected schema rejection for non-ULID suffix; overlay accepted it"
    )
    # The error should mention the offending property name.
    messages = " ".join(str(e.message) for e in errs)
    assert "scene-thumbnail-foo" in messages or "propertyNames" in messages
