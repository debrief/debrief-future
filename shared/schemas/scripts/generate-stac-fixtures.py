#!/usr/bin/env python3
"""
Generate 100 deterministic STAC item.json fixtures for Debrief maritime analysis.

Produces:
  - shared/schemas/fixtures/stac-browser/exercise-{NNN}/item.json  (100 items)
  - shared/schemas/fixtures/stac-browser/catalog.json               (root catalog)

Usage:
  cd shared/schemas && uv run python scripts/generate-stac-fixtures.py
"""

from __future__ import annotations

import json
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
SCHEMAS_ROOT = SCRIPT_DIR.parent
FIXTURES_DIR = SCHEMAS_ROOT / "fixtures" / "stac-browser"
TAXONOMY_FILE = FIXTURES_DIR / "vessel-taxonomy.json"

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
STAC_VERSION = "1.0.0"
STAC_EXTENSIONS = ["https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json"]

# ---------------------------------------------------------------------------
# Vessel taxonomy (4-level paths)
# ---------------------------------------------------------------------------
BUILTIN_VESSEL_TAXONOMY: dict[str, list[str]] = {
    "surface_warship": [
        "surface/warship/frigate/type23",
        "surface/warship/frigate/type26",
        "surface/warship/frigate/fremm",
        "surface/warship/frigate/f125",
        "surface/warship/destroyer/type45",
        "surface/warship/destroyer/arleigh-burke",
        "surface/warship/destroyer/horizon",
        "surface/warship/corvette/visby",
        "surface/warship/carrier/queen-elizabeth",
        "surface/warship/carrier/charles-de-gaulle",
        "surface/warship/patrol/river",
        "surface/warship/patrol/offshore",
    ],
    "subsurface": [
        "subsurface/submarine/ssn/astute",
        "subsurface/submarine/ssn/trafalgar",
        "subsurface/submarine/ssn/virginia",
        "subsurface/submarine/ssbn/vanguard",
        "subsurface/submarine/ssbn/ohio",
        "subsurface/submarine/ssk/gotland",
        "subsurface/submarine/ssk/type212",
    ],
    "auxiliary": [
        "surface/auxiliary/tanker/tide",
        "surface/auxiliary/supply/fort-victoria",
        "surface/auxiliary/survey/echo",
        "surface/auxiliary/mcm/hunt",
        "surface/auxiliary/mcm/sandown",
    ],
    "merchant": [
        "surface/merchant/tanker/vlcc",
        "surface/merchant/container/panamax",
        "surface/merchant/bulk/handymax",
        "surface/merchant/fishing/trawler",
    ],
}

# ---------------------------------------------------------------------------
# Exercise name components
# ---------------------------------------------------------------------------
EXERCISE_NAMES: list[str] = [
    "Neptune Strike",
    "Baltic Shield",
    "Cold Response",
    "Formidable Shield",
    "Trident Juncture",
    "Northern Coasts",
    "Dynamic Mongoose",
    "Saxon Warrior",
    "Joint Warrior",
    "Steadfast Defender",
    "Ocean Shield",
    "Sea Breeze",
    "RIMPAC Echo",
    "Talisman Sabre",
    "Malabar Horizon",
    "Pitch Black",
    "Bersama Lima",
    "Kakadu Sun",
    "Cutlass Express",
    "Obangame Express",
    "Phoenix Express",
    "Archipelago Sentinel",
    "Iron Resolve",
    "Bright Star",
    "Argonaut Dawn",
    "Cerberus Gate",
    "Vigilant Mariner",
    "Cobra Warrior",
    "Griffin Strike",
    "Tempest Anvil",
    "Aurora Borealis",
    "Silent Resolve",
    "Thunder Forge",
    "Poseidon Guard",
    "Vanguard Horizon",
    "Triton Sweep",
    "Aegis Lance",
    "Storm Petrel",
    "Boreas Shield",
    "Atlas Venture",
    "Coral Sabre",
    "Halcyon Dawn",
    "Meridian Watch",
    "Polaris Star",
    "Sceptre Tide",
    "Zenith Wave",
    "Barracuda Surge",
    "Condor Flight",
    "Dragon Hammer",
    "Eagle Resolve",
    "Falcon Reach",
    "Harrier Sprint",
    "Javelin Thrust",
    "Kestrel Eye",
    "Lancer Sweep",
    "Nomad Venture",
    "Osprey Watch",
    "Puma Prowl",
    "Raptor Chase",
    "Sierra Storm",
    "Talon Strike",
    "Ursus Patrol",
    "Viper Coil",
    "Wolf Pack Alpha",
    "Xerxes March",
    "Yeoman Guard",
    "Zephyr Gale",
    "Bastion Wall",
    "Citadel Peak",
    "Dagger Point",
]

