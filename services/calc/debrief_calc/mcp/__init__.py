"""
MCP (Model Context Protocol) integration for debrief-calc.

Provides a thin wrapper over the debrief-calc library, exposing
tool discovery and execution via MCP following the patterns
established in mcp-common.
"""

from debrief_calc.mcp.server import create_server, serve

__all__ = ["create_server", "serve"]
