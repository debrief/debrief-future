"""
Provenance round-trip test — validates Python→JSON→TypeScript naming convention.

This test exists because of the provenance data loss incident (March 2026):
Python wrote snake_case keys, TypeScript expected camelCase, and provenance
entries were silently dropped.

The test verifies that LogEntry serialized from Python produces JSON with
the camelCase keys that TypeScript consumers expect. If this test fails,
data will be silently lost at the Python→TypeScript boundary.

See: docs/project_notes/failure-pattern-type-erasure-at-boundaries.md
ADR-010: JSON Wire Format Uses camelCase
"""

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import pytest

# Import generated models
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import LogEntry, ParameterValue, WasGeneratedBy

# The camelCase keys that TypeScript consumers expect.
# Source: services/session-state/src/log/types.ts LogEntry interface.
EXPECTED_CAMEL_CASE_KEYS = {
    "activityId",
    "timestamp",
    "wasGeneratedBy",
    "used",
    "generated",
    "executionDuration",
}

# Nested: WasGeneratedBy must also be camelCase
EXPECTED_WGB_CAMEL_CASE_KEYS = {
    "tool",
    "toolVersion",
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
    """Verify that Python-serialized provenance uses camelCase keys."""

    @pytest.mark.xfail(
        reason=(
            "ConfiguredBaseModel lacks alias_generator — "
            "model_dump(by_alias=True) produces snake_case. "
            "Fix: add alias_generator=to_camel to generate.py post-processing (ADR-010)."
        ),
        strict=True,
    )
    def test_log_entry_json_keys_are_camel_case(self) -> None:
        """LogEntry.model_dump(by_alias=True) must produce camelCase keys.

        This is the exact scenario that caused the provenance data loss incident:
        Python wrote snake_case, TypeScript read camelCase, data was silently dropped.
        """
        entry = _make_log_entry()
        dumped = entry.model_dump(mode="json", by_alias=True)

        # Top-level keys must be camelCase
        for expected_key in EXPECTED_CAMEL_CASE_KEYS:
            assert expected_key in dumped, (
                f"Expected camelCase key '{expected_key}' not found in serialized LogEntry. "
                f"Actual keys: {list(dumped.keys())}. "
                "This means TypeScript consumers will silently drop this field."
            )

    @pytest.mark.xfail(
        reason=(
            "ConfiguredBaseModel lacks alias_generator — "
            "model_dump(by_alias=True) produces snake_case. "
            "Fix: add alias_generator=to_camel to generate.py post-processing (ADR-010)."
        ),
        strict=True,
    )
    def test_was_generated_by_json_keys_are_camel_case(self) -> None:
        """Nested WasGeneratedBy must also use camelCase keys."""
        entry = _make_log_entry()
        dumped = entry.model_dump(mode="json", by_alias=True)

        wgb = dumped.get("wasGeneratedBy") or dumped.get("was_generated_by")
        assert wgb is not None, "wasGeneratedBy/was_generated_by not found in serialized LogEntry"

        for expected_key in EXPECTED_WGB_CAMEL_CASE_KEYS:
            assert expected_key in wgb, (
                f"Expected camelCase key '{expected_key}' not found in WasGeneratedBy. "
                f"Actual keys: {list(wgb.keys())}."
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

    def test_snake_case_keys_present_in_current_output(self) -> None:
        """Documents the current (broken) state: output uses snake_case.

        This test will start failing when the alias_generator is added to
        ConfiguredBaseModel — at that point, remove this test and un-xfail
        the camelCase tests above.
        """
        entry = _make_log_entry()
        dumped = entry.model_dump(mode="json", by_alias=True)

        # Currently, keys are snake_case because no alias_generator is set
        assert "activity_id" in dumped, (
            "Expected snake_case key 'activity_id' — if this fails, the alias_generator "
            "has been added! Remove this test and un-xfail the camelCase tests."
        )
