"""Debrief Config - Shared configuration service for Debrief v4.x.

This module provides configuration management for STAC store registrations
and user preferences across Python and TypeScript consumers.
"""

__version__ = "0.1.0"

from .core import (
    delete_preference,
    get_preference,
    get_store,
    list_stores,
    register_store,
    remove_store,
    set_preference,
)
from .exceptions import (
    ConfigCorruptError,
    ConfigError,
    InvalidCatalogError,
    StoreExistsError,
    StoreNotFoundError,
)
from .models import Config, PreferenceValue, StoreRegistration
from .paths import get_config_dir, get_config_file

__all__ = [
    # Core functions
    "register_store",
    "list_stores",
    "get_store",
    "remove_store",
    "get_preference",
    "set_preference",
    "delete_preference",
    # Models
    "Config",
    "StoreRegistration",
    "PreferenceValue",
    # Exceptions
    "ConfigError",
    "InvalidCatalogError",
    "StoreNotFoundError",
    "StoreExistsError",
    "ConfigCorruptError",
    # Paths
    "get_config_dir",
    "get_config_file",
]
