"""
Tool specification decorator for linking implementations to specs.

The @tool_spec decorator validates that a specification file exists and
stores the spec path for introspection.
"""

from __future__ import annotations

import functools
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

F = TypeVar("F", bound=Callable[..., object])


class ToolSpecError(Exception):
    """Raised when tool specification validation fails."""


def _find_repo_root() -> Path:
    """Find the repository root by looking for shared/tools directory.

    Walks up from current file to find the repo root.

    Returns:
        Path to repository root

    Raises:
        ToolSpecError: If repository root cannot be found
    """
    # Start from the decorator module location and walk up
    current = Path(__file__).resolve().parent

    # Walk up at most 10 levels to find repo root
    for _ in range(10):
        if (current / "shared" / "tools").is_dir():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent

    # Fall back to CWD if running from repo root
    cwd = Path.cwd()
    if (cwd / "shared" / "tools").is_dir():
        return cwd

    raise ToolSpecError(
        "Cannot find repository root. Ensure shared/tools directory exists in the project root."
    )


def _resolve_spec_path(spec_path: str) -> Path:
    """Resolve a spec path to an absolute file path.

    Args:
        spec_path: Relative path like "track/styling/set-track-color.1.0"

    Returns:
        Absolute path to the specification file

    Raises:
        ToolSpecError: If the spec path is invalid
    """
    if not spec_path:
        raise ToolSpecError("spec_path cannot be empty")

    # Normalize the path (remove any leading/trailing slashes)
    spec_path = spec_path.strip("/")

    # Add .md extension if not present
    if not spec_path.endswith(".md"):
        spec_path = f"{spec_path}.md"

    repo_root = _find_repo_root()
    full_path = repo_root / "shared" / "tools" / spec_path

    return full_path


def tool_spec(spec_path: str, *, validate: bool = True) -> Callable[[F], F]:
    """Decorator to link a function to its tool specification.

    This decorator:
    1. Validates that the specification file exists (if validate=True)
    2. Attaches the spec path to the function as __tool_spec__ attribute
    3. Preserves the function's metadata using functools.wraps

    Args:
        spec_path: Relative path to spec from shared/tools/
            Example: "track/styling/set-track-color.1.0"
        validate: Whether to validate spec existence at decoration time.
            Defaults to True. Set to False for testing or deferred validation.

    Returns:
        Decorator function

    Raises:
        ToolSpecError: If validate=True and the spec file doesn't exist

    Example:
        >>> @tool_spec("track/styling/set-track-color.1.0")
        ... def set_track_color(features, color):
        ...     # Implementation
        ...     pass
        ...
        >>> set_track_color.__tool_spec__
        'track/styling/set-track-color.1.0'
    """

    def decorator(func: F) -> F:
        # Validate spec exists if requested
        if validate:
            full_path = _resolve_spec_path(spec_path)
            if not full_path.exists():
                raise ToolSpecError(
                    f"Tool specification not found: {spec_path}\nExpected at: {full_path}"
                )

        @functools.wraps(func)
        def wrapper(*args: object, **kwargs: object) -> object:
            return func(*args, **kwargs)

        # Attach spec path for introspection
        # Store without .md extension for cleaner API
        clean_path = spec_path.strip("/")
        if clean_path.endswith(".md"):
            clean_path = clean_path[:-3]
        wrapper.__tool_spec__ = clean_path  # type: ignore[attr-defined]

        return wrapper  # type: ignore[return-value]

    return decorator
