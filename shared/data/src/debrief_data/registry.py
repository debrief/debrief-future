"""Platform registry loader — reads the vessel class tree and resolves platforms."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

_REGISTRY_PATH = Path(__file__).resolve().parent.parent.parent / "platform-registry.json"


@dataclass(frozen=True)
class ResolvedPlatform:
    """Complete metadata for a platform, combining leaf attributes with position-derived fields."""

    id: str
    name: str
    nationality: str
    vessel_class: str
    vessel_type: str
    vessel_role: str
    domain: str
    short_name: str | None = None


class RegistryError(ValueError):
    """Raised when the registry file is structurally invalid."""


class PlatformRegistry:
    """Parsed platform registry with lookup, enumeration, and tree traversal."""

    def __init__(self, platforms: dict[str, ResolvedPlatform], tree: dict[str, Any]) -> None:
        self._platforms = platforms
        self._tree = tree

    def resolve(self, platform_id: str) -> ResolvedPlatform | None:
        """Look up a single platform by ID. Returns None for unknown/empty IDs."""
        if not platform_id or not platform_id.strip():
            return None
        return self._platforms.get(platform_id)

    def list_platforms(self) -> list[ResolvedPlatform]:
        """Return all registered platforms sorted by ID."""
        return sorted(self._platforms.values(), key=lambda p: p.id)

    def find_by_class(self, class_path: str) -> list[ResolvedPlatform]:
        """Find all platforms under a given vessel class path (including descendants)."""
        if not class_path or not class_path.strip():
            return []
        segments = class_path.strip().split("/")
        node = self._tree
        for seg in segments:
            if seg not in node:
                return []
            child = node[seg]
            if not isinstance(child, dict):
                return []
            node = child
        results: list[ResolvedPlatform] = []
        _collect_platforms(node, results, self._platforms)
        return sorted(results, key=lambda p: p.id)

    def is_valid_class(self, class_path: str) -> bool:
        """Check whether a class path corresponds to a real node in the taxonomy tree."""
        if not class_path or not class_path.strip():
            return False
        segments = class_path.strip().split("/")
        node = self._tree
        for seg in segments:
            if seg not in node:
                return False
            child = node[seg]
            if not isinstance(child, dict):
                return False
            node = child
        return True


def _collect_platforms(
    node: dict[str, Any],
    results: list[ResolvedPlatform],
    index: dict[str, ResolvedPlatform],
) -> None:
    """Recursively collect all platforms at or below a tree node."""
    for key, value in node.items():
        if key.startswith("_"):
            continue
        if not isinstance(value, dict):
            continue
        if "name" in value:
            platform = index.get(key)
            if platform is not None:
                results.append(platform)
        else:
            _collect_platforms(value, results, index)


def _is_platform_entry(value: Any) -> bool:
    """A node is a platform if it's a dict with a 'name' field."""
    return isinstance(value, dict) and "name" in value


def _is_leaf_entry(value: Any) -> bool:
    """A node is a leaf if it's a dict where any non-underscore value is not a dict.

    This catches malformed platforms (e.g., missing 'name' but has 'nationality').
    """
    if not isinstance(value, dict):
        return False
    for k, v in value.items():
        if k.startswith("_"):
            continue
        if not isinstance(v, dict):
            return True
    return False


def _walk_tree(
    node: dict[str, Any],
    path_segments: list[str],
    platforms: dict[str, ResolvedPlatform],
    seen_ids: dict[str, str],
) -> None:
    """Walk the vessel class tree, extracting platforms and building the index."""
    for key, value in node.items():
        if key.startswith("_"):
            continue
        if not isinstance(value, dict):
            raise RegistryError(
                f"Invalid registry format: expected object for key '{key}' "
                f"at path '{'/'.join(path_segments)}'"
            )
        if _is_platform_entry(value) or _is_leaf_entry(value):
            # Validate required fields
            if "name" not in value or not value["name"]:
                raise RegistryError(f"Platform '{key}' missing required field 'name'")
            if "nationality" not in value or not value["nationality"]:
                raise RegistryError(f"Platform '{key}' missing required field 'nationality'")

            # Check for duplicate IDs
            current_path = "/".join(path_segments)
            if key in seen_ids:
                raise RegistryError(
                    f"Duplicate platform ID '{key}' found at paths "
                    f"'{seen_ids[key]}' and '{current_path}'"
                )
            seen_ids[key] = current_path

            # Derive positional fields
            class_path = "/".join(path_segments)
            domain = path_segments[0] if len(path_segments) >= 1 else ""
            vessel_type = path_segments[-1] if len(path_segments) >= 1 else ""
            vessel_role = path_segments[-2] if len(path_segments) >= 2 else ""

            platforms[key] = ResolvedPlatform(
                id=key,
                name=value["name"],
                short_name=value.get("short_name"),
                nationality=value["nationality"],
                vessel_class=class_path,
                vessel_type=vessel_type,
                vessel_role=vessel_role,
                domain=domain,
            )
        else:
            _walk_tree(value, [*path_segments, key], platforms, seen_ids)


def load_registry(path: str | Path | None = None) -> PlatformRegistry:
    """Load and validate the platform registry from a JSON file.

    Args:
        path: Path to the registry JSON file. Defaults to the bundled registry.

    Returns:
        A PlatformRegistry instance with all platforms indexed.

    Raises:
        FileNotFoundError: If the registry file does not exist.
        RegistryError: If the file content is invalid.
    """
    registry_path = Path(path) if path is not None else _REGISTRY_PATH

    if not registry_path.exists():
        raise FileNotFoundError(f"Registry file not found: {registry_path}")

    text = registry_path.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RegistryError(f"Invalid registry format: {exc}") from exc

    if not isinstance(data, dict) or "vessel_classes" not in data:
        raise RegistryError("Registry must have 'vessel_classes' root key")

    vessel_classes = data["vessel_classes"]
    if not isinstance(vessel_classes, dict):
        raise RegistryError("Invalid registry format: 'vessel_classes' must be an object")

    platforms: dict[str, ResolvedPlatform] = {}
    seen_ids: dict[str, str] = {}
    _walk_tree(vessel_classes, [], platforms, seen_ids)

    return PlatformRegistry(platforms, vessel_classes)
