#!/usr/bin/env python3
"""Generate SVG comparison plots for feature 119 (array offset calculations).

Outputs real track plots showing the same sensor cuts rendered with PLAIN, WORM,
and MEASURED array centres.  Every coordinate on the page is computed by the
real ``compute_array_centre`` dispatcher — there are no mocks and no
hand-drawn illustrations.

Run from the repository root:

    uv run python scripts/119-render-comparison-plots.py

Writes these files into ``specs/119-array-offset-calc/evidence/``:

  * plot-plain.svg   — track, contacts, bearing lines for PLAIN mode
  * plot-worm.svg    — same scenario rendered in WORM mode
  * plot-measured.svg— same scenario rendered in MEASURED mode
  * plot-comparison.svg  — three panels side by side (used in the shipped post)
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "calc"))

from debrief_calc.tools.sensor.array_offset import (  # noqa: E402
    _geodesic_destination,
    compute_array_centre,
)

# ── Scenario ─────────────────────────────────────────────────────────
#
# Track: vessel sails straight north for ~3 km, executes a 90° right turn,
# then continues east for another ~3 km.  A towed-array sensor with a 1 500 m
# offset reports five bearing cuts after the turn.  The offset is deliberately
# large (comparable to the track-leg length) so the PLAIN/WORM/MEASURED
# differences are clearly visible at chart scale.

BASE_TIME = datetime(2026, 1, 27, 10, 0, 0, tzinfo=UTC)


def iso(offset_seconds: float) -> str:
    return (BASE_TIME + timedelta(seconds=offset_seconds)).isoformat().replace("+00:00", "Z")


# Thirty fixes: 15 northbound, 15 eastbound.  Each fix is 60 s apart.
def _build_track() -> tuple[list[list[float]], list[dict[str, Any]]]:
    coords: list[list[float]] = []
    positions: list[dict[str, Any]] = []

    # Northbound leg
    for i in range(15):
        lon = -5.0
        lat = 49.97 + i * 0.002  # ~222 m per step
        coords.append([lon, lat])
        positions.append({"time": iso(i * 60), "course": 0.0, "speed": 12.0})

    # Eastbound leg (after turn)
    for i in range(15):
        lon = -5.0 + (i + 1) * 0.003  # ~215 m per step at lat 50°
        lat = 50.0
        coords.append([lon, lat])
        positions.append({"time": iso((15 + i) * 60), "course": 90.0, "speed": 12.0})

    return coords, positions


TRACK_COORDS, TRACK_POSITIONS = _build_track()

# Five contacts spaced across the eastbound leg
CONTACT_TIMES = [iso(t) for t in (16 * 60, 19 * 60, 22 * 60, 25 * 60, 28 * 60)]
CONTACT_BEARINGS = [40.0, 55.0, 70.0, 85.0, 100.0]

# Sensor (offset 1500 m — deliberately large for visibility)
SENSOR_OFFSET = 1500.0

# Measured positions: deliberately offset from the track path by ~300 m south
# so the MEASURED mode renders visibly differently from WORM.  Covers only a
# subset of the contact times (so the final contact triggers the PLAIN
# fallback described in FR-004).
MEASURED_POSITIONS = [
    {"time": iso(14 * 60), "location": [-4.975, 49.996]},
    {"time": iso(18 * 60), "location": [-4.964, 49.996]},
    {"time": iso(22 * 60), "location": [-4.953, 49.996]},
    {"time": iso(26 * 60), "location": [-4.940, 49.996]},
]


# ── Helpers ──────────────────────────────────────────────────────────


def _interp(time_iso: str) -> tuple[float, float, float | None]:
    """Interpolate vessel position + course at ``time_iso``."""
    from debrief_calc.tools.sensor.array_offset import (
        _interpolate_track_position,
        _parse_iso_to_ms,
        interpolate_track_course,
    )

    t_ms = _parse_iso_to_ms(time_iso)
    host = _interpolate_track_position(TRACK_COORDS, TRACK_POSITIONS, t_ms)
    course = interpolate_track_course(TRACK_POSITIONS, time_iso)
    assert host is not None
    return host[0], host[1], course


def _compute_origins(mode: str) -> list[tuple[float, float]]:
    origins: list[tuple[float, float]] = []
    for t_iso in CONTACT_TIMES:
        host_lon, host_lat, course = _interp(t_iso)
        origin = compute_array_centre(
            host_position=(host_lon, host_lat),
            course_deg=course,
            offset_metres=SENSOR_OFFSET,
            array_centre_mode=mode,
            measured_positions=MEASURED_POSITIONS if mode == "MEASURED" else None,
            contact_time_iso=t_iso,
            track_coordinates=TRACK_COORDS,
            track_positions=TRACK_POSITIONS,
        )
        origins.append(origin)
    return origins


def _bearing_endpoint(
    origin: tuple[float, float], bearing_deg: float, range_metres: float = 3500.0
) -> tuple[float, float]:
    return _geodesic_destination(origin[0], origin[1], bearing_deg, range_metres)


# ── Projection ───────────────────────────────────────────────────────


def _bounds_for(points: list[tuple[float, float]]) -> tuple[float, float, float, float]:
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    return min(lons), min(lats), max(lons), max(lats)


def _make_projector(
    bounds: tuple[float, float, float, float],
    width: int,
    height: int,
    padding: int = 30,
) -> Callable[[float, float], tuple[float, float]]:
    min_lon, min_lat, max_lon, max_lat = bounds
    dlon = max_lon - min_lon
    dlat = max_lat - min_lat

    # Preserve aspect ratio using a cosine-lat correction
    mid_lat = (min_lat + max_lat) / 2
    import math

    cos_mid = math.cos(math.radians(mid_lat))
    scale_x = (width - 2 * padding) / max(dlon, 1e-9)
    scale_y = (height - 2 * padding) / max(dlat, 1e-9)
    scale = min(scale_x, scale_y * cos_mid) if cos_mid > 0 else min(scale_x, scale_y)

    def project(lon: float, lat: float) -> tuple[float, float]:
        x = padding + (lon - min_lon) * scale
        y = height - padding - (lat - min_lat) * scale / cos_mid
        return x, y

    return project


# ── SVG rendering ────────────────────────────────────────────────────


def _panel_svg(
    mode: str,
    origins: list[tuple[float, float]],
    x0: float = 0,
    y0: float = 0,
    width: int = 380,
    height: int = 360,
) -> str:
    """Render a single panel (clip-boxed) as a <g> element suitable for embedding."""
    # Compute bounds across track, origins, bearing endpoints
    all_points: list[tuple[float, float]] = []
    all_points += [(c[0], c[1]) for c in TRACK_COORDS]
    all_points += origins
    for origin, bearing in zip(origins, CONTACT_BEARINGS, strict=True):
        all_points.append(_bearing_endpoint(origin, bearing))
    # Expand bounds slightly
    bounds = _bounds_for(all_points)

    project = _make_projector(bounds, width, height, padding=28)

    parts: list[str] = []

    # Clip + background
    clip_id = f"clip-{mode.lower()}"
    parts.append(f'<g transform="translate({x0},{y0})">')
    parts.append(f'<clipPath id="{clip_id}"><rect width="{width}" height="{height}"/></clipPath>')
    parts.append(f'<g clip-path="url(#{clip_id})">')
    parts.append(f'<rect width="{width}" height="{height}" fill="#FAFAFA" stroke="#CCC"/>')

    # Title
    parts.append(
        f'<text x="{width / 2}" y="22" text-anchor="middle" '
        f'style="font: 600 14px sans-serif; fill: #333">{mode} mode</text>'
    )

    # Track path
    track_pts = [project(c[0], c[1]) for c in TRACK_COORDS]
    track_d = " ".join(
        f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(track_pts)
    )
    parts.append(f'<path d="{track_d}" stroke="#4CAF50" stroke-width="2.5" fill="none"/>')

    # Track fix markers (every 3rd for clarity)
    for i, (x, y) in enumerate(track_pts):
        if i % 3 == 0:
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.8" fill="#2E7D32"/>')

    # Mark the turn point
    turn_idx = 14
    tx, ty = track_pts[turn_idx]
    parts.append(f'<circle cx="{tx:.1f}" cy="{ty:.1f}" r="3.5" fill="#1B5E20"/>')

    # Host positions at contact times (reference — where the vessel is)
    for t_iso in CONTACT_TIMES:
        host_lon, host_lat, _ = _interp(t_iso)
        hx, hy = project(host_lon, host_lat)
        parts.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="3" fill="#1976D2"/>')

    # Bearing lines from origins
    colours = {"PLAIN": "#FF8F00", "WORM": "#8E24AA", "MEASURED": "#00838F"}
    origin_colour = colours.get(mode, "#666")

    for origin, bearing in zip(origins, CONTACT_BEARINGS, strict=True):
        ox, oy = project(origin[0], origin[1])
        end_lon, end_lat = _bearing_endpoint(origin, bearing)
        ex, ey = project(end_lon, end_lat)
        parts.append(
            f'<line x1="{ox:.1f}" y1="{oy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" '
            f'stroke="{origin_colour}" stroke-width="1.2" opacity="0.85"/>'
        )
        # Origin marker
        parts.append(
            f'<circle cx="{ox:.1f}" cy="{oy:.1f}" r="4" fill="{origin_colour}" '
            f'stroke="#333" stroke-width="0.8"/>'
        )
        # Dashed host-to-origin connector
        hx, hy = project(
            *_interp(  # just recompute
                CONTACT_TIMES[CONTACT_BEARINGS.index(bearing)]
            )[:2]
        )
        parts.append(
            f'<line x1="{hx:.1f}" y1="{hy:.1f}" x2="{ox:.1f}" y2="{oy:.1f}" '
            f'stroke="{origin_colour}" stroke-width="0.8" stroke-dasharray="3,3" '
            f'opacity="0.5"/>'
        )

    # MEASURED: plot measured positions too
    if mode == "MEASURED":
        for mp in MEASURED_POSITIONS:
            mx, my = project(mp["location"][0], mp["location"][1])
            parts.append(
                f'<rect x="{mx - 3:.1f}" y="{my - 3:.1f}" width="6" height="6" '
                f'fill="none" stroke="#00838F" stroke-width="1.2"/>'
            )

    parts.append("</g>")  # clip group
    parts.append("</g>")  # panel translate group
    return "\n".join(parts)


def _legend_svg(x: float, y: float, width: int = 1160) -> str:
    return f"""
