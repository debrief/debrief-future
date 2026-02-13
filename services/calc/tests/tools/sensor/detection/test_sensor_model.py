"""Tests for the sensor model interface and stub implementation."""

import pytest
from debrief_calc.tools.sensor.detection.sensor_model import (
    SensorModel,
    SensorModelZone,
    StubSensorModel,
)

SAMPLE_TRACK = {
    "type": "Feature",
    "id": "track-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-4.5, 50.2, 0, 1705305600000], [-4.4, 50.3, 0, 1705309200000]],
    },
    "properties": {"kind": "TRACK", "name": "HMS Example"},
}


class TestSensorModelZone:
    """Tests for the SensorModelZone dataclass."""

    def test_create_zone(self):
        zone = SensorModelZone(distance_nm=3.0, likelihood_pct=75, name="75%")
        assert zone.distance_nm == 3.0
        assert zone.likelihood_pct == 75
        assert zone.name == "75%"

    def test_zone_is_frozen(self):
        zone = SensorModelZone(distance_nm=3.0, likelihood_pct=75, name="75%")
        with pytest.raises(AttributeError):
            zone.distance_nm = 5.0  # type: ignore[misc]


class TestStubSensorModel:
    """Tests for the stub sensor model implementation."""

    def test_returns_three_zones(self):
        model = StubSensorModel()
        zones = model.get_detection_zones(SAMPLE_TRACK)
        assert len(zones) == 3

    def test_zone_distances(self):
        model = StubSensorModel()
        zones = model.get_detection_zones(SAMPLE_TRACK)
        assert zones[0].distance_nm == 3.0
        assert zones[1].distance_nm == 6.0
        assert zones[2].distance_nm == 12.0

    def test_zone_likelihoods(self):
        model = StubSensorModel()
        zones = model.get_detection_zones(SAMPLE_TRACK)
        assert zones[0].likelihood_pct == 75
        assert zones[1].likelihood_pct == 50
        assert zones[2].likelihood_pct == 25

    def test_zone_names(self):
        model = StubSensorModel()
        zones = model.get_detection_zones(SAMPLE_TRACK)
        assert zones[0].name == "75%"
        assert zones[1].name == "50%"
        assert zones[2].name == "25%"

    def test_ordered_ascending_distance(self):
        model = StubSensorModel()
        zones = model.get_detection_zones(SAMPLE_TRACK)
        distances = [z.distance_nm for z in zones]
        assert distances == sorted(distances)

    def test_satisfies_protocol(self):
        """Verify StubSensorModel satisfies the SensorModel Protocol."""
        model: SensorModel = StubSensorModel()
        zones = model.get_detection_zones(SAMPLE_TRACK)
        assert len(zones) == 3

    def test_ignores_track_content(self):
        """Stub returns same result regardless of track."""
        model = StubSensorModel()
        zones_a = model.get_detection_zones(SAMPLE_TRACK)
        zones_b = model.get_detection_zones({"type": "Feature", "geometry": {}, "properties": {}})
        assert zones_a == zones_b
