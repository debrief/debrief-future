# Quickstart: Cross-Service End-to-End Workflow Tests

## Prerequisites

- Python 3.11+
- uv package manager
- Repository cloned with all workspace members installed (`task install`)

## Run the E2E Tests

```bash
# Run all e2e tests
uv run pytest tests/e2e/ -v

# Run a specific test module
uv run pytest tests/e2e/test_full_workflow.py -v

# Run with coverage
uv run pytest tests/e2e/ -v --cov

# Run as part of full test suite (includes unit tests)
task test
```

## Test Structure

```
tests/e2e/
├── conftest.py              # Shared fixtures
├── test_full_workflow.py     # Parse -> Store -> Analyze -> Persist
├── test_multi_file.py       # Multi-file ingestion
└── test_error_propagation.py # Error handling across boundaries
```

## Key Fixtures (from conftest.py)

| Fixture | Scope | Description |
|---------|-------|-------------|
| `catalog_path` | function | Fresh STAC catalog in tmp_path |
| `boat1_path` | session | Path to boat1.rep test fixture |
| `boat2_path` | session | Path to boat2.rep test fixture |
| `parsed_boat1` | function | ParseResult from parsing boat1.rep |
| `plot_with_tracks` | function | Catalog with boat1 features already loaded |

## Writing a New E2E Test

```python
def test_my_workflow(catalog_path, boat1_path):
    """Example: parse a file and store in catalog."""
    from debrief_io import parse
    from debrief_stac.catalog import create_catalog
    from debrief_stac.plot import create_plot, read_plot
    from debrief_stac.features import add_features
    from debrief_stac.models import PlotMetadata

    # 1. Parse source file
    result = parse(boat1_path)
    assert len(result.features) > 0

    # 2. Create catalog and plot
    create_catalog(catalog_path)
    plot_id = create_plot(catalog_path, PlotMetadata(title="Test"))

    # 3. Store features
    count = add_features(catalog_path, plot_id, result.features)
    assert count == len(result.features)

    # 4. Verify persistence
    item = read_plot(catalog_path, plot_id)
    assert item["properties"]["datetime"] is not None
```

## Debugging

```bash
# Run with full traceback
uv run pytest tests/e2e/ -v --tb=long

# Run a single test by name
uv run pytest tests/e2e/ -v -k "test_full_parse_store_analyze"

# Show print output
uv run pytest tests/e2e/ -v -s
```