<g transform="translate({x},{y})">
  <line x1="0" y1="6" x2="24" y2="6" stroke="#4CAF50" stroke-width="2.5"/>
  <text x="30" y="10" style="font: 12px sans-serif; fill: #555">vessel track</text>

  <circle cx="130" cy="6" r="3" fill="#1976D2"/>
  <text x="140" y="10" style="font: 12px sans-serif; fill: #555">host position at contact time</text>

  <circle cx="340" cy="6" r="4" fill="#FF8F00" stroke="#333" stroke-width="0.8"/>
  <text x="350" y="10" style="font: 12px sans-serif; fill: #555">PLAIN array centre</text>

  <circle cx="490" cy="6" r="4" fill="#8E24AA" stroke="#333" stroke-width="0.8"/>
  <text x="500" y="10" style="font: 12px sans-serif; fill: #555">WORM array centre</text>

  <circle cx="645" cy="6" r="4" fill="#00838F" stroke="#333" stroke-width="0.8"/>
  <text x="655" y="10" style="font: 12px sans-serif; fill: #555">MEASURED array centre</text>

  <rect x="825" y="2" width="8" height="8" fill="none" stroke="#00838F" stroke-width="1.2"/>
  <text x="838" y="10" style="font: 12px sans-serif; fill: #555">measured position</text>

  <circle cx="970" cy="6" r="3.5" fill="#1B5E20"/>
  <text x="980" y="10" style="font: 12px sans-serif; fill: #555">turn point</text>
