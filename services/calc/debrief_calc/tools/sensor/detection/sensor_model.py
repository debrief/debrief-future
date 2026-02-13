"""Sensor model interface and stub implementation for detection zone generation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class SensorModelZone:
    """A single detection zone definition returned by a sensor model.

    Attributes:
        distance_nm: Buffer distance in nautical miles (must be > 0).
        likelihood_pct: Detection likelihood as integer percentage (1-100).
        name: Human-readable zone label (e.g., "75%").
    """

    distance_nm: float
    likelihood_pct: int
    name: str


class SensorModel(Protocol):
    """Protocol for sensor model implementations.

    A sensor model accepts a track feature dict and returns an ordered list
    of detection zone definitions. Implementations may ignore the track
    (like the stub) or use track properties to compute realistic zones.
    """

    def get_detection_zones(self, track: dict[str, Any]) -> list[SensorModelZone]:
        """Return detection zone definitions for the given track.

        Args:
            track: GeoJSON Feature dict with kind=TRACK and LineString geometry.

        Returns:
            List of SensorModelZone ordered by distance ascending (innermost first).
        """
        ...


class StubSensorModel:
    """Stub sensor model returning hardcoded detection zones.

    Returns three zones at 3nm/75%, 6nm/50%, 12nm/25% regardless of input.
    This will be replaced by a real sensor model in future iterations.
    """

    def get_detection_zones(self, track: dict[str, Any]) -> list[SensorModelZone]:
        return [
            SensorModelZone(distance_nm=3.0, likelihood_pct=75, name="75%"),
            SensorModelZone(distance_nm=6.0, likelihood_pct=50, name="50%"),
            SensorModelZone(distance_nm=12.0, likelihood_pct=25, name="25%"),
        ]
