"""
Symbol code parsing for REP file annotations.

Handles parsing of Debrief symbol codes in various formats:
- Simple: @A
- Extended: @A@00 (color, line style, thickness, fill)
- With attributes: @A[LAYER=x,SYMBOL=y]
- SVG style: aB[LAYER=x]
"""

import re
from dataclasses import dataclass

from debrief_io.symbology import VALID_COLOR_CODES, get_color

# Line style codes
LINE_STYLES = {
    "@": "solid",
    "A": "dotted",
    "B": "dot-dash",
    "C": "short-dash",
    "D": "long-dash",
    "E": "unconnected",
}

# Fill style codes
FILL_STYLES = {
    "0": None,  # No fill
    "1": "solid",
    "2": "semi-transparent",
}

# Full symbol pattern supporting all formats
# Note: Color code is [A-Z] to catch invalid codes - validation happens separately
# Formats:
# - @A, @A@00, @A[LAYER=x] (standard)
# - aA, aA@00, aA[LAYER=x] (SVG-style, lowercase prefix)
# - 0A, 1A[LAYER=x] (digit prefix for buoy/icon types)
SYMBOL_PATTERN = re.compile(
    r"^"
    r"([a-zA-Z@\d])"  # Symbol prefix (@ or letter or digit)
    r"([A-Z])"  # Color code (accepts any uppercase, validated later)
    r"(?:([A-E@])(\d)(\d))?"  # Optional: line style + thickness + fill
    r"(?:\[([^\]]+)\])?"  # Optional: [LAYER=x,SYMBOL=y]
    r"$"
)

# Attribute pattern for parsing [KEY=VALUE,...] blocks
ATTRIBUTE_PATTERN = re.compile(r"([A-Z_]+)=([^,\]]+)")


@dataclass(frozen=True)
class ParsedSymbol:
    """Parsed symbol code with all components."""

    raw: str  # Original symbol string
    color_code: str  # A-Q
    css_color: str  # CSS hex color
    line_style: str | None  # solid, dotted, etc.
    thickness: int | None  # 0-5 pixels
    fill_style: str | None  # None, solid, semi-transparent
    layer: str | None  # LAYER attribute value
    symbol_name: str | None  # SYMBOL attribute value (legacy icon name)
    is_svg: bool  # True if SVG-style symbol (lowercase prefix)


def parse_symbol(symbol: str, line_number: int | None = None) -> ParsedSymbol:
    """
    Parse a symbol code string into its components.

    Args:
        symbol: Symbol string (e.g., "@A", "@A@00", "@A[LAYER=x,SYMBOL=y]")
        line_number: Optional line number for error messages

    Returns:
        ParsedSymbol with all parsed components

    Raises:
        ValueError: If symbol format is invalid or color code unknown
    """
    if not symbol:
        loc = f" at line {line_number}" if line_number else ""
        raise ValueError(f"Missing symbol code{loc}. All annotations require a symbol.")

    match = SYMBOL_PATTERN.match(symbol)
    if not match:
        loc = f" at line {line_number}" if line_number else ""
        raise ValueError(
            f"Invalid symbol format '{symbol}'{loc}. "
            f"Expected format like @A, @A@00, or @A[LAYER=x]."
        )

    prefix = match.group(1)
    color_code = match.group(2)
    line_style_code = match.group(3)
    thickness_code = match.group(4)
    fill_code = match.group(5)
    attributes = match.group(6)

    # Validate color code
    if color_code not in VALID_COLOR_CODES:
        loc = f" at line {line_number}" if line_number else ""
        valid_codes = ", ".join(sorted(VALID_COLOR_CODES))
        raise ValueError(f"Invalid color code '{color_code}'{loc}. Valid codes are: {valid_codes}.")

    # Get CSS color
    css_color = get_color(color_code)

    # Parse line style
    line_style = LINE_STYLES.get(line_style_code) if line_style_code else None

    # Parse thickness (0-5 pixels)
    thickness = int(thickness_code) if thickness_code else None

    # Parse fill style
    fill_style = FILL_STYLES.get(fill_code) if fill_code else None

    # Parse attributes
    layer = None
    symbol_name = None
    if attributes:
        attr_dict = dict(ATTRIBUTE_PATTERN.findall(attributes))
        layer = attr_dict.get("LAYER")
        symbol_name = attr_dict.get("SYMBOL")

    # Determine if SVG style (lowercase prefix)
    is_svg = prefix.islower()

    return ParsedSymbol(
        raw=symbol,
        color_code=color_code,
        css_color=css_color,
        line_style=line_style,
        thickness=thickness,
        fill_style=fill_style,
        layer=layer,
        symbol_name=symbol_name,
        is_svg=is_svg,
    )


