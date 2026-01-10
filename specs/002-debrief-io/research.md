# Research: debrief-io

**Feature**: File Parsing Service
**Date**: 2026-01-10
**Status**: Complete

## Technical Decisions

### TD-001: REP File Format Parser Approach

**Decision**: Custom line-based parser with explicit record type handling

**Rationale**:
- REP is a legacy Debrief-specific format, no external libraries exist
- Line-based format is simple to parse with Python's standard library
- Explicit record type handling makes the code self-documenting
- Easier to provide line-number context in error messages

**Alternatives Considered**:
- Generic CSV parser: Rejected - REP is not CSV, has complex record types
- Grammar-based parser (ANTLR, PLY): Rejected - over-engineering for line-based format
- Regex-only parsing: Rejected - harder to maintain, poor error messages

### TD-002: Handler Registry Pattern

**Decision**: Dictionary-based registry with explicit registration

**Rationale**:
- Simple and predictable behavior
- Easy to test in isolation
- Supports contrib extensions via explicit registration
- No magic discovery overhead

**Implementation**:
```python
_handlers: dict[str, type[Handler]] = {}

def register_handler(extension: str, handler_class: type[Handler]) -> None:
    """Register a handler for a file extension."""
    _handlers[extension.lower()] = handler_class

def get_handler(path: Path) -> Handler | None:
    """Get handler for file extension, or None if unsupported."""
    ext = path.suffix.lower()
    handler_class = _handlers.get(ext)
    return handler_class() if handler_class else None
```

**Alternatives Considered**:
- Plugin discovery (entry_points): Deferred - adds complexity, consider for v2
- Convention-based discovery (scan handlers/): Rejected - magic behavior
- Single monolithic parser: Rejected - violates extensibility requirements

### TD-003: Encoding Detection Strategy

**Decision**: Try UTF-8 first, fall back to Latin-1, report in warnings

