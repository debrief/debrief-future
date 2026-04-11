#!/usr/bin/env python3
"""
Two-phase build for the enriched STAC search slug.

Phase 1 — Enrich features.geojson in place:
  For every TRACK feature across all 70 plots, populate these new properties:
    display_name, nationality, vessel_class, vessel_type, vessel_role, domain, synthetic

  Known platform_ids are looked up in PLATFORM_VESSEL_MAP (imported from
  scripts/enrich-legacy-catalog.py — the existing registry). Unknown platforms
  are assigned deterministically by zipping the remainder of each item's
  aggregate debrief:track_names / debrief:vessel_classes lists alphabetically
  against the item's unknown-track platform_ids. Unknown platforms get
  synthetic=true so the LLM knows their metadata was fabricated.

Phase 2 — Rebuild catalog-data.js from enriched features:
  Walks the (now enriched) features.geojson + item.json for each plot and
  emits the v2 slug — per-platform records plus cheap derived aggregates.

Usage:
  python3 prototypes/stac-nl-filter/build-catalog.py          # do it
  python3 prototypes/stac-nl-filter/build-catalog.py --dry    # inspect only
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_ROOT = REPO_ROOT / "preview" / "workspace" / "samples" / "local-store"
OUT_JS = REPO_ROOT / "prototypes" / "stac-nl-filter" / "catalog-data.js"
EXCLUDED_IDS = {"core--bulk-red-tracks"}

# Authoritative platform registry — 10 entries from the enrich script.
PLATFORM_VESSEL_MAP: dict[str, tuple[str, str, str]] = {
    "NELSON":       ("HMS Nelson",         "GB", "surface/warship/frigate/type23"),
    "COLLINGWOOD":  ("HMS Collingwood",    "GB", "surface/warship/destroyer/type45"),
    "FRIGATE":      ("HMS Argyll",         "GB", "surface/warship/frigate/type23"),
    "OWNSHIP":      ("HMS Defender",       "GB", "surface/warship/destroyer/type45"),
    "SENSOR":       ("HMS Richmond",       "GB", "surface/warship/frigate/type23"),
    "SUBJECT":      ("Contact Alpha",      "GB", "subsurface/submarine/ssn/astute"),
    "TARGET":       ("Contact Bravo",      "GB", "subsurface/submarine/ssk/type212"),
    "TMA_TRACK":    ("TMA Solution Track", "GB", "subsurface/submarine/ssn/trafalgar"),
    "OWNSHIP_A":    ("HMS Lancaster",      "GB", "surface/warship/frigate/type23"),
    "OWNSHIP_B":    ("USS Mason",          "US", "surface/warship/destroyer/arleigh-burke"),
}

# Naval prefixes → ISO nationality codes (superset of TRACK_NAME_PREFIXES from enrich script).
PREFIX_TO_NATIONALITY = {
    "HMS": "GB", "USS": "US", "FS": "FR", "FGS": "DE",
    "HNoMS": "NO", "HDMS": "DK", "ITS": "IT", "HNLMS": "NL",
    "SPS": "ES", "HMCS": "CA", "HMAS": "AU", "JS": "JP",
    "ROKS": "KR", "INS": "IN",
}


def nationality_from_name(name: str) -> str | None:
    for prefix, nat in PREFIX_TO_NATIONALITY.items():
        if name.startswith(prefix + " "):
            return nat
    return None


def parse_iso(dt: str | None) -> datetime | None:
    if not dt:
        return None
    try:
        return datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except ValueError:
        return None


def split_class(vessel_class: str) -> tuple[str, str, str]:
    """
    Split 'surface/warship/frigate/type23' → (domain, vessel_role, vessel_type).
    Returns ('', '', '') for empty/malformed paths.
    """
    if not vessel_class:
        return "", "", ""
    parts = vessel_class.split("/")
    domain = parts[0] if parts else ""
    vessel_type = parts[-1] if parts else ""
    vessel_role = parts[-2] if len(parts) >= 2 else ""
    return domain, vessel_role, vessel_type


# ---------------------------------------------------------------------------
# Phase 1 — per-plot platform assignment
# ---------------------------------------------------------------------------

def assign_platforms(track_features: list[dict], item_props: dict) -> dict[int, dict]:
    """
    For each TRACK feature (by index), return its assigned metadata dict.
    Known IDs use PLATFORM_VESSEL_MAP; unknowns zip alphabetically against
    the remaining entries of item.debrief:track_names / debrief:vessel_classes.
    """
    agg_names = list(item_props.get("debrief:track_names") or [])
    agg_classes = list(item_props.get("debrief:vessel_classes") or [])
    agg_nats = list(item_props.get("debrief:nationalities") or [])

    assignments: dict[int, dict] = {}
    used_names: set[str] = set()
    used_classes: set[str] = set()
    unknown_indices: list[int] = []

    # First pass — resolve known platforms
    for idx, feat in enumerate(track_features):
        pid = (feat.get("properties") or {}).get("platform_id", "")
        if pid in PLATFORM_VESSEL_MAP:
            name, nat, cls = PLATFORM_VESSEL_MAP[pid]
            assignments[idx] = {
                "display_name": name,
                "nationality": nat,
                "vessel_class": cls,
                "synthetic": False,
            }
            used_names.add(name)
            used_classes.add(cls)
        else:
            unknown_indices.append(idx)

    # Second pass — deterministic fill for unknowns
    remaining_names = sorted(n for n in agg_names if n not in used_names)
    remaining_classes = sorted(c for c in agg_classes if c not in used_classes)
    sorted_unknown = sorted(
        unknown_indices,
        key=lambda i: (track_features[i].get("properties") or {}).get("platform_id", ""),
    )

    for k, idx in enumerate(sorted_unknown):
        pid = (track_features[idx].get("properties") or {}).get("platform_id", f"UNK_{idx}")
        name = (
            remaining_names[k] if k < len(remaining_names)
            else f"Unknown ({pid})"
        )
        cls = (
            remaining_classes[k] if k < len(remaining_classes)
            else (remaining_classes[-1] if remaining_classes else "surface/merchant/unknown/unknown")
        )
        nat = nationality_from_name(name) or (agg_nats[0] if agg_nats else "XX")
        assignments[idx] = {
            "display_name": name,
            "nationality": nat,
            "vessel_class": cls,
            "synthetic": True,
        }

    return assignments


def enrich_features(plot_dir: Path, item_props: dict, dry: bool) -> tuple[int, int]:
    """Enrich features.geojson in place. Returns (tracks, unknown_count)."""
    fg_path = plot_dir / "features.geojson"
    if not fg_path.exists():
        return 0, 0

    fc = json.loads(fg_path.read_text())
    features = fc.get("features") or []

    track_indices = [i for i, f in enumerate(features) if (f.get("properties") or {}).get("kind") == "TRACK"]
    track_features = [features[i] for i in track_indices]
    if not track_features:
        return 0, 0

    assignments = assign_platforms(track_features, item_props)
    unknown_count = sum(1 for a in assignments.values() if a.get("synthetic"))

    for local_idx, global_idx in enumerate(track_indices):
        meta = assignments[local_idx]
        domain, vessel_role, vessel_type = split_class(meta["vessel_class"])
        feat = features[global_idx]
        props = dict(feat.get("properties") or {})
        props["display_name"]  = meta["display_name"]
        props["nationality"]   = meta["nationality"]
        props["vessel_class"]  = meta["vessel_class"]
        props["vessel_type"]   = vessel_type
        props["vessel_role"]   = vessel_role
        props["domain"]        = domain
        props["synthetic"]     = meta["synthetic"]
        feat["properties"] = props
        features[global_idx] = feat

    fc["features"] = features
    if not dry:
        fg_path.write_text(json.dumps(fc, indent=2) + "\n")

    return len(track_features), unknown_count


# ---------------------------------------------------------------------------
# Phase 2 — slug builder
# ---------------------------------------------------------------------------

def build_slug(item: dict, fc: dict) -> dict:
    """Build the v2 slug for one plot from (now-enriched) features.geojson."""
    item_props = item.get("properties") or {}
    features = fc.get("features") or []
    tracks = [f for f in features if (f.get("properties") or {}).get("kind") == "TRACK"]

    # Per-platform records (all metadata read from features.geojson)
    platforms = []
    for t in tracks:
        props = t.get("properties") or {}
        positions = props.get("positions") or []
        max_depth = max((abs(p.get("depth", 0) or 0) for p in positions), default=0.0)
        st = parse_iso(props.get("start_time"))
        et = parse_iso(props.get("end_time"))
        track_duration = round((et - st).total_seconds() / 3600, 2) if st and et else None
        platforms.append({
            "id": props.get("platform_id", ""),
            "name": props.get("display_name") or props.get("platform_name", ""),
            "nationality": props.get("nationality"),
            "vessel_class": props.get("vessel_class"),
            "vessel_type": props.get("vessel_type"),
            "vessel_role": props.get("vessel_role"),
            "domain": props.get("domain"),
            "max_depth_m": round(max_depth, 1),
            "track_duration_hours": track_duration,
            "synthetic": props.get("synthetic", False),
        })

    # Derived aggregates
    nationalities = sorted({p["nationality"] for p in platforms if p["nationality"]})
    domains       = sorted({p["domain"]      for p in platforms if p["domain"]})
    vessel_types  = sorted({p["vessel_type"] for p in platforms if p["vessel_type"]})
    warship_roles = {"frigate", "destroyer", "corvette", "carrier", "patrol"}
    has_submarine = any(p["domain"] == "subsurface" for p in platforms)
    has_warship   = any(p["vessel_role"] in warship_roles for p in platforms)

    # Title parsing
    title = item_props.get("title", "")
    exercise = title.split(":", 1)[0].strip() if ":" in title else None
    plot_name = title.split(":", 1)[1].strip() if ":" in title else title

    # Time
    start_dt = item_props.get("start_datetime") or item_props.get("datetime")
    end_dt   = item_props.get("end_datetime")   or start_dt
    year = int(start_dt[:4]) if start_dt else None
    st, et = parse_iso(start_dt), parse_iso(end_dt)
    duration_hours = round((et - st).total_seconds() / 3600, 2) if st and et else None

    # Feature kinds
    kinds: dict[str, int] = {}
    for f in features:
        k = (f.get("properties") or {}).get("kind", "unknown")
        kinds[k] = kinds.get(k, 0) + 1

    return {
        "id": item.get("id"),
        "title": title,
        "exercise": exercise,
        "plot_name": plot_name,
        "description": item_props.get("description"),
        "bbox": item.get("bbox"),
        "start_datetime": start_dt,
        "end_datetime": end_dt,
        "year": year,
        "duration_hours": duration_hours,
        "feature_kinds": kinds,
        "platform_count": len(platforms),
        "narrative_count": kinds.get("NARRATIVE", 0),
        "platforms": platforms,
        "nationalities": nationalities,
        "domains": domains,
        "vessel_types": vessel_types,
        "has_submarine": has_submarine,
        "has_warship": has_warship,
        "tags": list(item_props.get("debrief:tags") or []),
        "feature_tags": list(item_props.get("debrief:feature_tags") or []),
    }


def to_compact(full: dict) -> dict:
    """Compact variant fed to the LLM — drops description and bulky per-platform ranges."""
    compact = {k: v for k, v in full.items() if k != "description"}
    compact["platforms"] = [
        {k: v for k, v in p.items() if k not in {"max_depth_m", "track_duration_hours"}}
        for p in full["platforms"]
    ]
    return compact


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    dry = "--dry" in sys.argv

    catalog_json = json.loads((CATALOG_ROOT / "catalog.json").read_text())
    plot_dirs: list[tuple[str, Path, dict]] = []
    for link in catalog_json.get("links", []):
        if link.get("rel") != "item":
            continue
        href = link["href"].lstrip("./")
        plot_id = href.split("/")[0]
        if plot_id in EXCLUDED_IDS:
            continue
        plot_dir = CATALOG_ROOT / plot_id
        item_path = plot_dir / "item.json"
        if not item_path.exists():
            continue
        item = json.loads(item_path.read_text())
        plot_dirs.append((plot_id, plot_dir, item))

    print(f"Processing {len(plot_dirs)} plots (dry={dry})")

    # Phase 1 — enrich features.geojson
    total_tracks = 0
    total_unknown = 0
    for plot_id, plot_dir, item in plot_dirs:
        n_tracks, n_unknown = enrich_features(plot_dir, item.get("properties") or {}, dry)
        total_tracks += n_tracks
        total_unknown += n_unknown

    known = total_tracks - total_unknown
    pct = (known / total_tracks * 100) if total_tracks else 0
    print(f"Phase 1: enriched {total_tracks} tracks ({known} known, {total_unknown} synthetic = {pct:.1f}% authoritative)")

    # Phase 2 — rebuild catalog-data.js
    full_items = []
    compact_items = []
    for plot_id, plot_dir, item in plot_dirs:
        fc = json.loads((plot_dir / "features.geojson").read_text())
        slug = build_slug(item, fc)
        full_items.append(slug)
        compact_items.append(to_compact(slug))

    header = (
        "// Auto-generated by prototypes/stac-nl-filter/build-catalog.py\n"
        f"// {len(full_items)} items — excludes {sorted(EXCLUDED_IDS)}\n"
        "// CATALOG_FULL: full slug with description (for browser rendering)\n"
        "// CATALOG_COMPACT: LLM-facing subset, no description, no per-platform timing/depth\n\n"
    )
    out = (
        header
        + "window.CATALOG_FULL = "    + json.dumps(full_items,    indent=2) + ";\n\n"
        + "window.CATALOG_COMPACT = " + json.dumps(compact_items, indent=2) + ";\n"
    )
    if not dry:
        OUT_JS.write_text(out)

    size_kb = len(out) / 1024
    compact_size_kb = len(json.dumps(compact_items)) / 1024
    print(f"Phase 2: wrote {OUT_JS.relative_to(REPO_ROOT)} ({size_kb:.1f} KB; compact JSON alone {compact_size_kb:.1f} KB)")

    if dry:
        print("(dry run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
