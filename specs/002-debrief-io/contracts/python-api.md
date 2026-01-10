# Python API Contract: debrief-io

**Package**: `debrief_io`
**Version**: 0.1.0
**Date**: 2026-01-10

## Module: `debrief_io`

Main package exports.

### parse

```python
def parse(path: Path | str) -> ParseResult:
    """Parse a file and return validated GeoJSON features.

    Automatically selects the appropriate handler based on file extension.

    Args:
        path: Path to the file to parse

    Returns:
        ParseResult containing features, warnings, and metadata

    Raises:
        FileNotFoundError: If file does not exist
        UnsupportedFormatError: If no handler registered for extension
        ParseError: If file cannot be parsed (fatal error)

    Example:
        >>> result = parse("/path/to/track.rep")
        >>> print(f"Parsed {len(result.features)} features")
        >>> for warning in result.warnings:
        ...     print(f"Warning: {warning.message}")
    """
```

### parse_rep

```python
def parse_rep(path: Path | str) -> ParseResult:
    """Parse a REP file directly (bypasses handler registry).

    Convenience function for parsing REP files without registry lookup.

    Args:
        path: Path to the REP file

    Returns:
        ParseResult containing features and warnings

    Raises:
        FileNotFoundError: If file does not exist
        ParseError: If file cannot be parsed
    """
```

## Module: `debrief_io.registry`

Handler registration and discovery.

### register_handler

```python
def register_handler(extension: str, handler_class: type[BaseHandler]) -> None:
    """Register a handler for a file extension.

    Args:
        extension: File extension including dot (e.g., ".rep")
        handler_class: Handler class (not instance)

    Raises:
        ValueError: If extension format is invalid

    Example:
        >>> from debrief_io.handlers.rep import REPHandler
        >>> register_handler(".rep", REPHandler)
    """
```

### get_handler

```python
def get_handler(path: Path | str) -> BaseHandler | None:
    """Get handler instance for a file based on extension.

    Args:
        path: File path to get handler for

    Returns:
        Handler instance if registered, None otherwise
    """
```

### list_handlers

```python
def list_handlers() -> list[HandlerInfo]:
    """List all registered handlers.

    Returns:
        List of HandlerInfo objects with handler metadata

    Example:
        >>> handlers = list_handlers()
        >>> for h in handlers:
        ...     print(f"{h.extension}: {h.name}")
        .rep: Debrief REP Format
    """
```

### unregister_handler

```python
def unregister_handler(extension: str) -> bool:
    """Remove a registered handler.

    Args:
        extension: Extension to unregister

    Returns:
        True if handler was removed, False if not found
    """
```

## Module: `debrief_io.handlers.base`

Base class for file handlers.

### BaseHandler

```python
class BaseHandler(ABC):
    """Abstract base class for file format handlers.

    Subclasses must implement:
        - name: Handler display name
        - description: Handler description
        - version: Handler version string
        - extensions: Supported file extensions
        - parse(): Parse file content
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Handler display name."""

    @property
    @abstractmethod
    def description(self) -> str:
        """Handler description."""

    @property
    @abstractmethod
    def version(self) -> str:
        """Handler version string."""

    @property
    @abstractmethod
    def extensions(self) -> list[str]:
        """Supported file extensions (with dots)."""

    @abstractmethod
    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse file content into features.

        Args:
            content: File content as string
            source_file: Original file path (for provenance)

        Returns:
            ParseResult with features and warnings

        Raises:
            ParseError: On fatal parse error
        """
```

## Module: `debrief_io.handlers.rep`

REP format handler.

### REPHandler

```python
class REPHandler(BaseHandler):
    """Handler for Debrief REP (Replay) format files.

    Parses:
        - Track positions with timestamps
        - Reference locations
        - Track metadata (type, color)

    Does not parse (yet):
        - Sensor contacts (planned for P2)
        - Narrative text
    """

    name = "Debrief REP Format"
    description = "Legacy Debrief replay file format"
    version = "1.0.0"
    extensions = [".rep"]
```

## Module: `debrief_io.models`

Pydantic models for parse results.

### ParseResult

