#!/usr/bin/env python3
"""
Schema generation script for Debrief v4.x.

Orchestrates generation of:
- Pydantic models from LinkML
- JSON Schema from LinkML
- TypeScript interfaces from LinkML
"""

import argparse
import subprocess
import sys
from pathlib import Path

# Paths relative to this script
SCRIPT_DIR = Path(__file__).parent
SCHEMAS_ROOT = SCRIPT_DIR.parent
LINKML_DIR = SCHEMAS_ROOT / "src" / "linkml"
GENERATED_DIR = SCHEMAS_ROOT / "src" / "generated"

# Source schema
MASTER_SCHEMA = LINKML_DIR / "debrief.yaml"

# Output directories
PYTHON_OUT = GENERATED_DIR / "python" / "debrief_schemas"
JSONSCHEMA_OUT = GENERATED_DIR / "json-schema"
TYPESCRIPT_OUT = GENERATED_DIR / "typescript"


def run_command(cmd: list[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"  → {description}")
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Failed: {e}")
        if e.stderr:
            print(e.stderr)
        return False
    except FileNotFoundError:
        print(f"  ✗ Command not found: {cmd[0]}")
        return False


def generate_pydantic() -> bool:
    """Generate Pydantic models from LinkML schema."""
    if not MASTER_SCHEMA.exists():
        print(f"  ✗ Master schema not found: {MASTER_SCHEMA}")
        return False

    PYTHON_OUT.mkdir(parents=True, exist_ok=True)
    output_file = PYTHON_OUT / "__init__.py"

    cmd = [
        "gen-pydantic",
        "--extra-fields", "forbid",
        str(MASTER_SCHEMA),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        # Format with black if available
        try:
            import black
            formatted = black.format_str(result.stdout, mode=black.Mode(line_length=100))
            output_file.write_text(formatted)
        except ImportError:
            output_file.write_text(result.stdout)
        print(f"  ✓ Generated: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ gen-pydantic failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  ✗ gen-pydantic not found. Install with: pip install linkml")
        return False


def generate_jsonschema() -> bool:
    """Generate JSON Schema from LinkML schema."""
    if not MASTER_SCHEMA.exists():
        print(f"  ✗ Master schema not found: {MASTER_SCHEMA}")
        return False

    JSONSCHEMA_OUT.mkdir(parents=True, exist_ok=True)
    output_file = JSONSCHEMA_OUT / "debrief.schema.json"

    cmd = [
        "gen-json-schema",
        str(MASTER_SCHEMA),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        output_file.write_text(result.stdout)
        print(f"  ✓ Generated: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ gen-json-schema failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  ✗ gen-json-schema not found. Install with: pip install linkml")
        return False


def generate_typescript() -> bool:
    """Generate TypeScript interfaces from LinkML schema."""
    if not MASTER_SCHEMA.exists():
        print(f"  ✗ Master schema not found: {MASTER_SCHEMA}")
        return False

    TYPESCRIPT_OUT.mkdir(parents=True, exist_ok=True)
    output_file = TYPESCRIPT_OUT / "types.ts"

    cmd = [
        "gen-typescript",
        str(MASTER_SCHEMA),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        output_file.write_text(result.stdout)
        print(f"  ✓ Generated: {output_file}")

        # Create index.ts that re-exports everything
        index_file = TYPESCRIPT_OUT / "index.ts"
        index_file.write_text('export * from "./types";\n')
        print(f"  ✓ Generated: {index_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ✗ gen-typescript failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  ✗ gen-typescript not found. Install with: pip install linkml")
        return False


def validate_fixtures() -> bool:
    """Validate all fixtures against the generated schemas."""
    fixtures_dir = SCHEMAS_ROOT / "src" / "fixtures"
    valid_dir = fixtures_dir / "valid"
    invalid_dir = fixtures_dir / "invalid"

    print("Validating fixtures...")

    if not valid_dir.exists() or not invalid_dir.exists():
        print("  ⚠ Fixtures directories not found, skipping validation")
        return True

    # This is a placeholder - actual validation would use linkml-validate
    # or the generated Pydantic models
    print("  ⚠ Fixture validation not yet implemented")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Generate derived schemas from LinkML master schema"
    )
    parser.add_argument(
        "--target",
        choices=["pydantic", "jsonschema", "typescript", "all"],
        default="all",
        help="Which schema(s) to generate (default: all)",
    )
    parser.add_argument(
        "--validate-fixtures",
        action="store_true",
        help="Validate fixtures after generation",
    )
    args = parser.parse_args()

    print(f"Schema generation for Debrief v4.x")
    print(f"Master schema: {MASTER_SCHEMA}")
    print()

    success = True

    if args.target in ("pydantic", "all"):
        print("Generating Pydantic models...")
        if not generate_pydantic():
            success = False

    if args.target in ("jsonschema", "all"):
        print("Generating JSON Schema...")
        if not generate_jsonschema():
            success = False

    if args.target in ("typescript", "all"):
        print("Generating TypeScript interfaces...")
        if not generate_typescript():
            success = False

    if args.validate_fixtures:
        if not validate_fixtures():
            success = False

    print()
    if success:
        print("✓ Generation complete")
    else:
        print("✗ Generation completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
