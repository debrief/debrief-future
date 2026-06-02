"""Prefix-aware STAC extension typing — generator transform tests (Feature 256).

Covers:
- FR-002 / FR-013: the prefix transform is a pure, schema-driven function, so a
  *new* modelled ``debrief:*`` slot flows through to a prefixed TS key with no
  edit to the generator (proved here without a full regen).
- The schema-convention guard: every modelled slot whose ``slot_uri`` carries a
  ``debrief:`` prefix is emitted under its colon key in the committed
  ``types.ts`` (none left bare), across StacExtensionProperties / StacSummaries
  / StacAsset.
"""

import importlib.util
from pathlib import Path

SCHEMAS_ROOT = Path(__file__).parent.parent
GENERATE_PY = SCHEMAS_ROOT / "scripts" / "generate.py"
TYPES_TS = SCHEMAS_ROOT / "src" / "generated" / "typescript" / "types.ts"


def _load_generate_module():
    """Import ``scripts/generate.py`` as a module without running it."""
    spec = importlib.util.spec_from_file_location("debrief_generate", GENERATE_PY)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


generate = _load_generate_module()


# --- FR-002 / FR-013: pure-function transform, new slot flows automatically ---


def test_prefix_extension_slots_rewrites_mapped_keys() -> None:
    """A mapped slot's bare key is rewritten to its (colon) slot_uri."""
    block = (
        "export interface StacExtensionProperties {\n"
        "    platforms?: PlatformRecord[],\n"
        "    provenance_log?: PropertiesProvenanceEntry[],\n"
        "}"
    )
    slot_map = {
        "platforms": "debrief:platforms",
        "provenance_log": "debrief:provenance_log",
    }
    out = generate.prefix_extension_slots(block, slot_map)
    assert "'debrief:platforms'?: PlatformRecord[]," in out
    assert "'debrief:provenance_log'?: PropertiesProvenanceEntry[]," in out
    # Bare keys must be gone.
    assert "\n    platforms?:" not in out
    assert "\n    provenance_log?:" not in out


def test_prefix_extension_slots_new_slot_flows_without_generator_edit() -> None:
    """FR-002: a brand-new modelled slot flows through purely from the map.

    Simulates a schema author adding ``debrief:reviewed_by`` — the transform
    rewrites it with no code change, proving the promise deterministically.
    """
    block = (
        "export interface StacExtensionProperties {\n"
        "    platforms?: PlatformRecord[],\n"
        "    reviewed_by?: string,\n"
        "}"
    )
    slot_map = {
        "platforms": "debrief:platforms",
        "reviewed_by": "debrief:reviewed_by",  # the "new" slot
    }
    out = generate.prefix_extension_slots(block, slot_map)
    assert "'debrief:reviewed_by'?: string," in out


def test_prefix_extension_slots_leaves_unmapped_slots_untouched() -> None:
    """Non-extension slots (e.g. StacAsset.href, type, roles) are not rewritten."""
    block = (
        "export interface StacAsset {\n"
        "    href: string,\n"
        "    type?: string,\n"
        "    roles?: string[],\n"
        "    tool_id?: string,\n"
        "}"
    )
    slot_map = {"tool_id": "debrief:toolId"}
    out = generate.prefix_extension_slots(block, slot_map)
    assert "'debrief:toolId'?: string," in out
    # Unmapped slots are byte-for-byte preserved.
    assert "    href: string,\n" in out
    assert "    type?: string,\n" in out
    assert "    roles?: string[],\n" in out
    assert "debrief:href" not in out


def test_prefix_extension_slots_does_not_touch_substring_matches() -> None:
    """`platforms` must not match inside `debrief_platforms` (anchored keys)."""
    block = (
        "export interface StacSummaries {\n"
        "    debrief_platforms?: PlatformRecord[],\n"
        "}"
    )
    # Only the full slot name is mapped.
    slot_map = {"debrief_platforms": "debrief:platforms"}
    out = generate.prefix_extension_slots(block, slot_map)
    assert "'debrief:platforms'?: PlatformRecord[]," in out
    assert "debrief_platforms" not in out


# --- Schema-convention guard over the committed artefact -----------------------


def _class_block(types_src: str, cls_name: str) -> str:
    marker = f"export interface {cls_name} "
    start = types_src.index(marker)
    end = types_src.index("}\n", start)
    return types_src[start:end]


def test_loader_returns_extension_slot_uris_for_three_classes() -> None:
    """The loader resolves slot_uri maps for all three prefix-bearing classes."""
    slot_uri_map = generate._load_extension_slot_uri_map()
    assert set(slot_uri_map) == {
        "StacExtensionProperties",
        "StacSummaries",
        "StacAsset",
    }
    # All resolved slot_uris carry the debrief: extension prefix.
    for cls, slots in slot_uri_map.items():
        assert slots, f"{cls} resolved no extension slots"
        for slot_name, slot_uri in slots.items():
            assert slot_uri.startswith("debrief:"), (cls, slot_name, slot_uri)


def test_committed_types_emit_every_extension_slot_under_colon_key() -> None:
    """Convention guard: every modelled debrief: slot is emitted prefixed.

    For each target class, every slot in the loader's map MUST appear in the
    committed ``types.ts`` under its quoted ``slot_uri`` key, and its bare slot
    name MUST NOT survive as a property key. Catches a future slot whose
    ``slot_uri`` diverges from the convention, or a gen-typescript change that
    reverts to bare keys.
    """
    types_src = TYPES_TS.read_text()
    slot_uri_map = generate._load_extension_slot_uri_map()
    for cls_name, slots in slot_uri_map.items():
        block = _class_block(types_src, cls_name)
        for slot_name, slot_uri in slots.items():
            assert f"'{slot_uri}'" in block, (
                f"{cls_name}.{slot_name}: expected colon key '{slot_uri}' "
                f"in generated block"
            )
            # The bare key must not survive as a property declaration.
            assert f"\n    {slot_name}?:" not in block, (
                f"{cls_name}.{slot_name}: bare key still present — prefix "
                f"transform did not run"
            )


def test_committed_types_structural_shape() -> None:
    """Structural: expected prefixed-key counts and index-signature retention.

    - StacExtensionProperties: 5 prefixed item slots, NO index signature
      (openness is provided by the derived StacItemProperties).
    - StacSummaries: 3 prefixed summary slots, retains the index signature.
    - StacAsset: 2 NEW prefixed asset slots, retains the index signature, and
      its non-extension slots (href/type/roles) remain bare.
    """
    types_src = TYPES_TS.read_text()

    ext = _class_block(types_src, "StacExtensionProperties")
    assert ext.count("'debrief:") == 5
    assert "[key: string]: unknown," not in ext

    summ = _class_block(types_src, "StacSummaries")
    assert summ.count("'debrief:") == 3
    assert "[key: string]: unknown," in summ

    asset = _class_block(types_src, "StacAsset")
    assert "'debrief:toolId'?: string," in asset
    assert "'debrief:snapshotTimestamp'?: string," in asset
    assert "[key: string]: unknown," in asset
    # Non-extension slots stay bare.
    assert "    href: string," in asset
    assert "    roles?: string[]," in asset
