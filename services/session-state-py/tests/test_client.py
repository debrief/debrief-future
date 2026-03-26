"""
Python client tests.
Feature: 024-document-session-state

Note: These tests require the TypeScript server to be running.
Run: pnpm --filter @debrief/session-state dev
"""

import pytest

from debrief_session import SessionClient, TimeInstant, make_time_instant, make_time_instant_now  # type: ignore[reportMissingImports]

# Mark all tests as requiring the server
pytestmark = pytest.mark.skipif(
    True,  # Skip by default - server needs to be running
    reason="Requires session state server to be running",
)


class TestSessionClient:
    """Test the session client against a running server."""

    @pytest.fixture
    def client(self) -> SessionClient:
        """Create a client instance."""
        return SessionClient("http://localhost:3001/mcp")

    def test_get_state(self, client: SessionClient) -> None:
        """Test getting full state."""
        state = client.get_state()
        assert state.temporal is not None
        assert state.spatial is not None
        assert state.features is not None
        assert state.document is not None

    def test_get_temporal_state(self, client: SessionClient) -> None:
        """Test getting temporal slice."""
        temporal = client.get_temporal_state()
        assert temporal.playbackState in ("stopped", "playing", "paused")
        assert temporal.displayMode in ("normal", "snailTrail")

    def test_set_current_time_epoch(self, client: SessionClient) -> None:
        """Test setting current time with epoch."""
        epoch = 1706097600000
        result = client.set_current_time(epoch=epoch)
        assert result.epoch == epoch

        # Verify state was updated
        state = client.get_temporal_state()
        assert state.currentTime is not None
        assert state.currentTime.epoch == epoch

    def test_set_current_time_iso(self, client: SessionClient) -> None:
        """Test setting current time with ISO string."""
        iso = "2024-01-24T12:00:00.000Z"
        result = client.set_current_time(iso=iso)
        assert result.iso == iso

    def test_set_selection(self, client: SessionClient) -> None:
        """Test setting feature selection."""
        feature_ids = ["track-001", "track-002"]
        selection = client.set_selection(feature_ids)
        assert selection.featureIds == feature_ids
        assert selection.primary == "track-001"

    def test_clear_selection(self, client: SessionClient) -> None:
        """Test clearing feature selection."""
        # First set a selection
        client.set_selection(["track-001"])

        # Then clear it
        selection = client.clear_selection()
        assert selection.featureIds == []

    def test_set_viewport(self, client: SessionClient) -> None:
        """Test setting viewport."""
        coordinates = [[-5.0, 55.0], [5.0, 55.0], [5.0, 50.0], [-5.0, 50.0]]
        result = client.set_viewport(coordinates)
        assert result["success"]
        assert result["viewport"]["coordinates"] == coordinates
        assert result["center"] == [0, 52.5]

    def test_hidden_features(self, client: SessionClient) -> None:
        """Test hidden features management."""
        # Set hidden features
        hidden = client.set_hidden_features(["track-003", "track-004"])
        assert "track-003" in hidden
        assert "track-004" in hidden

        # Clear
        hidden = client.clear_hidden_features()
        assert len(hidden) == 0


class TestTimeInstant:
    """Test TimeInstant type.

    NOTE: Generated TimeInstant has no classmethods; use make_time_instant_now()
    and make_time_instant() helpers instead.
    """

    def test_now(self) -> None:
        """Test creating TimeInstant for current time via helper."""
        now = make_time_instant_now()
        assert now.epoch > 0
        assert now.iso.endswith("Z")

    def test_from_epoch(self) -> None:
        """Test creating TimeInstant from epoch via helper."""
        epoch = 1706097600000
        instant = make_time_instant(epoch)
        assert instant.epoch == epoch
        assert "2024-01-24" in instant.iso
