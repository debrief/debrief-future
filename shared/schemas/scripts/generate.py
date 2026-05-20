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

# Source schemas
MASTER_SCHEMA = LINKML_DIR / "debrief.yaml"
# JSON Schema uses a subset that excludes session-state (gen-json-schema bug
# with Coordinate as multivalued class range).
JSONSCHEMA_SCHEMA = LINKML_DIR / "debrief-jsonschema.yaml"

# Output directories
PYTHON_OUT = GENERATED_DIR / "python" / "debrief_schemas"
JSONSCHEMA_OUT = GENERATED_DIR / "json-schema"
TYPESCRIPT_OUT = GENERATED_DIR / "typescript"

# Documentation output (uncommitted — lives under build/, consumed by MkDocs)
BUILD_DIR = SCHEMAS_ROOT / "build"
DOCS_MD_OUT = BUILD_DIR / "md"
DOCS_TEMPLATES = SCHEMAS_ROOT / "docs-templates"


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

        # Post-process: gen-pydantic embeds the source YAML's *absolute* path in
        # the LinkMLMeta `source_file` field. That path differs between a
        # developer's machine (`/home/<user>/…/shared/schemas/src/linkml/debrief.yaml`)
        # and the GitHub Actions runner (`/home/runner/work/debrief-future/debrief-future/…`),
        # which trips the CI drift gate (spec 240 / T013) even though the
        # schema content is byte-identical. Normalise to a stable repo-relative
        # form so the committed artefact is environment-independent.
        import re as _re_src

        content = _re_src.sub(
            r"'source_file':\s*'[^']*src/linkml/([^']+)'",
            r"'source_file': 'src/linkml/\1'",
            content,
        )

        # Post-process: gen-pydantic emits dict[str, Any] in boilerplate classes
        # (ConfiguredBaseModel, LinkMLMeta). Replace with dict[str, object] to
        # eliminate Any from generated code. These are infrastructure classes,
        # not domain models — object is sufficient for their serialisation needs.
        content = content.replace("dict[str, Any]", "dict[str, object]")
        # Post-process: LinkML emits `Optional[Any]` for `range: Any` slots
        # (RawGeoJSONFeature.properties). Replace with `Optional[dict[str, object]]`
        # to stay Article-XV-compliant (no authored `Any` in generated code).
        content = content.replace("Optional[Any]", "Optional[dict[str, object]]")
        # Remove the Any import if it's no longer used. We search for any
        # remaining `Any`-as-a-typing-token occurrences (word boundary, not
        # preceded by lowercase letters to avoid matching "Any" inside other
        # identifiers).
        import re as _re

        if not _re.search(r"(?<![A-Za-z_])Any(?![A-Za-z_])", content):
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

        # ----------------------------------------------------------------------
        # STAC cluster post-processing (Feature #223 / Research R-011)
        # ----------------------------------------------------------------------
        # LinkML cannot express list-of-lists slots directly, so the
        # StacSpatialExtent.bbox and StacTemporalExtent.interval slots are
        # authored as flat `multivalued` and rewritten here. Same precedent
        # as the GeoJSON coordinate fixes above.
        _stac_nested_pydantic_fixes = {
            "StacSpatialExtent": (
                "bbox: list[float]",
                "bbox: list[list[float]]",
            ),
            "StacTemporalExtent": (
                "interval: list[str]",
                "interval: list[list[Optional[str]]]",
            ),
        }
        for class_name, (old_type, new_type) in _stac_nested_pydantic_fixes.items():
            class_marker = f"class {class_name}("
            if class_marker in content:
                idx = content.index(class_marker)
                next_class = content.find("\nclass ", idx + 1)
                block_end = next_class if next_class != -1 else len(content)
                block = content[idx:block_end]
                fixed_block = block.replace(old_type, new_type, 1)
                if fixed_block == block:
                    raise RuntimeError(
                        f"generate.py: STAC nested-array post-processor had no "
                        f"effect on {class_name} — gen-pydantic output no longer "
                        f"contains the expected `{old_type}` token. Update "
                        f"generate.py (Feature 223)."
                    )
                content = content[:idx] + fixed_block + content[block_end:]

        # Rewrite the open-record asset map slot. Authored as `range: Any` in
        # LinkML (which renders as `Any` in Pydantic), it must become a typed
        # `dict[str, StacAsset]` so consumers get autocomplete on asset
        # values. StacItem.assets is required; StacCollection.item_assets is
        # optional. Note: the earlier post-processor at the top of this
        # function rewrites `Optional[Any]` → `Optional[dict[str, object]]`,
        # so we match the already-substituted form for the Collection slot.
        _stac_assets_fixes: list[tuple[str, str, str]] = [
            ("class StacItem(", "assets: Any = Field", "assets: dict[str, StacAsset] = Field"),
            (
                "class StacCollection(",
                "item_assets: Optional[dict[str, object]] = Field",
                "item_assets: Optional[dict[str, StacItemAssetDefinition]] = Field",
            ),
        ]
        for class_marker, old, new in _stac_assets_fixes:
            if class_marker in content:
                idx = content.index(class_marker)
                next_class = content.find("\nclass ", idx + 1)
                block_end = next_class if next_class != -1 else len(content)
                block = content[idx:block_end]
                fixed_block = block.replace(old, new, 1)
                if fixed_block == block:
                    raise RuntimeError(
                        f"generate.py: STAC asset-dict post-processor had no "
                        f"effect on {class_marker} — gen-pydantic output no "
                        f"longer contains `{old}`. Update generate.py "
                        f"(Feature 223)."
                    )
                content = content[:idx] + fixed_block + content[block_end:]

        # Mark the three open-record classes as `extra='allow'` so STAC
        # extension keys (`debrief:*`, `file:*`, `processing:*`, `proj:*`)
        # pass through validation without rejection. Article XV.2 exception
        # documented in plan.md Complexity Tracking. The classes inherit
        # from ConfiguredBaseModel which sets `extra='forbid'`; we override
        # by inserting `model_config = ConfigDict(extra='allow')` after the
        # full linkml_meta declaration (which may span multiple lines).
        for stac_open_class in (
            "StacItemProperties",
            "StacAsset",
            "StacItemAssetDefinition",
            "StacSummaries",
        ):
            class_marker = f"class {stac_open_class}("
            if class_marker not in content:
                raise RuntimeError(
                    f"generate.py: STAC extra='allow' post-processor could "
                    f"not find `{class_marker}` — gen-pydantic output is "
                    f"missing the expected class. Update generate.py "
                    f"(Feature 223)."
                )
            idx = content.index(class_marker)
            linkml_meta_idx = content.index("linkml_meta: ClassVar[LinkMLMeta]", idx)
            # Walk forward from the start of LinkMLMeta(...) and balance
            # parentheses to find the true end of the call expression.
            paren_open = content.index("LinkMLMeta(", linkml_meta_idx)
            cursor = paren_open + len("LinkMLMeta")
            depth = 0
            while cursor < len(content):
                ch = content[cursor]
                if ch == "(":
                    depth += 1
                elif ch == ")":
                    depth -= 1
                    if depth == 0:
                        cursor += 1
                        break
                cursor += 1
            # Advance past the trailing newline so insertion lands on its
            # own line.
            newline_idx = content.find("\n", cursor)
            line_end = (newline_idx + 1) if newline_idx != -1 else cursor
            insertion = (
                "    model_config = ConfigDict(\n"
                "        extra='allow',\n"
                "        serialize_by_alias=True,\n"
                "        validate_by_name=True,\n"
                "        validate_assignment=True,\n"
                "        validate_default=True,\n"
                "        arbitrary_types_allowed=True,\n"
                "        use_enum_values=True,\n"
                "    )\n"
            )
            content = content[:line_end] + insertion + content[line_end:]

        # Prepend DO NOT EDIT header
        content = "# AUTO-GENERATED — DO NOT EDIT\n" + content

        output_file.write_text(content, encoding="utf-8", newline="\n")
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

    schema_file = JSONSCHEMA_SCHEMA if JSONSCHEMA_SCHEMA.exists() else MASTER_SCHEMA
    if not schema_file.exists():
        print(f"  [FAIL] Schema not found: {schema_file}")
        return False

    JSONSCHEMA_OUT.mkdir(parents=True, exist_ok=True)
    output_file = JSONSCHEMA_OUT / "debrief.schema.json"

    cmd = [
        "gen-json-schema",
        str(schema_file),
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)

        # Post-process: gen-json-schema emits "type": "string" alongside "anyOf"
        # for any_of union fields (e.g., geometry unions). The spurious "type" must
        # be removed so AJV validates against the anyOf alternatives instead.
        full_schema = json.loads(result.stdout)
        _strip_type_from_anyof(full_schema)
        _fix_geojson_coordinates(full_schema)

        output_file.write_text(json.dumps(full_schema, indent=2), encoding="utf-8", newline="\n")
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
                entity_file.write_text(
                    json.dumps(entity_schema, indent=2), encoding="utf-8", newline="\n"
                )
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

        # Post-process (Feature 201 / FR-014): narrow `symbol: string` on the
        # two enum-ranged attributes (`PositionStyle.symbol`,
        # `PositionStyleOverride.symbol`) to the template-literal union
        # `PointShape` derived from `PointShapeEnum`. gen-typescript emits
        # `string` for enum-ranged attributes; without this narrowing,
        # callers cannot catch `{ symbol: 'star' }` at compile time. The
        # `PointShape` type is injected immediately after the PointShapeEnum
        # declaration (same file, no cross-package import — avoids a build-
        # order cycle with @debrief/utils which consumes PointShapeEnum).
        _point_shape_decl = (
            "};\n"
            "/**\n"
            "* Template-literal derivation of the permissible point-marker shapes\n"
            "* from PointShapeEnum. Narrows the `symbol` field on PositionStyle /\n"
            "* PositionStyleOverride so TypeScript rejects an unknown shape at\n"
            "* compile time (Feature 201 / FR-014).\n"
            "*/\n"
            "export type PointShape = `${PointShapeEnum}`;\n"
        )
        _point_shape_sentinel = "export enum PointShapeEnum {"
        if _point_shape_sentinel in content and "export type PointShape" not in content:
            # Find the closing brace that ends the PointShapeEnum declaration.
            enum_start = content.index(_point_shape_sentinel)
            enum_end = content.index("};\n", enum_start)
            content = content[:enum_end] + _point_shape_decl + content[enum_end + len("};\n") :]

        _symbol_narrow_targets = ("PositionStyle", "PositionStyleOverride")
        for iface_name in _symbol_narrow_targets:
            old_sig = f"export interface {iface_name}"
            if old_sig in content:
                idx = content.index(old_sig)
                brace_idx = content.index("}", idx)
                block = content[idx:brace_idx]
                fixed_block = block.replace("symbol: string,", "symbol: PointShape,").replace(
                    "symbol?: string,", "symbol?: PointShape,"
                )
                content = content[:idx] + fixed_block + content[brace_idx:]

        # Post-process (Feature 205 / FR-007): narrow `playbackState: string` /
        # `displayMode: string` on `TemporalSlice` to the template-literal
        # unions `PlaybackState` / `DisplayMode` derived from
        # PlaybackStateEnum / DisplayModeEnum. gen-typescript emits `string`
        # for enum-ranged attributes (see the Feature 201 / FR-014 PointShape
        # precedent above); without this narrowing, callers cannot catch
        # `{ playbackState: 'palying' }` or `{ displayMode: 'snailTrail' }`
        # at compile time.
        _playback_state_decl = (
            "};\n"
            "/**\n"
            "* Template-literal derivation of the permissible playback states from\n"
            "* PlaybackStateEnum. Narrows the `playbackState` field on TemporalSlice\n"
            "* so TypeScript rejects an unknown state at compile time (Feature 205 /\n"
            "* FR-007).\n"
            "*/\n"
            "export type PlaybackState = `${PlaybackStateEnum}`;\n"
        )
        _display_mode_decl = (
            "};\n"
            "/**\n"
            "* Template-literal derivation of the permissible display modes from\n"
            "* DisplayModeEnum. Narrows the `displayMode` field on TemporalSlice so\n"
            "* TypeScript rejects an unknown mode at compile time (Feature 205 /\n"
            "* FR-007).\n"
            "*/\n"
            "export type DisplayMode = `${DisplayModeEnum}`;\n"
        )
        _playback_state_sentinel = "export enum PlaybackStateEnum {"
        _display_mode_sentinel = "export enum DisplayModeEnum {"

        if _playback_state_sentinel in content and "export type PlaybackState" not in content:
            enum_start = content.index(_playback_state_sentinel)
            enum_end = content.index("};\n", enum_start)
            content = content[:enum_end] + _playback_state_decl + content[enum_end + len("};\n") :]

        if _display_mode_sentinel in content and "export type DisplayMode" not in content:
            enum_start = content.index(_display_mode_sentinel)
            enum_end = content.index("};\n", enum_start)
            content = content[:enum_end] + _display_mode_decl + content[enum_end + len("};\n") :]

        # Post-process (Feature 258 / FR-001, FR-006): narrow
        # `SceneProperties.display_mode` and `SceneProperties._polygon_source`
        # from `string` to the corresponding template-literal types. Same
        # post-processing rationale as the TemporalSlice case above:
        # gen-typescript collapses enum-ranged slots to bare `string`, and the
        # spec only "means" what it says once these are narrowed.
        _polygon_source_decl = (
            "};\n"
            "/**\n"
            "* Template-literal derivation of the permissible polygon-source values\n"
            "* from PolygonSourceEnum. Narrows the `_polygon_source` field on\n"
            "* SceneProperties so TypeScript rejects an unknown provenance value at\n"
            "* compile time (Feature 258).\n"
            "*/\n"
            "export type PolygonSource = `${PolygonSourceEnum}`;\n"
        )
        _polygon_source_sentinel = "export enum PolygonSourceEnum {"
        if _polygon_source_sentinel in content and "export type PolygonSource" not in content:
            enum_start = content.index(_polygon_source_sentinel)
            enum_end = content.index("};\n", enum_start)
            content = content[:enum_end] + _polygon_source_decl + content[enum_end + len("};\n") :]

        _scene_props_start = content.find("export interface SceneProperties ")
        if _scene_props_start == -1:
            raise RuntimeError(
                "generate.py: gen-typescript did not emit `export interface SceneProperties`."
            )
        _scene_props_end = content.index("}\n", _scene_props_start) + 2
        _scene_props_block = content[_scene_props_start:_scene_props_end]
        _new_scene_props_block = _scene_props_block.replace(
            "    display_mode?: string,\n", "    display_mode?: DisplayMode,\n", 1
        ).replace("    _polygon_source?: string,\n", "    _polygon_source?: PolygonSource,\n", 1)
        if _new_scene_props_block == _scene_props_block:
            raise RuntimeError(
                "generate.py: SceneProperties enum-slot post-processor had no "
                "effect — gen-typescript output no longer contains the expected "
                "`display_mode?: string` / `_polygon_source?: string` tokens. Update "
                "generate.py (Feature 258)."
            )
        content = content[:_scene_props_start] + _new_scene_props_block + content[_scene_props_end:]

        # Narrow the two TemporalSlice fields from string → template-literal type.
        _temporal_slice_start = content.find("export interface TemporalSlice {\n")
        if _temporal_slice_start == -1:
            raise RuntimeError(
                "generate.py: gen-typescript did not emit `export interface TemporalSlice`."
            )
        _temporal_slice_end = content.index("}\n", _temporal_slice_start) + 2
        _temporal_slice_block = content[_temporal_slice_start:_temporal_slice_end]
        _new_block = _temporal_slice_block.replace(
            "    playbackState: string,\n", "    playbackState: PlaybackState,\n", 1
        ).replace("    displayMode: string,\n", "    displayMode: DisplayMode,\n", 1)
        if _new_block == _temporal_slice_block:
            raise RuntimeError(
                "generate.py: TemporalSlice enum-slot post-processor had no "
                "effect — gen-typescript output no longer contains the expected "
                "`playbackState: string` / `displayMode: string` tokens. Update "
                "generate.py (Feature 205)."
            )
        content = content[:_temporal_slice_start] + _new_block + content[_temporal_slice_end:]

        # Post-process (#208): narrow LogEntry.activity_type from string → ActivityType.
        # gen-typescript doesn't wire enum ranges into interface field types; the
        # ActivityType enum declaration is emitted separately but the slot range
        # collapses to `string`. We rewrite the single occurrence inside the
        # LogEntry interface block.
        _log_entry_start = content.find("export interface LogEntry {\n")
        if _log_entry_start == -1:
            raise RuntimeError(
                "generate.py: gen-typescript did not emit `export interface LogEntry`."
            )
        _log_entry_end = content.index("}\n", _log_entry_start) + 2
        _log_entry_block = content[_log_entry_start:_log_entry_end]
        _new_log_entry_block = _log_entry_block.replace(
            "    activity_type?: string,\n",
            "    activity_type?: ActivityType,\n",
            1,
        )
        if _new_log_entry_block == _log_entry_block:
            raise RuntimeError(
                "generate.py: LogEntry.activity_type post-processor had no "
                "effect — gen-typescript output no longer contains the expected "
                "`activity_type?: string` token. Update generate.py (Feature 208)."
            )
        content = content[:_log_entry_start] + _new_log_entry_block + content[_log_entry_end:]

        # Post-process (#214): tag the generated `GeoJSONFeature` interface
        # with `// canonical` so the `scripts/check-no-geojson-feature.sh`
        # regression guard (wired into `task lint`) doesn't flag the
        # schema's own declaration.
        content = content.replace(
            "export interface GeoJSONFeature {",
            "export interface GeoJSONFeature { // canonical — LinkML-generated schema type",
        )

        # Post-process (#204): RawGeoJSONFeature needs four narrowing fixes
        # because gen-typescript doesn't emit literal types, any_of unions,
        # or free-form record types for the relevant slots. The fixes are
        # applied line-by-line on three specific fields inside the
        # `export interface RawGeoJSONFeature { … }` block so that changes
        # to the LinkML description text do not break the post-processor.
        raw_feature_start = content.find("export interface RawGeoJSONFeature {\n")
        if raw_feature_start == -1:
            raise RuntimeError(
                "generate.py: gen-typescript did not emit `export interface RawGeoJSONFeature`."
            )
        raw_feature_end = content.index("}\n", raw_feature_start) + 2
        raw_feature_block = content[raw_feature_start:raw_feature_end]
        # 1) discriminated type literal
        new_block = raw_feature_block.replace("    type: string,\n", '    type: "Feature",\n', 1)
        # 2) id union
        new_block = new_block.replace("    id?: string,\n", "    id?: string | number,\n", 1)
        # 3) geometry union
        new_block = new_block.replace(
            "    geometry: string,\n",
            "    geometry: GeoJSONPoint | GeoJSONEmptyPoint | GeoJSONLineString | "
            "GeoJSONPolygon | GeoJSONMultiPoint | GeoJSONMultiLineString | "
            "GeoJSONMultiPolygon,\n",
            1,
        )
        # 4) free-form properties
        new_block = new_block.replace(
            "    properties?: Any,\n",
            "    properties?: Record<string, unknown> | null,\n",
            1,
        )
        if new_block == raw_feature_block:
            raise RuntimeError(
                "generate.py: RawGeoJSONFeature post-processor had no "
                "effect — gen-typescript output no longer contains the "
                "expected `type: string` / `id?: string` / `geometry: string` / "
                "`properties?: Any` tokens. Update generate.py."
            )
        content = content[:raw_feature_start] + new_block + content[raw_feature_end:]

        # RawGeoJSONFeatureCollection.type — literal narrowing.
        content = content.replace(
            "export interface RawGeoJSONFeatureCollection {\n"
            '    /** GeoJSON object type — always "FeatureCollection". */\n'
            "    type: string,",
            "export interface RawGeoJSONFeatureCollection {\n"
            '    /** GeoJSON object type — always "FeatureCollection". */\n'
            '    type: "FeatureCollection",',
        )

        # ----------------------------------------------------------------------
        # STAC cluster post-processing (Feature #223)
        # ----------------------------------------------------------------------
        # 1) Narrow the discriminator `type` slot to a string literal on each
        #    of StacItem / StacCatalog / StacCollection. gen-typescript loses
        #    equals_string when the range is a permissible-value enum.
        # 2) Replace the StacItem.geometry placeholder (`string`) with the
        #    full any_of union (same pattern as RawGeoJSONFeature.geometry).
        # 3) Rewrite the open-record asset map slot:
        #       StacItem.assets       unknown          → Record<string, StacAsset>
        #       StacCollection.item_assets unknown    → Record<string, StacAsset>
        # 4) Rewrite StacSpatialExtent.bbox / StacTemporalExtent.interval to
        #    nested arrays (Research R-011 precedent).
        # 5) Add `[key: string]: unknown` to StacItemProperties, StacAsset, and
        #    StacSummaries so extension keys (`debrief:*`, `file:*`,
        #    `processing:*`, `proj:*`) are permitted at the type level — same
        #    boundary-loose semantics as the Pydantic `extra='allow'` above.

        # (1) Discriminator type literals
        _stac_type_literal_fixes: list[tuple[str, str, str]] = [
            ("export interface StacItem {", 'type: string,', 'type: "Feature",'),
            ("export interface StacCatalog {", 'type: string,', 'type: "Catalog",'),
            ("export interface StacCollection {", 'type: string,', 'type: "Collection",'),
        ]
        for marker, old, new in _stac_type_literal_fixes:
            if marker in content:
                start = content.index(marker)
                end = content.index("}\n", start) + 2
                block = content[start:end]
                fixed_block = block.replace(old, new, 1)
                if fixed_block == block:
                    raise RuntimeError(
                        f"generate.py: STAC type-literal post-processor had no "
                        f"effect on `{marker}` — `{old}` not found. Update "
                        f"generate.py (Feature 223)."
                    )
                content = content[:start] + fixed_block + content[end:]

        # (2) StacItem.geometry — any_of geometry union (same as RawGeoJSONFeature)
        stac_item_start = content.find("export interface StacItem {\n")
        if stac_item_start != -1:
            stac_item_end = content.index("}\n", stac_item_start) + 2
            stac_item_block = content[stac_item_start:stac_item_end]
            new_block = stac_item_block.replace(
                "    geometry: string,\n",
                "    geometry: GeoJSONPoint | GeoJSONEmptyPoint | GeoJSONLineString | "
                "GeoJSONPolygon | GeoJSONMultiPoint | GeoJSONMultiLineString | "
                "GeoJSONMultiPolygon,\n",
                1,
            )
            if new_block == stac_item_block:
                raise RuntimeError(
                    "generate.py: STAC geometry post-processor had no effect — "
                    "gen-typescript output no longer contains the expected "
                    "`geometry: string` token inside StacItem. Update generate.py."
                )
            content = content[:stac_item_start] + new_block + content[stac_item_end:]

        # (3) Open-record asset map. gen-typescript emits `Any` for
        # `range: Any` slots; this patch must run BEFORE the bulk
        # `Any → unknown` substitution later in this function so we can
        # match the typed `Any` token, not the post-substitution `unknown`.
        _stac_record_fixes: list[tuple[str, str, str]] = [
            ("export interface StacItem {", "assets: Any,", "assets: Record<string, StacAsset>,"),
            (
                "export interface StacCollection {",
                "item_assets?: Any,",
                "item_assets?: Record<string, StacItemAssetDefinition>,",
            ),
        ]
        for marker, old, new in _stac_record_fixes:
            if marker in content:
                start = content.index(marker)
                end = content.index("}\n", start) + 2
                block = content[start:end]
                fixed_block = block.replace(old, new, 1)
                if fixed_block == block:
                    raise RuntimeError(
                        f"generate.py: STAC asset-record post-processor had no "
                        f"effect on `{marker}` — `{old}` not found. Update "
                        f"generate.py (Feature 223)."
                    )
                content = content[:start] + fixed_block + content[end:]

        # (4) Nested-array slots (Research R-011)
        _stac_nested_ts_fixes: list[tuple[str, str, str]] = [
            (
                "export interface StacSpatialExtent {",
                "bbox: number[],",
                "bbox: number[][],",
            ),
            (
                "export interface StacTemporalExtent {",
                "interval: string[],",
                "interval: (string | null)[][],",
            ),
        ]
        for marker, old, new in _stac_nested_ts_fixes:
            if marker in content:
                start = content.index(marker)
                end = content.index("}\n", start) + 2
                block = content[start:end]
                fixed_block = block.replace(old, new, 1)
                if fixed_block == block:
                    raise RuntimeError(
                        f"generate.py: STAC nested-array post-processor had no "
                        f"effect on `{marker}` — `{old}` not found. Update "
                        f"generate.py (Feature 223)."
                    )
                content = content[:start] + fixed_block + content[end:]

        # (5) Extension-key open-record on the three boundary-loose classes
        _stac_open_record_classes = (
            "StacItemProperties",
            "StacAsset",
            "StacItemAssetDefinition",
            "StacSummaries",
        )
        for cls_name in _stac_open_record_classes:
            marker = f"export interface {cls_name}"
            if marker not in content:
                raise RuntimeError(
                    f"generate.py: STAC open-record post-processor could not "
                    f"find `{marker}`. Update generate.py (Feature 223)."
                )
            start = content.index(marker)
            # Find the closing brace of this interface block.
            end = content.index("}\n", start)
            # Insert the index signature on a new line just before the close.
            # Preserve the trailing comma convention used by gen-typescript.
            insertion = "    [key: string]: unknown,\n"
            content = content[:end] + insertion + content[end:]

        # Drop the empty `export interface Any {}` stub — it's the LinkML
        # wildcard class that the post-processor has already mapped to
        # `Record<string, unknown>` at the usage site. Leaving it in the
        # output would ship an exported `Any` symbol that other packages
        # could accidentally import, defeating Article XV.
        import re as _re_any

        content = _re_any.sub(
            r"/\*\*\s*\n\s*\*[^*]*LinkML idiom[^*]*"
            r"\*/\s*\nexport interface Any \{\s*\n\}\s*\n\s*\n",
            "",
            content,
        )

        # Post-process: any remaining `Any`-typed slot fields (`: Any,`,
        # `?: Any,`, `: Any[]`, etc.) come from LinkML `range: Any` slots
        # that did not get a per-field post-processor (the RawGeoJSONFeature
        # block above handles RawGeoJSON.properties specifically; this is
        # the general fallback used by the MCP envelope cluster (#222) and
        # any future schemas that use `range: Any`).
        #
        # Mapping rule: `Any` becomes `unknown` so consumers MUST narrow
        # before reading (Article XV.2 spirit). `unknown` is preferred over
        # `Record<string, unknown>` because not every `Any` slot is an
        # object — some carry primitives or arrays (e.g. tool result
        # payloads).
        content = _re_any.sub(
            r"(?<![A-Za-z_])Any(?![A-Za-z_])",
            "unknown",
            content,
        )

        # Prepend DO NOT EDIT header
        content = "// AUTO-GENERATED — DO NOT EDIT\n" + content

        output_file.write_text(content, encoding="utf-8", newline="\n")
        print(f"  [OK] Generated: {output_file}")

        # Create index.ts that re-exports everything (generated types,
        # union helpers, and the TS-only function aliases for the MCP
        # cluster — spec 222 Research R-002).
        index_file = TYPESCRIPT_OUT / "index.ts"
        index_file.write_text(
            'export * from "./types.js";\n'
            'export * from "./unions.js";\n'
            "export type { ToolExecutor, ToolVersionResolver } "
            'from "../../typescript/aliases/mcp-functions.js";\n'
            'export type { StacCatalogOrCollection } '
            'from "../../typescript/aliases/stac-unions.js";\n',
            encoding="utf-8",
            newline="\n",
        )
        print(f"  [OK] Generated: {index_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [FAIL] gen-typescript failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  [FAIL] gen-typescript not found. Install with: pip install linkml")
        return False