## Author removed — derived from PROV lineage at query time (see research.md R7)

TAGS: list[str] = [
    "ASW",
    "SAR",
    "MCM",
    "escort",
    "transit",
    "gunnery",
    "missile-firing",
    "EW",
    "amphibious",
    "multi-national",
    "training",
    "certification",
    "force-protection",
    "harbour-ops",
    "replenishment",
    "AAW",
    "NGFS",
    "boarding",
    "surveillance",
    "mine-clearance",
]

FEATURE_TAGS: list[str] = [
    "sonar-contact",
    "datum",
    "prosecution",
    "track-merge",
    "visual-sighting",
    "radar-detection",
    "towed-array",
    "helicopter-ops",
    "torpedo-run",
    "depth-charge",
    "minefield",
    "intercept",
    "zig-zag",
    "sprint-and-drift",
    "passive-search",
    "active-search",
]

NATIONALITIES_POOL: list[str] = [
    "GB",
    "US",
    "FR",
    "DE",
    "NO",
    "SE",
    "IT",
    "NL",
    "DK",
    "ES",
    "CA",
    "AU",
    "JP",
    "KR",
    "IN",
]

# Track name prefixes by nationality
TRACK_NAME_PREFIXES: dict[str, list[str]] = {
    "GB": ["HMS"],
    "US": ["USS"],
    "FR": ["FS"],
    "DE": ["FGS"],
    "NO": ["HNoMS"],
    "SE": ["HMS"],  # Swedish HMS
    "IT": ["ITS"],
    "NL": ["HNLMS"],
    "DK": ["HDMS"],
    "ES": ["SPS"],
    "CA": ["HMCS"],
    "AU": ["HMAS"],
    "JP": ["JS"],
    "KR": ["ROKS"],
    "IN": ["INS"],
}

SHIP_NAMES: list[str] = [
    "Argyll",
    "Sutherland",
    "Portland",
    "Westminster",
    "Kent",
    "Lancaster",
    "Richmond",
    "Somerset",
    "Northumberland",
    "Iron Duke",
    "Defender",
    "Diamond",
    "Dragon",
    "Duncan",
    "Dauntless",
    "Mahan",
    "Cole",
    "Carney",
    "Roosevelt",
    "Mason",
    "Bainbridge",
    "Truxtun",
    "Gonzalez",
    "Laboon",
    "Ramage",
    "Aquitaine",
    "Provence",
    "Languedoc",
    "Auvergne",
    "Bretagne",
    "Sachsen",
    "Hamburg",
    "Hessen",
    "Nordrhein-Westfalen",
    "Fridtjof Nansen",
    "Roald Amundsen",
    "Otto Sverdrup",
    "Helge Ingstad",
    "Visby",
    "Helsingborg",
    "Harnosand",
    "Nykoping",
    "Andrea Doria",
    "Caio Duilio",
    "Bergamini",
    "Margottini",
    "De Zeven Provincien",
    "Tromp",
    "De Ruyter",
    "Evertsen",
]

# ---------------------------------------------------------------------------
# Geographic regions
# ---------------------------------------------------------------------------
Region = tuple[str, float, float, float, float]  # name, lat_min, lat_max, lon_min, lon_max

