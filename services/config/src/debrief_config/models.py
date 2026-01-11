"""Pydantic models for debrief-config."""

from datetime import datetime

from pydantic import BaseModel, Field


class StoreRegistration(BaseModel):
    """A registered STAC catalog location."""

    path: str = Field(..., min_length=1, description="Absolute path to catalog")
    name: str = Field(..., min_length=1, description="Display name")
    last_accessed: datetime = Field(
        ..., alias="lastAccessed", description="When store was last accessed"
    )
    notes: str | None = Field(default=None, description="Optional user notes")

    model_config = {"populate_by_name": True}


# Type alias for preference values
PreferenceValue = str | int | float | bool | None


class Config(BaseModel):
    """Root configuration object."""

    version: str = Field(
        default="1.0.0",
        pattern=r"^\d+\.\d+\.\d+$",
        description="Schema version (semver)",
    )
    stores: list[StoreRegistration] = Field(
        default_factory=list, description="Registered STAC stores"
    )
    preferences: dict[str, PreferenceValue] = Field(
        default_factory=dict, description="User preferences"
    )

    @classmethod
    def default(cls) -> "Config":
        """Create a default config with empty stores and preferences."""
        return cls(version="1.0.0", stores=[], preferences={})
