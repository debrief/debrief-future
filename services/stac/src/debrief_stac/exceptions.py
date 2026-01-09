"""
Domain-specific exceptions for debrief-stac.

All exceptions inherit from DebriefStacError for easy catching
of any debrief-stac related error.
"""


class DebriefStacError(Exception):
    """Base exception for all debrief-stac errors."""

    pass


class CatalogExistsError(DebriefStacError):
    """Raised when attempting to create a catalog that already exists."""

    def __init__(self, path: str):
        self.path = path
        super().__init__(f"Catalog already exists at: {path}")


class CatalogNotFoundError(DebriefStacError):
    """Raised when a catalog cannot be found at the specified path."""

    def __init__(self, path: str):
        self.path = path
        super().__init__(f"Catalog not found at: {path}")


class PlotNotFoundError(DebriefStacError):
    """Raised when a plot cannot be found in the catalog."""

    def __init__(self, plot_id: str, catalog_path: str | None = None):
        self.plot_id = plot_id
        self.catalog_path = catalog_path
        msg = f"Plot not found: {plot_id}"
        if catalog_path:
            msg += f" in catalog: {catalog_path}"
        super().__init__(msg)


class PlotExistsError(DebriefStacError):
    """Raised when attempting to create a plot with an ID that already exists."""

    def __init__(self, plot_id: str):
        self.plot_id = plot_id
        super().__init__(f"Plot already exists with ID: {plot_id}")


class ValidationError(DebriefStacError):
    """Raised when data validation fails."""

    def __init__(self, message: str, details: dict | None = None):
        self.details = details or {}
        super().__init__(message)


class PermissionError(DebriefStacError):
    """Raised when file system permission is denied."""

    def __init__(self, path: str, operation: str = "access"):
        self.path = path
        self.operation = operation
        super().__init__(f"Permission denied to {operation}: {path}")


class AssetNotFoundError(DebriefStacError):
    """Raised when an asset cannot be found."""

    def __init__(self, asset_key: str, plot_id: str):
        self.asset_key = asset_key
        self.plot_id = plot_id
        super().__init__(f"Asset '{asset_key}' not found in plot: {plot_id}")
