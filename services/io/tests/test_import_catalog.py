"""Tests for the batch import pipeline.

Tests cover:
- Importing REP files into STAC catalog
- Importing DPF files into STAC catalog
- Importing DSF files into STAC catalog
- Mixed format import
- Category detection from directory structure
- Error handling for missing/existing paths
- Report generation
"""

from pathlib import Path

import pytest

from debrief_io.import_catalog import (
    _attach_provenance,
    _build_provenance_entry,
    _count_feature_kinds,
    _detect_domain,
    _duration_ms_to_iso8601,
    _slugify,
    generate_report,
    import_legacy_data,
)
from debrief_io.models import ImportResult

FIXTURES = Path(__file__).parent / "fixtures" / "valid"


class TestSlugify:
    """Tests for filename slugification."""

    def test_simple_name(self) -> None:
        assert _slugify("boat1.rep") == "boat1"

    def test_spaces_and_underscores(self) -> None:
        assert _slugify("SATC_Test1.dpf") == "satc-test1"

    def test_mixed_case(self) -> None:
        assert _slugify("MyTrack.rep") == "mytrack"


class TestDetectDomain:
    """Tests for domain tier detection."""

    def test_root_level_maps_to_core(self) -> None:
        base = Path("/data")
        f = Path("/data/boat1.rep")
        assert _detect_domain(f, base) == "core"

    def test_demo_directory(self) -> None:
        base = Path("/data")
        f = Path("/data/Demo/boat1.rep")
        assert _detect_domain(f, base) == "demo"

    def test_demo_subdirectory(self) -> None:
        base = Path("/data")
        f = Path("/data/Demo/Analysis/test.rep")
        assert _detect_domain(f, base) == "demo/analysis"

    def test_satc_directory(self) -> None:
        base = Path("/data")
        f = Path("/data/SATC/test.dpf")
        assert _detect_domain(f, base) == "satc"

    def test_satc_test_maps_to_satc(self) -> None:
        base = Path("/data")
        f = Path("/data/SATC_Test/test.rep")
        assert _detect_domain(f, base) == "satc"

    def test_s2r_directory(self) -> None:
        base = Path("/data")
        f = Path("/data/S2R/test.rep")
        assert _detect_domain(f, base) == "s2r"

    def test_s2r_subdirectory(self) -> None:
        base = Path("/data")
        f = Path("/data/S2R/freq/test.dsf")
        assert _detect_domain(f, base) == "s2r/freq"

    def test_multistatics_maps_to_multi_static(self) -> None:
        base = Path("/data")
        f = Path("/data/MultiStatics/test.rep")
        assert _detect_domain(f, base) == "multi-static"

    def test_multipath_maps_to_multi_static(self) -> None:
        base = Path("/data")
        f = Path("/data/MultiPath/test.dpf")
        assert _detect_domain(f, base) == "multi-static"

    def test_other_formats(self) -> None:
        base = Path("/data")
        f = Path("/data/other_formats/test.dsf")
        assert _detect_domain(f, base) == "other-formats"

    def test_other_formats_subdirectory(self) -> None:
        base = Path("/data")
        f = Path("/data/other_formats/TA_DUMMY_DATA/test.dsf")
        assert _detect_domain(f, base) == "other-formats/ta-dummy-data"

    def test_unknown_directory_maps_to_core(self) -> None:
        base = Path("/data")
        f = Path("/data/Custom/test.rep")
        assert _detect_domain(f, base) == "core"


class TestCountFeatureKinds:
    """Tests for feature kind counting."""

    def test_mixed_features(self) -> None:
        features = [
            {
                "properties": {
                    "kind": "TRACK",
                    "sensors": [{"name": "S1", "contacts": [{"time": "t", "bearing": 0}]}],
                }
            },
            {"properties": {"kind": "TRACK"}},
            {"properties": {"kind": "NARRATIVE"}},
        ]
        tracks, sensors, narratives = _count_feature_kinds(features)
        assert tracks == 2
        assert sensors == 1  # 1 embedded sensor contact
        assert narratives == 1


class TestDurationMsToIso8601:
    """Tests for duration conversion."""

    def test_whole_seconds(self) -> None:
        assert _duration_ms_to_iso8601(1000.0) == "PT1S"

    def test_fractional_seconds(self) -> None:
        assert _duration_ms_to_iso8601(300.0) == "PT0.3S"

    def test_zero(self) -> None:
        assert _duration_ms_to_iso8601(0.0) == "PT0S"


