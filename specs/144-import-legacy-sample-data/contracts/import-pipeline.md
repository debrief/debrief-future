# Import Pipeline API Contract

**Feature**: 144-import-legacy-sample-data
**Date**: 2026-03-20

## Module: `debrief_io.handlers.dpf`

### DPFHandler

Extends `BaseHandler`. Registered for `.dpf` extension.

```python
class DPFHandler(BaseHandler):
    name: str = "Debrief DPF Format"
    description: str = "Handler for Debrief Plot File (XML) format"
    version: str = "1.0.0"
    extensions: list[str] = [".dpf"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse DPF XML content into GeoJSON features.

        Extracts:
        - Tracks as LineString features (from <track>/<fix> elements)
        - Sensor contacts as features with null geometry (from <sensor_contact>)
        - Narratives as features with null geometry (from <narrative_entry>)
        - Shapes as Point/LineString/Polygon features (from layer shapes)

        Returns ParseResult with features and warnings.
        Follows warn-and-continue: invalid elements logged, not fatal.
        """
```

## Module: `debrief_io.handlers.dsf`

### DSFHandler

Extends `BaseHandler`. Registered for `.dsf` extension.

```python
class DSFHandler(BaseHandler):
    name: str = "Debrief DSF Format"
    description: str = "Handler for Debrief Sensor File format"
    version: str = "1.0.0"
    extensions: list[str] = [".dsf"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse DSF sensor contact lines into GeoJSON features.

        DSF files contain only ;SENSOR: lines (same format as REP sensor comments).
        Each line produces a GeoJSON feature with Point geometry (if location given)
        or null geometry (if location is NULL).

        Returns ParseResult with sensor contact features and warnings.
        """
```

## Module: `debrief_io.import_catalog`

### import_legacy_data

```python
def import_legacy_data(
    source_dir: Path,
    catalog_path: Path,
    catalog_title: str = "Debrief Legacy Sample Data",
) -> ImportResult:
    """Import all REP/DPF/DSF files from source directory into a STAC catalog.

    Args:
        source_dir: Path to legacy sample_data directory (must exist).
        catalog_path: Path where STAC catalog will be created (must not exist).
        catalog_title: Title for the STAC catalog.

    Returns:
        ImportResult with per-file outcomes and aggregate statistics.

    Raises:
        FileNotFoundError: If source_dir does not exist.
        FileExistsError: If catalog_path already exists.
    """
```

### ImportResult

```python
class ImportResult(BaseModel):
    catalog_path: str
    files_processed: int
    files_succeeded: int
    files_failed: int
    total_tracks: int
    total_sensors: int
    total_narratives: int
    warnings: list[ImportWarning]
    errors: list[ImportFileError]
    duration_seconds: float

class ImportWarning(BaseModel):
    file: str
    code: str
    message: str

class ImportFileError(BaseModel):
    file: str
    error: str
```

### generate_report

```python
def generate_report(result: ImportResult) -> str:
    """Generate a human-readable summary report from import results.

    Returns:
        Formatted text report suitable for terminal output.
    """
```

## CLI Entry Point

```python
# services/io/src/debrief_io/cli/import_cmd.py
def main() -> None:
    """CLI entry point for legacy data import.

    Usage:
        python -m debrief_io.cli.import_cmd SOURCE_DIR CATALOG_PATH [--title TITLE]

    Example:
        python -m debrief_io.cli.import_cmd \
            ~/debrief/org.mwc.cmap.combined.feature/root_installs/sample_data \
            demo/catalog \
            --title "Debrief Legacy Sample Data"
    """
```
