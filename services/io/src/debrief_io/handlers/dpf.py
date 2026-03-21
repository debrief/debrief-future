"""DPF (Debrief Plot File) format handler.

Parses Debrief's DPF XML format into GeoJSON features.
The DPF format is an XML format for storing complete plot data
including tracks, sensor contacts, narratives, and TMA solutions.

See specs/144-import-legacy-sample-data/debrief_plot.xsd for the full schema.
"""

from __future__ import annotations

import contextlib
import logging
import time
import uuid
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from typing import Any

from debrief_io.handlers.base import BaseHandler
from debrief_io.models import ParseResult, ParseWarning

logger = logging.getLogger(__name__)

# DPF namespace
NS = "http://www.debrief.info/plot"

# Null timestamp sentinel — legacy Debrief uses this for uninitialised times
_NULL_DTG = "691231 235959.999"


def _tag(name: str, ns: str | None) -> str:
    """Build a namespace-qualified tag name."""
    if ns:
        return f"{{{ns}}}{name}"
    return name


def _detect_namespace(root: ET.Element) -> str | None:
    """Detect whether the document uses the Debrief namespace."""
    tag = root.tag
    if tag.startswith("{"):
        return tag[1 : tag.index("}")]
    return None


def _parse_dtg(dtg: str) -> datetime | None:
    """Parse a Debrief DTG string into a datetime.

    Handles both YYMMDD HHMMSS[.SSS] and YYYYMMDD HHMMSS[.SSS] formats.

    Returns None for null sentinel timestamps.
    """
    if dtg == _NULL_DTG:
        return None

    parts = dtg.strip().split()
    if len(parts) != 2:
        return None

    date_str, time_str = parts

    # Parse date — 6 digits = YYMMDD, 8 digits = YYYYMMDD
    if len(date_str) == 8:
        year = int(date_str[0:4])
        month = int(date_str[4:6])
        day = int(date_str[6:8])
    elif len(date_str) == 6:
        yy = int(date_str[0:2])
        month = int(date_str[2:4])
        day = int(date_str[4:6])
        year = 1900 + yy if yy >= 50 else 2000 + yy
    else:
        return None

    # Parse time — HHMMSS or HHMMSS.SSS
    hour = int(time_str[0:2])
    minute = int(time_str[2:4])
    sec_part = time_str[4:]

    if "." in sec_part:
        sec_str, frac_str = sec_part.split(".", 1)
        second = int(sec_str)
        microsecond = int(frac_str.ljust(6, "0")[:6])
    else:
        second = int(sec_part)
        microsecond = 0

    return datetime(year, month, day, hour, minute, second, microsecond, tzinfo=UTC)


def _parse_location(centre_elem: ET.Element, ns: str | None) -> tuple[float, float, float] | None:
    """Parse a <centre> element containing shortLocation or longLocation.

    Returns (lat, lon, depth) or None if no valid location found.
    """
    short = centre_elem.find(_tag("shortLocation", ns))
    if short is not None:
        lat = float(short.get("Lat", "0"))
        lon = float(short.get("Long", "0"))
        depth = float(short.get("Depth", "0"))
        return (lat, lon, depth)

    long_loc = centre_elem.find(_tag("longLocation", ns))
    if long_loc is not None:
        lat_deg = float(long_loc.get("LatDeg", "0"))
        lat_min = float(long_loc.get("LatMin", "0"))
        lat_sec = float(long_loc.get("LatSec", "0"))
        lat_hem = long_loc.get("LatHem", "N")
        lon_deg = float(long_loc.get("LongDeg", "0"))
        lon_min = float(long_loc.get("LongMin", "0"))
        lon_sec = float(long_loc.get("LongSec", "0"))
        lon_hem = long_loc.get("LongHem", "E")

        lat = lat_deg + lat_min / 60.0 + lat_sec / 3600.0
        if lat_hem in ("S", "s"):
            lat = -lat

        lon = lon_deg + lon_min / 60.0 + lon_sec / 3600.0
        if lon_hem in ("W", "w"):
            lon = -lon

        depth = float(long_loc.get("Depth", "0"))
        return (lat, lon, depth)

    return None


def _calculate_intervals(duration_hours: float) -> tuple[str, str]:
    """Calculate symbol and label intervals based on track duration."""
    if duration_hours < 0.5:
        return ("PT1M", "PT5M")
    elif duration_hours < 2:
        return ("PT5M", "PT15M")
    elif duration_hours < 6:
        return ("PT10M", "PT30M")
    elif duration_hours < 12:
        return ("PT15M", "PT1H")
    elif duration_hours < 24:
        return ("PT30M", "PT2H")
    else:
        return ("PT1H", "PT4H")


