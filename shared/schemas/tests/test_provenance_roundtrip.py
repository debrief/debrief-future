"""
Provenance round-trip test — validates Python→JSON naming convention.

This test exists because of the provenance data loss incident (March 2026):
Python wrote snake_case keys, TypeScript expected camelCase, and provenance
entries were silently dropped.

ADR-010 resolved this by adopting **snake_case** as the wire format, matching
the STAC specification (the pre-existing naming standard in the project).
TypeScript consumers must use snake_case field names from the generated types.

See: docs/project_notes/failure-pattern-type-erasure-at-boundaries.md
ADR-010: JSON Wire Format Uses snake_case
"""

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

# Import generated models
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import LogEntry, ParameterValue, WasGeneratedBy

# The snake_case keys that match the LinkML schema and STAC convention.
# TypeScript consumers must use these names (ADR-010).
EXPECTED_TOP_LEVEL_KEYS = {
    "activity_id",
    "timestamp",
    "was_generated_by",
    "used",
    "generated",
    "execution_duration",
}

EXPECTED_WGB_KEYS = {
    "tool",
    "tool_version",
    "parameters",
}


def _make_log_entry() -> LogEntry:
    """Create a representative LogEntry for testing."""
    return LogEntry(
        activity_id="4ac3131d-test-roundtrip",
        timestamp=datetime(2026, 3, 23, 12, 0, 0, tzinfo=UTC),
        was_generated_by=WasGeneratedBy(
            tool="rep-parser",
            tool_version="1.0.0",
            parameters=[
                ParameterValue(value="test-value", default=False, tunable=True),
            ],
        ),
        used=["feature-001"],
        generated=["feature-002"],
        execution_duration="PT0S",
    )


class TestProvenanceNamingConvention:
    """Verify that Python-serialized provenance uses snake_case keys (ADR-010)."""

    def test_log_entry_json_keys_are_snake_case(self) -> None:
        """LogEntry.model_dump() must produce snake_case keys matching STAC convention.

        This is the guardrail for the provenance data loss incident:
        if keys don't match what TypeScript expects, data is silently dropped.
        ADR-010 mandates snake_case everywhere, matching the STAC spec.
        """
        entry = _make_log_entry()
        dumped = entry.model_dump(mode="json")

        for expected_key in EXPECTED_TOP_LEVEL_KEYS:
            assert expected_key in dumped, (
                f"Expected snake_case key '{expected_key}' not found in serialized LogEntry. "
                f"Actual keys: {list(dumped.keys())}. "
                "TypeScript consumers expect these exact keys (ADR-010)."
            )

    def test_was_generated_by_json_keys_are_snake_case(self) -> None:
        """Nested WasGeneratedBy must also use snake_case keys."""
        entry = _make_log_entry()
        dumped = entry.model_dump(mode="json")

        wgb = dumped.get("was_generated_by")
        assert wgb is not None, "was_generated_by not found in serialized LogEntry"

        for expected_key in EXPECTED_WGB_KEYS:
            assert expected_key in wgb, (
                f"Expected snake_case key '{expected_key}' not found in WasGeneratedBy. "
                f"Actual keys: {list(wgb.keys())}."
            )

    def test_no_camel_case_keys_in_output(self) -> None:
        """Serialized JSON must not contain camelCase keys (ADR-010).

        If camelCase keys appear, it means an alias_generator has been
        incorrectly added or explicit aliases are leaking through.
        """
        entry = _make_log_entry()
        dumped = entry.model_dump(mode="json")

        camel_case_keys = {
            "activityId",
            "wasGeneratedBy",
            "executionDuration",
            "generatedResultId",
            "inputState",
            "toolVersion",
        }
        found_camel = camel_case_keys & set(dumped.keys())
        assert not found_camel, (
            f"Found camelCase keys in serialized LogEntry: {found_camel}. "
            "ADR-010 mandates snake_case wire format (matching STAC)."
        )

    def test_log_entry_roundtrip_through_json(self) -> None:
        """LogEntry should survive Python → JSON string → Python round-trip."""
        entry = _make_log_entry()
        json_str = entry.model_dump_json()
        roundtripped = json.loads(json_str)

        # Re-parse — Pydantic should accept its own output
        entry2 = LogEntry(**roundtripped)
        assert entry.activity_id == entry2.activity_id
        assert entry.was_generated_by.tool == entry2.was_generated_by.tool
        assert entry.execution_duration == entry2.execution_duration
