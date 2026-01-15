"""
Output formatting utilities for debrief-cli.

Provides human-readable and JSON output modes for all commands.
"""

from __future__ import annotations

import json
import sys
from typing import Any


class OutputFormatter:
    """
    Handles output formatting for CLI commands.

    Supports two modes:
    - Human-readable: Formatted text for terminal display
    - JSON: Machine-readable output for scripting
    """

    def __init__(self, json_mode: bool = False):
        self.json_mode = json_mode
        self._data = {}

    def set(self, key: str, value: Any) -> None:
        """Set a value in the output data."""
        self._data[key] = value

    def success(self, message: str) -> None:
        """Output a success message."""
        if self.json_mode:
            self._data["status"] = "success"
            self._data["message"] = message
        else:
            print(f"✓ {message}")

    def error(self, message: str, code: str = "ERROR") -> None:
        """Output an error message."""
        if self.json_mode:
            self._data["status"] = "error"
            self._data["code"] = code
            self._data["message"] = message
        else:
            print(f"✗ {message}", file=sys.stderr)

    def info(self, message: str) -> None:
        """Output an info message."""
        if self.json_mode:
            if "info" not in self._data:
                self._data["info"] = []
            self._data["info"].append(message)
        else:
            print(message)

    def table(self, headers: list[str], rows: list[list[str]]) -> None:
        """Output a table."""
        if self.json_mode:
            self._data["rows"] = [
                dict(zip(headers, row, strict=True)) for row in rows
            ]
        else:
            # Calculate column widths
            widths = [len(h) for h in headers]
            for row in rows:
                for i, cell in enumerate(row):
                    widths[i] = max(widths[i], len(str(cell)))

            # Print header
            header_line = " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
            print(header_line)
            print("-" * len(header_line))

            # Print rows
            for row in rows:
                print(" | ".join(str(cell).ljust(widths[i]) for i, cell in enumerate(row)))

    def json_output(self, data: Any) -> None:
        """Output raw JSON data."""
        if self.json_mode:
            self._data = data if isinstance(data, dict) else {"data": data}
        else:
            print(json.dumps(data, indent=2))

    def geojson(self, data: dict[str, Any]) -> None:
        """Output GeoJSON data."""
        print(json.dumps(data, indent=2))

    def finish(self) -> None:
        """Finish output and print JSON if in JSON mode."""
        if self.json_mode:
            print(json.dumps(self._data, indent=2))


def format_tool_metadata(tool_meta: dict[str, Any], verbose: bool = False) -> str:
    """Format tool metadata for human display."""
    lines = [
        f"Name: {tool_meta['name']}",
        f"Description: {tool_meta['description']}",
        f"Version: {tool_meta['version']}",
        f"Context Type: {tool_meta['context_type']}",
        f"Input Kinds: {', '.join(tool_meta['input_kinds'])}",
        f"Output Kind: {tool_meta['output_kind']}",
    ]

    if verbose and tool_meta.get("parameters"):
        lines.append("\nParameters:")
        for param in tool_meta["parameters"]:
            req = " (required)" if param.get("required") else ""
            default = f" [default: {param.get('default')}]" if param.get("default") is not None else ""
            lines.append(f"  --{param['name']}: {param['description']}{req}{default}")
            if param.get("choices"):
                lines.append(f"    choices: {', '.join(str(c) for c in param['choices'])}")

    return "\n".join(lines)
