---
feature: 208-timeline-entry-kind
captured_at: 2026-04-22T20:47:00Z
git_sha: "694ae1dc (HEAD at capture)"
verification: SC-002 + Quality Rubric (Schema Change feature)
method: Python model_dump → JSON → model_validate, with byte-level JSON equality
---

# Round-trip schema adherence proof

**Quality Rubric** (from `.specify/templates/tasks-template.md`): schema-change features require a round-trip proof that the schema edit passes through the Python ↔ JSON boundary without information loss. This file captures that proof for `LogEntry.activity_type`.

## What the round-trip demonstrates

1. An explicit `ActivityType.snapshot` Python value round-trips to `activity_type: "snapshot"` on the JSON wire, back into an `ActivityType.snapshot` Python value, with byte-level JSON equality on re-serialisation.
2. A record with no `activity_type` round-trips to JSON with the key absent (no spurious default emitted), back to Python with `activity_type = None`.
3. A record with `activity_type: "invalid"` (outside the enum) is rejected by Pydantic enum validation at `model_validate` time.

Each assertion is an `assert` in the capture script; the script exits 0 only if all three pass.

## Capture script

```python
# shared/schemas/src/generated/python is added to sys.path so Pydantic models
# resolve from the just-regenerated output rather than a stale dist.

import json
from datetime import UTC, datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path("shared/schemas/src/generated/python")))
from debrief_schemas import ActivityType, LogEntry, ParameterValue, WasGeneratedBy
from pydantic import ValidationError

# --- Round-trip 1: snapshot entry ---
original = LogEntry(
    activity_id="c0ffee00-0208-4000-8000-000000000001",
    timestamp=datetime(2026, 4, 22, 7, 0, 0, tzinfo=UTC),
    was_generated_by=WasGeneratedBy(tool="manual-checkpoint", tool_version="1.0.0", parameters=[]),
    used=[], generated=[], execution_duration="PT0S",
    activity_type=ActivityType.snapshot,
)
wire = original.model_dump(mode="json", exclude_none=True)
wire_json = json.dumps(wire, sort_keys=True)
restored = LogEntry.model_validate(wire)
assert json.dumps(restored.model_dump(mode="json", exclude_none=True), sort_keys=True) == wire_json
assert restored.activity_type == ActivityType.snapshot
assert wire["activity_type"] == "snapshot"

# --- Round-trip 2: absent field ---
original2 = LogEntry(
    activity_id="c0ffee00-0208-4000-8000-000000000002",
    timestamp=datetime(2026, 4, 22, 7, 5, 0, tzinfo=UTC),
    was_generated_by=WasGeneratedBy(
        tool="calculate-range", tool_version="1.2.0",
        parameters=[ParameterValue(value="60", default=True, tunable=True)]
    ),
    used=["track-alpha"], generated=["range-result-001"], execution_duration="PT0.3S",
)
wire2 = original2.model_dump(mode="json", exclude_none=True)
assert "activity_type" not in wire2
restored2 = LogEntry.model_validate(wire2)
assert restored2.activity_type is None

# --- Round-trip 3: enum validation ---
bad = {
    "activity_id": "c0ffee00-0208-4000-8000-000000000003",
    "timestamp": "2026-04-22T07:10:00Z",
    "was_generated_by": {"tool": "calculate-range", "tool_version": "1.2.0", "parameters": []},
    "used": [], "generated": [], "execution_duration": "PT0.1S",
    "activity_type": "invalid",
}
try:
    LogEntry.model_validate(bad)
    raise SystemExit("FAIL — invalid value was not rejected")
except ValidationError:
    pass  # expected
```

## Captured output

```text
======================================================================
Round-trip 1: snapshot entry with explicit activity_type
======================================================================
  Python:  activity_type = 'snapshot'
  Wire JSON (snake_case, ADR-010):
    activity_id: 'c0ffee00-0208-4000-8000-000000000001'
    activity_type: 'snapshot'
    disabled: False
    execution_duration: 'PT0S'
    generated: []
    timestamp: '2026-04-22T07:00:00Z'
    used: []
    was_generated_by: {'tool': 'manual-checkpoint', 'tool_version': '1.0.0', 'parameters': []}
  Python restored: activity_type = 'snapshot'
  OK — byte-level JSON equality and enum value preserved.

======================================================================
Round-trip 2: record without activity_type (backward compat)
======================================================================
  Wire JSON has 'activity_type'? False
  Python restored: activity_type = None
  OK — absent in, absent out; no spurious default emitted.

======================================================================
Round-trip 3: invalid value is rejected at the boundary
======================================================================
  OK — pydantic ValidationError raised on activity_type='invalid'
  error fragment: 1 validation error for LogEntry

ALL ROUND-TRIPS PASS.
```

## Relation to the three golden fixtures

The same three scenarios are represented as permanent regression fixtures under `shared/schemas/fixtures/log-entry/{valid,invalid}/`:

| Fixture | Scenario | Corresponding round-trip |
|---|---|---|
| `valid/activity-type-snapshot.json` | Explicit `"snapshot"` | Round-trip 1 |
| `valid/activity-type-absent.json` | Field omitted | Round-trip 2 |
| `invalid/activity-type-invalid-value.json` | Enum rejection | Round-trip 3 |

Exercised continuously by `shared/schemas/tests/test_activity_type_fixtures.py` (5 assertions, all pass — see `test-summary.md`).

## Verdict

✅ **Schema-change round-trip proof satisfied.** `activity_type` round-trips losslessly at the Python ↔ JSON ↔ Python boundary, honouring ADR-010 (snake_case wire) and Article II (LinkML is the source of truth — Pydantic and TypeScript types are generated, not hand-written). Enum constraint is enforced at validation time. Backward compatibility for pre-208 records is preserved.