def generate_markdown_docs() -> bool:
    """Generate Markdown documentation from the LinkML schema via `gen-doc`.

    Output goes to ``build/md/`` for MkDocs to consume. Flag choices:

    - ``--render-imports`` — essential; ``debrief.yaml`` is a pure import
      aggregator, so without this flag no content is rendered.
    - ``--subfolder-type-separation`` — groups outputs into
      ``classes/``, ``slots/``, ``enums/``, ``types/`` subdirectories for
      cleaner navigation in MkDocs.
    - ``--hierarchical-class-view`` — index page shows classes indented by
      inheritance, making the ~91-class tree readable at a glance.
    - ``--include-top-level-diagram`` — index page shows a Mermaid ER diagram
      of the whole schema; individual class pages get their own diagrams by
      default.
    """
    if not MASTER_SCHEMA.exists():
        print(f"  [FAIL] Master schema not found: {MASTER_SCHEMA}")
        return False

    DOCS_MD_OUT.mkdir(parents=True, exist_ok=True)

    cmd = [
        "gen-doc",
        "--render-imports",
        "--subfolder-type-separation",
        "--hierarchical-class-view",
        # Intentionally NOT passing --include-top-level-diagram: when the
        # diagram type is mermaid_class_diagram, linkml's index template calls
        # gen.mermaid_diagram() which returns None (the class-diagram path is
        # handled only in per-class jinja templates). Jinja stringifies that
        # to "None", producing a broken Mermaid block on the index page.
        # Per-class diagrams are unaffected — they render via the
        # class_diagram.md.jinja2 include in our template override.
        "--diagram-type",
        "mermaid_class_diagram",
        # Local template override adds a defensive fix for classes with
        # postcondition-only rules (see docs-templates/class.md.jinja2).
        "--template-directory",
        str(DOCS_TEMPLATES),
        "--directory",
        str(DOCS_MD_OUT),
        str(MASTER_SCHEMA),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"  [OK] Generated Markdown docs: {DOCS_MD_OUT}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [FAIL] gen-doc failed: {e.stderr}")
        return False
    except FileNotFoundError:
        print("  [FAIL] gen-doc not found. Install with: pip install linkml")
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
        choices=["pydantic", "jsonschema", "typescript", "docs", "all"],
        default="all",
        help=(
            "Which schema(s) to generate (default: all). "
            "'docs' runs gen-doc only and is NOT included in 'all' — "
            "it's a separate, heavier pipeline consumed by mkdocs."
        ),
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

    if args.target == "docs":
        print("Generating Markdown documentation...")
        if not generate_markdown_docs():
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
