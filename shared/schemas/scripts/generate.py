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
        print(f"  [FAIL] {e}")
        if e.stderr:
            print(e.stderr)
        return False
    except FileNotFoundError:
        print(f"  [FAIL] Command not found: {cmd[0]}")
        return False


def generate_pydantic() -> bool:
    """Generate Pydantic models from LinkML schema."""
    if not MASTER_SCHEMA.exists():
        print(f"  [FAIL] Master schema not found: {MASTER_SCHEMA}")
        return False

    PYTHON_OUT.mkdir(parents=True, exist_ok=True)
    output_file = PYTHON_OUT / "__init__.py"

    cmd = [
        "gen-pydantic",
        "--extra-fields",
        "forbid",
        str(MASTER_SCHEMA),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        content = result.stdout

        # Post-process: gen-pydantic emits dict[str, Any] in boilerplate classes
        # (ConfiguredBaseModel, LinkMLMeta). Replace with dict[str, object] to
        # eliminate Any from generated code. These are infrastructure classes,
        # not domain models — object is sufficient for their serialisation needs.
        content = content.replace("dict[str, Any]", "dict[str, object]")
        # Remove the Any import if it's no longer used
        content = content.replace(
            "from typing import (\n    Any,\n",
            "from typing import (\n",
        )

        output_file.write_text(content)
        print(f"  [OK] Generated: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [FAIL] gen-pydantic failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  [FAIL] gen-pydantic not found. Install with: pip install linkml")
        return False


def _strip_type_from_anyof(obj: object) -> None:
    """Remove spurious ``"type": "string"`` from properties that have ``"anyOf"``.

    LinkML gen-json-schema emits both ``anyOf`` (with the correct union refs) and
    a fallback ``"type": "string"`` for ``any_of`` slots. AJV enforces both,
    causing valid objects to fail with "must be string". Walk the schema tree and
    delete the ``type`` key from any mapping that already carries ``anyOf``.
    """
    if isinstance(obj, dict):
        if "anyOf" in obj and "type" in obj:
            del obj["type"]
        for v in obj.values():
            _strip_type_from_anyof(v)
    elif isinstance(obj, list):
        for item in obj:
            _strip_type_from_anyof(item)


def _collect_refs(
    node: object, all_defs: dict[str, object], seen: set[str] | None = None
) -> set[str]:
    """Collect all $ref targets reachable from *node* (transitively)."""
    if seen is None:
        seen = set()
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/$defs/"):
            name = ref.split("/")[-1]
            if name not in seen and name in all_defs:
                seen.add(name)
                _collect_refs(all_defs[name], all_defs, seen)
        for v in node.values():
            _collect_refs(v, all_defs, seen)
    elif isinstance(node, list):
        for item in node:
            _collect_refs(item, all_defs, seen)
    return seen


def generate_jsonschema() -> bool:
    """Generate JSON Schema from LinkML schema."""
    import json

    if not MASTER_SCHEMA.exists():
        print(f"  [FAIL] Master schema not found: {MASTER_SCHEMA}")
        return False

    JSONSCHEMA_OUT.mkdir(parents=True, exist_ok=True)
    output_file = JSONSCHEMA_OUT / "debrief.schema.json"

    cmd = [
        "gen-json-schema",
        str(MASTER_SCHEMA),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)

        # Post-process: gen-json-schema emits "type": "string" alongside "anyOf"
        # for any_of union fields (e.g., geometry unions). The spurious "type" must
        # be removed so AJV validates against the anyOf alternatives instead.
        full_schema = json.loads(result.stdout)
        _strip_type_from_anyof(full_schema)

        output_file.write_text(json.dumps(full_schema, indent=2))
        print(f"  [OK] Generated: {output_file}")
        entity_types = [
            # Core types
            "TrackFeature",
            "ReferenceLocation",
            # Annotation types
            "NarrativeEntry",
            "CircleAnnotation",
            "RectangleAnnotation",
            "LineAnnotation",
            "TextAnnotation",
            "VectorAnnotation",
            "PolyAnnotation",
            # Tool metadata types
            "Tool",
            "SelectionRequirement",
            # Multi-geometry tool result types
            "MultiPointFeature",
            "MultiPolygonFeature",
            # Sub-schema types (styling, state)
            "LineProperties",
            "PointProperties",
            "PolygonProperties",
            "TrackStyle",
            "SystemState",
        ]
        all_defs = full_schema.get("$defs", {})
        for entity in entity_types:
            if entity in all_defs:
                reachable = _collect_refs(all_defs[entity], all_defs)
                entity_schema = {
                    "$schema": "https://json-schema.org/draft/2019-09/schema",
                    "$id": f"https://debrief.info/schemas/{entity}",
                    **all_defs[entity],
                    "$defs": {k: v for k, v in all_defs.items() if k in reachable},
                }
                entity_file = JSONSCHEMA_OUT / f"{entity}.schema.json"
                entity_file.write_text(json.dumps(entity_schema, indent=2))
                print(f"  [OK] Generated: {entity_file}")

        return True
    except subprocess.CalledProcessError as e:
        print(f"  [FAIL] gen-json-schema failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  [FAIL] gen-json-schema not found. Install with: pip install linkml")
        return False


def generate_typescript() -> bool:
    """Generate TypeScript interfaces from LinkML schema."""
    if not MASTER_SCHEMA.exists():
        print(f"  [FAIL] Master schema not found: {MASTER_SCHEMA}")
        return False

    TYPESCRIPT_OUT.mkdir(parents=True, exist_ok=True)
    output_file = TYPESCRIPT_OUT / "types.ts"

    cmd = [
        "gen-typescript",
        str(MASTER_SCHEMA),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        content = result.stdout

        # Post-process: gen-typescript doesn't support any_of unions,
        # so it falls back to 'string' for union geometry fields.
        # Patch geometry fields to use the proper union types.
        content = content.replace(
            "/** Track path as LineString (simple) or MultiLineString (compound) */\n"
            "    geometry: string,",
            "/** Track path as LineString (simple) or MultiLineString (compound) */\n"
            "    geometry: GeoJSONLineString | GeoJSONMultiLineString,",
        )
        content = content.replace(
            "/** Location (Point) or reference point set (MultiPoint) */\n    geometry: string,",
            "/** Location (Point) or reference point set (MultiPoint) */\n"
            "    geometry: GeoJSONPoint | GeoJSONMultiPoint,",
        )

        # Post-process: Fix coordinate types for nested geometries.
        # gen-typescript emits `coordinates: number[]` for all geometries,
        # but GeoJSON coordinate nesting varies by geometry type.
        _coordinate_type_fixes = {
            # Point: [lon, lat] → number[] (already correct)
            # LineString: [[lon, lat], ...] → number[][]
            "GeoJSONLineString": ("number[]", "number[][]"),
            # Polygon: [[[lon, lat], ...], ...] → number[][][]
            "GeoJSONPolygon": ("number[]", "number[][][]"),
            # MultiPoint: [[lon, lat], ...] → number[][]
            "GeoJSONMultiPoint": ("number[]", "number[][]"),
            # MultiLineString: [[[lon, lat], ...], ...] → number[][][]
            "GeoJSONMultiLineString": ("number[]", "number[][][]"),
            # MultiPolygon: [[[[lon, lat], ...], ...], ...] → number[][][][]
            "GeoJSONMultiPolygon": ("number[]", "number[][][][]"),
        }
        for iface_name, (old_type, new_type) in _coordinate_type_fixes.items():
            # Match within the specific interface block to avoid false replacements
            # Pattern: inside the interface, replace `coordinates: number[]` with correct type
            old_sig = f"export interface {iface_name}"
            if old_sig in content:
                # Find the interface block and fix the coordinates type within it
                idx = content.index(old_sig)
                # Find the closing brace of the interface
                brace_idx = content.index("}", idx)
                block = content[idx:brace_idx]
                fixed_block = block.replace(
                    f"coordinates?: {old_type}",
                    f"coordinates?: {new_type}",
                ).replace(
                    f"coordinates: {old_type}",
                    f"coordinates: {new_type}",
                )
                content = content[:idx] + fixed_block + content[brace_idx:]

        output_file.write_text(content)
        print(f"  [OK] Generated: {output_file}")

        # Create index.ts that re-exports everything
        index_file = TYPESCRIPT_OUT / "index.ts"
        index_file.write_text('export * from "./types";\n')
        print(f"  [OK] Generated: {index_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [FAIL] gen-typescript failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  [FAIL] gen-typescript not found. Install with: pip install linkml")
        return False


def validate_fixtures() -> bool:
    """Validate all fixtures against the generated schemas."""
    fixtures_dir = SCHEMAS_ROOT / "src" / "fixtures"
    valid_dir = fixtures_dir / "valid"
    invalid_dir = fixtures_dir / "invalid"

    print("Validating fixtures...")

    if not valid_dir.exists() or not invalid_dir.exists():
        print("  [WARN] Fixtures directories not found, skipping validation")
        return True

    # This is a placeholder - actual validation would use linkml-validate
    # or the generated Pydantic models
    print("  [WARN] Fixture validation not yet implemented")
    return True


def main() -> None:
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

    print("Schema generation for Debrief v4.x")
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

    if args.validate_fixtures and not validate_fixtures():
        success = False

    print()
    if success:
        print("[OK] Generation complete")
    else:
        print("[FAIL] Generation completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
