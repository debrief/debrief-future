"""
Main entry point for debrief-cli.

Provides the root CLI group and global options.
"""

from __future__ import annotations

import sys

import click

from debrief_cli.output import OutputFormatter


# Global context object to store shared state
class Context:
    def __init__(self):
        self.json_mode = False
        self.formatter = None

    def get_formatter(self) -> OutputFormatter:
        if self.formatter is None:
            self.formatter = OutputFormatter(json_mode=self.json_mode)
        return self.formatter


pass_context = click.make_pass_decorator(Context, ensure=True)


@click.group()
@click.option("--json", "json_mode", is_flag=True, help="Output in JSON format")
@click.version_option(message="%(version)s")
@pass_context
def cli(ctx: Context, json_mode: bool):
    """
    Debrief CLI - Command-line tools for maritime tactical analysis.

    Provides access to analysis tools, validation, and STAC catalog browsing.

    Exit codes:
      0 - Success
      2 - Invalid arguments
      3 - Validation failed
      4 - Execution failed
      5 - Store not found
    """
    ctx.json_mode = json_mode


def _register_commands():
    """Register subcommand groups (deferred to avoid E402)."""
    from debrief_cli.catalog import catalog
    from debrief_cli.tools import tools
    from debrief_cli.validate import validate

    cli.add_command(tools)
    cli.add_command(validate)
    cli.add_command(catalog)


# Register commands at module load
_register_commands()


def main():
    """Main entry point."""
    try:
        cli()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(4)


if __name__ == "__main__":
    main()