</g>
""".strip()


def _full_svg(mode: str, origins: list[tuple[float, float]]) -> str:
    width, height = 500, 460
    body = _panel_svg(mode, origins, x0=0, y0=40, width=width, height=height - 80)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"
     font-family="Segoe UI, Arial, sans-serif">
  <text x="{width / 2}" y="22" text-anchor="middle"
        style="font: bold 15px sans-serif; fill: #333">
    Track + bearing cuts — {mode} array offset mode (1500 m offset)
  </text>
  {body}
  <text x="{width / 2}" y="{height - 18}" text-anchor="middle"
        style="font: 11px sans-serif; fill: #777">
    Vessel sails north, turns east at marked point; 5 contacts reported after the turn.
  </text>
</svg>
"""


def _comparison_svg(
    plain_origins: list[tuple[float, float]],
    worm_origins: list[tuple[float, float]],
    measured_origins: list[tuple[float, float]],
) -> str:
    panel_w = 380
    panel_h = 380
    spacing = 10
    title_h = 40
    legend_h = 28
    total_w = 3 * panel_w + 4 * spacing
    total_h = title_h + panel_h + legend_h + spacing * 2
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}"
     font-family="Segoe UI, Arial, sans-serif">
  <text x="{total_w / 2}" y="24" text-anchor="middle"
        style="font: bold 16px sans-serif; fill: #333">
    Same track, same contacts — three array offset modes compared (1500 m offset)
  </text>
  {_panel_svg("PLAIN", plain_origins, x0=spacing, y0=title_h, width=panel_w, height=panel_h)}
  {_panel_svg("WORM", worm_origins, x0=panel_w + 2 * spacing, y0=title_h, width=panel_w, height=panel_h)}
  {_panel_svg("MEASURED", measured_origins, x0=2 * panel_w + 3 * spacing, y0=title_h, width=panel_w, height=panel_h)}
  {_legend_svg(spacing, title_h + panel_h + spacing)}
