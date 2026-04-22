"""
Adherence tests for the `activity_type` LogEntry field (Feature 208).

Exercises three golden fixtures in
`shared/schemas/fixtures/log-entry/{valid,invalid}/`:

- `activity-type-snapshot.json` — valid record with `activity_type: "snapshot"`
  validates successfully and the enum round-trips as a string.
- `activity-type-absent.json` — valid record with the field omitted
  (backward compatibility with pre-208 records) validates successfully and the
  Pydantic model exposes `activity_type` as `None`.
- `activity-type-invalid-value.json` — invalid record with
  `activity_type: "invalid"` is rejected by Pydantic enum validation.

All fixtures use snake_case keys per ADR-010 (JSON wire format).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

# Import generated models
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import ActivityType, LogEntry  # noqa: E402

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "log-entry"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class TestActivityTypeFixtures:
    """SC-002 + FR-006 adherence coverage for the new PROV-side signal."""

    def test_snapshot_fixture_validates(self) -> None:
        data = _load(FIXTURES_DIR / "valid" / "activity-type-snapshot.json")
        entry = LogEntry.model_validate(data)
        assert entry.activity_type == ActivityType.snapshot

    def test_absent_fixture_validates(self) -> None:
        data = _load(FIXTURES_DIR / "valid" / "activity-type-absent.json")
        assert "activity_type" not in data
        entry = LogEntry.model_validate(data)
        assert entry.activity_type is None

    def test_invalid_value_fixture_is_rejected(self) -> None:
        data = _load(FIXTURES_DIR / "invalid" / "activity-type-invalid-value.json")
        with pytest.raises(ValidationError):
            LogEntry.model_validate(data)

    def test_snapshot_roundtrip_preserves_enum(self) -> None:
        """ADR-010 round-trip: Python → JSON → Python preserves the enum value."""
        data = _load(FIXTURES_DIR / "valid" / "activity-type-snapshot.json")
        entry = LogEntry.model_validate(data)
        serialized = entry.model_dump(mode="json")
        assert serialized["activity_type"] == "snapshot"
        restored = LogEntry.model_validate(serialized)
        assert restored.activity_type == ActivityType.snapshot

    def test_absent_roundtrip_remains_absent(self) -> None:
        """Absent in, absent out — no spurious default is emitted on serialize."""
        data = _load(FIXTURES_DIR / "valid" / "activity-type-absent.json")
        entry = LogEntry.model_validate(data)
        serialized = entry.model_dump(mode="json", exclude_none=True)
        assert "activity_type" not in serialized
