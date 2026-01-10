"""Tests for handler registry."""

import pytest

from debrief_io.handlers.base import BaseHandler
from debrief_io.handlers.rep import REPHandler
from debrief_io.models import ParseResult
from debrief_io.registry import (
    clear_registry,
    get_handler,
    get_supported_extensions,
    list_handlers,
    register_handler,
    unregister_handler,
)


@pytest.fixture(autouse=True)
def clean_registry():
    """Clean registry before and after each test."""
    clear_registry()
    # Re-register REP handler for tests that need it
    register_handler(".rep", REPHandler)
    yield
    clear_registry()


class TestRegisterHandler:
    """Tests for register_handler function."""

    def test_register_handler_success(self):
        """Register a handler successfully."""
        clear_registry()
        register_handler(".rep", REPHandler)
        handler = get_handler("test.rep")
        assert handler is not None
        assert isinstance(handler, REPHandler)

    def test_register_handler_lowercase(self):
        """Extension is normalized to lowercase."""
        clear_registry()
        register_handler(".REP", REPHandler)
        handler = get_handler("test.rep")
        assert handler is not None

    def test_register_handler_invalid_extension(self):
        """Raise ValueError for extension without dot."""
        with pytest.raises(ValueError, match="must start with"):
            register_handler("rep", REPHandler)


class TestGetHandler:
    """Tests for get_handler function."""

    def test_get_handler_found(self):
        """Return handler for registered extension."""
        handler = get_handler("test.rep")
        assert handler is not None
        assert isinstance(handler, REPHandler)

    def test_get_handler_not_found(self):
        """Return None for unregistered extension."""
        handler = get_handler("test.unknown")
        assert handler is None

    def test_get_handler_case_insensitive(self):
        """Extension lookup is case-insensitive."""
        handler = get_handler("test.REP")
        assert handler is not None


class TestListHandlers:
    """Tests for list_handlers function."""

    def test_list_handlers_empty(self):
        """Return empty list when no handlers registered."""
        clear_registry()
        handlers = list_handlers()
        assert handlers == []

    def test_list_handlers_with_handler(self):
        """Return handler info for registered handlers."""
        handlers = list_handlers()
        assert len(handlers) >= 1

        rep_handler = next((h for h in handlers if h.extension == ".rep"), None)
        assert rep_handler is not None
        assert rep_handler.name == "Debrief REP Format"
        assert rep_handler.version == "1.0.0"


class TestUnregisterHandler:
    """Tests for unregister_handler function."""

    def test_unregister_handler_success(self):
        """Unregister existing handler."""
        result = unregister_handler(".rep")
        assert result is True
        assert get_handler("test.rep") is None

    def test_unregister_handler_not_found(self):
        """Return False for non-existent handler."""
        result = unregister_handler(".unknown")
        assert result is False


class TestGetSupportedExtensions:
    """Tests for get_supported_extensions function."""

    def test_get_supported_extensions(self):
        """Return list of registered extensions."""
        extensions = get_supported_extensions()
        assert ".rep" in extensions

    def test_get_supported_extensions_empty(self):
        """Return empty list when no handlers registered."""
        clear_registry()
        extensions = get_supported_extensions()
        assert extensions == []


class TestCustomHandler:
    """Tests for registering custom handlers."""

    def test_register_custom_handler(self):
        """Register and use a custom handler."""

        class CustomHandler(BaseHandler):
            @property
            def name(self) -> str:
                return "Custom Format"

            @property
            def description(self) -> str:
                return "Custom test format"

            @property
            def version(self) -> str:
                return "1.0.0"

            @property
            def extensions(self) -> list[str]:
                return [".custom"]

            def parse(self, content: str, source_file: str) -> ParseResult:
                return ParseResult(
                    features=[],
                    warnings=[],
                    source_file=source_file,
                    handler=self.name,
                )

        register_handler(".custom", CustomHandler)
        handler = get_handler("test.custom")
        assert handler is not None
        assert handler.name == "Custom Format"
