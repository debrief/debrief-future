# Python API Contract: debrief-config

**Package**: `debrief_config`
**Version**: 0.1.0

This document defines the public API for the Python debrief-config library.

---

## Module: `debrief_config`

### Functions

#### `get_config_dir() -> Path`

Get the platform-specific configuration directory.

**Returns**: Path to config directory (creates if `ensure_exists=True`)

**Platform Paths**:
- Linux: `~/.config/debrief` or `$XDG_CONFIG_HOME/debrief`
- macOS: `~/Library/Application Support/debrief`
- Windows: `%APPDATA%\debrief`

---

#### `register_store(path: Path | str, name: str, notes: str | None = None) -> StoreRegistration`

Register a STAC catalog location.

**Parameters**:
- `path`: Absolute path to STAC catalog directory
- `name`: Human-readable display name
- `notes`: Optional notes about the store

**Returns**: The created StoreRegistration

**Raises**:
- `InvalidCatalogError`: If path is not a valid STAC catalog
- `StoreExistsError`: If path is already registered
- `ValueError`: If path or name is empty

**Example**:
```python
from debrief_config import register_store

store = register_store(
    path="/data/exercise-2024",
    name="Exercise 2024",
    notes="Main analysis catalog"
)
```

---

#### `list_stores() -> list[StoreRegistration]`

List all registered STAC stores.

**Returns**: List of StoreRegistration objects (empty list if none registered)

**Example**:
```python
from debrief_config import list_stores

for store in list_stores():
    print(f"{store.name}: {store.path}")
```

---

#### `remove_store(path: Path | str) -> None`

Remove a store registration (does not delete the catalog).

**Parameters**:
- `path`: Path of the store to remove

**Raises**:
- `StoreNotFoundError`: If path is not registered

**Example**:
```python
from debrief_config import remove_store

remove_store("/data/old-catalog")
```

---

#### `get_preference(key: str, default: T = None) -> T | PreferenceValue`

Get a user preference value.

**Parameters**:
- `key`: Preference key
- `default`: Value to return if key not found

**Returns**: Preference value or default

**Example**:
```python
from debrief_config import get_preference

theme = get_preference("theme", default="system")
```

---

#### `set_preference(key: str, value: PreferenceValue) -> None`

Set a user preference value.

**Parameters**:
- `key`: Preference key
- `value`: Value to store (string, number, boolean, or None)

**Example**:
```python
from debrief_config import set_preference

set_preference("theme", "dark")
set_preference("defaultStore", "/data/main-catalog")
```

---

### Classes

#### `StoreRegistration`

Pydantic model representing a registered STAC store.

**Attributes**:
- `path: str` - Absolute path to catalog
- `name: str` - Display name
- `last_accessed: datetime` - When store was last accessed
- `notes: str | None` - Optional notes

---

#### `Config`

Pydantic model representing the full configuration.

**Attributes**:
- `version: str` - Schema version
- `stores: list[StoreRegistration]` - Registered stores
- `preferences: dict[str, PreferenceValue]` - User preferences

---

### Exceptions

#### `InvalidCatalogError`

Raised when a path is not a valid STAC catalog.

```python
class InvalidCatalogError(Exception):
    """Path is not a valid STAC catalog."""
    pass
```

---

#### `StoreNotFoundError`

Raised when attempting to access an unregistered store.

```python
class StoreNotFoundError(Exception):
    """Store is not registered."""
    pass
```

---

#### `StoreExistsError`

Raised when attempting to register a store that already exists.

```python
class StoreExistsError(Exception):
    """Store is already registered."""
    pass
```

---

## Types

```python
PreferenceValue = str | int | float | bool | None
```

---

## Usage Example

```python
from pathlib import Path
from debrief_config import (
    register_store,
    list_stores,
    remove_store,
    get_preference,
    set_preference,
)

# Register a new store
store = register_store(
    path=Path("/data/exercise-2024"),
    name="Exercise 2024"
)
print(f"Registered: {store.name}")

# List all stores
for s in list_stores():
    print(f"  - {s.name}: {s.path}")

# Set default store
set_preference("defaultStore", str(store.path))

# Get default store
default = get_preference("defaultStore")
print(f"Default store: {default}")

# Remove a store (keeps files, just removes registration)
remove_store(store.path)
```
