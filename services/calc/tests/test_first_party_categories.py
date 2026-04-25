"""
First-party tool-category coverage test (Feature 207 FR-003, FR-008).

Walks the global `registry.list_all()` and asserts that every registered
first-party tool has declared a visual `category` (one of the five
canonical `ToolCategoryEnum` values). A tool that ships without a
declared category — either through a typo or simple oversight — fails
this test, preventing it from being merged.

Contrib tools registered via future extension-discovery paths are
explicitly *exempt* from this test (spec A3); when that discovery path
lands it will live under a different registry, and this test stays
focused on first-party tools defined under `services/calc/debrief_calc/`.
"""

from __future__ import annotations

import importlib

import pytest

from debrief_calc.models import ToolCategoryEnum
from debrief_calc.registry import registry

# Ensure every first-party tool module is imported so `registry.list_all()`
# is fully populated. This mirrors what `debrief_calc.tools.__init__`
# does in production.
_TOOL_MODULES = [
    "debrief_calc.tools.track_stats",
    "debrief_calc.tools.range_bearing",
    "debrief_calc.tools.area_summary",
    "debrief_calc.tools.reference.classification",
    "debrief_calc.tools.reference.generation",
    "debrief_calc.tools.sensor.detection.buffer_zone_generator",
    "debrief_calc.tools.shape.manipulation.move_shape",
    "debrief_calc.tools.shape.manipulation.enlarge_shape",
    "debrief_calc.tools.track.manipulation.generate_courses_speeds",
    "debrief_calc.tools.track.styling.apply_symbol_style",
    "debrief_calc.tools.track.styling.label_interval",
    "debrief_calc.tools.track.styling.set_track_color",
    "debrief_calc.tools.track.styling.symbol_interval",
]

CANONICAL_CATEGORY_VALUES = {e.value for e in ToolCategoryEnum}


@pytest.fixture(scope="module", autouse=True)
def _load_all_tools() -> None:
    """Import every tool module once per session so the registry is populated."""
    for module_name in _TOOL_MODULES:
        importlib.import_module(module_name)


def test_every_first_party_tool_has_a_category() -> None:
    """FR-003: first-party tools MUST declare a visual category."""
    tools_without_category = [t.name for t in registry.list_all() if t.category is None]
    assert not tools_without_category, (
        "The following first-party tools have no visual category declared:\n"
        + "\n".join(f"  - {n}" for n in tools_without_category)
        + "\n\n"
        + "Add `category=ToolCategoryEnum.<one-of-five>` to their @tool "
        + "decorator. See specs/207-tool-manifest-categories/quickstart.md."
    )


def test_every_category_is_canonical() -> None:
    """FR-001 / FR-008: declared category values must be canonical.

    `Tool.category` may be stored as either a `ToolCategoryEnum` instance
    (when constructed via `@tool(category=ToolCategoryEnum.calc)`) or as
    the underlying string (when constructed from Pydantic's use_enum_values
    path). Both forms compare-equal to the string value for membership.
    """
    non_canonical = []
    for t in registry.list_all():
        if t.category is None:
            continue
        value = t.category.value if isinstance(t.category, ToolCategoryEnum) else t.category
        if value not in CANONICAL_CATEGORY_VALUES:
            non_canonical.append((t.name, t.category))
    assert not non_canonical, "Tools with non-canonical category values:\n" + "\n".join(
        f"  - {n!r}: {c!r}" for n, c in non_canonical
    )


def test_every_first_party_tool_emits_ui_category_annotation() -> None:
    """FR-004: the MCP annotation path carries the value."""
    missing = [
        t.name
        for t in registry.list_all()
        if t.category is not None
        and t.to_mcp_tool()["annotations"].get("debrief:uiCategory") is None
    ]
    assert not missing, (
        "Tools with a declared category whose to_mcp_tool() output omits "
        "the debrief:uiCategory annotation:\n" + "\n".join(f"  - {n}" for n in missing)
    )


def test_registry_is_non_empty() -> None:
    """Sanity check — ensure we are actually measuring something."""
    assert len(registry.list_all()) >= len(_TOOL_MODULES), (
        f"Expected at least {len(_TOOL_MODULES)} tools registered; got {len(registry.list_all())}."
    )