**Rationale**:
- Most modern files are UTF-8
- Legacy Debrief files often use Latin-1 (Western European)
- Latin-1 decodes any byte sequence (won't raise errors)
- User informed via warnings, not silent substitution

**Implementation**:
```python
def read_file(path: Path) -> tuple[str, str]:
    """Read file with encoding detection. Returns (content, encoding)."""
    try:
        return path.read_text(encoding="utf-8"), "utf-8"
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1"), "latin-1"
```

**Alternatives Considered**:
- chardet library: Rejected - adds dependency, often incorrect for small files
- Explicit encoding parameter: Rejected - poor UX, users won't know encoding
- BOM detection: Partial adoption - check for UTF-8 BOM, but rare in REP files

### TD-004: Parse Error Handling Strategy

**Decision**: Collect recoverable errors as warnings, raise on fatal errors

**Rationale**:
- A single malformed line shouldn't prevent parsing the rest
- Users get maximum data extraction with clear warnings
- Fatal errors (unreadable file, wrong format) still raise immediately
- Follows "no silent failures" constitution principle

**Implementation**:
```python
@dataclass
class ParseWarning:
    message: str
    line_number: int | None
    field: str | None

@dataclass
class ParseResult:
    features: list[Feature]
    warnings: list[ParseWarning]
    source_file: str

# Fatal errors raise exceptions
class UnsupportedFormatError(Exception): pass
class ParseError(Exception): pass
```

**Alternatives Considered**:
- Strict mode (any error = failure): Rejected - too aggressive for legacy data
- Silent recovery: Rejected - violates constitution I.3
- Separate valid/invalid collections: Rejected - overly complex for typical use

### TD-005: Feature Validation Timing

**Decision**: Validate features immediately after construction using Pydantic

**Rationale**:
- Early validation catches issues at the source
- Pydantic provides rich error messages with field paths
- Validated features can be trusted by downstream code
- Matches Stage 0 schema compliance requirement

**Implementation**:
```python
from debrief_schemas import TrackFeature, ReferenceLocation

def parse_track(lines: list[str]) -> TrackFeature:
    """Parse track lines into validated TrackFeature."""
    # Extract data...
    return TrackFeature(**track_data)  # Pydantic validates
```

**Alternatives Considered**:
- Delayed validation: Rejected - invalid data could propagate
- Optional validation: Rejected - violates constitution II.2
- Custom validation: Rejected - duplicates Pydantic work

### TD-006: MCP Integration Approach

**Decision**: FastMCP with thin wrappers (same as debrief-stac)

**Rationale**:
- Consistency with existing debrief-stac pattern
- FastMCP provides decorator-based tool registration
- Thin wrappers keep domain logic in pure Python
- Constitution Article IV: Services have zero MCP dependency in core

**Alternatives Considered**:
- REST API: Rejected - MCP is project standard
- Direct Python imports only: Rejected - need MCP for loader app

## Edge Case Handling

### EC-001: Non-UTF8 Encoding

**Handling Strategy**:
1. Attempt UTF-8 decode
2. On failure, decode as Latin-1 (never fails)
3. Add warning with detected encoding
4. Continue parsing

**Implementation Notes**:
- Latin-1 is safe fallback (maps bytes 0-255 to Unicode)
- Warning allows user to correct source if needed
- No data loss, but characters may display incorrectly

### EC-002: Unknown Record Types in REP

**Handling Strategy**:
1. Log warning with record type and line number
2. Skip the line
3. Continue parsing remaining content
4. Include skipped count in result summary

**Rationale**: Legacy files may have custom extensions. Fail-safe parsing is better than complete failure.

### EC-003: Truncated File / Incomplete Record

**Handling Strategy**:
1. Detect incomplete record at EOF
2. Discard incomplete record
3. Add warning with line number
4. Return successfully parsed features

**Implementation Notes**:
- Check for expected continuation lines
- Track record boundaries during parsing
- Clean termination even on malformed input

### EC-004: Invalid Coordinates

**Handling Strategy**:
1. Validate coordinate ranges during parsing (-180 to 180 lon, -90 to 90 lat)
2. Invalid coordinates: skip position, add warning
3. Track with no valid positions: skip track, add warning
4. Pydantic provides secondary validation

**Rationale**: Invalid coordinates are common in legacy data (typos, format errors). Better to warn than fail.

### EC-005: Ambiguous Timestamps

**Handling Strategy**:
1. Parse timestamp as-is from file
2. If no timezone, assume UTC (common convention)
3. Add warning about timezone assumption
4. Store as ISO8601 with Z suffix

**Implementation Notes**:
- Python datetime handles timezone-aware parsing
- UTC assumption documented in warnings
- User can post-process if local time was intended

## Dependency Analysis

### Required Dependencies

| Dependency | Version | Purpose | Constitution Check |
|------------|---------|---------|-------------------|
| pydantic | >=2.0.0 | Data validation | ✓ Already in use |
| debrief-schemas | workspace | Generated models | ✓ Internal package |

### Optional Dependencies

| Dependency | Version | Purpose | Notes |
|------------|---------|---------|-------|
| mcp | >=1.0.0 | MCP server | Optional extra for MCP exposure |

### Rejected Dependencies

| Dependency | Reason for Rejection |
|------------|---------------------|
| chardet | Unnecessary for UTF-8/Latin-1 detection |
| pyparsing | Over-engineering for line-based format |
| pandas | Too heavy for simple parsing |

## REP Format Specification

**Reference**: [Debrief File Formats Documentation](https://debrief.github.io/tutorial/reference.html#replay_file_format)

### Overview

REP (Replay) is Debrief's legacy file format for storing track and reference data. It originated from the Royal Navy's Replay application and is the primary data interchange format for Debrief.

### Track Position Record

The main record type is a whitespace-separated position fix:

```
YYMMDD HHMMSS.SSS TRACKNAME SYMBOL DD MM SS.SS H DDD MM SS.SS H CCC.C SSS.S DEPTH [LABEL]
```

| Field | Format | Description |
|-------|--------|-------------|
| Date | `YYMMDD` | Year (2-digit), month, day |
| Time | `HHMMSS.SSS` | Hours, minutes, seconds with milliseconds |
| Track Name | String | Platform/vessel identifier (no spaces) |
| Symbol | `@X` or `@XY` | Symbol code (e.g., `@A`, `@C`, `@D`) |
| Latitude | `DD MM SS.SS H` | Degrees, minutes, seconds, hemisphere (N/S) |
| Longitude | `DDD MM SS.SS H` | Degrees, minutes, seconds, hemisphere (E/W) |
| Course | `CCC.C` | Course in degrees (0-360) |
| Speed | `SSS.S` | Speed in knots |
| Depth | Integer | Depth in meters (0 for surface) |
| Label | String | Optional label text |

### Special Record Types

| Prefix | Description | Format |
|--------|-------------|--------|
| `;` | Comment | Ignored (unless followed by keyword) |
| `;NARRATIVE:` | Narrative entry | `YYMMDD HHMMSS.SSS TRACKNAME TEXT` |
| `;RECT:` | Rectangle shape | `SYMBOL LAT1 LON1 LAT2 LON2 LABEL` |
| `;LINE:` | Line shape | `SYMBOL LAT1 LON1 LAT2 LON2 LABEL` |
| `;CIRCLE:` | Circle shape | `SYMBOL LAT LON RADIUS LABEL` |
| `;TEXT:` | Text annotation | `SYMBOL LAT LON LABEL` |
| `;VECTOR:` | Vector shape | `SYMBOL LAT LON RANGE BEARING LABEL` |

### Example REP Content

```
;; Ship track data from exercise
951212 050300.000 COLLINGWOOD @A 21 53 39.19 N 21 35 37.59 W   0.3   3.5      0
951212 050400.000 COLLINGWOOD @A 21 53 43.69 N 21 35 37.55 W 359.6   3.5      0
951212 050500.000 COLLINGWOOD @A 21 53 48.10 N 21 35 37.60 W 358.5   3.5      0

;NARRATIVE: 951212 050000.000 NELSON COMEX SERIAL 16D
;NARRATIVE: 951212 050100.100 NELSON INTEND WIDE AREA SEARCH

;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 reference circle
;TEXT: @E 21.7 0 0 N 21.5 0 0 W waypoint alpha
```

### Coordinate Format Details

**Degrees-Minutes-Seconds (DMS)**:
- Latitude: `DD MM SS.SS H` where H is N or S
- Longitude: `DDD MM SS.SS H` where H is E or W
- Spaces separate degree, minute, second components
- Seconds include decimal fraction

**Conversion to Decimal Degrees**:
```python
def dms_to_decimal(deg: float, min: float, sec: float, hemisphere: str) -> float:
    decimal = deg + min/60 + sec/3600
    if hemisphere in ('S', 'W'):
        decimal = -decimal
    return decimal
```

### Symbol Codes

Symbol codes control display appearance:
- Single letter: `@A`, `@B`, `@C`, etc. - basic symbols
- Extended: `@XY` where X is symbol, Y is style/color modifier

### Timestamp Format

- Date: 2-digit year (95 = 1995, 26 = 2026)
- Time: HHMMSS with optional .SSS milliseconds
- No timezone specified - assumed UTC

### File Conventions

- File extension: `.rep` or `.REP`
- Encoding: Typically ASCII/Latin-1, modern files may be UTF-8
- Line endings: CRLF (Windows) or LF (Unix) accepted
- Whitespace: Tabs or spaces as field delimiters
- Empty lines: Ignored

## Performance Considerations

### Target Metrics

- Parse typical REP file (<1000 positions): <100ms
- Parse large REP file (10k+ positions): <500ms
- Memory: O(n) where n = number of features

### Benchmarking Notes

- Performance is I/O bound for small files
- For large files, list/dict construction dominates
- No streaming needed for target file sizes
- Profile before optimizing

## Security Considerations

### Path Traversal Prevention

- Validate file paths before reading
- Use pathlib for all path operations
- Do not construct paths from file content

### No Code Execution

- Parser only reads data, never executes
- No eval() or exec() of file content
- No shell commands from file content

## Open Questions (Resolved)

1. ~~REP format specification?~~ → Documented above (TD-001)
2. ~~Encoding detection approach?~~ → UTF-8 then Latin-1 (TD-003)
3. ~~Handler registration pattern?~~ → Dictionary-based registry (TD-002)
4. ~~Error handling philosophy?~~ → Collect warnings, raise on fatal (TD-004)
