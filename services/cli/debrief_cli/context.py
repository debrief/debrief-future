"""
Shared CLI context used by all command groups.

Extracted from ``debrief_cli.main`` to break a cyclic import:
``main`` imports the subcommand groups (``catalog``, ``tools``, ``validate``)
to register them, while each of those groups imports ``Context`` and
``pass_context`` to decorate their commands.

Keeping the context primitives in this leaf module lets the subcommand
groups import them without pulling ``main`` back in.
"""

from __future__ import annotations

import click

from debrief_cli.output import OutputFormatter


class Context:
    """Shared global state carried through the Click invocation."""

    def __init__(self) -> None:
        self.json_mode = False
        self.formatter: OutputFormatter | None = None

    def get_formatter(self) -> OutputFormatter:
        if self.formatter is None:
            self.formatter = OutputFormatter(json_mode=self.json_mode)
        return self.formatter


pass_context = click.make_pass_decorator(Context, ensure=True)
