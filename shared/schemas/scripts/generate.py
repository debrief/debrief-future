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

        # Post-process: Fix GeoJSON coordinate types. LinkML generates flat
        # list[float] for all coordinate arrays, but GeoJSON requires nested
        # arrays whose depth varies by geometry type.
        _pydantic_coord_fixes = {
            # LineString: [[lon, lat], ...] → list of position pairs
            "GeoJSONLineString": ("coordinates: list[float]", "coordinates: list[list[float]]"),
            # Polygon: [[[lon, lat], ...], ...] → list of linear rings
            "GeoJSONPolygon": ("coordinates: list[float]", "coordinates: list[list[list[float]]]"),
            # MultiPoint: [[lon, lat], ...] → list of position pairs
            "GeoJSONMultiPoint": ("coordinates: list[float]", "coordinates: list[list[float]]"),
            # MultiLineString: [[[lon, lat], ...], ...] → list of LineStrings
            "GeoJSONMultiLineString": (
                "coordinates: list[float]",
                "coordinates: list[list[list[float]]]",
            ),
            # MultiPolygon: [[[[lon, lat], ...], ...], ...] → list of Polygons
            "GeoJSONMultiPolygon": (
                "coordinates: list[float]",
                "coordinates: list[list[list[list[float]]]]",
            ),
        }
        for class_name, (old_type, new_type) in _pydantic_coord_fixes.items():
            class_marker = f"class {class_name}("
            if class_marker in content:
                idx = content.index(class_marker)
                # Find next class definition or end of file
                next_class = content.find("\nclass ", idx + 1)
                block_end = next_class if next_class != -1 else len(content)
                block = content[idx:block_end]
                fixed_block = block.replace(old_type, new_type, 1)
                content = content[:idx] + fixed_block + content[block_end:]

        # Post-process: Fix nullable array items. LinkML generates
        # list[PositionStyleOverride] but the GeoJSON data uses null entries
        # for positions without custom styling.
        content = content.replace(
            "Optional[list[PositionStyleOverride]]",
            "Optional[list[Optional[PositionStyleOverride]]]",
        )

        # Post-process: Fix Optional list fields with min_length constraints.
        # gen-pydantic emits default=[] for optional multivalued fields, which
        # conflicts with min_length constraints (e.g., bbox with min_length=4).
        # Change default=[] to default=None for Optional fields with min_length.
        import re

        content = re.sub(
            r"(Optional\[list\[[^\]]+\]\])\s*=\s*Field\(default=\[\],"
            r'\s*(description="""[^"]*"""),\s*(min_length=\d+)',
            r"\1 = Field(default=None, \2, \3",
            content,
        )

        # Prepend DO NOT EDIT header
        content = "# AUTO-GENERATED — DO NOT EDIT\n" + content

        output_file.write_text(content)
        print(f"  [OK] Generated: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [FAIL] gen-pydantic failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  [FAIL] gen-pydantic not found. Install with: pip install linkml")
        return False


# GeoJSON coordinate schema definitions per geometry type.
# LinkML generates flat {"items": {"type": "number"}} for all coordinate
# arrays, but GeoJSON requires nested arrays whose depth varies by type.
_GEOJSON_COORDINATE_SCHEMAS: dict[str, dict[str, object]] = {
    # Point: [lon, lat] — flat array of numbers (already correct, listed for completeness)
    "GeoJSONPoint": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2},
    # EmptyPoint: [] — empty array
    "GeoJSONEmptyPoint": {"type": "array", "items": {"type": "number"}, "maxItems": 0},
    # LineString: [[lon, lat], ...]
    "GeoJSONLineString": {
        "type": "array",
        "items": {"type": "array", "items": {"type": "number"}, "minItems": 2},
    },
    # Polygon: [[[lon, lat], ...], ...]
    "GeoJSONPolygon": {
        "type": "array",
        "items": {
            "type": "array",
            "items": {"type": "array", "items": {"type": "number"}, "minItems": 2},
        },
    },
    # MultiPoint: [[lon, lat], ...]
    "GeoJSONMultiPoint": {
        "type": "array",
        "items": {"type": "array", "items": {"type": "number"}, "minItems": 2},
    },
    # MultiLineString: [[[lon, lat], ...], ...]
    "GeoJSONMultiLineString": {
        "type": "array",
        "items": {
            "type": "array",
            "items": {"type": "array", "items": {"type": "number"}, "minItems": 2},
        },
    },
    # MultiPolygon: [[[[lon, lat], ...], ...], ...]
    "GeoJSONMultiPolygon": {
        "type": "array",
        "items": {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": "array", "items": {"type": "number"}, "minItems": 2},
            },
        },
    },
}


def _fix_geojson_coordinates(schema: dict[str, object]) -> None:
    """Patch GeoJSON coordinate definitions in a full JSON Schema.

    Replaces the flat ``{"items": {"type": "number"}}`` emitted by LinkML's
    gen-json-schema with properly nested array schemas that match the GeoJSON
    specification (RFC 7946).

    Also fixes nullable array items for ``position_style_overrides`` where
    LinkML doesn't support nullable items in arrays.
    """
    defs = schema.get("$defs", {})
    if not isinstance(defs, dict):
        return

    for geom_name, coord_schema in _GEOJSON_COORDINATE_SCHEMAS.items():
        geom_def = defs.get(geom_name)
        if not isinstance(geom_def, dict):
            continue
        props = geom_def.get("properties", {})
        if not isinstance(props, dict):
            continue
        if "coordinates" in props:
            # Preserve the description from the original schema
            desc = props["coordinates"].get("description", "")
            props["coordinates"] = {**coord_schema, "description": desc}

    # Fix nullable array items: position_style_overrides can contain null entries
    track_props = defs.get("TrackProperties")
    if isinstance(track_props, dict):
        props = track_props.get("properties", {})
        if isinstance(props, dict) and "position_style_overrides" in props:
            pso = props["position_style_overrides"]
            if isinstance(pso, dict) and "$ref" in pso.get("items", {}):
                ref_val = pso["items"]["$ref"]
                pso["items"] = {
                    "anyOf": [
                        {"$ref": ref_val},
                        {"type": "null"},
                    ]
                }


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
        _fix_geojson_coordinates(full_schema)

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

        # Prepend DO NOT EDIT header
        content = "// AUTO-GENERATED — DO NOT EDIT\n" + content

        output_file.write_text(content)
        print(f"  [OK] Generated: {output_file}")

        # Create index.ts that re-exports everything
        index_file = TYPESCRIPT_OUT / "index.ts"
        index_file.write_text('export * from "./types.js";\nexport * from "./unions.js";\n')
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
