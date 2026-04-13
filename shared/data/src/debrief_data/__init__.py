"""Shared reference data and loaders for Debrief v4.x."""

from debrief_data.registry import PlatformRegistry, RegistryError, ResolvedPlatform, load_registry

__all__ = ["PlatformRegistry", "RegistryError", "ResolvedPlatform", "load_registry"]
