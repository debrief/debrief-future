"""Base class for file format handlers.

All file format handlers must inherit from BaseHandler and implement
the required abstract methods. This ensures consistent behavior across
all handlers and enables the registry pattern.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from debrief_io.models import ParseResult


class BaseHandler(ABC):
    """Abstract base class for file format handlers.

    Subclasses must implement all abstract properties and methods
    to be registered with the handler registry.

    Example:
        class MyHandler(BaseHandler):
            @property
            def name(self) -> str:
                return "My Format"

            @property
            def description(self) -> str:
                return "Handler for my custom format"

            @property
            def version(self) -> str:
                return "1.0.0"

            @property
            def extensions(self) -> list[str]:
                return [".myformat"]

            def parse(self, content: str, source_file: str) -> ParseResult:
                # Parse content and return features
                ...
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Handler display name.

        Returns:
            Human-readable name for this handler.
        """

    @property
    @abstractmethod
    def description(self) -> str:
        """Handler description.

        Returns:
            Brief description of what this handler does.
        """

    @property
    @abstractmethod
    def version(self) -> str:
        """Handler version string.

        Returns:
            Semantic version string (e.g., "1.0.0").
        """

    @property
    @abstractmethod
    def extensions(self) -> list[str]:
        """Supported file extensions.

        Returns:
            List of file extensions this handler supports,
            including the dot (e.g., [".rep", ".REP"]).
        """

    @abstractmethod
    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse file content into features.

        Args:
            content: File content as string (already decoded)
            source_file: Original file path (for provenance)

        Returns:
            ParseResult containing features and any warnings

        Raises:
            ParseError: On fatal parse error that prevents completion
        """
