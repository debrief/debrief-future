"""Unit tests for array offset calculations (feature 119).

Mirrors shared/components/src/MapView/__tests__/array-offset.test.ts.
Cross-language golden parity is verified by test_array_offset_parity.py.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from debrief_calc.tools.sensor.array_offset import (
    EARTH_RADIUS_METRES,
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


@pytest.fixture(scope="module")
def golden_cases() -> list[dict]:
    data = json.loads(FIXTURE_PATH.read_text())
    cases = data["cases"]
    assert len(cases) == 7, "Golden fixture must contain 7 cases"
    return cases


# ── Haversine distance ──────────────────────────────────────────────


class TestHaversineDistanceMetres:
    def test_zero_for_identical_points(self) -> None:
        assert haversine_distance_metres(0, 0, 0, 0) == pytest.approx(0.0, abs=1e-6)
        assert haversine_distance_metres(-5, 50, -5, 50) == pytest.approx(0.0, abs=1e-6)

    def test_one_degree_latitude_at_equator(self) -> None:
        # 2*pi*R/360 ≈ 111195 m
        d = haversine_distance_metres(0, 0, 0, 1)
        assert 111_000 < d < 111_200

    def test_antimeridian_crossing(self) -> None:
        d = haversine_distance_metres(179.99, 0, -179.99, 0)
        assert 2000 < d < 2500

    def test_equator_to_north_pole(self) -> None:
        d = haversine_distance_metres(0, 0, 0, 90)
        expected = math.pi * EARTH_RADIUS_METRES / 2
        assert d == pytest.approx(expected, rel=1e-6)

    def test_symmetric(self) -> None:
        d1 = haversine_distance_metres(-5, 50, -4.5, 50.5)
        d2 = haversine_distance_metres(-4.5, 50.5, -5, 50)
        assert d1 == pytest.approx(d2, rel=1e-9)


# ── PLAIN mode ──────────────────────────────────────────────────────


class TestComputePlainOffset:
    def test_case_1_eastward(self) -> None:
        result = compute_plain_offset((0.0, 50.0), 90.0, 500.0)
        assert result[0] == pytest.approx(-0.006995480231292392, abs=1e-9)
        assert result[1] == pytest.approx(49.99999978971712, abs=1e-9)

    def test_case_2_northward(self) -> None:
        result = compute_plain_offset((-5.0, 50.0), 0.0, 1000.0)
        assert result[0] == pytest.approx(-5.0, abs=1e-12)
        assert result[1] == pytest.approx(49.99100678394081, abs=1e-9)

    def test_case_7_zero_offset(self) -> None:
        result = compute_plain_offset((-5.0, 50.0), 90.0, 0.0)
        assert result == (-5.0, 50.0)

    def test_course_360_equals_zero(self) -> None:
        r0 = compute_plain_offset((-5.0, 50.0), 0.0, 500.0)
        r360 = compute_plain_offset((-5.0, 50.0), 360.0, 500.0)
        assert r0[0] == pytest.approx(r360[0], abs=1e-9)
        assert r0[1] == pytest.approx(r360[1], abs=1e-9)

    def test_negative_course_handled(self) -> None:
        r_pos = compute_plain_offset((-5.0, 50.0), 270.0, 500.0)
        r_neg = compute_plain_offset((-5.0, 50.0), -90.0, 500.0)
        assert r_pos[0] == pytest.approx(r_neg[0], abs=1e-9)
        assert r_pos[1] == pytest.approx(r_neg[1], abs=1e-9)


# ── WORM mode ───────────────────────────────────────────────────────


class TestBacktrackAlongTrack:
    STRAIGHT_COORDS = [[-5.0, 49.98], [-5.0, 49.99], [-5.0, 50.0]]
    TURN_COORDS = [[-5.0, 49.98], [-5.0, 50.0], [-4.98, 50.0]]
    POSITIONS = [
        {"time": "2026-01-01T10:00:00Z"},
        {"time": "2026-01-01T10:30:00Z"},
        {"time": "2026-01-01T11:00:00Z"},
    ]

    def test_case_3_straight_line(self) -> None:
        result = backtrack_along_track(
            self.STRAIGHT_COORDS, self.POSITIONS, "2026-01-01T11:00:00Z", 500.0
        )
        assert result[0] == pytest.approx(-5.0, abs=1e-9)
        assert result[1] == pytest.approx(49.99550339197041, abs=1e-6)

    def test_case_4_through_turn(self) -> None:
        result = backtrack_along_track(
            self.TURN_COORDS, self.POSITIONS, "2026-01-01T11:00:00Z", 2000.0
        )
        assert result[0] == pytest.approx(-5.0, abs=1e-6)
        assert result[1] == pytest.approx(49.994869320037054, abs=1e-4)

    def test_returns_earliest_when_offset_exceeds_track(self) -> None:
        result = backtrack_along_track(
            [[-5.0, 49.99], [-5.0, 50.0]],
            [
                {"time": "2026-01-01T10:00:00Z"},
                {"time": "2026-01-01T11:00:00Z"},
            ],
            "2026-01-01T11:00:00Z",
            100_000.0,
        )
        assert result == (-5.0, 49.99)

    def test_single_position_track(self) -> None:
        result = backtrack_along_track(
            [[-5.0, 50.0]],
            [{"time": "2026-01-01T10:00:00Z"}],
            "2026-01-01T10:00:00Z",
            500.0,
        )
        assert result == (-5.0, 50.0)

    def test_contact_before_track_range(self) -> None:
        result = backtrack_along_track(
            [[-5.0, 49.99], [-5.0, 50.0]],
            [
                {"time": "2026-01-01T11:00:00Z"},
                {"time": "2026-01-01T12:00:00Z"},
            ],
            "2026-01-01T10:00:00Z",
            500.0,
        )
        assert result == (-5.0, 49.99)

    def test_empty_coords_raises(self) -> None:
        with pytest.raises(ValueError):
            backtrack_along_track([], [], "2026-01-01T10:00:00Z", 500.0)


# ── MEASURED mode ───────────────────────────────────────────────────


class TestInterpolateMeasuredPosition:
    POSITIONS = [
        {"time": "2026-01-01T10:00:00Z", "location": [-5.001, 49.998]},
        {"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]},
    ]

    def test_case_5_midpoint(self) -> None:
        result = interpolate_measured_position(self.POSITIONS, "2026-01-01T10:30:00Z")
        assert result is not None
        assert result[0] == pytest.approx(-4.951, abs=1e-9)
        assert result[1] == pytest.approx(50.048, abs=1e-9)

    def test_exact_boundary_timestamp(self) -> None:
        result = interpolate_measured_position(self.POSITIONS, "2026-01-01T10:00:00Z")
        assert result == (-5.001, 49.998)

    def test_before_range_returns_none(self) -> None:
        result = interpolate_measured_position(self.POSITIONS, "2026-01-01T09:00:00Z")
        assert result is None

    def test_after_range_returns_none(self) -> None:
        result = interpolate_measured_position(self.POSITIONS, "2026-01-01T12:00:00Z")
        assert result is None

    def test_empty_positions_returns_none(self) -> None:
        assert interpolate_measured_position([], "2026-01-01T10:30:00Z") is None

    def test_unordered_input_is_sorted(self) -> None:
        unordered = [
            {"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]},
            {"time": "2026-01-01T10:00:00Z", "location": [-5.001, 49.998]},
        ]
        result = interpolate_measured_position(unordered, "2026-01-01T10:30:00Z")
        assert result is not None
        assert result[0] == pytest.approx(-4.951, abs=1e-9)
        assert result[1] == pytest.approx(50.048, abs=1e-9)


# ── Dispatcher ──────────────────────────────────────────────────────


class TestComputeArrayCentre:
    HOST = (-5.0, 50.0)
    TRACK_COORDS = [[-5.0, 49.99], [-5.0, 50.0]]
    TRACK_POSITIONS = [
        {"time": "2026-01-01T10:00:00Z"},
        {"time": "2026-01-01T11:00:00Z"},
    ]
    CONTACT_TIME = "2026-01-01T11:00:00Z"

    def test_none_offset_returns_host(self) -> None:
        result = compute_array_centre(
            self.HOST,
            90.0,
            None,
            "PLAIN",
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result == self.HOST

    def test_zero_offset_returns_host(self) -> None:
        result = compute_array_centre(
            self.HOST,
            90.0,
            0.0,
            "PLAIN",
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result == self.HOST

    def test_none_mode_returns_host(self) -> None:
        result = compute_array_centre(
            self.HOST,
            90.0,
            500.0,
            None,
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result == self.HOST

    def test_plain_dispatch(self) -> None:
        result = compute_array_centre(
            self.HOST,
            90.0,
            500.0,
            "PLAIN",
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result[0] < -5.005
        assert result[1] == pytest.approx(50.0, abs=1e-6)

    def test_worm_dispatch(self) -> None:
        result = compute_array_centre(
            self.HOST,
            0.0,
            300.0,
            "WORM",
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result[0] == pytest.approx(-5.0, abs=1e-9)
        assert 49.99 < result[1] < 50.0

    def test_plain_with_null_course_returns_host(self) -> None:
        result = compute_array_centre(
            self.HOST,
            None,
            500.0,
            "PLAIN",
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result == self.HOST

    def test_unknown_mode_returns_host(self) -> None:
        result = compute_array_centre(
            self.HOST,
            90.0,
            500.0,
            "UNKNOWN",
            None,
            self.CONTACT_TIME,
            self.TRACK_COORDS,
            self.TRACK_POSITIONS,
        )
        assert result == self.HOST

    def test_measured_fallback_to_plain_case_6(self) -> None:
        result = compute_array_centre(
            (-5.0, 50.0),
            45.0,
            300.0,
            "MEASURED",
            [{"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]}],
            "2026-01-01T10:00:00Z",
            [[-5.0, 50.0]],
            [{"time": "2026-01-01T10:00:00Z"}],
        )
        assert result[0] == pytest.approx(-5.00296781314724, abs=1e-6)
        assert result[1] == pytest.approx(49.998092212932896, abs=1e-6)


# ── Golden fixture validation ───────────────────────────────────────


class TestGoldenFixture:
    def test_has_7_contract_cases(self, golden_cases: list[dict]) -> None:
        ids = [c["id"] for c in golden_cases]
        assert ids == [
            "case-1-plain-eastward",
            "case-2-plain-northward",
            "case-3-worm-straight",
            "case-4-worm-through-turn",
            "case-5-measured-midpoint",
            "case-6-measured-fallback-plain",
            "case-7-zero-offset",
        ]

    def test_every_case_declares_tolerance(self, golden_cases: list[dict]) -> None:
        for case in golden_cases:
            assert "tolerance_metres" in case
            assert isinstance(case["tolerance_metres"], (int, float))
            assert case["tolerance_metres"] >= 0
