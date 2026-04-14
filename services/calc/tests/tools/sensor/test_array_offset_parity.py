"""Cross-language golden parity tests for array offset calculations.

Loads the same golden fixture exercised by the TypeScript test suite
(shared/components/src/MapView/__tests__/array-offset.test.ts) and asserts
that the Python implementation reproduces ``expected_origin`` within each
case's tolerance.

Because both suites use identical pure-math implementations (spherical
geodesic formulas with Earth radius 6,371,000 m), they converge on the
same output values — which is the whole point of Constitution I.4
(reproducibility).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from debrief_calc.tools.sensor.array_offset import (
    backtrack_along_track,
    compute_array_centre,
    compute_plain_offset,
    haversine_distance_metres,
    interpolate_measured_position,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[5]
    / "shared"
    / "schemas"
    / "src"
    / "fixtures"
    / "valid"
    / "track-feature-array-offset-01.json"
)


def _load_cases() -> list[dict]:
    return json.loads(FIXTURE_PATH.read_text())["cases"]


def _run_case(case: dict) -> tuple[float, float]:
    """Execute the array offset algorithm corresponding to a case."""
    mode = case["mode"]

    if case["id"] == "case-7-zero-offset":
        return (case["host_position"][0], case["host_position"][1])

    if mode == "PLAIN":
        return compute_plain_offset(
            (case["host_position"][0], case["host_position"][1]),
            case["course_deg"],
            case["offset_metres"],
        )

    if mode == "WORM":
        positions = [{"time": t} for t in case["track_times"]]
        return backtrack_along_track(
            case["track_coordinates"],
            positions,
            case["contact_time"],
            case["offset_metres"],
        )

    if case["id"] == "case-5-measured-midpoint":
        result = interpolate_measured_position(
            case["measured_positions"], case["contact_time"]
        )
        assert result is not None, "Midpoint interpolation must not return None"
        return result

    if case["id"] == "case-6-measured-fallback-plain":
        return compute_array_centre(
            (case["host_position"][0], case["host_position"][1]),
            case["course_deg"],
            case["offset_metres"],
            "MEASURED",
            case["measured_positions"],
            case["contact_time"],
            [[case["host_position"][0], case["host_position"][1]]],
            [{"time": case["contact_time"]}],
        )

    raise AssertionError(f"Unhandled case: {case['id']}")


@pytest.mark.parametrize("case", _load_cases(), ids=lambda c: c["id"])
def test_python_matches_golden_fixture(case: dict) -> None:
    """Python output must match expected_origin within the case's tolerance."""
    expected = case["expected_origin"]
    tol = case["tolerance_metres"]

    actual = _run_case(case)

    distance = haversine_distance_metres(
        actual[0], actual[1], expected[0], expected[1]
    )
    assert distance <= tol, (
        f"{case['id']}: actual={actual}, expected={expected}, "
        f"distance={distance:.4f}m > tolerance={tol}m"
    )


def test_all_cases_covered() -> None:
    """Sanity check: ensure the parametrised test actually exercises 7 cases."""
    assert len(_load_cases()) == 7