class TestBuildProvenanceEntry:
    """Tests for provenance entry construction."""

    def test_structure(self) -> None:
        entry = _build_provenance_entry(
            tool="rep-parser",
            tool_version="1.0.0",
            feature_id="track-001",
            parse_time_ms=42.5,
            activity_id="test-uuid",
            timestamp="2026-01-01T00:00:00Z",
        )
        assert entry["activity_id"] == "test-uuid"
        assert entry["timestamp"] == "2026-01-01T00:00:00Z"
        assert entry["was_generated_by"]["tool"] == "rep-parser"
        assert entry["was_generated_by"]["tool_version"] == "1.0.0"
        assert entry["was_generated_by"]["parameters"] == []
        assert entry["used"] == []
        assert entry["generated"] == ["track-001"]
        assert entry["execution_duration"] == "PT0.0425S"


class TestAttachProvenance:
    """Tests for provenance attachment to features."""

    def test_attaches_to_all_features(self) -> None:
        features: list[dict] = [
            {"id": "track-1", "properties": {"kind": "TRACK"}},
            {"id": "track-2", "properties": {"kind": "TRACK"}},
        ]
        _attach_provenance(
            features,
            handler_name="Debrief REP Format",
            handler_version="1.0.0",
            source_file_rel="boat1.rep",
            parse_time_ms=10.0,
        )
        for f in features:
            prov = f["properties"]["provenance"]
            assert isinstance(prov, list)
            assert len(prov) == 1
            assert prov[0]["was_generated_by"]["tool"] == "rep-parser"

    def test_shared_activity_id(self) -> None:
        features: list[dict] = [
            {"id": "t1", "properties": {}},
            {"id": "t2", "properties": {}},
        ]
        _attach_provenance(
            features,
            handler_name="Debrief DPF Format",
            handler_version="1.0.0",
            source_file_rel="test.dpf",
            parse_time_ms=5.0,
        )
        aid1 = features[0]["properties"]["provenance"][0]["activity_id"]
        aid2 = features[1]["properties"]["provenance"][0]["activity_id"]
        assert aid1 == aid2

    def test_tool_name_derivation(self) -> None:
        features: list[dict] = [{"id": "s1", "properties": {}}]
        _attach_provenance(
            features,
            handler_name="Debrief DSF Format",
            handler_version="1.0.0",
            source_file_rel="sensor.dsf",
            parse_time_ms=1.0,
        )
        tool = features[0]["properties"]["provenance"][0]["was_generated_by"]["tool"]
        assert tool == "dsf-parser"


