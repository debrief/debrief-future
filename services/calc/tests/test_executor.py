"""Unit tests for debrief-calc executor."""

import copy
from collections.abc import Iterator

import pytest
from debrief_calc.executor import _capture_input_state, run
from debrief_calc.models import ContextType, SelectionContext


@pytest.fixture(autouse=True)
def setup_registry() -> Iterator[None]:
    """Ensure registry has test tools."""
    # Import built-in tools to register them
    yield


@pytest.fixture
def single_track_context() -> SelectionContext:
    """Create a single track selection context."""
    feature = {
        "type": "Feature",
        "id": "track-001",
        "properties": {"kind": "TRACK", "name": "Test Track"},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-4.5, 50.2, 0, 1705305600000],
                [-4.4, 50.3, 0, 1705309200000],
                [-4.3, 50.4, 0, 1705312800000],
            ],
        },
    }
    return SelectionContext(type=ContextType.SINGLE, features=[feature])


@pytest.fixture
def multi_track_context() -> SelectionContext:
    """Create a multi track selection context."""
    feature1 = {
        "type": "Feature",
        "id": "track-alpha",
        "properties": {
            "kind": "TRACK",
            "name": "Alpha",
            "times": [1705305600000, 1705309200000],
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[-5.0, 50.0, 0, 1705305600000], [-4.5, 50.2, 0, 1705309200000]],
        },
    }
    feature2 = {
        "type": "Feature",
        "id": "track-bravo",
        "properties": {
            "kind": "TRACK",
            "name": "Bravo",
            "times": [1705305600000, 1705309200000],
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[-4.0, 50.5, 0, 1705305600000], [-4.5, 50.3, 0, 1705309200000]],
        },
    }
    return SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])


@pytest.fixture
def region_context() -> SelectionContext:
    """Create a region selection context."""
    return SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.5, -3.0, 51.0])


class TestRunSuccess:
    """Tests for successful tool execution."""

    def test_run_track_stats(self, single_track_context: SelectionContext) -> None:
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.tool == "track-stats"
        assert result.error is None
        assert result.duration_ms > 0
        assert result.features is not None
        assert len(result.features) == 1

        feature = result.features[0]
        assert feature["properties"]["kind"] == "track/statistics"
        assert "provenance" in feature["properties"]
        assert "statistics" in feature["properties"]

    def test_run_range_bearing(self, multi_track_context: SelectionContext) -> None:
        result = run("range-bearing", multi_track_context)

        assert result.success is True
        assert result.tool == "range-bearing"
        assert result.features is not None
        assert len(result.features) == 1  # single GeoJSON Feature wrapper

        feature = result.features[0]
        assert feature["type"] == "Feature"
        assert feature["properties"]["kind"] == "dataset/range_bearing_series"
        assert "__datasets" in feature["properties"]
        datasets = feature["properties"]["__datasets"]
        assert len(datasets) == 2
        for dataset in datasets:
            assert dataset["type"] == "range_bearing_series"
            assert len(dataset["series"][0]["data"]) == 2

    def test_run_area_summary(self) -> None:
        # area-summary now uses MULTI context type, extracts bounds from features (#107)
        features = [
            {
                "type": "Feature",
                "id": "zone-1",
                "properties": {"kind": "RECTANGLE"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [[-5.0, 49.5], [-3.0, 49.5], [-3.0, 51.0], [-5.0, 51.0], [-5.0, 49.5]]
                    ],
                },
            }
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        result = run("area-summary", context)

        assert result.success is True
        assert result.tool == "area-summary"
        assert result.features is not None
        assert len(result.features) == 1

        feature = result.features[0]
        assert feature["properties"]["kind"] == "region/statistics"
        assert "provenance" in feature["properties"]
        assert "statistics" in feature["properties"]

    def test_run_with_parameters(self, multi_track_context: SelectionContext) -> None:
        result = run("range-bearing", multi_track_context, params={})

        assert result.success is True
        assert result.features is not None
        assert len(result.features) == 1  # single wrapper with time-series

    def test_provenance_attached(self, single_track_context: SelectionContext) -> None:
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.features is not None
        provenance = result.features[0]["properties"]["provenance"]

        # Provenance is now an array of PROV-aligned entries
        assert isinstance(provenance, list)
        assert len(provenance) == 1

        entry = provenance[0]
        assert "activityId" in entry
        assert "timestamp" in entry
        assert "executionDuration" in entry

        wgb = entry["wasGeneratedBy"]
        assert wgb["tool"] == "track-stats"
        assert wgb["toolVersion"] == "1.0.0"
        assert entry["used"] == ["track-001"]


