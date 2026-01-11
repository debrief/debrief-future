"""Custom exceptions for debrief-config."""


class ConfigError(Exception):
    """Base exception for config-related errors."""

    pass


class InvalidCatalogError(ConfigError):
    """Raised when a path is not a valid STAC catalog."""

    def __init__(self, path: str, reason: str) -> None:
        self.path = path
        self.reason = reason
        super().__init__(f"Invalid STAC catalog at {path}: {reason}")


class StoreNotFoundError(ConfigError):
    """Raised when attempting to access an unregistered store."""

    def __init__(self, path: str) -> None:
        self.path = path
        super().__init__(f"Store not found: {path}")


class StoreExistsError(ConfigError):
    """Raised when attempting to register a store that already exists."""

    def __init__(self, path: str) -> None:
        self.path = path
        super().__init__(f"Store already registered: {path}")


class ConfigCorruptError(ConfigError):
    """Raised when config file is corrupted and will be reset."""

    def __init__(self, path: str, reason: str) -> None:
        self.path = path
        self.reason = reason
        super().__init__(f"Config corrupted at {path}: {reason}. Reset to defaults.")
