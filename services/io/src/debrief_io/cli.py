"""
JSON-RPC CLI interface for debrief-io.

Reads JSON-RPC 2.0 requests from stdin and writes responses to stdout.
Used by Electron app for file parsing operations.
"""

import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from debrief_io import __version__, parse
from debrief_io.exceptions import ParseError, UnsupportedFormatError


def compute_hash(file_path: str) -> str:
    """Compute SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def handle_parse_file(params: dict[str, Any]) -> dict[str, Any]:
    """Handle parse_file method.

    Args:
        params: {"file_path": str}

    Returns:
        {
            "features": [...],
            "metadata": {
                "parser": str,
                "version": str,
                "timestamp": str,
                "source_hash": str
            }
        }
    """
    file_path = params.get("file_path")
    if not file_path:
        raise ValueError("Missing required parameter: file_path")

    path = Path(file_path)
    result = parse(path)

    # Convert features to JSON-serializable format
    features = []
    for feature in result.features:
        if hasattr(feature, "model_dump"):
            features.append(feature.model_dump(mode="json"))
        elif isinstance(feature, dict):
            features.append(feature)
        else:
            features.append(dict(feature))

    return {
        "features": features,
        "metadata": {
            "parser": result.handler,
            "version": __version__,
            "timestamp": datetime.now(UTC).isoformat(),
            "source_hash": compute_hash(file_path),
        },
    }


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    """Handle a JSON-RPC request and return the response.

    Args:
        request: JSON-RPC 2.0 request object

    Returns:
        JSON-RPC 2.0 response object
    """
    request_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})

    try:
        if method == "parse_file":
            result = handle_parse_file(params)
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}",
                },
            }

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result,
        }

    except FileNotFoundError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32000,
                "message": str(e),
                "data": {"type": "FileNotFoundError"},
            },
        }
    except UnsupportedFormatError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32001,
                "message": str(e),
                "data": {"type": "UnsupportedFormatError"},
            },
        }
    except ParseError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32002,
                "message": str(e),
                "data": {
                    "type": "ParseError",
                    "line": getattr(e, "line", None),
                    "column": getattr(e, "column", None),
                },
            },
        }
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32603,
                "message": f"Internal error: {e}",
            },
        }


def main() -> None:
    """Main entry point for CLI.

    Reads JSON-RPC requests from stdin, one per line.
    Writes JSON-RPC responses to stdout, one per line.
    """
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": f"Parse error: {e}",
                },
            }
            print(json.dumps(response), flush=True)
            continue

        response = handle_request(request)
        print(json.dumps(response), flush=True)


if __name__ == "__main__":
    main()