class TestRunErrors:
    """Tests for error handling in tool execution."""

    def test_tool_not_found(self, single_track_context: SelectionContext) -> None:
        result = run("nonexistent-tool", single_track_context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "TOOL_NOT_FOUND"
        assert "nonexistent-tool" in result.error.message

    def test_invalid_context_type(self, multi_track_context: SelectionContext) -> None:
        # track-stats requires SINGLE, we're giving MULTI
        result = run("track-stats", multi_track_context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "INVALID_CONTEXT"
        assert "single" in result.error.message.lower()
        assert "multi" in result.error.message.lower()

    def test_kind_mismatch(self) -> None:
        # Create context with zone kind, but try track-stats which wants track
        feature = {
            "type": "Feature",
            "id": "zone-001",
            "properties": {"kind": "ZONE"},
            "geometry": None,
        }
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])

        result = run("track-stats", context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "KIND_MISMATCH"


class TestRunDuration:
    """Tests for execution duration tracking."""

    def test_duration_is_positive(self, single_track_context: SelectionContext) -> None:
        result = run("track-stats", single_track_context)
        assert result.duration_ms > 0

    def test_duration_on_error(self, single_track_context: SelectionContext) -> None:
        result = run("nonexistent-tool", single_track_context)
        assert result.duration_ms > 0  # Duration tracked even on error


class TestCaptureInputState:
    """Tests for _capture_input_state helper (T012-T014)."""

    def test_captures_geometry_and_properties(self) -> None:
        """T012: Captures geometry and non-provenance properties."""
        features = [
            {
                "id": "circle-001",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[0.0, 50.0], [0.01, 50.01], [0.0, 50.0]]],
                },
                "properties": {
                    "kind": "CIRCLE",
                    "center": [0.0, 50.0],
                    "radius": 1000,
                    "label": "Test",
                },
            }
        ]

        states = _capture_input_state(features)

        assert len(states) == 1
        assert states[0].feature_id == "circle-001"
        assert states[0].geometry["type"] == "Polygon"
        assert states[0].geometry["coordinates"] == [[[0.0, 50.0], [0.01, 50.01], [0.0, 50.0]]]
        assert states[0].properties is not None
        assert states[0].properties["center"] == [0.0, 50.0]
        assert states[0].properties["kind"] == "CIRCLE"

    def test_excludes_provenance(self) -> None:
        """T013: Excludes provenance from captured properties."""
        features = [
            {
                "id": "f1",
                "geometry": {"type": "Point", "coordinates": [0.0, 50.0]},
                "properties": {
                    "kind": "TEXT",
                    "provenance": [{"activityId": "abc", "tool": "old-tool"}],
                },
            }
        ]

        states = _capture_input_state(features)

        assert len(states) == 1
        assert states[0].properties is not None
        assert "provenance" not in states[0].properties
        assert states[0].properties["kind"] == "TEXT"

    def test_handles_missing_id(self) -> None:
        """T014: Uses 'unknown' when feature has no id."""
        features = [
            {
                "geometry": {"type": "Point", "coordinates": [1.0, 2.0]},
                "properties": {"kind": "TEXT"},
            }
        ]

        states = _capture_input_state(features)

        assert len(states) == 1
        assert states[0].feature_id == "unknown"

    def test_deep_copies_geometry(self) -> None:
        """Verify geometry is deep-copied so mutations don't affect the snapshot."""
        features = [
            {
                "id": "f1",
                "geometry": {"type": "Point", "coordinates": [0.0, 50.0]},
                "properties": {"kind": "TEXT"},
            }
        ]

        states = _capture_input_state(features)

        # Mutate the original
        features[0]["geometry"]["coordinates"] = [99.0, 99.0]

        # Snapshot should be unchanged
        assert states[0].geometry["coordinates"] == [0.0, 50.0]

    def test_empty_properties_returns_none(self) -> None:
        """Properties is None when feature has no non-provenance properties."""
        features = [
            {
                "id": "f1",
                "geometry": {"type": "Point", "coordinates": [0.0, 50.0]},
                "properties": {"provenance": [{"activityId": "abc"}]},
            }
        ]

        states = _capture_input_state(features)

        assert states[0].properties is None


