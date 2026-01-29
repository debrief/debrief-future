"""
CLI runner for debrief-calc.

Reads JSON from stdin, executes a tool, writes JSON result to stdout.

Input format:
    { "tool": "range-bearing", "features": [...geojson...], "params": {} }

Output format:
    { "success": true, "features": [...], "duration_ms": 42.5 }
    or
    { "success": false, "error": {"code": "...", "message": "..."}, "duration_ms": 0 }

Usage:
    echo '{"tool":"range-bearing","features":[...],"params":{}}' | python -m debrief_calc.cli
"""

from __future__ import annotations

import json
import sys

from debrief_calc.executor import run
from debrief_calc.models import ContextType, SelectionContext


def _context_type_from_features(features: list) -> ContextType:
    """Determine context type from feature count."""
    n = len(features)
    if n == 0:
        return ContextType.NONE
    if n == 1:
        return ContextType.SINGLE
    return ContextType.MULTI


def main() -> None:
    """Read JSON from stdin, run tool, write JSON to stdout."""
    try:
        raw = sys.stdin.read()
        request = json.loads(raw)

        tool_name: str = request["tool"]
        features: list = request.get("features", [])
        params: dict = request.get("params", {})

        context_type = _context_type_from_features(features)
        context = SelectionContext(type=context_type, features=features)

        result = run(tool_name, context, params)

        output = {
            "success": result.success,
            "features": result.features or [],
            "duration_ms": result.duration_ms,
        }
        if result.error:
            output["error"] = result.error.model_dump()

        json.dump(output, sys.stdout)

    except Exception as e:
        json.dump(
            {
                "success": False,
                "error": {"code": "CLI_ERROR", "message": str(e)},
                "duration_ms": 0,
                "features": [],
            },
            sys.stdout,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