```python
class ParseResult(BaseModel):
    """Result of a successful parse operation."""

    features: list[TrackFeature | ReferenceLocation]
    """Parsed and validated GeoJSON features."""

    warnings: list[ParseWarning] = Field(default_factory=list)
    """Non-fatal issues encountered during parsing."""

    source_file: str
    """Absolute path to source file."""

    encoding: str = "utf-8"
    """Detected file encoding."""

    parse_time_ms: float
    """Parse duration in milliseconds."""

    handler: str
    """Name of handler that processed the file."""
```

### ParseWarning

```python
class ParseWarning(BaseModel):
    """Non-fatal issue encountered during parsing."""

    message: str
    """Human-readable warning description."""

    line_number: int | None = None
    """Source file line number if applicable."""

    field: str | None = None
    """Field name if validation warning."""

    code: str
    """Warning code (e.g., UNKNOWN_RECORD, INVALID_COORD)."""
```

### HandlerInfo

```python
class HandlerInfo(BaseModel):
    """Metadata about a registered handler."""

    extension: str
    """File extension (lowercase, with dot)."""

    name: str
    """Handler display name."""

    description: str
    """Handler description."""

    version: str
    """Handler version."""
```

## Module: `debrief_io.exceptions`

Domain exceptions.

### ParseError

```python
class ParseError(Exception):
    """Fatal error during file parsing.

    Attributes:
        message: Error description
        line_number: Line where error occurred (optional)
        field: Field that caused error (optional)
    """

    def __init__(
        self,
        message: str,
        line_number: int | None = None,
        field: str | None = None,
    ):
        super().__init__(message)
        self.line_number = line_number
        self.field = field
```

### UnsupportedFormatError

```python
class UnsupportedFormatError(Exception):
    """File format not recognized.

    Attributes:
        extension: Unrecognized file extension
        supported: List of supported extensions
    """

    def __init__(self, extension: str, supported: list[str]):
        self.extension = extension
        self.supported = supported
        super().__init__(
            f"Unsupported file format: {extension}. "
            f"Supported: {', '.join(supported)}"
        )
```

### ValidationError

```python
class ValidationError(ParseError):
    """Feature failed schema validation.

    Wraps Pydantic ValidationError with parse context.
    """

    def __init__(
        self,
        message: str,
        line_number: int | None = None,
        pydantic_error: PydanticValidationError | None = None,
    ):
        super().__init__(message, line_number)
        self.pydantic_error = pydantic_error
```

## Module: `debrief_io.mcp_server`

MCP tool exposure (optional dependency).

### Tools

#### parse_file

```python
@mcp.tool()
def parse_file(path: str) -> dict[str, Any]:
    """Parse a file and return GeoJSON features.

    Args:
        path: Absolute path to file

    Returns:
        Dict with keys:
            - features: List of GeoJSON feature dicts
            - warnings: List of warning dicts
            - source_file: Source path
            - encoding: Detected encoding
            - handler: Handler name

    Raises:
        Returns error dict on failure
    """
```

#### list_handlers

```python
@mcp.tool()
def list_handlers() -> dict[str, Any]:
    """List available file format handlers.

    Returns:
        Dict with key "handlers" containing list of handler info dicts
    """
```

## Usage Examples

### Basic Parsing

```python
from debrief_io import parse

# Parse a REP file
result = parse("/path/to/track.rep")

# Access features
for feature in result.features:
    if feature.properties.track_type == "OWNSHIP":
        print(f"Own ship: {feature.properties.platform_id}")

# Check warnings
if result.warnings:
    print(f"Warnings: {len(result.warnings)}")
    for w in result.warnings:
        print(f"  Line {w.line_number}: {w.message}")
```

### Custom Handler Registration

```python
from debrief_io.registry import register_handler
from debrief_io.handlers.base import BaseHandler
from debrief_io.models import ParseResult

class CustomHandler(BaseHandler):
    name = "Custom Format"
    description = "My custom format handler"
    version = "1.0.0"
    extensions = [".custom"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        # Implementation...
        pass

# Register the handler
register_handler(".custom", CustomHandler)
```

### Integration with debrief-stac

```python
from debrief_io import parse
from debrief_stac import create_catalog, create_plot, add_features

# Parse source file
result = parse("/path/to/track.rep")

# Create catalog and plot
catalog_path = create_catalog("/path/to/catalog")
plot_id = create_plot(catalog_path, PlotMetadata(title="Parsed Track"))

# Add parsed features
add_features(catalog_path, plot_id, result.features)
```