class TestExecutorInputState:
    """Tests for executor attaching inputState to provenance (T015-T017)."""

    def test_mutation_tool_gets_input_state(self) -> None:
        """T015: Executor attaches inputState for mutation tool (move-shape)."""
        feature = copy.deepcopy(
            {
                "type": "Feature",
                "id": "circle-001",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [0.008993, 50.0],
                            [0.006363, 50.006363],
                            [0.0, 50.008993],
                            [-0.006363, 50.006363],
                            [-0.008993, 50.0],
                            [-0.006363, 49.993637],
                            [0.0, 49.991007],
                            [0.006363, 49.993637],
                            [0.008993, 50.0],
                        ]
                    ],
                },
                "properties": {
                    "kind": "CIRCLE",
                    "center": [0.0, 50.0],
                    "radius": 1000,
                    "label": "Test",
                },
            }
        )
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        result = run("move-shape", context, params={"direction": 90, "distance_km": 5})

        assert result.success is True
        assert result.features is not None

        prov = result.features[0]["properties"]["provenance"]
        assert isinstance(prov, list)
        assert len(prov) == 1

        entry = prov[0]
        assert "inputState" in entry
        assert entry["inputState"] is not None
        assert len(entry["inputState"]) == 1
        assert entry["inputState"][0]["featureId"] == "circle-001"
        assert entry["inputState"][0]["geometry"]["type"] == "Polygon"

    def test_non_mutation_tool_gets_null_input_state(
        self, single_track_context: SelectionContext
    ) -> None:
        """T016: Non-mutation tool has inputState=null."""
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.features is not None

        prov = result.features[0]["properties"]["provenance"]
        entry = prov[0]
        assert entry["inputState"] is None

    def test_capture_happens_before_handler(self) -> None:
        """T017: InputState captures pre-mutation geometry (not post-mutation)."""
        original_center = [0.0, 50.0]
        feature = copy.deepcopy(
            {
                "type": "Feature",
                "id": "circle-001",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [0.008993, 50.0],
                            [0.006363, 50.006363],
                            [0.0, 50.008993],
                            [-0.006363, 50.006363],
                            [-0.008993, 50.0],
                            [-0.006363, 49.993637],
                            [0.0, 49.991007],
                            [0.006363, 49.993637],
                            [0.008993, 50.0],
                        ]
                    ],
                },
                "properties": {
                    "kind": "CIRCLE",
                    "center": original_center[:],
                    "radius": 1000,
                },
            }
        )
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        result = run("move-shape", context, params={"direction": 90, "distance_km": 5})

        assert result.success is True
        assert result.features is not None

        entry = result.features[0]["properties"]["provenance"][0]
        input_state = entry["inputState"][0]

        # inputState center should be the ORIGINAL (pre-move), not the moved position
        assert input_state["properties"]["center"] == original_center

        # The output feature's center should be DIFFERENT (moved East)
        output_center = result.features[0]["properties"]["center"]
        assert output_center[0] > original_center[0]


class TestMutationConvention:
    """Tests for general mutation tool convention (T025-T026)."""

    def test_set_track_color_gets_input_state(self) -> None:
        """T025: set-track-color (mutation tool) gets inputState captured automatically."""
        feature = {
            "type": "Feature",
            "id": "track-001",
            "properties": {"kind": "TRACK", "name": "Test Track"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-4.5, 50.2, 0, 1705305600000],
                    [-4.4, 50.3, 0, 1705309200000],
                ],
            },
        }
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        result = run("set-track-color", context, params={"color": "RED"})

        assert result.success is True
        assert result.features is not None

        entry = result.features[0]["properties"]["provenance"][0]
        assert entry["inputState"] is not None
        assert len(entry["inputState"]) == 1
        assert entry["inputState"][0]["featureId"] == "track-001"
        assert entry["inputState"][0]["geometry"]["type"] == "LineString"

    def test_track_stats_gets_null_input_state(
        self, single_track_context: SelectionContext
    ) -> None:
        """T026: track-stats (non-mutation tool) gets inputState=null."""
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.features is not None

        entry = result.features[0]["properties"]["provenance"][0]
        assert entry["inputState"] is None


class TestChainedMutations:
    """Tests for chained mutation operations (T028)."""

    def test_second_input_state_reflects_post_first_move(self) -> None:
        """T028: Chained moves — second inputState reflects post-first-move geometry."""
        # Start with a text feature at [0, 50]
        feature = {
            "type": "Feature",
            "id": "text-001",
            "geometry": {"type": "Point", "coordinates": [0.0, 50.0]},
            "properties": {"kind": "TEXT", "text": "Waypoint"},
        }
        original_coords = [0.0, 50.0]

        # First move: East 5km
        context1 = SelectionContext(type=ContextType.SINGLE, features=[copy.deepcopy(feature)])
        result1 = run("move-shape", context1, params={"direction": 90, "distance_km": 5})

        assert result1.success is True
        assert result1.features is not None
        moved_feature = result1.features[0]

        # Verify first move's inputState has original coords
        entry1 = moved_feature["properties"]["provenance"][0]
        assert entry1["inputState"][0]["geometry"]["coordinates"] == original_coords

        # Record the intermediate position (after first move)
        intermediate_coords = moved_feature["geometry"]["coordinates"][:]

        # Second move: North 3km (applied to the already-moved feature)
        context2 = SelectionContext(
            type=ContextType.SINGLE, features=[copy.deepcopy(moved_feature)]
        )
        result2 = run("move-shape", context2, params={"direction": 0, "distance_km": 3})

        assert result2.success is True
        assert result2.features is not None
        final_feature = result2.features[0]

        # The second operation's provenance is appended after the first
        prov = final_feature["properties"]["provenance"]
        assert len(prov) == 2

        # Second entry's inputState should be the INTERMEDIATE position
        entry2 = prov[1]
        second_input_coords = entry2["inputState"][0]["geometry"]["coordinates"]
        assert second_input_coords[0] == pytest.approx(intermediate_coords[0], abs=0.001)
        assert second_input_coords[1] == pytest.approx(intermediate_coords[1], abs=0.001)
