"""
CLI runner for debrief-calc.

Reads JSON from stdin, executes a tool, writes JSON result to stdout.

Input format:
    { "tool": "range-bearing", "features": [...geojson...], "params": {} }

Output format (MCP content):
    { "content": [...MCP content items...], "duration_ms": 42.5 }
    or
    { "error": {"code": -32000, "message": "...", "data": {...}} }

Usage:
    echo '{"tool":"range-bearing","features":[...],"params":{}}' | python -m debrief_calc.cli
"""

from __future__ import annotations

import json
import sys

from debrief_calc.executor import run
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.registry import registry
from debrief_calc.result_builder import build_addition, build_artifact, build_error, build_response


def _context_type_from_features(features: list) -> ContextType:
    """Determine context type from feature count."""
    n = len(features)
    if n == 0:
        return ContextType.NONE
    if n == 1:
        return ContextType.SINGLE
    return ContextType.MULTI


def _extract_source_ids(features: list) -> list[str]:
    """Extract feature IDs from input features."""
    ids = []
    for f in features:
        props = f.get("properties", {}) or {}
        fid = f.get("id") or props.get("id")
        if fid:
            ids.append(str(fid))
    return ids


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

        if result.success:
            # Get tool's output_kind for result subtype
            tool = registry.get_tool(tool_name)
            source_ids = _extract_source_ids(features)

            if tool.output_kind == "range-bearing-series":
                # Artifact output: serialize time-series as JSON
                series_data = result.features[0] if result.features else {}
                data_bytes = json.dumps(series_data, indent=2).encode("utf-8")
                href = f"range-bearing-{'-'.join(source_ids[:2])}.json"
                content_item = build_artifact(
                    data=data_bytes,
                    mime_type="application/json",
                    result_subtype="range-bearing-series",
                    source_feature_ids=source_ids,
                    label=f"{tool_name} results",
                    href=href,
                )
                response = build_response([content_item])
            else:
                content_items = build_addition(
                    features=result.features or [],
                    result_subtype=tool.output_kind,
                    source_feature_ids=source_ids,
                    label=f"{tool_name} results",
                )
                response = build_response(content_items)
            response["duration_ms"] = result.duration_ms
            json.dump(response, sys.stdout)
        else:
            error = result.error
            source_ids = _extract_source_ids(features)
            error_response = {
                "error": build_error(
                    message=error.message if error else "Unknown error",
                    category="invalid_input",
                    affected_feature_ids=source_ids,
                ),
                "duration_ms": result.duration_ms,
            }
            json.dump(error_response, sys.stdout)

    except Exception as e:
        json.dump(
            {
                "error": build_error(
                    message=str(e),
                    category="algorithm_failure",
                    affected_feature_ids=[],
                ),
                "duration_ms": 0,
            },
            sys.stdout,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
