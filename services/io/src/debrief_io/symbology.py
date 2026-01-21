"""
Debrief symbology module.

Maps REP file color codes (A-Q) to CSS color values for styling properties.
"""

# Color code mapping from Debrief symbology table
# Reference: https://debrief.github.io/tutorial/reference.html#replay_symbology
COLOR_MAP: dict[str, str] = {
    "A": "#0000FF",  # Blue
    "B": "#00FF00",  # Green
    "C": "#FF0000",  # Red
    "D": "#FFFF00",  # Yellow
    "E": "#FF00FF",  # Magenta
    "F": "#FFA500",  # Orange
    "G": "#800080",  # Purple
    "H": "#00FFFF",  # Cyan
    "I": "#A52A2A",  # Brown
    "J": "#90EE90",  # Light Green
    "K": "#FFC0CB",  # Pink
    "L": "#FFD700",  # Gold
    "M": "#D3D3D3",  # Light Grey
    "N": "#808080",  # Grey
    "O": "#A9A9A9",  # Dark Grey
    "P": "#FFFFFF",  # White
    "Q": "#000000",  # Black
}

# Color code to name mapping for documentation
COLOR_NAMES: dict[str, str] = {
    "A": "Blue",
    "B": "Green",
    "C": "Red",
    "D": "Yellow",
    "E": "Magenta",
    "F": "Orange",
    "G": "Purple",
    "H": "Cyan",
    "I": "Brown",
    "J": "Light Green",
    "K": "Pink",
    "L": "Gold",
    "M": "Light Grey",
    "N": "Grey",
    "O": "Dark Grey",
    "P": "White",
    "Q": "Black",
}

# Valid color codes
VALID_COLOR_CODES = frozenset(COLOR_MAP.keys())


def get_color(code: str) -> str:
    """
    Get CSS color value for a color code.

    Args:
        code: Single uppercase letter A-Q

    Returns:
        CSS color string (e.g., '#0000FF')

    Raises:
        ValueError: If code is not a valid color code (A-Q)
    """
    if code not in COLOR_MAP:
        valid_codes = ", ".join(sorted(VALID_COLOR_CODES))
        raise ValueError(f"Invalid color code '{code}'. Valid codes are: {valid_codes}")
    return COLOR_MAP[code]


def get_color_name(code: str) -> str:
    """
    Get human-readable color name for a color code.

    Args:
        code: Single uppercase letter A-Q

    Returns:
        Color name (e.g., 'Blue')

    Raises:
        ValueError: If code is not a valid color code (A-Q)
    """
    if code not in COLOR_NAMES:
        valid_codes = ", ".join(sorted(VALID_COLOR_CODES))
        raise ValueError(f"Invalid color code '{code}'. Valid codes are: {valid_codes}")
    return COLOR_NAMES[code]


def is_valid_color_code(code: str) -> bool:
    """
    Check if a string is a valid color code.

    Args:
        code: String to check

    Returns:
        True if code is a valid color code (A-Q), False otherwise
    """
    return code in VALID_COLOR_CODES


def parse_color_code(symbol: str) -> str | None:
    """
    Extract color code from a symbol string.

    Handles various symbol formats:
    - Simple: '@A' -> 'A'
    - Extended: '@A@00' -> 'A'
    - With attributes: '@A[LAYER=x]' -> 'A'
    - SVG style: 'aB' -> 'B' (second char is color)

    Args:
        symbol: Symbol string to parse

    Returns:
        Color code letter (A-Q) or None if not found
    """
    if not symbol:
        return None

    # Simple symbol: @A or just A
    if symbol.startswith("@"):
        if len(symbol) >= 2 and symbol[1] in VALID_COLOR_CODES:
            return symbol[1]
    # SVG style: first char is SVG symbol, second is color
    elif len(symbol) >= 2 and symbol[1] in VALID_COLOR_CODES:
        return symbol[1]
    # Just a letter
    elif len(symbol) == 1 and symbol in VALID_COLOR_CODES:
        return symbol

    return None
