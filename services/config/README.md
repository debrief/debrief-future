# debrief-config

Shared configuration service for Debrief v4.x. Manages STAC store registrations and user preferences across Python and TypeScript consumers.

## Installation

```bash
cd services/config
uv sync
```

## Quick Start

```python
from debrief_config import register_store, list_stores, get_preference

# Register a STAC catalog
store = register_store("/data/exercise-2024", "Exercise 2024")

# List all stores
for s in list_stores():
    print(f"{s.name}: {s.path}")

# Get a preference
theme = get_preference("theme", default="system")
```

## API

### Store Management

```python
from debrief_config import register_store, list_stores, remove_store

# Register a STAC catalog (with validation)
store = register_store(
    path="/data/exercise-2024",
    name="Exercise 2024",
    notes="Main analysis catalog",  # optional
    validate=True  # default: validates catalog.json
)

# Access store properties
print(store.path)          # /data/exercise-2024
print(store.name)          # Exercise 2024
print(store.last_accessed) # datetime ISO string

# List all registered stores
stores = list_stores()  # Returns List[StoreRegistration]

# Remove a store (keeps files, only removes registration)
remove_store("/data/exercise-2024")
```

### User Preferences

```python
from debrief_config import get_preference, set_preference, delete_preference

# Get preference with optional default
theme = get_preference("theme", default="system")  # Returns str | int | float | bool | None

# Set preferences (string, number, boolean, or None)
set_preference("theme", "dark")
set_preference("fontSize", 14)
set_preference("showGrid", True)

# Delete preference
delete_preference("theme")
```

### Path Utilities

```python
from debrief_config import get_config_dir, get_config_file

# Get platform-specific config directory
config_dir = get_config_dir()  # Returns Path

# Get config file path
config_file = get_config_file()  # Returns Path to config.json
```

## Features

- Cross-platform config paths (XDG on Linux, Application Support on macOS, AppData on Windows)
- STAC catalog validation on registration
- Atomic file writes with locking for concurrent access
- Full API parity with TypeScript library (`@debrief/config`)

## Config Location

| Platform | Path |
|----------|------|
| Linux | `~/.config/debrief/config.json` |
| macOS | `~/Library/Application Support/debrief/config.json` |
| Windows | `%APPDATA%\debrief\config.json` |

## Development

```bash
# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov=debrief_config
```

## License

See repository root LICENSE file.
