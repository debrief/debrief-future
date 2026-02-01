"""
Result type classification for debrief-calc tool responses.

Provides the four top-level result types and hierarchical type path matching.
"""

from enum import Enum


class ResultTopType(str, Enum):
    """Four permitted top-level result types."""
    MUTATION = "mutation"
    ADDITION = "addition"
    DELETION = "deletion"
    ARTIFACT = "artifact"


class ResultTypePath:
    """Hierarchical result type path (e.g., 'mutation/track/smoothed').

    The first segment must be a valid ResultTopType. Paths are slash-delimited
    with no empty segments, leading, or trailing slashes.
    """

    def __init__(self, path: str) -> None:
        if not path or not isinstance(path, str):
            raise ValueError("path must be a non-empty string")
        path = path.strip()
        if path.startswith("/") or path.endswith("/"):
            raise ValueError("path must not have leading or trailing slashes")
        self._segments = path.split("/")
        if any(s == "" for s in self._segments):
            raise ValueError("path must not contain empty segments")
        try:
            self._top_level = ResultTopType(self._segments[0])
        except ValueError as err:
            valid = ", ".join(t.value for t in ResultTopType)
            raise ValueError(
                f"first segment must be a valid ResultTopType ({valid}), got: '{self._segments[0]}'"
            ) from err
        self._path = path

    @property
    def path(self) -> str:
        return self._path

    @property
    def top_level(self) -> ResultTopType:
        return self._top_level

    @property
    def segments(self) -> list[str]:
        return list(self._segments)

    def matches(self, prefix: str) -> bool:
        """Check if this type path starts with the given prefix.

        Matching is segment-based: 'mutation' matches 'mutation/track/smoothed'
        but 'mut' does not.
        """
        if not prefix:
            return False
        prefix_segments = prefix.split("/")
        if len(prefix_segments) > len(self._segments):
            return False
        return self._segments[:len(prefix_segments)] == prefix_segments

    def __str__(self) -> str:
        return self._path

    def __repr__(self) -> str:
        return f"ResultTypePath('{self._path}')"

    def __eq__(self, other: object) -> bool:
        if isinstance(other, ResultTypePath):
            return self._path == other._path
        return NotImplemented

    def __hash__(self) -> int:
        return hash(self._path)