REGIONS: list[tuple[Region, int]] = [
    (("North Atlantic", 45.0, 62.0, -40.0, -5.0), 30),
    (("Mediterranean", 33.0, 42.0, -5.0, 35.0), 25),
    (("Indo-Pacific", -10.0, 22.0, 90.0, 145.0), 20),
    (("Arctic", 65.0, 80.0, -30.0, 40.0), 10),
    (("South Atlantic", -50.0, -15.0, -40.0, -5.0), 10),
    (("Indian Ocean", -5.0, 18.0, 55.0, 80.0), 5),
]

# ---------------------------------------------------------------------------
# Duration buckets (hours)
# ---------------------------------------------------------------------------
DURATION_BUCKETS: list[tuple[float, float, int]] = [
    (1.0, 6.0, 15),  # <6H
    (6.0, 24.0, 25),  # <24H
    (24.0, 72.0, 30),  # <72H
    (72.0, 240.0, 20),  # <10D
    (240.0, 720.0, 10),  # >10D
]

# Nationality distribution targets
NATIONALITY_WEIGHTS: list[tuple[str, int]] = [
    ("GB", 30),
    ("US", 20),
    ("FR", 15),
    ("DE", 10),
    ("NO", 8),
    ("SE", 7),
]

# Track count buckets
TRACK_BUCKETS: list[tuple[int, int, int]] = [
    (0, 0, 5),  # 0 tracks
    (1, 2, 30),  # 1-2
    (3, 4, 40),  # 3-4
    (5, 8, 25),  # 5+
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _flatten_taxonomy_tree(node: dict[str, Any], prefix: str = "") -> list[str]:
    """Recursively flatten a nested taxonomy tree into slash-separated paths."""
    paths: list[str] = []
    children = node.get("children", {})
    if not children:
        # Leaf node — the prefix itself is a complete path
        return [prefix] if prefix else []
    for key, child in children.items():
        current = f"{prefix}/{key}" if prefix else key
        child_paths = _flatten_taxonomy_tree(child, current)
        if child_paths:
            paths.extend(child_paths)
        else:
            paths.append(current)
    return paths


def _categorise_path(path: str) -> str:
    """Map a vessel path to a category key for distribution buckets."""
    if path.startswith("subsurface/"):
        return "subsurface"
    if path.startswith("surface/auxiliary/"):
        return "auxiliary"
    if path.startswith("surface/merchant/"):
        return "merchant"
    if path.startswith("surface/warship/"):
        return "surface_warship"
    return "surface_warship"  # fallback


def load_vessel_taxonomy() -> dict[str, list[str]]:
    """Load vessel taxonomy from file or use built-in.

    If the taxonomy file exists it is a nested tree; flatten it into
    category -> [flat-path, ...] so the rest of the generator can sample
    from it the same way as the built-in dict.
    """
    if TAXONOMY_FILE.exists():
        print(f"  Loading taxonomy from {TAXONOMY_FILE}")
        with open(TAXONOMY_FILE) as f:
            raw: dict[str, Any] = json.load(f)
        tree = raw.get("taxonomy", raw)
        # The top-level tree is a dict of domain keys, each a node with
        # "label" and "children".  Wrap it so _flatten_taxonomy_tree can
        # treat it as a single root node.
        all_paths = _flatten_taxonomy_tree({"children": tree})
        # Group by category
        categorised: dict[str, list[str]] = {}
        for p in all_paths:
            cat = _categorise_path(p)
            categorised.setdefault(cat, []).append(p)
        return categorised
    print("  Using built-in vessel taxonomy")
    return BUILTIN_VESSEL_TAXONOMY


def distribute_items(total: int, buckets: list[tuple[Any, ...]]) -> list[int]:
    """Expand bucket counts, adjusting last bucket to match total."""
    counts = [b[-1] for b in buckets]
    diff = total - sum(counts)
    counts[-1] += diff
    return counts


def pick_from_buckets(
    buckets: list[tuple[Any, ...]], counts: list[int], rng: random.Random
) -> list[Any]:
    """Build a shuffled assignment list from bucket definitions and counts."""
    assignments: list[Any] = []
    for bucket, count in zip(buckets, counts, strict=True):
        for _ in range(count):
            assignments.append(bucket[:-1])  # everything except the count
    rng.shuffle(assignments)
    return assignments


def generate_bbox(region: Region, rng: random.Random, size_deg: float | None = None) -> list[float]:
    """Generate a random bounding box within a region."""
    name, lat_min, lat_max, lon_min, lon_max = region
    if size_deg is None:
        size_deg = rng.uniform(0.1, 3.0)
    half = size_deg / 2.0
    center_lat = rng.uniform(lat_min + half, lat_max - half)
    center_lon = rng.uniform(lon_min + half, lon_max - half)
    west = round(center_lon - half, 4)
    south = round(center_lat - half, 4)
    east = round(center_lon + half, 4)
    north = round(center_lat + half, 4)
    return [west, south, east, north]


def bbox_to_polygon(bbox: list[float]) -> dict[str, Any]:
    """Convert bbox [west, south, east, north] to GeoJSON Polygon."""
    w, s, e, n = bbox
    return {
        "type": "Polygon",
        "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
    }


def pick_primary_nationality(rng: random.Random) -> str:
    """Pick a nationality weighted by distribution targets."""
    pool: list[str] = []
    for nat, weight in NATIONALITY_WEIGHTS:
        pool.extend([nat] * weight)
    # Fill remainder with "other" nationalities
    others = [n for n in NATIONALITIES_POOL if n not in dict(NATIONALITY_WEIGHTS)]
    remainder = 100 - sum(w for _, w in NATIONALITY_WEIGHTS)
    for _ in range(remainder):
        pool.append(rng.choice(others))
    return rng.choice(pool)


def generate_track_names(
    nationalities: list[str],
    count: int,
    rng: random.Random,
) -> list[str]:
    """Generate realistic track names for the given nationalities."""
    names: list[str] = []
    available_ships = list(SHIP_NAMES)
    rng.shuffle(available_ships)
    for i in range(count):
        nat = nationalities[i % len(nationalities)] if nationalities else "GB"
        prefix = rng.choice(TRACK_NAME_PREFIXES.get(nat, ["WARSHIP"]))
        ship = available_ships.pop() if available_ships else f"CONTACT {i + 1:02d}"
        names.append(f"{prefix} {ship}")
    return names


def pick_vessel_classes(
    taxonomy: dict[str, list[str]],
    category_key: str,
    count: int,
    rng: random.Random,
) -> list[str]:
    """Pick vessel classes from taxonomy for a given category."""
    if category_key == "mixed":
        all_classes = [c for classes in taxonomy.values() for c in classes]
        return rng.sample(all_classes, min(count, len(all_classes)))
    classes = taxonomy.get(category_key, [])
    if not classes:
        all_classes = [c for classes in taxonomy.values() for c in classes]
        classes = all_classes
    return rng.sample(classes, min(count, len(classes)))


def make_slug(name: str) -> str:
    """Convert exercise name to URL-safe slug."""
    return name.lower().replace(" ", "-").replace("'", "")


# ---------------------------------------------------------------------------
# Named edge-case definitions
# ---------------------------------------------------------------------------


class EdgeCase:
    """Defines a named edge-case exercise."""

    def __init__(
        self,
        prefix: str,
        count: int,
        overrides: dict[str, Any],
    ) -> None:
        self.prefix = prefix
        self.count = count
        self.overrides = overrides


EDGE_CASES: list[EdgeCase] = [
    EdgeCase(
        "empty-plot",
        3,
        {
            "track_count": 0,
            "vessel_classes": [],
            "track_names": [],
            "nationalities": [],
            "platforms_override": [],
            "description_note": "Empty plot with no track data.",
        },
    ),
    EdgeCase(
        "multi-nation",
        5,
        {
            "multi_nation": True,
            "description_note": "Multi-national exercise with 4+ participant nations.",
        },
    ),
    EdgeCase(
        "single-point",
        3,
        {
            "single_point": True,
            "description_note": "Single-point observation, no time range.",
        },
    ),
    EdgeCase(
        "long-duration",
        3,
        {
            "duration_hours": (300.0, 600.0),
            "description_note": "Extended duration exercise (10+ days).",
        },
    ),
    EdgeCase(
        "dense-tracks",
        3,
        {
            "track_count_range": (5, 8),
            "description_note": "Dense track exercise with many participants.",
        },
    ),
]


# ---------------------------------------------------------------------------
# Item generation
# ---------------------------------------------------------------------------


def generate_item(
    item_id: str,
    name: str,
    region: Region,
    duration_hours_range: tuple[float, float],
    vessel_category: str,
    taxonomy: dict[str, list[str]],
    rng: random.Random,
    track_count: int | None = None,
    overrides: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a single STAC item.json."""
    overrides = overrides or {}

    # Bbox and geometry
    bbox = generate_bbox(region, rng)
    geometry = bbox_to_polygon(bbox)

    # Temporal
    year = rng.randint(2020, 2026)
    month = rng.randint(1, 12)
    day = rng.randint(1, 28)
    hour = rng.randint(0, 23)
    start_dt = datetime(year, month, day, hour, 0, 0, tzinfo=UTC)

    is_single_point = overrides.get("single_point", False)

    if is_single_point:
        dt_str = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        properties_temporal: dict[str, str | None] = {
            "datetime": dt_str,
        }
    else:
        dur_range = overrides.get("duration_hours", duration_hours_range)
        duration_h = rng.uniform(dur_range[0], dur_range[1])
        end_dt = start_dt + timedelta(hours=duration_h)
        properties_temporal = {
            "datetime": None,
            "start_datetime": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "end_datetime": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    # Nationalities
    if "nationalities" in overrides:
        nationalities: list[str] = overrides["nationalities"]
    elif overrides.get("multi_nation"):
        nat_count = rng.randint(4, 7)
        nationalities = rng.sample(NATIONALITIES_POOL, nat_count)
    else:
        primary = pick_primary_nationality(rng)
        extra_count = rng.choices([0, 1, 2], weights=[40, 40, 20])[0]
        extras = [n for n in NATIONALITIES_POOL if n != primary]
        nationalities = [primary] + rng.sample(extras, extra_count)

    # Track count
    if "track_count" in overrides:
        n_tracks: int = overrides["track_count"]
    elif "track_count_range" in overrides:
        lo, hi = overrides["track_count_range"]
        n_tracks = rng.randint(lo, hi)
    elif track_count is not None:
        n_tracks = track_count
    else:
        n_tracks = rng.randint(1, 5)

    # Track names
    if "track_names" in overrides:
        track_names: list[str] = overrides["track_names"]
    else:
        track_names = generate_track_names(nationalities, n_tracks, rng) if n_tracks > 0 else []

    # Vessel classes
    if "vessel_classes" in overrides:
        vessel_classes: list[str] = overrides["vessel_classes"]
    else:
        vc_count = min(n_tracks, rng.randint(1, 3)) if n_tracks > 0 else 0
        vessel_classes = (
            pick_vessel_classes(taxonomy, vessel_category, max(vc_count, 1), rng)
            if vc_count > 0
            else []
        )

    # Tags and feature tags
    n_tags = rng.randint(1, 5)
    tags = rng.sample(TAGS, n_tags)
    n_ftags = rng.randint(0, 4)
    feature_tags = rng.sample(FEATURE_TAGS, n_ftags)

    # Description
    region_name = region[0]
    desc_note = overrides.get("description_note", "")
    description = (
        f"{name} — {region_name} exercise. "
        f"{n_tracks} track(s), {len(nationalities)} nation(s). "
        f"{desc_note}"
    ).strip()

    # Build platforms array from track_names, nationalities, vessel_classes
    if "platforms_override" in overrides:
        platforms: list[dict[str, Any]] = overrides["platforms_override"]
    else:
        platforms = []
        for t_idx in range(n_tracks):
            platform: dict[str, Any] = {}
            # Use track name as id (slugified) and name
            if t_idx < len(track_names):
                t_name = track_names[t_idx]
                platform["id"] = t_name.upper().replace(" ", "-")
                platform["name"] = t_name
            else:
                platform["id"] = f"PLATFORM-{t_idx + 1:02d}"

            # Assign nationality round-robin
            if nationalities:
                nat = nationalities[t_idx % len(nationalities)]
                platform["nationality"] = nat

            # Assign vessel class round-robin
            if vessel_classes and t_idx < len(vessel_classes):
                vc = vessel_classes[t_idx]
                platform["vessel_class"] = vc
                # Derive domain, role, type from path
                parts = vc.split("/")
                if len(parts) >= 1:
                    platform["domain"] = parts[0]
                if len(parts) >= 3:
                    platform["vessel_role"] = parts[2]
                if len(parts) >= 4:
                    platform["vessel_type"] = parts[3]

            platforms.append(platform)

    # Build properties
    properties: dict[str, Any] = {
        "title": f"Exercise {name}",
        "description": description,
        **properties_temporal,
        "debrief:platforms": platforms,
        "debrief:tags": tags,
        "debrief:feature_tags": feature_tags,
    }

    item: dict[str, Any] = {
        "type": "Feature",
        "stac_version": STAC_VERSION,
        "stac_extensions": list(STAC_EXTENSIONS),
        "id": item_id,
        "geometry": geometry,
        "bbox": bbox,
        "properties": properties,
        "links": [
            {"rel": "root", "href": "../catalog.json", "type": "application/json"},
            {"rel": "parent", "href": "../catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./item.json", "type": "application/json"},
        ],
        "assets": {
            "data": {
                "href": f"./{item_id}.geojson",
                "type": "application/geo+json",
                "title": "Track and Location Data",
                "roles": ["data"],
            }
        },
    }

    return item


def generate_catalog(item_ids: list[str]) -> dict[str, Any]:
    """Generate root STAC catalog linking all items."""
    links: list[dict[str, str]] = [
        {"rel": "root", "href": "./catalog.json", "type": "application/json"},
        {"rel": "self", "href": "./catalog.json", "type": "application/json"},
    ]
    for item_id in item_ids:
        links.append(
            {
                "rel": "item",
                "href": f"./{item_id}/item.json",
                "type": "application/json",
            }
        )

    return {
        "type": "Catalog",
        "id": "debrief-exercises",
        "stac_version": STAC_VERSION,
        "description": (
            "Debrief maritime exercise catalog — 100 deterministic fixtures for testing."
        ),
        "title": "Debrief Exercise Catalog",
        "links": links,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    """Generate 100 STAC item fixtures and a root catalog."""
    random.seed(42)
    rng = random.Random(42)

    print("Generating STAC fixtures...")
    taxonomy = load_vessel_taxonomy()

    # Build assignment pools
    # Region assignments
    region_assignments: list[Region] = []
    for region, count in REGIONS:
        region_assignments.extend([region] * count)
    rng.shuffle(region_assignments)

    # Duration assignments
    dur_counts = distribute_items(100, DURATION_BUCKETS)
    dur_assignments = pick_from_buckets(DURATION_BUCKETS, dur_counts, rng)

    # Track count assignments
    track_counts_raw = distribute_items(100, TRACK_BUCKETS)
    track_assignments = pick_from_buckets(TRACK_BUCKETS, track_counts_raw, rng)

    # Vessel category assignments (~45 surface_warship, ~20 subsurface, ~15 auxiliary, ~10 merchant, ~10 mixed)
    vessel_cats: list[str] = (
        ["surface_warship"] * 45
        + ["subsurface"] * 20
        + ["auxiliary"] * 15
        + ["merchant"] * 10
        + ["mixed"] * 10
    )
    rng.shuffle(vessel_cats)

    # Reserve indices for named edge cases
    edge_case_indices: dict[int, tuple[str, dict[str, Any]]] = {}
    idx = 0
    for ec in EDGE_CASES:
        for i in range(ec.count):
            suffix = f"{i + 1:03d}"
            edge_id = f"exercise-{ec.prefix}-{suffix}"
            edge_case_indices[idx] = (edge_id, ec.overrides)
            idx += 1

    # Shuffle exercise names for non-edge-case items
    available_names = list(EXERCISE_NAMES)
    rng.shuffle(available_names)
    name_idx = 0

    item_ids: list[str] = []
    items: list[tuple[str, dict[str, Any]]] = []

    for i in range(100):
        region = region_assignments[i]
        dur_range = dur_assignments[i]
        track_range = track_assignments[i]
        vessel_cat = vessel_cats[i]

        if i in edge_case_indices:
            item_id, overrides = edge_case_indices[i]
            # Use the edge case prefix as base for the name
            parts = item_id.replace("exercise-", "").rsplit("-", 1)
            ec_label = parts[0].replace("-", " ").title()
            name = f"{ec_label} {parts[1]}"
        else:
            overrides = {}
            if name_idx < len(available_names):
                name = available_names[name_idx]
                name_idx += 1
            else:
                name = f"Exercise Alpha-{i:03d}"
            item_id = f"exercise-{make_slug(name)}"

        # Determine track count from bucket assignment
        tc_lo, tc_hi = track_range
        track_count = rng.randint(tc_lo, tc_hi)

        item = generate_item(
            item_id=item_id,
            name=name,
            region=region,
            duration_hours_range=dur_range,
            vessel_category=vessel_cat,
            taxonomy=taxonomy,
            rng=rng,
            track_count=track_count,
            overrides=overrides,
        )

        item_ids.append(item_id)
        items.append((item_id, item))

    # Write items
    for item_id, item in items:
        item_dir = FIXTURES_DIR / item_id
        item_dir.mkdir(parents=True, exist_ok=True)
        item_file = item_dir / "item.json"
        with open(item_file, "w") as f:
            json.dump(item, f, indent=2)
            f.write("\n")

    # Write catalog
    catalog = generate_catalog(item_ids)
    catalog_file = FIXTURES_DIR / "catalog.json"
    with open(catalog_file, "w") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")

    # Summary
    print(f"\n  Generated {len(items)} items in {FIXTURES_DIR}/")
    print(f"  Catalog: {catalog_file}")

    # Distribution summary
    region_counts: dict[str, int] = {}
    nat_counts: dict[str, int] = {}
    track_total = 0
    empty_count = 0
    single_point_count = 0

    for _, item in items:
        props = item["properties"]
        # Count regions (approximate from bbox center latitude)
        bbox = item["bbox"]
        center_lat = (bbox[1] + bbox[3]) / 2
        center_lon = (bbox[0] + bbox[2]) / 2
        region_name = "Unknown"
        for reg, _count in REGIONS:
            rname, lat_min, lat_max, lon_min, lon_max = reg
            if lat_min <= center_lat <= lat_max and lon_min <= center_lon <= lon_max:
                region_name = rname
                break
        region_counts[region_name] = region_counts.get(region_name, 0) + 1

        for p in props.get("debrief:platforms", []):
            nat = p.get("nationality")
            if nat:
                nat_counts[nat] = nat_counts.get(nat, 0) + 1

        n_tracks = len(props.get("debrief:platforms", []))
        track_total += n_tracks
        if n_tracks == 0:
            empty_count += 1
        if props.get("datetime") is not None:
            single_point_count += 1

    print("\n  Region distribution:")
    for rname, count in sorted(region_counts.items(), key=lambda x: -x[1]):
        print(f"    {rname}: {count}")

    print("\n  Top nationalities (appearances):")
    for nat, count in sorted(nat_counts.items(), key=lambda x: -x[1])[:8]:
        print(f"    {nat}: {count}")

    print(f"\n  Empty plots (0 tracks): {empty_count}")
    print(f"  Single-point (datetime only): {single_point_count}")
    print(f"  Total tracks across all items: {track_total}")
    print("\n  Done.")


if __name__ == "__main__":
    main()