class DPFHandler(BaseHandler):
    """Handler for Debrief DPF (Plot File) XML format.

    Parses DPF XML into GeoJSON features:
    - Tracks → LineString features with temporal properties
    - Sensor contacts → features with null geometry
    - Narratives → features with null geometry
    - TMA solutions → features with null geometry
    """

    @property
    def name(self) -> str:
        return "Debrief DPF Format"

    @property
    def description(self) -> str:
        return "Handler for Debrief Plot File (XML) format"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def extensions(self) -> list[str]:
        return [".dpf", ".DPF"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse DPF XML content into GeoJSON features."""
        start = time.perf_counter()
        warnings: list[ParseWarning] = []
        features: list[dict[str, Any]] = []

        try:
            root = ET.fromstring(content)
        except ET.ParseError as e:
            warnings.append(ParseWarning(message=f"XML parse error: {e}", code="XML_PARSE_ERROR"))
            return ParseResult(
                features=[],
                warnings=warnings,
                source_file=source_file,
                parse_time_ms=(time.perf_counter() - start) * 1000,
                handler=self.name,
                handler_version=self.version,
            )

        ns = _detect_namespace(root)

        # Navigate to layers
        session = root.find(_tag("session", ns))
        if session is None:
            warnings.append(
                ParseWarning(message="No <session> element found", code="MISSING_ELEMENT")
            )
            return ParseResult(
                features=features,
                warnings=warnings,
                source_file=source_file,
                parse_time_ms=(time.perf_counter() - start) * 1000,
                handler=self.name,
                handler_version=self.version,
            )

        layers = session.find(_tag("layers", ns))
        if layers is None:
            warnings.append(
                ParseWarning(message="No <layers> element found", code="MISSING_ELEMENT")
            )
            return ParseResult(
                features=features,
                warnings=warnings,
                source_file=source_file,
                parse_time_ms=(time.perf_counter() - start) * 1000,
                handler=self.name,
                handler_version=self.version,
            )

        # Parse tracks (including composite_track which extends track)
        for track_tag in ("track", "composite_track"):
            for track_elem in layers.findall(_tag(track_tag, ns)):
                track_features = self._parse_track(track_elem, ns, warnings, source_file)
                features.extend(track_features)

        # Parse narratives
        for narrative_elem in layers.findall(_tag("narrative", ns)):
            narrative_features = self._parse_narrative(narrative_elem, ns, warnings)
            features.extend(narrative_features)

        elapsed_ms = (time.perf_counter() - start) * 1000

        return ParseResult(
            features=features,
            warnings=warnings,
            source_file=source_file,
            parse_time_ms=elapsed_ms,
            handler=self.name,
            handler_version=self.version,
        )

    def _parse_track(
        self,
        track_elem: ET.Element,
        ns: str | None,
        warnings: list[ParseWarning],
        source_file: str,
    ) -> list[dict[str, Any]]:
        """Parse a <track> element into GeoJSON features.

        Returns track LineString features plus sensor and TMA features.
        """
        features: list[dict[str, Any]] = []
        track_name = track_elem.get("Name", "Unknown")
        track_color = track_elem.get("Color", "#808080")

        # Collect fixes from TrackSegment and SegmentList elements
        all_fixes: list[dict[str, Any]] = []

        # Direct TrackSegments
        for segment in track_elem.findall(_tag("TrackSegment", ns)):
            fixes = self._parse_fixes(segment, ns, warnings, track_name)
            all_fixes.extend(fixes)

        # SegmentList → TrackSegment
        for seg_list in track_elem.findall(_tag("SegmentList", ns)):
            for segment in seg_list.findall(_tag("TrackSegment", ns)):
                fixes = self._parse_fixes(segment, ns, warnings, track_name)
                all_fixes.extend(fixes)

        # Direct fixes (some older files put fixes directly under track)
        direct_fixes = self._parse_fixes(track_elem, ns, warnings, track_name)
        all_fixes.extend(direct_fixes)

        # Build track feature if we have fixes
        if all_fixes:
            # Sort by timestamp
            all_fixes.sort(key=lambda f: f["timestamp"])

            coordinates = [[f["lon"], f["lat"]] for f in all_fixes]
            positions_data = [
                {
                    "time": f["timestamp"].isoformat(),
                    "course": f["course"],
                    "speed": f["speed"],
                    "depth": f["depth"],
                }
                for f in all_fixes
            ]

            start_time = all_fixes[0]["timestamp"]
            end_time = all_fixes[-1]["timestamp"]
            duration_hours = (end_time - start_time).total_seconds() / 3600
            symbol_interval, label_interval = _calculate_intervals(duration_hours)

            # Single-point tracks need duplicate coordinate for valid LineString
            if len(coordinates) == 1:
                coordinates.append(coordinates[0])
                positions_data.append(positions_data[0])

            features.append(
                {
                    "type": "Feature",
                    "id": str(uuid.uuid4()),
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates,
                    },
                    "properties": {
                        "kind": "TRACK",
                        "platform_id": track_name,
                        "platform_name": track_name,
                        "track_type": "CONTACT",
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "positions": positions_data,
                        "style": {
                            "line": {"color": track_color},
                            "point": {
                                "shape": "circle",
                                "radius": 3.0,
                                "fill_color": track_color,
                                "color": track_color,
                            },
                        },
                        "default_position_style": {
                            "show_symbol": False,
                            "symbol": "circle",
                            "show_label": False,
                        },
                        "symbol_interval": symbol_interval,
                        "label_interval": label_interval,
                    },
                }
            )

        # Parse sensors
        for sensor_elem in track_elem.findall(_tag("sensor", ns)):
            sensor_features = self._parse_sensor(sensor_elem, ns, warnings, track_name)
            features.extend(sensor_features)

        # Parse TMA solutions
        for tma_elem in track_elem.findall(_tag("tma", ns)):
            tma_features = self._parse_tma(tma_elem, ns, warnings, track_name)
            features.extend(tma_features)

        return features

    def _parse_fixes(
        self,
        parent: ET.Element,
        ns: str | None,
        warnings: list[ParseWarning],
        track_name: str,
    ) -> list[dict[str, Any]]:
        """Parse <fix> elements from a parent element."""
        fixes: list[dict[str, Any]] = []

        for fix_elem in parent.findall(_tag("fix", ns)):
            dtg = fix_elem.get("Dtg", "")
            timestamp = _parse_dtg(dtg)
            if timestamp is None:
                if dtg != _NULL_DTG:
                    warnings.append(
                        ParseWarning(
                            message=f"Invalid timestamp '{dtg}' in track '{track_name}'",
                            code="INVALID_TIMESTAMP",
                        )
                    )
                continue

            # Parse location from <centre> child
            centre = fix_elem.find(_tag("centre", ns))
            if centre is None:
                warnings.append(
                    ParseWarning(
                        message=f"Fix missing <centre> in track '{track_name}' at {dtg}",
                        code="MISSING_ELEMENT",
                    )
                )
                continue

            location = _parse_location(centre, ns)
            if location is None:
                warnings.append(
                    ParseWarning(
                        message=f"Fix missing location in track '{track_name}' at {dtg}",
                        code="MISSING_ELEMENT",
                    )
                )
                continue

            lat, lon, depth = location

            # Validate coordinates
            if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                warnings.append(
                    ParseWarning(
                        message=f"Invalid coordinates ({lat}, {lon}) in track '{track_name}' at {dtg}",
                        code="INVALID_COORD",
                    )
                )
                continue

            course = float(fix_elem.get("Course", "0"))
            speed = float(fix_elem.get("Speed", "0"))

            fixes.append(
                {
                    "timestamp": timestamp,
                    "lat": lat,
                    "lon": lon,
                    "depth": depth,
                    "course": course,
                    "speed": speed,
                }
            )

        return fixes

    def _parse_sensor(
        self,
        sensor_elem: ET.Element,
        ns: str | None,
        warnings: list[ParseWarning],
        parent_track: str,
    ) -> list[dict[str, Any]]:
        """Parse a <sensor> element into sensor contact features."""
        features: list[dict[str, Any]] = []
        sensor_name = sensor_elem.get("Name", "Unknown")
        track_name = sensor_elem.get("TrackName", parent_track)

        for contact in sensor_elem.findall(_tag("sensor_contact", ns)):
            dtg = contact.get("Dtg", "")
            timestamp = _parse_dtg(dtg)
            if timestamp is None:
                warnings.append(
                    ParseWarning(
                        message=f"Invalid sensor contact timestamp '{dtg}' in sensor '{sensor_name}'",
                        code="INVALID_TIMESTAMP",
                    )
                )
                continue

            bearing_str = contact.get("Bearing", "0")
            try:
                bearing = float(bearing_str)
            except ValueError:
                warnings.append(
                    ParseWarning(
                        message=f"Invalid bearing '{bearing_str}' in sensor '{sensor_name}'",
                        code="INVALID_BEARING",
                    )
                )
                continue

            # Optional ambiguous bearing
            ambiguous_bearing: float | None = None
            if contact.get("HasAmbiguousBearing", "false").lower() == "true":
                with contextlib.suppress(ValueError):
                    ambiguous_bearing = float(contact.get("AmbiguousBearing", "0"))

            # Optional frequency
            frequency: float | None = None
            if contact.get("HasFrequency", "false").lower() == "true":
                with contextlib.suppress(ValueError):
                    frequency = float(contact.get("Frequency", "0"))

            label = contact.get("Label", "")

            props: dict[str, Any] = {
                "kind": "SENSOR_CONTACT",
                "parent_track": track_name,
                "sensor_name": sensor_name,
                "bearing": bearing,
                "time": timestamp.isoformat(),
                "label": label,
            }
            if ambiguous_bearing is not None:
                props["ambiguous_bearing"] = ambiguous_bearing
            if frequency is not None:
                props["frequency"] = frequency

            features.append(
                {
                    "type": "Feature",
                    "id": str(uuid.uuid4()),
                    "geometry": None,
                    "properties": props,
                }
            )

        return features

    def _parse_tma(
        self,
        tma_elem: ET.Element,
        ns: str | None,
        warnings: list[ParseWarning],
        parent_track: str,
    ) -> list[dict[str, Any]]:
        """Parse a <tma> element into TMA solution features."""
        features: list[dict[str, Any]] = []
        tma_name = tma_elem.get("Name", "Unknown")
        track_name = tma_elem.get("TrackName", parent_track)

        for solution in tma_elem.findall(_tag("tma_solution", ns)):
            dtg = solution.get("Dtg", "")
            timestamp = _parse_dtg(dtg)
            if timestamp is None:
                warnings.append(
                    ParseWarning(
                        message=f"Invalid TMA solution timestamp '{dtg}' in '{tma_name}'",
                        code="INVALID_TIMESTAMP",
                    )
                )
                continue

            label = solution.get("Label", "")

            props: dict[str, Any] = {
                "kind": "TMA_SOLUTION",
                "parent_track": track_name,
                "tma_name": tma_name,
                "time": timestamp.isoformat(),
                "label": label,
            }

            # Extract optional attributes
            for attr in ("Course", "Speed", "Bearing", "Depth"):
                val = solution.get(attr)
                if val is not None:
                    with contextlib.suppress(ValueError):
                        props[attr.lower()] = float(val)

            # Parse location if present
            centre = solution.find(_tag("centre", ns))
            if centre is not None:
                location = _parse_location(centre, ns)
                if location is not None:
                    lat, lon, depth = location
                    features.append(
                        {
                            "type": "Feature",
                            "id": str(uuid.uuid4()),
                            "geometry": {
                                "type": "Point",
                                "coordinates": [lon, lat],
                            },
                            "properties": props,
                        }
                    )
                    continue

            # No location — null geometry
            features.append(
                {
                    "type": "Feature",
                    "id": str(uuid.uuid4()),
                    "geometry": None,
                    "properties": props,
                }
            )

        return features

    def _parse_narrative(
        self,
        narrative_elem: ET.Element,
        ns: str | None,
        warnings: list[ParseWarning],
    ) -> list[dict[str, Any]]:
        """Parse a <narrative> element into narrative features."""
        features: list[dict[str, Any]] = []

        for entry in narrative_elem.findall(_tag("narrative_entry", ns)):
            dtg = entry.get("Dtg", "")
            timestamp = _parse_dtg(dtg)
            if timestamp is None:
                warnings.append(
                    ParseWarning(
                        message=f"Invalid narrative timestamp '{dtg}'",
                        code="INVALID_TIMESTAMP",
                    )
                )
                continue

            features.append(
                {
                    "type": "Feature",
                    "id": str(uuid.uuid4()),
                    "geometry": None,
                    "properties": {
                        "kind": "NARRATIVE",
                        "track": entry.get("Track", ""),
                        "entry": entry.get("Entry", ""),
                        "type": entry.get("Type", ""),
                        "time": timestamp.isoformat(),
                    },
                }
            )

        return features
