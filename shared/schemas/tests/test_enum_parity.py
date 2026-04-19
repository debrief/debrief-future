"""
Enum-parity adherence test for Feature 201 (FR-017 / R-012 / SC-010).

LinkML currently defines two marker-shape enums:
- `PointShapeEnum` — styling attribute context (`PositionStyle.symbol`,
  `PositionStyleOverride.symbol`).
- `MarkerSymbolEnum` — tool-parameter context (e.g. `apply-symbol-style`
  tool's `symbol` param, documented as "superset of PointShapeEnum").

Feature #091 deliberately split them so the two contexts could evolve
independently. Today their permissible-value sets are identical. Feature
201 option 17B keeps both enums and pins that equality here via an
adherence test so they cannot silently drift apart.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

JSONSCHEMA_DIR = Path(__file__).parent.parent / "src" / "generated" / "json-schema"


def _get_enum_values(enum_name: str) -> list[str]:
    """Extract the `enum` array for *enum_name* from the generated JSON Schema."""
    main_schema = json.loads((JSONSCHEMA_DIR / "debrief.schema.json").read_text())
    enum_def = main_schema.get("$defs", {}).get(enum_name, {})
    return enum_def.get("enum", [])


class TestPointShapeMarkerSymbolParity:
    """PointShapeEnum and MarkerSymbolEnum MUST have identical value sets."""

    def test_both_enums_present_in_generated_schema(self) -> None:
        point_shapes = _get_enum_values("PointShapeEnum")
        marker_symbols = _get_enum_values("MarkerSymbolEnum")

        assert point_shapes, (
            "PointShapeEnum not found in generated JSON Schema — is the "
            "schema generation step up to date?"
        )
        assert marker_symbols, (
            "MarkerSymbolEnum not found in generated JSON Schema — is the "
            "schema generation step up to date?"
        )

    def test_permissible_value_sets_are_identical(self) -> None:
        point_shapes = set(_get_enum_values("PointShapeEnum"))
        marker_symbols = set(_get_enum_values("MarkerSymbolEnum"))

        missing_from_marker = point_shapes - marker_symbols
        missing_from_point = marker_symbols - point_shapes

        if missing_from_marker or missing_from_point:
            diagnostic = (
                "PointShapeEnum and MarkerSymbolEnum have drifted apart "
                "(Feature 201 FR-017 / R-012 option 17B).\n"
            )
            if missing_from_marker:
                diagnostic += (
                    f"  In PointShapeEnum but not MarkerSymbolEnum: "
                    f"{sorted(missing_from_marker)}\n"
                )
            if missing_from_point:
                diagnostic += (
                    f"  In MarkerSymbolEnum but not PointShapeEnum: "
                    f"{sorted(missing_from_point)}\n"
                )
            diagnostic += (
                "  Update both enums together (or merge them per option "
                "17A in a follow-up) — this test exists to force the "
                "coupled edit."
            )
            raise AssertionError(diagnostic)