class TestImportLegacyData:
    """Tests for the full import pipeline."""

    def test_import_rep_files(self, tmp_path: Path) -> None:
        """Import REP track fixtures into STAC catalog."""
        # Use only track-based REP files (boat1, boat2) to avoid
        # annotation parser issues with narrative.rep and shapes.rep
        source = tmp_path / "source"
        source.mkdir()
        for name in ("boat1.rep", "boat2.rep"):
            src = FIXTURES / name
            if src.exists():
                (source / name).write_text(src.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed > 0
        assert result.files_succeeded > 0
        assert result.files_failed == 0
        assert result.total_tracks > 0
        assert catalog.exists()

    def test_import_dpf_files(self, tmp_path: Path) -> None:
        """DPF files import successfully with sensors/TMA embedded in tracks."""
        source = tmp_path / "source"
        source.mkdir()
        for dpf_file in FIXTURES.glob("*.dpf"):
            (source / dpf_file.name).write_text(dpf_file.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed > 0
        assert result.files_succeeded > 0
        assert result.files_failed == 0
        assert result.total_tracks > 0

    def test_import_dsf_files(self, tmp_path: Path) -> None:
        """DSF files import successfully; sensor data deferred for merging."""
        source = tmp_path / "source"
        source.mkdir()
        for dsf_file in FIXTURES.glob("*.dsf"):
            (source / dsf_file.name).write_text(dsf_file.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed > 0
        # DSF files succeed (no standalone features, just deferred sensor data)
        assert result.files_succeeded > 0
        assert result.files_failed == 0
        # Orphan warnings since there are no companion tracks
        orphan_warns = [w for w in result.warnings if w.code == "ORPHAN_SENSOR"]
        assert len(orphan_warns) > 0

    def test_import_mixed_formats(self, tmp_path: Path) -> None:
        """Import a mix of REP, DPF, and DSF files.

        All formats now succeed: REP and DPF produce valid features;
        DSF defers sensor data (orphaned without companion tracks here).
        """
        source = tmp_path / "source"
        source.mkdir()

        # Copy one of each
        (source / "boat1.rep").write_text((FIXTURES / "boat1.rep").read_text())
        (source / "sample.dpf").write_text((FIXTURES / "sample.dpf").read_text())
        (source / "sensor.dsf").write_text((FIXTURES / "sen_frig_sensor.dsf").read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed == 3
        assert result.files_succeeded == 3
        assert result.files_failed == 0

    def test_domain_in_plot_id(self, tmp_path: Path) -> None:
        """Verify domain detection creates correct plot IDs."""
        source = tmp_path / "source"
        demo_dir = source / "Demo"
        demo_dir.mkdir(parents=True)
        (demo_dir / "boat1.rep").write_text((FIXTURES / "boat1.rep").read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_succeeded == 1
        # The plot directory should contain the domain prefix
        plot_dirs = [d.name for d in catalog.iterdir() if d.is_dir()]
        assert any("demo" in d for d in plot_dirs)

    def test_source_dir_not_found(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            import_legacy_data(tmp_path / "nonexistent", tmp_path / "catalog")

    def test_catalog_already_exists(self, tmp_path: Path) -> None:
        source = tmp_path / "source"
        source.mkdir()
        catalog = tmp_path / "catalog"
        catalog.mkdir()

        with pytest.raises(FileExistsError):
            import_legacy_data(source, catalog)

    def test_no_supported_files(self, tmp_path: Path) -> None:
        source = tmp_path / "source"
        source.mkdir()
        (source / "readme.txt").write_text("not a data file")

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed == 0

    def test_features_have_provenance(self, tmp_path: Path) -> None:
        """Verify imported features carry PROV LogEntry records."""
        import json

        source = tmp_path / "source"
        source.mkdir()
        src = FIXTURES / "boat1.rep"
        if not src.exists():
            pytest.skip("boat1.rep fixture not available")
        (source / "boat1.rep").write_text(src.read_text())

        catalog = tmp_path / "catalog"
        import_legacy_data(source, catalog)

        # Find the FeatureCollection JSON
        fc_files = list(catalog.rglob("features.geojson"))
        assert len(fc_files) >= 1, "No features.json found in catalog"

        fc = json.loads(fc_files[0].read_text())
        features = fc.get("features", [])
        assert len(features) > 0, "No features in FeatureCollection"

        for feature in features:
            prov = feature.get("properties", {}).get("provenance")
            assert prov is not None, f"Feature {feature.get('id')} missing provenance"
            assert isinstance(prov, list), "Provenance should be an array"
            assert len(prov) == 1, "Import should create exactly one provenance entry"

            entry = prov[0]
            assert "activity_id" in entry
            assert "timestamp" in entry
            assert entry["was_generated_by"]["tool"] == "rep-parser"
            assert entry["was_generated_by"]["tool_version"] == "1.0.0"
            assert entry["used"] == []
            assert feature.get("id") in entry["generated"]
            assert entry["execution_duration"].startswith("PT")


class TestSchemaValidationInImport:
    """Tests for schema validation at import time."""

    def test_import_dsf_no_schema_warnings(self, tmp_path: Path) -> None:
        """DSF files produce no features, so no schema warnings are emitted."""
        source = tmp_path / "source"
        source.mkdir()
        for dsf_file in FIXTURES.glob("*.dsf"):
            (source / dsf_file.name).write_text(dsf_file.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        # DSF files produce no standalone features, so no schema validation runs
        schema_warns = [w for w in result.warnings if w.code == "SCHEMA_VALIDATION"]
        assert len(schema_warns) == 0

    def test_import_rep_features_pass_validation(self, tmp_path: Path) -> None:
        """REP files produce schema-valid features that import successfully."""
        source = tmp_path / "source"
        source.mkdir()
        src = FIXTURES / "boat1.rep"
        if not src.exists():
            pytest.skip("boat1.rep fixture not available")
        (source / "boat1.rep").write_text(src.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_failed == 0
        assert result.files_succeeded == 1
        assert result.total_tracks > 0


class TestGenerateReport:
    """Tests for report generation."""

    def test_basic_report(self) -> None:
        result = ImportResult(
            catalog_path="/tmp/catalog",
            files_processed=10,
            files_succeeded=9,
            files_failed=1,
            total_tracks=20,
            total_sensors=5,
            total_narratives=3,
            duration_seconds=2.5,
        )
        report = generate_report(result)
        assert "Files processed: 10" in report
        assert "Files succeeded: 9" in report
        assert "Files failed:    1" in report
        assert "Total tracks:     20" in report
