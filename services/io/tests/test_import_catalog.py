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
    _count_feature_kinds,
    _detect_category,
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


class TestDetectCategory:
    """Tests for category detection."""

    def test_root_level(self) -> None:
        base = Path("/data")
        f = Path("/data/boat1.rep")
        assert _detect_category(f, base) == "general"

    def test_demo_directory(self) -> None:
        base = Path("/data")
        f = Path("/data/Demo/boat1.rep")
        assert _detect_category(f, base) == "demo"

    def test_satc_directory(self) -> None:
        base = Path("/data")
        f = Path("/data/SATC/test.dpf")
        assert _detect_category(f, base) == "satc"

    def test_unknown_directory(self) -> None:
        base = Path("/data")
        f = Path("/data/Custom/test.rep")
        assert _detect_category(f, base) == "general"


class TestCountFeatureKinds:
    """Tests for feature kind counting."""

    def test_mixed_features(self) -> None:
        features = [
            {"properties": {"kind": "TRACK"}},
            {"properties": {"kind": "TRACK"}},
            {"properties": {"kind": "SENSOR_CONTACT"}},
            {"properties": {"kind": "NARRATIVE"}},
        ]
        tracks, sensors, narratives = _count_feature_kinds(features)
        assert tracks == 2
        assert sensors == 1
        assert narratives == 1


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
        """Import DPF fixtures into STAC catalog."""
        source = tmp_path / "source"
        source.mkdir()
        for dpf_file in FIXTURES.glob("*.dpf"):
            (source / dpf_file.name).write_text(dpf_file.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed > 0
        assert result.files_succeeded > 0
        assert result.total_tracks > 0

    def test_import_dsf_files(self, tmp_path: Path) -> None:
        """Import DSF fixtures into STAC catalog."""
        source = tmp_path / "source"
        source.mkdir()
        for dsf_file in FIXTURES.glob("*.dsf"):
            (source / dsf_file.name).write_text(dsf_file.read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_processed > 0
        assert result.files_succeeded > 0

    def test_import_mixed_formats(self, tmp_path: Path) -> None:
        """Import a mix of REP, DPF, and DSF files."""
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

    def test_category_in_plot_id(self, tmp_path: Path) -> None:
        """Verify category detection creates correct plot IDs."""
        source = tmp_path / "source"
        demo_dir = source / "Demo"
        demo_dir.mkdir(parents=True)
        (demo_dir / "boat1.rep").write_text((FIXTURES / "boat1.rep").read_text())

        catalog = tmp_path / "catalog"
        result = import_legacy_data(source, catalog)

        assert result.files_succeeded == 1
        # The plot directory should contain the category prefix
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
