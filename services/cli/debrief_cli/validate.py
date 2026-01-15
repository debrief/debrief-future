"""
Validate command for debrief-cli.

Validates GeoJSON files against the Debrief schema.
"""

from __future__ import annotations

import json
import sys

import click

from debrief_cli.main import Context, pass_context


@click.command()
@click.argument("file", type=click.Path(exists=True))
@click.option("--strict", is_flag=True, help="Enable strict validation (require kind attribute)")
@pass_context
def validate(ctx: Context, file: str, strict: bool):
    """
    Validate a GeoJSON file.

    FILE is the path to the GeoJSON file to validate.

    Exit codes:
      0 - Validation passed
      3 - Validation failed
    """
    formatter = ctx.get_formatter()

    try:
        from debrief_calc.validation import validate_geojson

        # Load and parse JSON
        with open(file) as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                formatter.error(f"Invalid JSON: {e}", "PARSE_ERROR")
                formatter.finish()
                sys.exit(3)

        # Validate GeoJSON structure
        errors = validate_geojson(data)

        # Strict mode: check for kind attribute
        if strict:
            kind_errors = _check_kind_attribute(data)
            errors.extend(kind_errors)

        if errors:
            if ctx.json_mode:
                formatter.json_output(
                    {"status": "failed", "file": file, "errors": errors, "error_count": len(errors)}
                )
            else:
                formatter.error(f"Validation failed with {len(errors)} error(s):")
                for error in errors[:10]:  # Show first 10 errors
                    formatter.info(f"  - {error}")
                if len(errors) > 10:
                    formatter.info(f"  ... and {len(errors) - 10} more errors")

            formatter.finish()
            sys.exit(3)
        else:
            if ctx.json_mode:
                formatter.json_output(
                    {"status": "passed", "file": file, "feature_count": _count_features(data)}
                )
            else:
                formatter.success(f"Validation passed: {file}")
                formatter.info(f"  Features: {_count_features(data)}")

            formatter.finish()

    except Exception as e:
        formatter.error(str(e), "VALIDATION_ERROR")
        formatter.finish()
        sys.exit(3)


def _check_kind_attribute(data: dict) -> list[str]:
    """Check that all features have a kind attribute."""
    errors = []

    if data.get("type") == "FeatureCollection":
        for i, feature in enumerate(data.get("features", [])):
            if not feature.get("properties", {}).get("kind"):
                errors.append(f"features[{i}]: missing 'kind' attribute in properties")
    elif data.get("type") == "Feature" and not data.get("properties", {}).get("kind"):
        errors.append("Feature missing 'kind' attribute in properties")

    return errors


def _count_features(data: dict) -> int:
    """Count the number of features in GeoJSON data."""
    if data.get("type") == "FeatureCollection":
        return len(data.get("features", []))
    elif data.get("type") == "Feature":
        return 1
    return 0
