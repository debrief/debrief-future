#!/usr/bin/env python3
"""One-shot upgrade of preview/workspace/samples/local-store/ to STAC 1.1.0
+ processing/file extensions + new asset-key conventions.

Spec 241 — see tasks.md T042/T043 for full contract. Per #228 precedent the
script lives in the repository for a single review cycle and is deleted in the
same PR (T057). Until then it serves as the deterministic, idempotent way to
reproduce the regenerated catalog from the legacy 1.0 baseline.

Usage:
    uv run python scripts/upgrade-catalog-to-stac-1.1.py
    uv run python scripts/upgrade-catalog-to-stac-1.1.py --catalog-root <path>
    uv run python scripts/upgrade-catalog-to-stac-1.1.py --no-git-mv  # for tests

Idempotency: a second run produces zero diff (verified by FR-019 / SC-007).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Make sure we can import from the workspace.
_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT / "services" / "stac" / "src"))
sys.path.insert(0, str(_REPO_ROOT / "services" / "stac" / "tests"))

from debrief_stac._helpers import (  # noqa: E402
    DEFAULT_PROVIDERS,
    STAC_EXTENSION_DEBRIEF,
    STAC_EXTENSION_FILE,
    STAC_EXTENSION_PROCESSING,
    multihash_sha256,
    normalise_to_utc,
)
from debrief_stac.collection import ITEM_ASSETS_TEMPLATE  # noqa: E402

# Import the vendored-schema validator harness.
from _stac_schema_harness import (  # type: ignore[import-not-found]  # noqa: E402
    validate_stac_collection,
    validate_stac_item,
)


_DEFAULT_CATALOG_ROOT = (
    _REPO_ROOT / "preview" / "workspace" / "samples" / "local-store"
)


def _git_introduction_iso(path: Path) -> str | None:
    """Return RFC 3339 of the commit that introduced ``path``, or None if untracked."""
    try:
        result = subprocess.run(
            [
                "git",
                "log",
                "--diff-filter=A",
                "--follow",
                "--format=%aI",
                "--",
                str(path),
            ],
            cwd=_REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError:
        return None
    lines = [line.strip() for line in result.stdout.strip().splitlines() if line.strip()]
    if not lines:
        return None
    # ``--diff-filter=A`` may produce multiple lines if a file was added more
    # than once (rare but possible after delete+restore); the earliest is last.
    return normalise_to_utc(lines[-1])


def _mtime_iso(path: Path) -> str:
    return normalise_to_utc(
        datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    )


def _upgrade_extensions(extensions: list[str]) -> list[str]:
    """Idempotent — append missing standard extension URIs without duplication."""
    out = list(extensions)
    for uri in (
        STAC_EXTENSION_DEBRIEF,
        STAC_EXTENSION_PROCESSING,
        STAC_EXTENSION_FILE,
    ):
        if uri not in out:
            out.append(uri)
    return out


def _upgrade_source_asset(asset: dict[str, Any], item_dir: Path) -> dict[str, Any]:
    """Mirror debrief:provenance into processing:* (idempotent) and compute
    file:size + file:checksum for the disk-backed asset bytes.

    Source-side hashes are skipped for assets whose href points at an
    unreachable absolute path (the spec's "omit, don't fake" rule).
    """
    provenance = asset.get("debrief:provenance") or {}

    # processing:software — Map<string, string>.
    if "processing:software" not in asset:
        tool_version = provenance.get("tool_version")
        if tool_version is not None:
            asset["processing:software"] = {"debrief-stac": str(tool_version)}

    # processing:datetime — RFC 3339 UTC.
    if "processing:datetime" not in asset:
        load_ts = provenance.get("load_timestamp")
        if load_ts is not None:
            try:
                asset["processing:datetime"] = normalise_to_utc(str(load_ts))
            except ValueError:
                pass

    # file:size + file:checksum — only when the on-disk bytes are reachable.
    href = asset.get("href")
    if isinstance(href, str):
        candidate = (item_dir / href.lstrip("./")).resolve()
        if candidate.is_file() and candidate.is_relative_to(item_dir.resolve()):
            asset["file:size"] = candidate.stat().st_size
            asset["file:checksum"] = multihash_sha256(candidate)
    return asset


def _upgrade_thumbnail_assets(
    item: dict[str, Any], item_dir: Path, *, use_git_mv: bool
) -> None:
    """Rename thumbnail.png → overview.png and thumbnail-sm.png → thumbnail.png
    via git mv (when use_git_mv), then rewrite the asset entries with the new
    keys, proj:shape, file:size, file:checksum.

    Order matters: the large-→overview rename MUST complete across all items
    before the small-→thumbnail rename starts to avoid filename collision.
    Since this function operates on a single item, the caller (regenerate())
    runs the renames in two passes.
    """
    # No-op on items without the legacy pair (idempotency).
    pass  # The actual rename is staged in regenerate(); see below.


def _rename_thumbnail_files(
    catalog_root: Path, *, use_git_mv: bool
) -> tuple[int, int]:
    """Pass 1: thumbnail.png → overview.png across all items.
    Pass 2: thumbnail-sm.png → thumbnail.png across all items.

    Returns (large_renamed_count, small_renamed_count). Idempotent: skips
    items whose layout already matches the target.
    """
    large_renamed = 0
    small_renamed = 0

    item_dirs = sorted(p for p in catalog_root.iterdir() if p.is_dir())

    # Pass 1: thumbnail.png (legacy 800x600) → overview.png.
    for item_dir in item_dirs:
        legacy_large = item_dir / "thumbnail.png"
        target_overview = item_dir / "overview.png"
        if target_overview.exists():
            continue  # already renamed
        if legacy_large.exists():
            _git_or_fs_rename(
                legacy_large, target_overview, use_git_mv=use_git_mv
            )
            large_renamed += 1

    # Pass 2: thumbnail-sm.png → thumbnail.png. Now that legacy thumbnail.png
    # has been moved aside (or never existed), the small can take over the
    # canonical filename.
    for item_dir in item_dirs:
        legacy_small = item_dir / "thumbnail-sm.png"
        target_small = item_dir / "thumbnail.png"
        if not legacy_small.exists():
            continue
        if target_small.exists():
            # Both exist — if the bytes match the legacy_small, just delete
            # legacy_small (idempotent re-run); otherwise skip and warn.
            if target_small.read_bytes() == legacy_small.read_bytes():
                _git_or_fs_remove(legacy_small, use_git_mv=use_git_mv)
                continue
            print(
                f"WARN: {legacy_small} present alongside {target_small} with "
                "different content — skipping rename. Investigate.",
                file=sys.stderr,
            )
            continue
        _git_or_fs_rename(legacy_small, target_small, use_git_mv=use_git_mv)
        small_renamed += 1

    return large_renamed, small_renamed


def _git_or_fs_rename(src: Path, dst: Path, *, use_git_mv: bool) -> None:
    if use_git_mv:
        try:
            subprocess.run(
                ["git", "mv", "--", str(src), str(dst)],
                cwd=_REPO_ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            return
        except subprocess.CalledProcessError:
            # Fall back if git refuses (e.g. files not tracked in tests).
            pass
    src.rename(dst)


def _git_or_fs_remove(path: Path, *, use_git_mv: bool) -> None:
    if use_git_mv:
        try:
            subprocess.run(
                ["git", "rm", "--", str(path)],
                cwd=_REPO_ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            return
        except subprocess.CalledProcessError:
            pass
    path.unlink(missing_ok=True)


def _rewrite_thumbnail_asset_entries(item: dict[str, Any], item_dir: Path) -> None:
    """Rewrite assets.thumbnail (small) + assets.overview (large) entries with
    proj:shape, file:size, file:checksum. Drops legacy thumbnail-sm key."""
    item.setdefault("assets", {})
    item["assets"].pop("thumbnail-sm", None)

    small_path = item_dir / "thumbnail.png"
    if small_path.exists():
        item["assets"]["thumbnail"] = {
            "href": "./thumbnail.png",
            "type": "image/png",
            "title": "Plot thumbnail (200x150)",
            "roles": ["thumbnail"],
            "proj:shape": [150, 200],
            "file:size": small_path.stat().st_size,
            "file:checksum": multihash_sha256(small_path),
        }
    elif "thumbnail" in item["assets"]:
        # No small file but a stale entry — drop it.
        item["assets"].pop("thumbnail", None)

    large_path = item_dir / "overview.png"
    if large_path.exists():
        item["assets"]["overview"] = {
            "href": "./overview.png",
            "type": "image/png",
            "title": "Plot overview (800x600)",
            "roles": ["overview"],
            "proj:shape": [600, 800],
            "file:size": large_path.stat().st_size,
            "file:checksum": multihash_sha256(large_path),
        }


def _upgrade_item(
    item_path: Path, *, regen_now_iso: str
) -> None:
    """Upgrade a single item.json in place to the spec-241 shape.

    Idempotency: ``properties.updated`` is only refreshed when some other
    field actually changes; a re-run on an already-upgraded item produces
    zero diff (FR-019, SC-007).
    """
    with open(item_path) as f:
        original_text = f.read()
    original = json.loads(original_text)
    item = json.loads(original_text)  # working copy

    item_dir = item_path.parent

    item["stac_version"] = "1.1.0"
    item["stac_extensions"] = _upgrade_extensions(item.get("stac_extensions") or [])

    # STAC 1.1 forbids null bbox — drop the key when geometry is null.
    if item.get("bbox") is None:
        item.pop("bbox", None)

    properties = item.setdefault("properties", {})

    # created — preserve if present; backfill from git log; fallback to mtime.
    if "created" not in properties:
        created = _git_introduction_iso(item_path) or _mtime_iso(item_path)
        properties["created"] = created

    # license — preserve SPDX; migrate proprietary/various → other.
    license_value = properties.get("license")
    if license_value in (None, "proprietary", "various"):
        properties["license"] = "other"

    # providers — preserve if non-empty; otherwise default.
    if not properties.get("providers"):
        properties["providers"] = [dict(p) for p in DEFAULT_PROVIDERS]

    # Source assets: mirror debrief:provenance.* into processing:* and emit
    # file:size + file:checksum for disk-backed bytes.
    for asset in item.get("assets", {}).values():
        roles = asset.get("roles") or []
        if "source" in roles:
            _upgrade_source_asset(asset, item_dir)

    # Rewrite thumbnail/overview asset entries (renames already done by the
    # two-pass _rename_thumbnail_files() before this point).
    _rewrite_thumbnail_asset_entries(item, item_dir)

    # Idempotency check: did anything other than `updated` change? Compare
    # both sides with `updated` masked out so a second run produces zero diff.
    original_for_compare = dict(original.get("properties", {}))
    new_for_compare = dict(item.get("properties", {}))
    original_for_compare.pop("updated", None)
    new_for_compare.pop("updated", None)
    other_props_changed = original_for_compare != new_for_compare
    other_top_changed = {k: v for k, v in original.items() if k != "properties"} != {
        k: v for k, v in item.items() if k != "properties"
    }
    if other_props_changed or other_top_changed or "updated" not in properties:
        properties["updated"] = regen_now_iso
    else:
        # Nothing of substance changed — preserve the existing updated value
        # so the file is byte-identical on a re-run.
        properties["updated"] = original["properties"]["updated"]

    new_text = json.dumps(item, indent=2) + "\n"
    if new_text == original_text:
        return  # idempotent — skip the write entirely
    with open(item_path, "w") as f:
        f.write(new_text)


def _upgrade_catalog(catalog_path: Path) -> None:
    """Upgrade catalog.json in place to the spec-241 shape (envelope only —
    summaries are recomputed by services/stac, not by this script)."""
    with open(catalog_path) as f:
        catalog = json.load(f)

    catalog["stac_version"] = "1.1.0"
    catalog["stac_extensions"] = _upgrade_extensions(
        catalog.get("stac_extensions") or [STAC_EXTENSION_DEBRIEF]
    )

    if catalog.get("license") in (None, "proprietary", "various"):
        catalog["license"] = "other"

    if not catalog.get("providers"):
        catalog["providers"] = [dict(p) for p in DEFAULT_PROVIDERS]

    # Merge item_assets — preserve any custom additions.
    existing = catalog.get("item_assets") or {}
    merged = {k: dict(v) for k, v in ITEM_ASSETS_TEMPLATE.items()}
    for key, asset in existing.items():
        merged[key] = asset
    catalog["item_assets"] = merged

    # license link (only when license == "other"; idempotent).
    if catalog["license"] == "other":
        links = catalog.setdefault("links", [])
        if not any(link.get("rel") == "license" for link in links):
            links.append(
                {
                    "rel": "license",
                    "href": "./LICENSE",
                    "title": "Sample-catalog license (Debrief internal use)",
                }
            )

    with open(catalog_path, "w") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")


def regenerate(catalog_root: Path, *, use_git_mv: bool = True) -> int:
    """Run the full regeneration. Returns 0 on success, 1 on validation failure."""
    if not catalog_root.is_dir():
        print(f"ERROR: catalog root not found: {catalog_root}", file=sys.stderr)
        return 1

    regen_now_iso = normalise_to_utc(datetime.now(tz=timezone.utc))

    print(f"Upgrading catalog at {catalog_root} (regen timestamp {regen_now_iso})")

    # 1. Two-pass thumbnail rename across all items.
    large_renamed, small_renamed = _rename_thumbnail_files(
        catalog_root, use_git_mv=use_git_mv
    )
    print(
        f"  thumbnail renames — large→overview: {large_renamed}; "
        f"small→thumbnail: {small_renamed}"
    )

    # 2. Per-item shape upgrade.
    item_paths = sorted(catalog_root.glob("*/item.json"))
    print(f"  upgrading {len(item_paths)} item.json files")
    for path in item_paths:
        _upgrade_item(path, regen_now_iso=regen_now_iso)

    # 3. Catalog envelope upgrade.
    catalog_json = catalog_root / "catalog.json"
    print(f"  upgrading {catalog_json}")
    _upgrade_catalog(catalog_json)

    # 4. Validate every item + the catalog against the vendored 1.1 schemas.
    print("  validating against vendored STAC 1.1 schemas")
    failures: list[tuple[Path, str]] = []
    for path in item_paths:
        with open(path) as f:
            item = json.load(f)
        try:
            validate_stac_item(item)
        except Exception as exc:  # noqa: BLE001 — we want the message
            failures.append((path, str(exc).splitlines()[0]))

    with open(catalog_json) as f:
        catalog = json.load(f)
    try:
        validate_stac_collection(catalog)
    except Exception as exc:  # noqa: BLE001
        failures.append((catalog_json, str(exc).splitlines()[0]))

    if failures:
        print(f"\n{len(failures)} validation failure(s):", file=sys.stderr)
        for path, message in failures[:20]:
            print(f"  {path.relative_to(_REPO_ROOT)}: {message}", file=sys.stderr)
        if len(failures) > 20:
            print(f"  ... and {len(failures) - 20} more", file=sys.stderr)
        return 1

    print(
        f"\nDone — {len(item_paths)} items + 1 catalog upgraded and "
        "validated against vendored STAC 1.1 schemas."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--catalog-root",
        type=Path,
        default=_DEFAULT_CATALOG_ROOT,
        help="Catalog root directory (default: preview/workspace/samples/local-store)",
    )
    parser.add_argument(
        "--no-git-mv",
        dest="use_git_mv",
        action="store_false",
        help="Use plain filesystem rename instead of git mv (test mode).",
    )
    parser.set_defaults(use_git_mv=True)
    args = parser.parse_args()
    return regenerate(args.catalog_root, use_git_mv=args.use_git_mv)


if __name__ == "__main__":
    sys.exit(main())
