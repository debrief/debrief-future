"""Tests for the @tool_spec decorator."""

import pytest

from debrief_tools import tool_spec
from debrief_tools.decorators import (
    ToolSpecError,
    _find_repo_root,
    _resolve_spec_path,
)


class TestFindRepoRoot:
    """Tests for _find_repo_root function."""

    def test_finds_repo_root(self):
        """Should find repository root containing shared/tools."""
        root = _find_repo_root()
        assert (root / "shared" / "tools").is_dir()

    def test_returns_path_object(self):
        """Should return a Path object."""
        from pathlib import Path

        root = _find_repo_root()
        assert isinstance(root, Path)


class TestResolveSpecPath:
    """Tests for _resolve_spec_path function."""

    def test_resolves_valid_path(self):
        """Should resolve a valid spec path to full path."""
        path = _resolve_spec_path("track/styling/set-track-color.1.0")
        assert path.name == "set-track-color.1.0.md"
        assert "shared/tools/track/styling" in str(path)

    def test_adds_md_extension(self):
        """Should add .md extension if not present."""
        path = _resolve_spec_path("track/styling/set-track-color.1.0")
        assert path.suffix == ".md"

    def test_preserves_md_extension(self):
        """Should not duplicate .md extension."""
        path = _resolve_spec_path("track/styling/set-track-color.1.0.md")
        assert str(path).count(".md") == 1

    def test_strips_leading_slashes(self):
        """Should handle leading slashes."""
        path = _resolve_spec_path("/track/styling/set-track-color.1.0")
        assert "track/styling" in str(path)

    def test_empty_path_raises_error(self):
        """Should raise error for empty path."""
        with pytest.raises(ToolSpecError, match="cannot be empty"):
            _resolve_spec_path("")


class TestToolSpecDecorator:
    """Tests for @tool_spec decorator."""

    def test_valid_spec_path(self):
        """Should decorate function when spec exists."""

        @tool_spec("track/styling/set-track-color.1.0")
        def my_tool():
            return "result"

        assert my_tool() == "result"

    def test_stores_spec_path(self):
        """Should store spec path in __tool_spec__ attribute."""

        @tool_spec("track/styling/set-track-color.1.0")
        def my_tool():
            pass

        assert my_tool.__tool_spec__ == "track/styling/set-track-color.1.0"

    def test_missing_spec_raises_error(self):
        """Should raise ToolSpecError when spec doesn't exist."""
        with pytest.raises(ToolSpecError, match="not found"):

            @tool_spec("nonexistent/tool.1.0")
            def my_tool():
                pass

    def test_validate_false_skips_check(self):
        """Should skip validation when validate=False."""

        @tool_spec("nonexistent/tool.1.0", validate=False)
        def my_tool():
            return "works"

        assert my_tool() == "works"
        assert my_tool.__tool_spec__ == "nonexistent/tool.1.0"

    def test_preserves_function_name(self):
        """Should preserve function __name__."""

        @tool_spec("track/styling/set-track-color.1.0")
        def set_track_color():
            pass

        assert set_track_color.__name__ == "set_track_color"

    def test_preserves_docstring(self):
        """Should preserve function __doc__."""

        @tool_spec("track/styling/set-track-color.1.0")
        def set_track_color():
            """My docstring."""
            pass

        assert set_track_color.__doc__ == "My docstring."

    def test_passes_arguments(self):
        """Should correctly pass arguments to decorated function."""

        @tool_spec("track/styling/set-track-color.1.0")
        def add(a, b):
            return a + b

        assert add(1, 2) == 3
        assert add(a=5, b=3) == 8

    def test_passes_kwargs(self):
        """Should correctly pass keyword arguments."""

        @tool_spec("track/styling/set-track-color.1.0")
        def greet(name, greeting="Hello"):
            return f"{greeting}, {name}!"

        assert greet("World") == "Hello, World!"
        assert greet("World", greeting="Hi") == "Hi, World!"

    def test_all_initial_tools_have_specs(self):
        """Should validate all four initial tool specs exist."""
        tools = [
            "track/styling/set-track-color.1.0",
            "track/styling/apply-symbol-style.1.0",
            "track/styling/label-interval.1.0",
            "track/styling/symbol-interval.1.0",
        ]
        for tool_path in tools:

            @tool_spec(tool_path)
            def placeholder():
                pass

            assert placeholder.__tool_spec__ == tool_path


class TestToolSpecIntrospection:
    """Tests for spec path introspection."""

    def test_introspection_on_decorated_function(self):
        """Should be able to access spec path via __tool_spec__."""

        @tool_spec("track/styling/set-track-color.1.0")
        def my_tool():
            pass

        # Access via __tool_spec__
        spec_path = my_tool.__tool_spec__
        assert spec_path == "track/styling/set-track-color.1.0"

    def test_introspection_strips_md_extension(self):
        """Should store clean path without .md extension."""

        @tool_spec("track/styling/set-track-color.1.0.md")
        def my_tool():
            pass

        assert my_tool.__tool_spec__ == "track/styling/set-track-color.1.0"


class TestToolSpecErrorMessages:
    """Tests for error message quality."""

    def test_missing_spec_shows_expected_path(self):
        """Error message should show expected file path."""
        with pytest.raises(ToolSpecError) as exc_info:

            @tool_spec("missing/tool.1.0")
            def my_tool():
                pass

        error_message = str(exc_info.value)
        assert "missing/tool.1.0" in error_message
        assert "Expected at:" in error_message
        assert "shared/tools/missing/tool.1.0.md" in error_message
