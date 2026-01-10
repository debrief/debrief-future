# API Contract: debrief-config

**Feature**: 003-debrief-config | **Date**: 2026-01-10

This document defines the public API for both Python and TypeScript implementations.

---

## Store Management

### register_store / registerStore

Register a new STAC store location.

**Python**:
```python
def register_store(path: str | Path, display_name: str, notes: str | None = None) -> StoreRegistration:
    """
    Register a STAC store location.

    Args:
        path: Absolute path to STAC catalog root
        display_name: Human-readable name for the store
        notes: Optional user notes

    Returns:
        The created StoreRegistration

    Raises:
        InvalidCatalogError: If path does not point to a valid STAC catalog
        ValueError: If path is not absolute or display_name is empty
    """
```

**TypeScript**:
```typescript
function registerStore(
  path: string,
  displayName: string,
  notes?: string
): Promise<StoreRegistration>;
```

**Behavior**:
1. Validate `path` is absolute
2. Validate `path` contains valid STAC catalog (`catalog.json` exists and is valid)
3. Acquire lock
4. Read current config
5. Add store to list (replace if path already exists)
6. Write config atomically
7. Release lock
8. Return created registration

---

### list_stores / listStores

List all registered STAC stores.

**Python**:
```python
def list_stores() -> list[StoreRegistration]:
    """
    List all registered STAC stores.

    Returns:
        List of StoreRegistration objects, sorted by last_accessed (newest first)

    Note:
        Updates last_accessed timestamp for each store checked.
    """
```

**TypeScript**:
```typescript
function listStores(): Promise<StoreRegistration[]>;
```

**Behavior**:
1. Acquire lock
2. Read current config
3. For each store, update `last_accessed` if catalog still exists
4. Sort by `last_accessed` descending (most recent first)
5. Write config atomically (to persist `last_accessed` updates)
6. Release lock
7. Return stores list

---

### remove_store / removeStore

Remove a store registration (does not delete catalog files).

**Python**:
```python
def remove_store(path: str | Path) -> None:
    """
    Remove a store registration.

    Args:
        path: Path of the store to remove

    Raises:
        StoreNotFoundError: If no store is registered at the given path

    Note:
        Only removes registration; catalog files are unchanged.
    """
```

**TypeScript**:
```typescript
function removeStore(path: string): Promise<void>;
```

**Behavior**:
1. Acquire lock
2. Read current config
3. Find store by path
4. If not found, raise `StoreNotFoundError`
5. Remove store from list
6. Write config atomically
7. Release lock

---

## Preferences

### get_preference / getPreference

Get a user preference value.

**Python**:
```python
def get_preference(key: str, default: str | None = None) -> str | None:
    """
    Get a user preference value.

    Args:
        key: Preference key
        default: Default value if key not found

    Returns:
        Preference value or default
    """
```

**TypeScript**:
```typescript
function getPreference(key: string, defaultValue?: string): Promise<string | undefined>;
```

---

### set_preference / setPreference

Set a user preference value.

**Python**:
```python
def set_preference(key: str, value: str) -> None:
    """
    Set a user preference value.

    Args:
        key: Preference key
        value: Preference value (will be coerced to string)
    """
```

**TypeScript**:
```typescript
function setPreference(key: string, value: string): Promise<void>;
```

---

### delete_preference / deletePreference

Delete a user preference.

**Python**:
```python
def delete_preference(key: str) -> None:
    """
    Delete a user preference.

    Args:
        key: Preference key to delete

    Note:
        No error if key doesn't exist.
    """
```

**TypeScript**:
```typescript
function deletePreference(key: string): Promise<void>;
```

---

## Path Utilities

### get_config_dir / getConfigDir

Get platform-appropriate config directory.

**Python**:
```python
def get_config_dir() -> Path:
    """
    Get the config directory for the current platform.

    Returns:
        Path to config directory (created if doesn't exist)
    """
```

**TypeScript**:
```typescript
function getConfigDir(): string;
```

---

### get_config_path / getConfigPath

Get full path to config file.

**Python**:
```python
def get_config_path() -> Path:
    """
    Get the full path to the config file.

    Returns:
        Path to config.json
    """
```

**TypeScript**:
```typescript
function getConfigPath(): string;
```

---

## Exceptions

### Python Exceptions

```python
class ConfigError(Exception):
    """Base exception for config errors."""
    pass

class InvalidCatalogError(ConfigError):
    """Raised when path does not point to a valid STAC catalog."""
    def __init__(self, path: str, reason: str):
        self.path = path
        self.reason = reason
        super().__init__(f"Invalid catalog at {path}: {reason}")

class StoreNotFoundError(ConfigError):
    """Raised when store is not registered."""
    def __init__(self, path: str):
        self.path = path
        super().__init__(f"No store registered at {path}")

class ConfigCorruptedError(ConfigError):
    """Raised when config file is corrupted (with recovery info)."""
    def __init__(self, backup_path: str | None = None):
        self.backup_path = backup_path
        msg = "Config file was corrupted"
        if backup_path:
            msg += f" (backup saved to {backup_path})"
        super().__init__(msg)
```

### TypeScript Errors

```typescript
class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

class InvalidCatalogError extends ConfigError {
  constructor(public path: string, public reason: string) {
    super(`Invalid catalog at ${path}: ${reason}`);
    this.name = 'InvalidCatalogError';
  }
}

class StoreNotFoundError extends ConfigError {
  constructor(public path: string) {
    super(`No store registered at ${path}`);
    this.name = 'StoreNotFoundError';
  }
}
```

---

## API Parity Matrix

| Python | TypeScript | Notes |
|--------|------------|-------|
| `register_store(path, name, notes)` | `registerStore(path, name, notes)` | Async in TS |
| `list_stores()` | `listStores()` | Async in TS |
| `remove_store(path)` | `removeStore(path)` | Async in TS |
| `get_preference(key, default)` | `getPreference(key, default)` | Async in TS |
| `set_preference(key, value)` | `setPreference(key, value)` | Async in TS |
| `delete_preference(key)` | `deletePreference(key)` | Async in TS |
| `get_config_dir()` | `getConfigDir()` | Sync in both |
| `get_config_path()` | `getConfigPath()` | Sync in both |
| `InvalidCatalogError` | `InvalidCatalogError` | - |
| `StoreNotFoundError` | `StoreNotFoundError` | - |
| `ConfigCorruptedError` | Not needed (auto-recovery) | - |

**Naming Convention**:
- Python: `snake_case`
- TypeScript: `camelCase`
- Both follow their respective language conventions while maintaining semantic parity.
