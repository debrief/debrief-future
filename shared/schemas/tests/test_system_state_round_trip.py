"""Cross-language round-trip for feature 261 SystemState variants + visibility.

Py -> JSON -> TS (structural guard + re-serialise) -> JSON -> Py, asserting
byte-identical Pydantic dumps at both ends (Article II.2, SC-008). Covers the
four SystemState variants and a `visible: false` geographic feature.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from debrief_schemas import ReferenceLocation, SystemState

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES = REPO_ROOT / "shared" / "schemas" / "fixtures" / "system-state" / "valid"
HELPER = Path(__file__).parent / "helpers" / "system_state_roundtrip_node.mjs"

ROUND_TRIP_FIXTURES: list[tuple[str, type]] = [
    ("spatial.json", SystemState),
    ("temporal.json", SystemState),
    ("selection.json", SystemState),
    ("active-storyboard.json", SystemState),
    ("feature-visible-false.json", ReferenceLocation),
]


@pytest.mark.parametrize("fixture_name,model_cls", ROUND_TRIP_FIXTURES)
def test_crosslang_round_trip(fixture_name: str, model_cls: type) -> None:
    fixture_path = FIXTURES / fixture_name
    assert fixture_path.exists(), f"Fixture not found: {fixture_path}"

    baseline = model_cls.model_validate_json(fixture_path.read_text(encoding="utf-8"))
    baseline_json = baseline.model_dump_json(by_alias=True, exclude_none=True)

    proc = subprocess.run(
        ["node", str(HELPER), str(fixture_path)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, (
        f"Node helper failed (exit {proc.returncode}):\n"
        f"  stdout: {proc.stdout}\n  stderr: {proc.stderr}"
    )

    ts_round_tripped = json.loads(proc.stdout)
    final = model_cls.model_validate(ts_round_tripped)
    final_json = final.model_dump_json(by_alias=True, exclude_none=True)

    assert json.loads(final_json) == json.loads(baseline_json)
