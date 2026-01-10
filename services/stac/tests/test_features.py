"""
Tests for feature operations (User Story 4).

Following TDD: Write tests first, ensure they fail, then implement.
"""

import json
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot
from debrief_stac.types import ASSET_ROLE_DATA, MEDIA_TYPE_GEOJSON
from tests.fixtures import (
    make_sample_feature_collection,
    make_sample_reference_location,
    make_sample_track_feature,
)


class TestAddFeatures:
    """Tests for add_features() function - User Story 4."""

    def test_add_features_creates_feature_collection_asset(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T031: Given an empty plot and valid GeoJSON features,
        When add_features() is called, Then FeatureCollection asset is created.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        features = [make_sample_track_feature()]
        add_features(catalog_path, plot_id, features)

        # Verify asset created in item
        item = read_plot(catalog_path, plot_id)
        assert "features" in item["assets"]
        assert item["assets"]["features"]["type"] == MEDIA_TYPE_GEOJSON
        assert ASSET_ROLE_DATA in item["assets"]["features"]["roles"]

        # Verify FeatureCollection file exists
        features_path = Path(item["assets"]["features"]["href"])
        full_path = catalog_path / plot_id / features_path
        assert full_path.exists()

        with open(full_path) as f:
            fc = json.load(f)

        assert fc["type"] == "FeatureCollection"
        assert len(fc["features"]) == 1

    def test_add_features_appends_to_existing(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T032: Given a plot with existing features,
        When add_features() is called, Then features are appended.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Add first feature
        features1 = [make_sample_track_feature(feature_id="track-001")]
        add_features(catalog_path, plot_id, features1)

        # Add second feature
        features2 = [make_sample_reference_location(feature_id="ref-001")]
        add_features(catalog_path, plot_id, features2)

        # Verify both features present
        item = read_plot(catalog_path, plot_id)
        features_path = catalog_path / plot_id / item["assets"]["features"]["href"]

        with open(features_path) as f:
            fc = json.load(f)

        assert len(fc["features"]) == 2
        feature_ids = [f["id"] for f in fc["features"]]
        assert "track-001" in feature_ids
        assert "ref-001" in feature_ids

    def test_add_features_updates_bbox(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T033: Given features with geometry,
        When added to plot, Then plot's bbox is updated.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Add track feature with known coordinates
        # Track: [-5.2, 50.0] to [-5.0, 50.2]
        features = [make_sample_track_feature()]
        add_features(catalog_path, plot_id, features)

        item = read_plot(catalog_path, plot_id)

        # Verify bbox set
        assert item["bbox"] is not None
        bbox = item["bbox"]
        # bbox = [minLon, minLat, maxLon, maxLat]
        assert bbox[0] == pytest.approx(-5.2, rel=0.01)  # minLon
        assert bbox[1] == pytest.approx(50.0, rel=0.01)  # minLat
        assert bbox[2] == pytest.approx(-5.0, rel=0.01)  # maxLon
        assert bbox[3] == pytest.approx(50.2, rel=0.01)  # maxLat

    def test_add_features_extends_bbox(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """When more features are added, bbox expands to encompass all."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Add track
        features1 = [make_sample_track_feature()]
        add_features(catalog_path, plot_id, features1)

        # Add reference point outside track bbox
        features2 = [make_sample_reference_location(feature_id="ref-outside", lon=-6.0, lat=51.0)]
        add_features(catalog_path, plot_id, features2)

        item = read_plot(catalog_path, plot_id)
        bbox = item["bbox"]

        # bbox should now include the reference point
        assert bbox[0] == pytest.approx(-6.0, rel=0.01)  # minLon now -6.0
        assert bbox[3] == pytest.approx(51.0, rel=0.01)  # maxLat now 51.0

    def test_add_features_validates_input(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T034: add_features validates features are proper GeoJSON."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Invalid feature (missing type)
        invalid_features = [{"id": "bad", "geometry": None}]

        with pytest.raises((ValueError, KeyError)):
            add_features(catalog_path, plot_id, invalid_features)

    def test_add_features_from_feature_collection(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """add_features can accept a FeatureCollection dict."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        fc = make_sample_feature_collection()
        # Pass the features from the collection
        add_features(catalog_path, plot_id, fc["features"])

        item = read_plot(catalog_path, plot_id)
        features_path = catalog_path / plot_id / item["assets"]["features"]["href"]

        with open(features_path) as f:
            stored_fc = json.load(f)

        assert len(stored_fc["features"]) == 2