def extract_symbol_from_line(line: str) -> str | None:
    """
    Extract the symbol code portion from an annotation line.

    The symbol typically appears right after the annotation type prefix.

    Args:
        line: Full annotation line (e.g., ";CIRCLE: @D 21.8...")

    Returns:
        Symbol string or None if not found
    """
    # Common patterns after the annotation type:
    # ;TYPE: @X...
    # ;TYPE: @X@00...
    # ;TYPE: @XA30...
    # ;TYPE: @X[LAYER=y]...

    # Split on colon and whitespace to get the parts
    parts = line.split()
    if len(parts) < 2:
        return None

    # Find the symbol part (starts with @ or is SVG style)
    for part in parts[1:]:  # Skip the annotation type
        # Check if this looks like a symbol starting with @
        if part.startswith("@"):
            # Symbol format: @X, @X@YY, @XAYY, or @X[...]
            # We need to capture @, color code, optional style/thickness/fill, optional attributes

            # Check for attributes first
            if "[" in part:
                # Include everything up to and including ]
                close = part.find("]")
                if close != -1:
                    return part[: close + 1]
                return part  # Malformed but return as-is

            # For extended format like @GA30, capture the full pattern
            # Pattern: @X followed by optional [A-E@] + digit + digit
            if len(part) >= 2:
                # At minimum we have @X (2 chars)
                # Check if we have extended format: @X followed by style code
                end_idx = 2  # Start after @X

                # Check for extended format (style + thickness + fill)
                if (
                    len(part) >= 5
                    and part[2] in "@ABCDE"
                    and part[3].isdigit()
                    and part[4].isdigit()
                ):
                    end_idx = 5
                elif len(part) >= 4 and part[2] in "@ABCDE" and part[3].isdigit():
                    end_idx = 4
                elif len(part) >= 3 and part[2] in "@ABCDE":
                    end_idx = 3

                return part[:end_idx]

        # Check for SVG-style symbol (lowercase letter followed by color code)
        # or digit-prefix symbol (digit followed by color code)
        elif (
            len(part) >= 2
            and (part[0].islower() or part[0].isdigit())
            and part[1] in VALID_COLOR_CODES
        ):
            # Similar logic for SVG style and digit-prefix style
            if "[" in part:
                close = part.find("]")
                if close != -1:
                    return part[: close + 1]
                return part

            end_idx = 2
            if len(part) >= 5 and part[2] in "@ABCDE" and part[3].isdigit() and part[4].isdigit():
                end_idx = 5
            elif len(part) >= 4 and part[2] in "@ABCDE" and part[3].isdigit():
                end_idx = 4
            elif len(part) >= 3 and part[2] in "@ABCDE":
                end_idx = 3

            return part[:end_idx]

    return None


def get_dash_array(line_style: str | None) -> str | None:
    """
    Convert line style to SVG dash array pattern.

    Args:
        line_style: Line style name (solid, dotted, etc.)

    Returns:
        SVG dash array string or None for solid
    """
    dash_patterns = {
        "solid": None,
        "dotted": "1, 3",
        "dot-dash": "5, 3, 1, 3",
        "short-dash": "5, 5",
        "long-dash": "10, 5",
        "unconnected": None,  # Points only, no line
    }
    if line_style is None:
        return None
    return dash_patterns.get(line_style)
