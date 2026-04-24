#!/usr/bin/env python3
"""Generate a reusable TrackFeature fixture with a turn and sensor cuts.

Writes ``shared/schemas/src/fixtures/valid/track-feature-sensors-turn-01.json``
— a vessel that sails north for ~3 km, turns 90° east, and continues east
for another ~3 km, with a single towed-array sensor reporting five bearing
cuts after the turn.  The ``offset`` is deliberately set to 1500 m so the
PLAIN/WORM/MEASURED differences are visible at chart scale.

Used by:
  * Storybook story ``ArrayOffsetComparison`` (visual comparison)
  * Playwright spec ``ArrayOffsetComparison.spec.ts`` (screenshot capture)

Running this script refreshes the fixture from the canonical scenario —
the Storybook story loads the same data inline so the visuals stay in sync
without a build step.  The fixture must also be valid per ``TrackFeature``
Pydantic + JSON Schema validation (both fixture suites cover it).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = (
    ROOT
    / "shared"
    / "schemas"
    / "src"
    / "fixtures"
    / "valid"
    / "track-feature-sensors-turn-01.json"
)

BASE_TIME = datetime(2026, 1, 27, 10, 0, 0, tzinfo=UTC)
MINUTE = timedelta(seconds=60)


def iso(offset_minutes: float) -> str:
    return (BASE_TIME + offset_minutes * MINUTE).isoformat().replace("+00:00", "Z")


def build_fixture() -> dict:
    coordinates: list[list[float]] = []
    positions: list[dict] = []

    # Northbound leg: 15 fixes at 1-minute intervals, lat step 0.002°
    for i in range(15):
        coordinates.append([-5.0, 49.97 + i * 0.002])
        positions.append({"time": iso(i), "course": 0, "speed": 12})

    # Eastbound leg (post-turn): 15 more fixes, lon step 0.003°
    for i in range(15):
        coordinates.append([-5.0 + (i + 1) * 0.003, 50.0])
        positions.append({"time": iso(15 + i), "course": 90, "speed": 12})

    # Five contacts spaced across the eastbound leg
    contacts = [
        {
            "time": iso(t),
            "bearing": 40 + idx * 15,
            "has_bearing": True,
            "range": 3500,
            "visible": True,
            "label": f"C{idx + 1}",
            "show_label": True,
            "put_label_at": "END",
            "label_location": "RIGHT",
            "line_style": "SOLID",
        }
        for idx, t in enumerate((16, 19, 22, 25, 28))
    ]

    # Measured positions offset ~300 m south of the eastbound leg.  Covers
    # contacts 1-4; contact 5 at minute 28 falls outside, forcing the
    # documented PLAIN fallback (FR-004).
    measured_positions = [
        {"time": iso(14), "location": [-4.975, 49.996]},
        {"time": iso(18), "location": [-4.964, 49.996]},
        {"time": iso(22), "location": [-4.953, 49.996]},
        {"time": iso(26), "location": [-4.940, 49.996]},
    ]

    return {
        "type": "Feature",
        "id": "track-sensors-turn-01",
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates,
        },
        "properties": {
            "kind": "TRACK",
            "platform_id": "PLT-E07-119",
            "platform_name": "HMS Turner",
            "track_type": "OWNSHIP",
            "start_time": positions[0]["time"],
            "end_time": positions[-1]["time"],
            "positions": positions,
            "style": {
                "line": {
                    "stroke": True,
                    "color": "#4CAF50",
                    "weight": 2.5,
                    "opacity": 1.0,
                    "line_cap": "round",
                    "line_join": "round",
                },
                "point": {
                    "shape": "circle",
                    "radius": 3,
                    "fill": True,
                    "fill_color": "#4CAF50",
                    "fill_opacity": 1.0,
                    "stroke": True,
                    "color": "#FFFFFF",
                    "weight": 1,
                    "opacity": 1.0,
                },
            },
            "default_position_style": {
                "show_symbol": False,
                "symbol": "circle",
                "show_label": False,
            },
            "sensors": [
                {
                    "name": "TOWED_ARRAY",
                    "base_frequency": 150.0,
                    "offset": 1500.0,
                    "array_centre_mode": "WORM",
                    "worm_in_hole": False,
                    "color": "#8E24AA",
                    "visible": True,
                    "line_thickness": 2,
                    "contacts": contacts,
                    "measured_positions": measured_positions,
                }
            ],
        },
    }


def main() -> None:
    fixture = build_fixture()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(fixture, indent=2) + "\n")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}")
    print(f"  - {len(fixture['geometry']['coordinates'])} track fixes")
    print(f"  - {len(fixture['properties']['sensors'][0]['contacts'])} sensor contacts")
    print(
        f"  - {len(fixture['properties']['sensors'][0]['measured_positions'])} measured positions"
    )


if __name__ == "__main__":
    main()
