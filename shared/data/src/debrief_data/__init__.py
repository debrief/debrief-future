"""Shared reference data and loaders for Debrief v4.x."""

from debrief_data.enum_bundle import (
    BundleMeta,
    CatalogScanResult,
    EnumBundle,
    build_bundle,
    extract_class_tree,
    scan_catalog,
    serialize,
)
from debrief_data.registry import PlatformRegistry, RegistryError, ResolvedPlatform, load_registry

__all__ = [
    "BundleMeta",
    "CatalogScanResult",
    "EnumBundle",
    "PlatformRegistry",
    "RegistryError",
    "ResolvedPlatform",
    "build_bundle",
    "extract_class_tree",
    "load_registry",
    "scan_catalog",
    "serialize",
]
