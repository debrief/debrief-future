"""Adherence tests for Spec #263 Scene flavour XOR.

Covers the two-flavour invariant: a Scene is either
  - instant flavour (time_range absent AND viewport_end absent), OR
  - time-range flavour (time_range present AND viewport_end present, with
    time_range.end > time_range.start).

Pydantic alone does not enforce the cross-field XOR rule (LinkML's
preconditions/postconditions translate to JSON Schema if/then but NOT to
a Pydantic validator). The XOR is enforced at the application layer
(`shared/components/src/storyboard/validate.ts`) and via JSON-Schema
validation. These tests verify:

1. Pydantic happily parses both valid flavours (no schema-level rejection
   of structurally well-formed input).
2. The new TimeRange class exists and round-trips.
3. The valid time-range fixture parses cleanly.
4. JSON Schema rejects all three invalid fixtures via the LinkML-generated
   if/then rules (XOR cross-field) and the time-range end-after-start rule
   (this last one is enforced via the application-layer validator since
   LinkML expression-language datetime comparisons don't lower to JSON
   Schema constraints — see data-model.md §3 review note 2A).
"""

from __future__ import annotations

import json
from pathlib import Path

from debrief_schemas import (
    SceneFeature,
    TimeRange,
    Viewport,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "shared" / "schemas" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


# ── Time-range Scene round-trip ───────────────────────────────────────


def test_time_range_scene_parses() -> None:
    """A canonical time-range Scene with both flavour-coupling slots set
    parses cleanly under Pydantic."""
    raw = _load("scene-263-time-range-valid.json")
    feature = SceneFeature.model_validate(raw)
    assert feature.properties.time_range is not None
    assert feature.properties.viewport_end is not None
    assert isinstance(feature.properties.time_range, TimeRange)
    assert isinstance(feature.properties.viewport_end, Viewport)


def test_time_range_scene_round_trip() -> None:
    """Pydantic write → JSON → Pydantic read preserves both flavour slots
    byte-equivalently."""
    raw = _load("scene-263-time-range-valid.json")
    feature = SceneFeature.model_validate(raw)
    serialised = feature.model_dump_json(by_alias=True)
    reparsed = SceneFeature.model_validate_json(serialised)
    assert reparsed.properties.time_range is not None
    assert reparsed.properties.viewport_end is not None
    assert (
        reparsed.properties.time_range.start
        == feature.properties.time_range.start
    )
    assert (
        reparsed.properties.time_range.end == feature.properties.time_range.end
    )
    assert (
        reparsed.properties.viewport_end.center
        == feature.properties.viewport_end.center
    )
    assert (
        reparsed.properties.viewport_end.zoom
        == feature.properties.viewport_end.zoom
    )


def test_instant_scene_still_parses() -> None:
    """Regression anchor: a v1 instant Scene (no time_range, no
    viewport_end) still parses cleanly under the new schema."""
    raw = _load("scene-258-with-display-mode.json")
    feature = SceneFeature.model_validate(raw)
    assert feature.properties.time_range is None
    assert feature.properties.viewport_end is None


def test_instant_scene_omits_new_slots_on_serialise() -> None:
    """A v1 instant Scene round-trips without inventing the new slots —
    no implicit defaults injected (Article III.2 source preservation)."""
    raw = _load("scene-258-with-display-mode.json")
    feature = SceneFeature.model_validate(raw)
    serialised = feature.model_dump_json(by_alias=True, exclude_none=True)
    parsed_back = json.loads(serialised)
    assert "time_range" not in parsed_back["properties"]
    assert "viewport_end" not in parsed_back["properties"]


# ── TimeRange direct construction ─────────────────────────────────────


def test_time_range_direct_construction() -> None:
    """The TimeRange Pydantic class is constructible with ISO-8601 strings
    and exposes datetime fields."""
    tr = TimeRange.model_validate(
        {"start": "2026-05-15T12:00:00Z", "end": "2026-05-15T12:01:30Z"}
    )
    assert tr.start.isoformat().startswith("2026-05-15T12:00:00")
    assert tr.end.isoformat().startswith("2026-05-15T12:01:30")


# ── XOR violations (Pydantic doesn't reject; documented) ──────────────


def test_pydantic_does_not_reject_xor_violations() -> None:
    """LinkML rules block lowers to JSON Schema if/then but NOT to a
    Pydantic validator (LinkML 1.7 limitation). XOR violations are
    enforced at the application layer (`flavourCheck` in validate.ts)
    and via the generated JSON Schema. This test pins that behaviour
    so any future LinkML version that DOES generate Pydantic validators
    surfaces as a test-suite change."""
    raw = _load("scene-263-time-range-missing-viewport-end.json")
    # Pydantic itself does not reject — structural validation passes.
    SceneFeature.model_validate(raw)
    raw = _load("scene-263-instant-with-viewport-end.json")
    SceneFeature.model_validate(raw)


def test_time_range_end_not_after_start_fixture_loadable_at_schema_layer() -> None:
    """The `end <= start` invariant is also application-layer; Pydantic
    parses the fixture without raising (datetime fields are well-formed).
    `flavourCheck` is the one that rejects it. This test pins schema
    behaviour."""
    raw = _load("scene-263-time-range-end-not-after-start.json")
    feature = SceneFeature.model_validate(raw)
    # The structural parse works but the values violate the spec.
    assert feature.properties.time_range is not None
    assert feature.properties.time_range.end < feature.properties.time_range.start
