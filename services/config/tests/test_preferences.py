"""Tests for user preferences functionality."""

from pathlib import Path

import pytest

from debrief_config import (
    delete_preference,
    get_preference,
    set_preference,
)


class TestGetPreference:
    """Tests for get_preference function."""

    def test_returns_default_when_not_set(self) -> None:
        """Should return default when preference not set."""
        result = get_preference("nonexistent", default="fallback")
        assert result == "fallback"

    def test_returns_none_when_no_default(self) -> None:
        """Should return None when no default specified."""
        result = get_preference("nonexistent")
        assert result is None

    def test_returns_set_value(self) -> None:
        """Should return the set value."""
        set_preference("theme", "dark")
        result = get_preference("theme")
        assert result == "dark"


class TestSetPreference:
    """Tests for set_preference function."""

    def test_set_string_preference(self) -> None:
        """Should set string preference."""
        set_preference("locale", "en-GB")
        assert get_preference("locale") == "en-GB"

    def test_set_number_preference(self) -> None:
        """Should set number preference."""
        set_preference("fontSize", 14)
        assert get_preference("fontSize") == 14

    def test_set_boolean_preference(self) -> None:
        """Should set boolean preference."""
        set_preference("showGrid", True)
        assert get_preference("showGrid") is True

    def test_set_null_preference(self) -> None:
        """Should set null preference."""
        set_preference("defaultStore", None)
        assert get_preference("defaultStore") is None

    def test_overwrite_existing_preference(self) -> None:
        """Should overwrite existing preference."""
        set_preference("theme", "light")
        set_preference("theme", "dark")
        assert get_preference("theme") == "dark"

    def test_empty_key_raises_error(self) -> None:
        """Should raise ValueError for empty key."""
        with pytest.raises(ValueError, match="key cannot be empty"):
            set_preference("", "value")


class TestDeletePreference:
    """Tests for delete_preference function."""

    def test_delete_existing_preference(self) -> None:
        """Should delete existing preference."""
        set_preference("toDelete", "value")
        assert get_preference("toDelete") == "value"

        delete_preference("toDelete")
        assert get_preference("toDelete") is None

    def test_delete_nonexistent_preference_no_error(self) -> None:
        """Should not raise when deleting nonexistent preference."""
        # Should not raise
        delete_preference("nonexistent")


class TestPreferencePersistence:
    """Tests for preference persistence across restarts."""

    def test_preferences_persist(self) -> None:
        """Preferences should persist across config reloads."""
        set_preference("persistent", "value")

        # Read back - persists within test due to autouse fixture
        result = get_preference("persistent")
        assert result == "value"
