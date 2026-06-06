"""Adherence tests for feature 261 — SystemState variants + per-feature visibility.

Coverage (SC-005 / SC-006 / SC-008):

* The four ``valid/*`` SystemState fixtures parse under Pydantic and round-trip
  Python -> JSON -> Python bit-identically.
* A geographic feature carrying ``properties.visible: false`` parses and
  round-trips, with the flag preserved.
* ``invalid/*`` fixtures that violate *structural* / *type* / *enum* /
  *required-discriminator* constraints are rejected by Pydantic.
* ``invalid/spatial-missing-viewport`` violates the per-variant ``rules:``
  block. LinkML lowers ``rules:`` to JSON-Schema ``if/then`` (NOT to a Pydantic
  validator — see ``test_storyboard_scene_flavour.py`` for the same limitation),
  so it is validated against the generated ``SystemState.schema.json``.
* ``invalid/multiple-same-state-type`` is a FeatureCollection-level invariant
  (two features sharing a ``state_type``); each feature is individually valid,
  so this is enforced by the TS helper ``read.ts`` (T038), not by per-feature
  schema validation. This test pins that each feature parses, documenting why
  the FC-level check lives in the helper.
* The two ``cross-field/*`` fixtures are schema-valid but violate a temporal
  cross-field invariant; Pydantic parses them (the values are well-formed
  datetimes). The invariant is enforced by the TS helper ``validate.ts`` (T040).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import Draft201909Validator
from pydantic import ValidationError

from debrief_schemas import ReferenceLocation, SystemState

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES = REPO_ROOT / "shared" / "schemas" / "fixtures" / "system-state"
SYSTEM_STATE_SCHEMA = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "json-schema"
    / "SystemState.schema.json"
)


def _load(rel: str) -> dict:
    return json.loads((FIXTURES / rel).read_text(encoding="utf-8"))


# ── Valid SystemState variants: parse + round-trip ────────────────────


@pytest.mark.parametrize(
    "name",
    ["spatial", "temporal", "selection", "active-storyboard"],
)
def test_valid_variant_parses_and_round_trips(name: str) -> None:
    raw = _load(f"valid/{name}.json")
    feature = SystemState.model_validate(raw)
    # Round-trip Python -> JSON -> Python, exclude_none so absent optionals
    # are not invented (Article III.2 source preservation).
    serialised = feature.model_dump_json(by_alias=True, exclude_none=True)
    reparsed = SystemState.model_validate_json(serialised)
    assert reparsed.properties.state_type == feature.properties.state_type
    assert json.loads(serialised)["properties"] == raw["properties"]


def test_visible_false_feature_parses_and_round_trips() -> None:
    raw = _load("valid/feature-visible-false.json")
    feature = ReferenceLocation.model_validate(raw)
    assert feature.properties.visible is False
    serialised = feature.model_dump_json(by_alias=True, exclude_none=True)
    reparsed = ReferenceLocation.model_validate_json(serialised)
    assert reparsed.properties.visible is False


def test_absent_visible_means_visible() -> None:
    """A feature with no `visible` flag parses and leaves the field None
    (treated as visible by the helper)."""
    raw = _load("valid/feature-visible-false.json")
    del raw["properties"]["visible"]
    feature = ReferenceLocation.model_validate(raw)
    assert feature.properties.visible is None


# ── Invalid: rejected by Pydantic (structural / type / enum / required) ─


@pytest.mark.parametrize(
    "name",
    [
        "selection-non-string-id",  # selected_ids: [1, 2] — type error
        "unknown-state-type",  # state_type not in enum
        "missing-discriminator",  # state_type required but absent
    ],
)
def test_invalid_rejected_by_pydantic(name: str) -> None:
    raw = _load(f"invalid/{name}.json")
    with pytest.raises(ValidationError):
        SystemState.model_validate(raw)


# ── Invalid: rejected by JSON-Schema rules (if/then), not Pydantic ────


def test_spatial_missing_viewport_rejected_by_json_schema() -> None:
    """The `state_type == spatial` rule requires `viewport`. LinkML lowers
    this to JSON-Schema if/then, so the generated SystemState.schema.json
    rejects it even though Pydantic (which doesn't honour rules:) does not."""
    schema = json.loads(SYSTEM_STATE_SCHEMA.read_text(encoding="utf-8"))
    validator = Draft201909Validator(schema)
    raw = _load("invalid/spatial-missing-viewport.json")
    errors = list(validator.iter_errors(raw))
    assert errors, "expected JSON Schema to reject a spatial feature with no viewport"


def test_valid_spatial_passes_json_schema() -> None:
    """Positive control: the valid spatial fixture passes the same validator."""
    schema = json.loads(SYSTEM_STATE_SCHEMA.read_text(encoding="utf-8"))
    validator = Draft201909Validator(schema)
    raw = _load("valid/spatial.json")
    assert not list(validator.iter_errors(raw))


# ── FC-level + cross-field invariants: documented as helper-enforced ──


def test_each_duplicate_state_type_feature_is_individually_valid() -> None:
    """Both features in multiple-same-state-type.json are individually valid;
    the at-most-one-per-state_type rule (FR-003) is an FC-level invariant
    enforced by the TS helper read.ts, not by per-feature schema validation."""
    fc = _load("invalid/multiple-same-state-type.json")
    for feat in fc["features"]:
        SystemState.model_validate(feat)  # does not raise


@pytest.mark.parametrize(
    "name",
    ["temporal-current-time-out-of-window", "temporal-bad-window"],
)
def test_cross_field_fixtures_parse_under_pydantic(name: str) -> None:
    """Cross-field fixtures are schema-valid (well-formed datetimes). The
    temporal invariants (current_time in [start,end]; start <= end) are
    enforced by the TS helper validate.ts (T040), not by Pydantic."""
    raw = _load(f"cross-field/{name}.json")
    SystemState.model_validate(raw)  # does not raise
