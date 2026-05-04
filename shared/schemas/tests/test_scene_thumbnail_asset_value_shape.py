"""Structural-shape adherence test for SceneThumbnailAssetEntry.

Loads the LinkML-generated $defs/SceneThumbnailAssetEntry directly and
asserts the JSON Schema validator accepts a hand-crafted valid value
object and rejects each of: missing href, missing type, type != image/png,
missing roles, additional properties.

Spec mapping: User Story 1 / FR-001, FR-004; T013.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[3]
GEN_JSON_SCHEMA = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "json-schema"
    / "debrief.schema.json"
)


@pytest.fixture(scope="module")
def value_validator() -> Draft202012Validator:
    bundle = json.loads(GEN_JSON_SCHEMA.read_text(encoding="utf-8"))
    entry = bundle["$defs"]["SceneThumbnailAssetEntry"]
    return Draft202012Validator(entry)


def _valid_payload() -> dict[str, Any]:
    return {
        "href": "./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png",
        "type": "image/png",
        "roles": ["thumbnail"],
        "title": "Scene thumbnail",
    }


def test_valid_value_passes(value_validator: Draft202012Validator) -> None:
    value_validator.validate(_valid_payload())


def test_valid_minimal_value_passes(value_validator: Draft202012Validator) -> None:
    """Title is optional; minimal payload with required slots only must pass."""
    payload = _valid_payload()
    del payload["title"]
    value_validator.validate(payload)


def test_missing_href_rejected(value_validator: Draft202012Validator) -> None:
    payload = _valid_payload()
    del payload["href"]
    errs = list(value_validator.iter_errors(payload))
    assert errs, "expected validator to reject payload missing href"
    assert any("href" in str(e.message) for e in errs)


def test_missing_type_rejected(value_validator: Draft202012Validator) -> None:
    payload = _valid_payload()
    del payload["type"]
    errs = list(value_validator.iter_errors(payload))
    assert errs, "expected validator to reject payload missing type"


def test_type_not_image_png_rejected(value_validator: Draft202012Validator) -> None:
    payload = _valid_payload()
    payload["type"] = "image/jpeg"
    errs = list(value_validator.iter_errors(payload))
    assert errs, "expected validator to reject non-PNG type"


def test_missing_roles_rejected(value_validator: Draft202012Validator) -> None:
    payload = _valid_payload()
    del payload["roles"]
    errs = list(value_validator.iter_errors(payload))
    assert errs, "expected validator to reject payload missing roles"


def test_additional_property_rejected(value_validator: Draft202012Validator) -> None:
    """LinkML-generated $defs has additionalProperties: false."""
    payload = _valid_payload()
    payload["unexpected_field"] = "nope"
    errs = list(value_validator.iter_errors(payload))
    assert errs, "expected validator to reject payload with extra property"
