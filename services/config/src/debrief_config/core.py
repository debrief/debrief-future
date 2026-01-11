"""Core functionality for debrief-config.

Provides the main API for managing STAC store registrations and user preferences.
"""

from datetime import UTC, datetime
from pathlib import Path

from .exceptions import StoreExistsError, StoreNotFoundError
from .models import Config, PreferenceValue, StoreRegistration
from .storage import read_config, update_config
from .validation import validate_stac_catalog


def register_store(
    path: Path | str,
    name: str,
    notes: str | None = None,
    *,
    validate: bool = True,
) -> StoreRegistration:
    """Register a STAC catalog location.

    Args:
        path: Absolute path to STAC catalog directory.
        name: Human-readable display name.
        notes: Optional notes about the store.
        validate: If True, validate the path is a valid STAC catalog.

    Returns:
        The created StoreRegistration.

    Raises:
        InvalidCatalogError: If path is not a valid STAC catalog (when validate=True).
        StoreExistsError: If path is already registered.
        ValueError: If path or name is empty.
    """
    path_str = str(Path(path).resolve())

    if not path_str:
        raise ValueError("path cannot be empty")
    if not name or not name.strip():
        raise ValueError("name cannot be empty")

    # Validate catalog structure
    if validate:
        validate_stac_catalog(path_str)

    def _register(config: Config) -> Config:
        # Check for duplicates
        for store in config.stores:
            if store.path == path_str:
                raise StoreExistsError(path_str)

        # Create new registration
        registration = StoreRegistration(
            path=path_str,
            name=name.strip(),
            last_accessed=datetime.now(UTC),
            notes=notes,
        )

        config.stores.append(registration)
        return config

    updated = update_config(_register)

    # Return the newly added store
    for store in updated.stores:
        if store.path == path_str:
            return store

    # Should not reach here
    raise RuntimeError("Store was not added")


def list_stores() -> list[StoreRegistration]:
    """List all registered STAC stores.

    Returns:
        List of StoreRegistration objects (empty list if none registered).
    """
    config = read_config()
    return list(config.stores)


def get_store(path: Path | str) -> StoreRegistration:
    """Get a specific store by path.

    Args:
        path: Path of the store to retrieve.

    Returns:
        The StoreRegistration if found.

    Raises:
        StoreNotFoundError: If path is not registered.
    """
    path_str = str(Path(path).resolve())
    config = read_config()

    for store in config.stores:
        if store.path == path_str:
            return store

    raise StoreNotFoundError(path_str)


def remove_store(path: Path | str) -> None:
    """Remove a store registration.

    Does not delete the underlying catalog, only removes the registration.

    Args:
        path: Path of the store to remove.

    Raises:
        StoreNotFoundError: If path is not registered.
    """
    path_str = str(Path(path).resolve())

    def _remove(config: Config) -> Config:
        for i, store in enumerate(config.stores):
            if store.path == path_str:
                config.stores.pop(i)
                return config
        raise StoreNotFoundError(path_str)

    update_config(_remove)


def get_preference(key: str, default: PreferenceValue = None) -> PreferenceValue:
    """Get a user preference value.

    Args:
        key: Preference key.
        default: Value to return if key not found.

    Returns:
        Preference value or default.
    """
    config = read_config()
    return config.preferences.get(key, default)


def set_preference(key: str, value: PreferenceValue) -> None:
    """Set a user preference value.

    Args:
        key: Preference key.
        value: Value to store (string, number, boolean, or None).
    """
    if not key or not key.strip():
        raise ValueError("key cannot be empty")

    def _set_pref(config: Config) -> Config:
        config.preferences[key.strip()] = value
        return config

    update_config(_set_pref)


def delete_preference(key: str) -> None:
    """Delete a user preference.

    Args:
        key: Preference key to delete.

    Note:
        Does not raise if key doesn't exist.
    """

    def _del_pref(config: Config) -> Config:
        config.preferences.pop(key, None)
        return config

    update_config(_del_pref)
