"""
Session state MCP client for Python.
Feature: 024-document-session-state
"""

import httpx

from .types import (
    DocumentSlice,
    FeatureSelection,
    FeaturesSlice,
    SessionState,
    SpatialSlice,
    TemporalSlice,
    TimeInstant,
    make_time_instant,
)


class SessionClient:
    """
    Python client for the session state MCP service.

    Example:
        client = SessionClient("http://localhost:3001/mcp")
        state = client.get_state()
        print(f"Current time: {state.temporal.current_time}")

        client.set_current_time(epoch=1706097600000)
    """

    def __init__(self, base_url: str = "http://localhost:3001/mcp") -> None:
        """
        Initialize the client.

        Args:
            base_url: Base URL of the MCP endpoint
        """
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(timeout=30.0)

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self) -> "SessionClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _call_tool(self, tool: str, input_data: dict | None = None) -> dict:
        """Call an MCP tool and return the result."""
        response = self._client.post(
            self.base_url,
            json={"tool": tool, "input": input_data or {}},
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("success", False):
            raise RuntimeError(result.get("error", "Unknown error"))

        return result

    # State getters

    def get_state(self) -> SessionState:
        """Get the full session state."""
        result = self._call_tool("session.getState")
        return SessionState(**result["state"])

    def get_temporal_state(self) -> TemporalSlice:
        """Get the temporal state slice."""
        result = self._call_tool("session.getTemporalState")
        return TemporalSlice(**result["state"])

    def get_spatial_state(self) -> SpatialSlice:
        """Get the spatial state slice."""
        result = self._call_tool("session.getSpatialState")
        return SpatialSlice(**result["state"])

    def get_features_state(self) -> FeaturesSlice:
        """Get the features state slice."""
        result = self._call_tool("session.getFeaturesState")
        return FeaturesSlice(**result["state"])

    def get_document_state(self) -> DocumentSlice:
        """Get the document state slice."""
        result = self._call_tool("session.getDocumentState")
        return DocumentSlice(**result["state"])

    # State setters

    def set_current_time(
        self,
        *,
        epoch: int | None = None,
        iso: str | None = None,
    ) -> TimeInstant:
        """
        Set the current playback/display time.

        Args:
            epoch: Time as milliseconds since Unix epoch
            iso: Time as ISO 8601 UTC string

        Returns:
            The new current time
        """
        if epoch is None and iso is None:
            raise ValueError("Either epoch or iso must be provided")

        input_data = {}
        if epoch is not None:
            input_data["epoch"] = epoch
        if iso is not None:
            input_data["iso"] = iso

        result = self._call_tool("session.setCurrentTime", input_data)
        ct = result["currentTime"]
        return make_time_instant(ct["epoch"])

    def set_viewport(
        self,
        coordinates: list[list[float]],
        rotation: float | None = None,
    ) -> dict:
        """
        Set the map viewport.

        Args:
            coordinates: Four corners [NW, NE, SE, SW] as [lon, lat] pairs
            rotation: Optional rotation in degrees

        Returns:
            Dict with viewport and center
        """
        input_data: dict = {"coordinates": coordinates}
        if rotation is not None:
            input_data["rotation"] = rotation

        return self._call_tool("session.setViewport", input_data)

    def set_selection(
        self,
        feature_ids: list[str],
        primary: str | None = None,
    ) -> FeatureSelection:
        """
        Set the feature selection.

        Args:
            feature_ids: List of feature IDs to select
            primary: Primary selection (defaults to first)

        Returns:
            The new selection
        """
        input_data: dict = {"featureIds": feature_ids}
        if primary is not None:
            input_data["primary"] = primary

        result = self._call_tool("session.setSelection", input_data)
        return FeatureSelection(**result["selection"])

    def clear_selection(self) -> FeatureSelection:
        """Clear the feature selection."""
        result = self._call_tool("session.setSelection", {"clear": True})
        return FeatureSelection(**result["selection"])

    def set_hidden_features(self, feature_ids: list[str]) -> list[str]:
        """
        Set which features are hidden.

        Args:
            feature_ids: List of feature IDs to hide

        Returns:
            The new list of hidden feature IDs
        """
        result = self._call_tool(
            "session.setHiddenFeatures",
            {"featureIds": feature_ids},
        )
        return result["hiddenFeatureIds"]

    def hide_features(self, feature_ids: list[str]) -> list[str]:
        """Add features to the hidden set."""
        result = self._call_tool(
            "session.setHiddenFeatures",
            {"add": feature_ids},
        )
        return result["hiddenFeatureIds"]

    def show_features(self, feature_ids: list[str]) -> list[str]:
        """Remove features from the hidden set."""
        result = self._call_tool(
            "session.setHiddenFeatures",
            {"remove": feature_ids},
        )
        return result["hiddenFeatureIds"]

    def clear_hidden_features(self) -> list[str]:
        """Clear all hidden features."""
        result = self._call_tool(
            "session.setHiddenFeatures",
            {"clear": True},
        )
        return result["hiddenFeatureIds"]
