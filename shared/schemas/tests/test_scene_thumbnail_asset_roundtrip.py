"""Round-trip test for SceneThumbnailAssetEntry (FR-012, Constitution Article II).

Pydantic instance → JSON dump → JSON Schema validation (proves structural
interop with the TypeScript-generated interface, since both are emitted
from the same LinkML source) → Pydantic re-parse → byte-equal JSON.

Spec mapping: User Story 2 / FR-012; T023.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[3]

# The generated Pydantic models live under src/generated/python — the
# existing cross-lang test imports this way.
sys.path.insert(
    0,
    str(REPO_ROOT / "shared" / "schemas" / "src" / "generated" / "python"),
)
from debrief_schemas import SceneThumbnailAssetEntry  # noqa: E402

GEN_JSON_SCHEMA = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "json-schema"
    / "debrief.schema.json"
)


def _value_validator() -> Draft202012Validator:
    bundle = json.loads(GEN_JSON_SCHEMA.read_text(encoding="utf-8"))
    return Draft202012Validator(bundle["$defs"]["SceneThumbnailAssetEntry"])


def test_roundtrip_preserves_full_payload() -> None:
    initial = SceneThumbnailAssetEntry(
        href="./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png",
        type="image/png",
        roles=["thumbnail"],
        title="Scene thumbnail",
    )
    baseline_json = initial.model_dump_json()

    # Structural interop: the JSON dump validates against the LinkML-emitted
    # JSON Schema. Both the JSON Schema and the TypeScript interface flow
    # from the same LinkML source, so passing this validation is equivalent
    # to "the TypeScript interface accepts this JSON".
    payload = json.loads(baseline_json)
    _value_validator().validate(payload)

    # Re-parse via Pydantic — round-trip equality (Article II SC-001).
    final = SceneThumbnailAssetEntry(**payload)
    final_json = final.model_dump_json()
    assert json.loads(final_json) == json.loads(baseline_json), (
        f"round-trip drift:\n  baseline:  {baseline_json}\n  roundtrip: {final_json}"
    )


def test_roundtrip_preserves_minimal_payload() -> None:
    """Title is optional — minimal payload still round-trips."""
    initial = SceneThumbnailAssetEntry(
        href="./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W-sm.png",
        type="image/png",
        roles=["thumbnail"],
    )
    baseline_json = initial.model_dump_json()
    payload = json.loads(baseline_json)
    _value_validator().validate(payload)
    final = SceneThumbnailAssetEntry(**payload)
    assert (
        json.loads(final.model_dump_json())
        == json.loads(baseline_json)
    )


def test_pydantic_rejects_wrong_type() -> None:
    """The LinkML `equals_string: image/png` constraint flows through to
    Pydantic — wrong MIME type is rejected at parse time."""
    import pytest
    from pydantic import ValidationError as PydanticValidationError

    with pytest.raises(PydanticValidationError):
        SceneThumbnailAssetEntry(
            href="./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png",
            type="image/jpeg",  # type: ignore[arg-type]
            roles=["thumbnail"],
        )
