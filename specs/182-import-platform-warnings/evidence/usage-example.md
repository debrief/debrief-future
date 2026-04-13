# Usage Example: Import Handler Warnings for Unregistered Platforms

## Basic Usage

```python
from pathlib import Path
from debrief_io.import_catalog import import_legacy_data, generate_report

# Import legacy files into a new STAC catalog
result = import_legacy_data(
    source_dir=Path("sample_data"),
    catalog_path=Path("local-store"),
)

# Check for unregistered platform warnings
unreg_warnings = [w for w in result.warnings if w.code == "UNREGISTERED_PLATFORM"]
if unreg_warnings:
    print(f"\n{len(unreg_warnings)} unregistered platform(s) found:")
    for w in unreg_warnings:
        print(f"  [{w.file}] {w.message}")
else:
    print("All platforms are registered.")

# Import always succeeds — tracks are present regardless
print(f"\nImported {result.total_tracks} tracks from {result.files_succeeded} files")
```

## Example Output

### Mixed registered and unregistered platforms

```
2 unregistered platform(s) found:
  [exercise1.rep] Platform 'PHANTOM' is not registered in the platform registry
  [exercise1.rep] Platform 'CONTACT_BRAVO' is not registered in the platform registry

Imported 5 tracks from 1 files
```

### All platforms registered (no warnings)

```
All platforms are registered.

Imported 3 tracks from 2 files
```

### Registry unavailable (graceful fallback)

```python
# If the platform registry file is missing or corrupt,
# the import still succeeds with an advisory warning:
reg_warnings = [w for w in result.warnings if w.code == "REGISTRY_UNAVAILABLE"]
if reg_warnings:
    print(f"Registry warning: {reg_warnings[0].message}")
    # "Platform registry could not be loaded: ... Platform validation skipped."
```

## Programmatic Filtering

```python
# Warning codes for filtering:
#   "UNREGISTERED_PLATFORM" — specific platform not in registry
#   "REGISTRY_UNAVAILABLE"  — registry could not be loaded

# Get just the unregistered platform IDs
import re
unregistered_ids = []
for w in result.warnings:
    if w.code == "UNREGISTERED_PLATFORM":
        match = re.search(r"Platform '(.+?)' is not", w.message)
        if match:
            unregistered_ids.append(match.group(1))

print(f"Unregistered: {unregistered_ids}")
# ['PHANTOM', 'CONTACT_BRAVO']
```
