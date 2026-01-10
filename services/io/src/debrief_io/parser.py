"""Main parser module for debrief-io.

Provides the main entry points for parsing files:
- parse(): Parse any supported file format
- parse_rep(): Direct REP parsing (bypasses registry)
"""

from __future__ import annotations

from pathlib import Path

from debrief_io.exceptions import UnsupportedFormatError
from debrief_io.handlers.rep import REPHandler
from debrief_io.models import ParseResult
from debrief_io.registry import get_handler, get_supported_extensions
from debrief_io.types import FilePath


def _read_file(path: Path) -> tuple[str, str]:
    """Read file with encoding detection.

    Tries UTF-8 first, falls back to Latin-1 (which never fails).

    Args:
        path: Path to file

    Returns:
        Tuple of (content, encoding)
    """
    try:
        return path.read_text(encoding="utf-8"), "utf-8"
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1"), "latin-1"


def parse(path: FilePath) -> ParseResult:
    """Parse a file and return validated GeoJSON features.

    Automatically selects the appropriate handler based on file extension.

    Args:
        path: Path to the file to parse

    Returns:
        ParseResult containing features, warnings, and metadata

    Raises:
        FileNotFoundError: If file does not exist
        UnsupportedFormatError: If no handler registered for extension
        ParseError: If file cannot be parsed (fatal error)

    Example:
        >>> result = parse("/path/to/track.rep")
        >>> print(f"Parsed {len(result.features)} features")
        >>> for warning in result.warnings:
        ...     print(f"Warning: {warning.message}")
    """
    if isinstance(path, str):
        path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    handler = get_handler(path)
    if handler is None:
        supported = get_supported_extensions()
        raise UnsupportedFormatError(path.suffix, supported)

    content, encoding = _read_file(path)
    result = handler.parse(content, str(path.absolute()))
    result.encoding = encoding

    return result


def parse_rep(path: FilePath) -> ParseResult:
    """Parse a REP file directly (bypasses handler registry).

    Convenience function for parsing REP files without registry lookup.

    Args:
        path: Path to the REP file

    Returns:
        ParseResult containing features and warnings

    Raises:
        FileNotFoundError: If file does not exist
        ParseError: If file cannot be parsed
    """
    if isinstance(path, str):
        path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    handler = REPHandler()
    content, encoding = _read_file(path)
    result = handler.parse(content, str(path.absolute()))
    result.encoding = encoding

    return result