</svg>
"""


# ── Entry point ──────────────────────────────────────────────────────


def main() -> None:
    plain = _compute_origins("PLAIN")
    worm = _compute_origins("WORM")
    measured = _compute_origins("MEASURED")

    out_dir = ROOT / "specs" / "119-array-offset-calc" / "evidence"
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "plot-plain.svg").write_text(_full_svg("PLAIN", plain))
    (out_dir / "plot-worm.svg").write_text(_full_svg("WORM", worm))
    (out_dir / "plot-measured.svg").write_text(_full_svg("MEASURED", measured))
    (out_dir / "plot-comparison.svg").write_text(_comparison_svg(plain, worm, measured))

    # Emit the numeric values so they can be embedded in the evidence doc
    print("Scenario: northbound leg → 90° right turn → eastbound leg")
    print(f"Sensor offset: {SENSOR_OFFSET} m")
    print()
    print(f"{'Contact time':<26} {'Host position':<26} {'PLAIN':<26} {'WORM':<26} {'MEASURED':<26}")
    for i, t in enumerate(CONTACT_TIMES):
        host_lon, host_lat, _ = _interp(t)
        host = f"({host_lon:.4f},{host_lat:.4f})"
        p = f"({plain[i][0]:.4f},{plain[i][1]:.4f})"
        w = f"({worm[i][0]:.4f},{worm[i][1]:.4f})"
        m = f"({measured[i][0]:.4f},{measured[i][1]:.4f})"
        print(f"{t:<26} {host:<26} {p:<26} {w:<26} {m:<26}")

    print()
    print("Wrote:")
    for p in out_dir.glob("plot-*.svg"):
        print(f"  - {p.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
