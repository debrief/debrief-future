#!/usr/bin/env python3
"""Enrich imported legacy STAC catalog items with realistic maritime metadata.

Reads each item.json + features.geojson from the local-store catalog,
extracts track/sensor/narrative information, and adds rich debrief:*
metadata so the STAC Catalog Browser can demonstrate its full capabilities.

Usage:
    uv run python scripts/enrich-legacy-catalog.py
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
CATALOG_DIR = Path("preview/workspace/samples/local-store")

STAC_EXTENSIONS = ["https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json"]

# ---------------------------------------------------------------------------
# Vocabulary (matching generate-stac-fixtures.py)
# ---------------------------------------------------------------------------

TAGS = [
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

FEATURE_TAGS = [
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

NATIONALITIES_POOL = [
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

VESSEL_CLASSES = {
    "surface_warship": [
        "surface/warship/frigate/type23",
        "surface/warship/frigate/type26",
        "surface/warship/frigate/fremm",
        "surface/warship/destroyer/type45",
        "surface/warship/destroyer/arleigh-burke",
        "surface/warship/corvette/visby",
        "surface/warship/carrier/queen-elizabeth",
        "surface/warship/patrol/river",
    ],
    "subsurface": [
        "subsurface/submarine/ssn/astute",
        "subsurface/submarine/ssn/trafalgar",
        "subsurface/submarine/ssn/virginia",
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

TRACK_NAME_PREFIXES: dict[str, list[str]] = {
    "GB": ["HMS"],
    "US": ["USS"],
    "FR": ["FS"],
    "DE": ["FGS"],
    "NO": ["HNoMS"],
    "SE": ["HMS"],
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

SHIP_NAMES = [
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
    "Fridtjof Nansen",
    "Roald Amundsen",
    "Otto Sverdrup",
    "Visby",
    "Helsingborg",
    "Andrea Doria",
    "Bergamini",
    "De Zeven Provincien",
    "Tromp",
    "De Ruyter",
    "Evertsen",
]

EXERCISE_NAMES = [
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
    "Talisman Sabre",
    "Malabar Horizon",
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
    "Osprey Watch",
    "Raptor Chase",
    "Sierra Storm",
    "Talon Strike",
    "Wolf Pack Alpha",
    "Bastion Wall",
    "Citadel Peak",
    "Dagger Point",
]

# ---------------------------------------------------------------------------
# Domain-specific configuration
# ---------------------------------------------------------------------------

DOMAIN_PROFILES: dict[str, dict[str, Any]] = {
    "core": {
        "exercise_type": "training",
        "primary_nationalities": ["GB", "US", "FR", "DE"],
        "vessel_category": "surface_warship",
        "base_tags": ["training"],
        "description_prefix": "Royal Navy training exercise",
        "region": "English Channel / Western Approaches",
    },
    "demo": {
        "exercise_type": "analysis",
        "primary_nationalities": ["GB", "US", "NO", "AU"],
        "vessel_category": "surface_warship",
        "base_tags": ["training", "certification"],
        "description_prefix": "Analysis and review exercise",
        "region": "North Atlantic",
    },
    "s2r": {
        "exercise_type": "asw",
        "primary_nationalities": ["GB", "US", "FR", "NO", "CA"],
        "vessel_category": "subsurface",
        "base_tags": ["ASW", "surveillance"],
        "description_prefix": "Sensor-to-range ASW analysis",
        "region": "North Atlantic / GIUK Gap",
    },
    "satc": {
        "exercise_type": "prosecution",
        "primary_nationalities": ["GB", "NO", "SE", "DE", "DK"],
        "vessel_category": "subsurface",
        "base_tags": ["ASW", "prosecution"],
        "description_prefix": "Semi-auto track construction exercise",
        "region": "Norwegian Sea",
    },
    "multi-static": {
        "exercise_type": "multi_static",
        "primary_nationalities": ["GB", "US", "NO", "FR", "IT", "NL"],
        "vessel_category": "surface_warship",
        "base_tags": ["ASW", "multi-national", "surveillance"],
        "description_prefix": "Multi-static sonar exercise",
        "region": "North Atlantic",
    },
    "other-formats": {
        "exercise_type": "mixed",
        "primary_nationalities": ["GB", "AU", "JP", "IN"],
        "vessel_category": "surface_warship",
        "base_tags": ["training"],
        "description_prefix": "Indo-Pacific interoperability exercise",
        "region": "Western Pacific",
    },
}

# Map legacy platform IDs to realistic vessel names and nationalities
PLATFORM_VESSEL_MAP: dict[str, tuple[str, str, str]] = {
    # (display_name, nationality, vessel_class)
    "NELSON": ("HMS Nelson", "GB", "surface/warship/frigate/type23"),
    "COLLINGWOOD": ("HMS Collingwood", "GB", "surface/warship/destroyer/type45"),
    "FRIGATE": ("HMS Argyll", "GB", "surface/warship/frigate/type23"),
    "OWNSHIP": ("HMS Defender", "GB", "surface/warship/destroyer/type45"),
    "SENSOR": ("HMS Richmond", "GB", "surface/warship/frigate/type23"),
    "SUBJECT": ("Contact Alpha", "GB", "subsurface/submarine/ssn/astute"),
    "TARGET": ("Contact Bravo", "GB", "subsurface/submarine/ssk/type212"),
    "TMA_TRACK": ("TMA Solution Track", "GB", "subsurface/submarine/ssn/trafalgar"),
    "OWNSHIP_A": ("HMS Lancaster", "GB", "surface/warship/frigate/type23"),
    "OWNSHIP_B": ("USS Mason", "US", "surface/warship/destroyer/arleigh-burke"),
}


def extract_features_metadata(features_path: Path) -> dict[str, Any]:
    """Extract track names, feature kinds, and counts from features.geojson."""
    if not features_path.exists():
        return {"tracks": [], "sensors": 0, "narratives": 0, "shapes": 0, "kinds": set()}

    with open(features_path) as f:
        fc = json.load(f)

    tracks: list[dict[str, Any]] = []
    sensors = 0
    narratives = 0
    shapes = 0
    kinds: set[str] = set()
    has_depth = False

    for feat in fc.get("features", []):
        props = feat.get("properties", {})
        kind = props.get("kind", "")
        kinds.add(kind)

        if kind == "TRACK":
            platform_id = props.get("platform_id", "UNKNOWN")
            positions = props.get("positions", [])
            has_sub_depth = any(p.get("depth", 0) > 10 for p in positions)
            if has_sub_depth:
                has_depth = True
            tracks.append(
                {
                    "platform_id": platform_id,
                    "platform_name": props.get("platform_name", platform_id),
                    "n_positions": len(positions),
                    "has_depth": has_sub_depth,
                }
            )
        elif kind in ("SENSOR_CONTACT", "SENSOR", "SENSOR2"):
            sensors += 1
        elif kind == "NARRATIVE":
            narratives += 1
        elif kind in ("RECTANGLE", "CIRCLE", "LINE", "VECTOR", "TEXT", "PERIODTEXT"):
            shapes += 1

    return {
        "tracks": tracks,
        "sensors": sensors,
        "narratives": narratives,
        "shapes": shapes,
        "kinds": kinds,
        "has_depth": has_depth,
    }


def determine_domain(item_id: str) -> str:
    """Extract domain prefix from item ID."""
    if item_id.startswith("core--"):
        return "core"
    if item_id.startswith("demo"):
        return "demo"
    if item_id.startswith("s2r"):
        return "s2r"
    if item_id.startswith("satc"):
        return "satc"
    if item_id.startswith("multi-static"):
        return "multi-static"
    if item_id.startswith("other-formats"):
        return "other-formats"
    return "core"


def assign_track_names(
    tracks: list[dict[str, Any]],
    domain: str,
    rng: random.Random,
) -> tuple[list[str], list[str], list[str]]:
    """Assign realistic vessel names, nationalities, and classes to tracks.

    Returns (track_names, nationalities, vessel_classes).
    """
    profile = DOMAIN_PROFILES.get(domain, DOMAIN_PROFILES["core"])
    track_names: list[str] = []
    nationalities: set[str] = set()
    vessel_classes: set[str] = set()
    available_ships = list(SHIP_NAMES)
    rng.shuffle(available_ships)

    # Cycle through available nationalities for variety
    nat_pool = list(profile["primary_nationalities"])
    nat_idx = rng.randint(0, len(nat_pool) - 1)

    for track in tracks:
        pid = track["platform_id"]

        # Check known mapping first
        if pid in PLATFORM_VESSEL_MAP:
            name, nat, vc = PLATFORM_VESSEL_MAP[pid]
            track_names.append(name)
            nationalities.add(nat)
            vessel_classes.add(vc)
            continue

        # Rotate through nationalities for multi-national feel
        nat = nat_pool[nat_idx % len(nat_pool)]
        nat_idx += 1
        nationalities.add(nat)
        prefix = rng.choice(TRACK_NAME_PREFIXES.get(nat, ["WARSHIP"]))

        if available_ships:
            ship = available_ships.pop()
            name = f"{prefix} {ship}"
        else:
            name = f"{prefix} {pid.title()}"

        track_names.append(name)

        # Assign vessel class
        if track.get("has_depth"):
            vc = rng.choice(VESSEL_CLASSES["subsurface"])
        else:
            cat = profile["vessel_category"]
            vc = rng.choice(VESSEL_CLASSES.get(cat, VESSEL_CLASSES["surface_warship"]))
        vessel_classes.add(vc)

    # Ensure multi-track items show nationality diversity
    if len(tracks) > 1 and len(nationalities) < 2:
        extras = [n for n in nat_pool if n not in nationalities]
        if extras:
            nationalities.add(rng.choice(extras))

    return track_names, sorted(nationalities), sorted(vessel_classes)


def assign_tags(
    domain: str,
    feature_meta: dict[str, Any],
    rng: random.Random,
) -> tuple[list[str], list[str]]:
    """Assign tags and feature_tags based on domain and content."""
    profile = DOMAIN_PROFILES.get(domain, DOMAIN_PROFILES["core"])
    tags: set[str] = set(profile["base_tags"])

    # Content-driven tags
    if feature_meta["sensors"] > 0:
        tags.add("ASW")
    if feature_meta["sensors"] > 50:
        tags.add("surveillance")
    if feature_meta["shapes"] > 0:
        tags.add("force-protection")
    if feature_meta["narratives"] > 0:
        tags.add("certification")
    if len(feature_meta["tracks"]) > 3:
        tags.add("multi-national")
    if feature_meta.get("has_depth"):
        tags.add("ASW")

    # Add 1-2 random extras for variety
    extras = [t for t in TAGS if t not in tags]
    n_extra = rng.randint(1, min(3, len(extras)))
    tags.update(rng.sample(extras, n_extra))

    # Feature tags based on content
    feature_tags: set[str] = set()
    kinds = feature_meta.get("kinds", set())

    if "SENSOR_CONTACT" in kinds or "SENSOR" in kinds or "SENSOR2" in kinds:
        feature_tags.add("sonar-contact")
        if domain == "s2r":
            feature_tags.update(rng.sample(["passive-search", "towed-array", "datum"], 2))
        elif domain == "satc":
            feature_tags.update(rng.sample(["prosecution", "track-merge", "sprint-and-drift"], 2))
        elif domain == "multi-static":
            feature_tags.update(["active-search", "passive-search"])

    if "TRACK" in kinds:
        feature_tags.add(rng.choice(["radar-detection", "visual-sighting"]))

    if "NARRATIVE" in kinds:
        feature_tags.add(rng.choice(["datum", "intercept"]))

    # Add 0-2 random extras
    extras_ft = [t for t in FEATURE_TAGS if t not in feature_tags]
    n_extra_ft = rng.randint(0, min(2, len(extras_ft)))
    feature_tags.update(rng.sample(extras_ft, n_extra_ft))

    return sorted(tags), sorted(feature_tags)


def build_description(
    domain: str,
    item_id: str,
    exercise_name: str,
    feature_meta: dict[str, Any],
    nationalities: list[str],
    track_names: list[str],
) -> str:
    """Build a rich, narrative description for the STAC item."""
    profile = DOMAIN_PROFILES.get(domain, DOMAIN_PROFILES["core"])
    n_tracks = len(feature_meta["tracks"])
    n_sensors = feature_meta["sensors"]
    n_narratives = feature_meta["narratives"]
    region = profile["region"]

    parts = [f"{exercise_name} — {profile['description_prefix']} in the {region}."]

    if n_tracks > 0:
        parts.append(f"{n_tracks} platform track(s) recorded")
        if track_names:
            parts[-1] += f" including {', '.join(track_names[:3])}"
            if len(track_names) > 3:
                parts[-1] += f" and {len(track_names) - 3} other(s)"
        parts[-1] += "."

    if n_sensors > 0:
        parts.append(f"{n_sensors} sensor contact(s) logged.")

    if n_narratives > 0:
        parts.append(f"{n_narratives} narrative entries.")

    if len(nationalities) > 1:
        parts.append(f"Multi-national participation: {', '.join(nationalities)}.")

    return " ".join(parts)


def enrich_item(
    item_dir: Path,
    exercise_name: str,
    rng: random.Random,
) -> dict[str, Any] | None:
    """Enrich a single STAC item with maritime metadata."""
    item_path = item_dir / "item.json"
    features_path = item_dir / "features.geojson"

    if not item_path.exists():
        return None

    with open(item_path) as f:
        item = json.load(f)

    item_id = item["id"]
    domain = determine_domain(item_id)

    # Extract what we know from features
    feature_meta = extract_features_metadata(features_path)

    # Assign rich metadata
    track_names, nationalities, vessel_classes = assign_track_names(
        feature_meta["tracks"], domain, rng
    )
    tags, feature_tags = assign_tags(domain, feature_meta, rng)

    # Build description
    description = build_description(
        domain, item_id, exercise_name, feature_meta, nationalities, track_names
    )

    # Update item
    item["stac_extensions"] = list(STAC_EXTENSIONS)
    item["properties"]["title"] = exercise_name
    item["properties"]["description"] = description
    item["properties"]["debrief:vessel_classes"] = vessel_classes
    item["properties"]["debrief:tags"] = tags
    item["properties"]["debrief:feature_tags"] = feature_tags
    item["properties"]["debrief:track_names"] = track_names
    item["properties"]["debrief:nationalities"] = nationalities

    # Write back
    with open(item_path, "w") as f:
        json.dump(item, f, indent=2)
        f.write("\n")

    return item


def update_catalog_summaries(catalog_path: Path, all_items: list[dict[str, Any]]) -> None:
    """Update catalog.json with aggregated summaries from all items."""
    catalog_file = catalog_path / "catalog.json"
    with open(catalog_file) as f:
        catalog = json.load(f)

    all_vessel_classes: set[str] = set()
    all_tags: set[str] = set()
    all_feature_tags: set[str] = set()
    all_track_names: set[str] = set()
    all_nationalities: set[str] = set()

    for item in all_items:
        props = item["properties"]
        all_vessel_classes.update(props.get("debrief:vessel_classes", []))
        all_tags.update(props.get("debrief:tags", []))
        all_feature_tags.update(props.get("debrief:feature_tags", []))
        all_track_names.update(props.get("debrief:track_names", []))
        all_nationalities.update(props.get("debrief:nationalities", []))

    catalog["summaries"] = {
        "debrief:vessel_classes": sorted(all_vessel_classes),
        "debrief:tags": sorted(all_tags),
        "debrief:feature_tags": sorted(all_feature_tags),
        "debrief:track_names": sorted(all_track_names),
        "debrief:nationalities": sorted(all_nationalities),
    }

    with open(catalog_file, "w") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")


def main() -> None:
    """Enrich all items in the legacy STAC catalog."""
    rng = random.Random(42)

    if not CATALOG_DIR.exists():
        print(f"Catalog not found at {CATALOG_DIR}")
        return

    # Read catalog to find all items
    catalog_file = CATALOG_DIR / "catalog.json"
    with open(catalog_file) as f:
        catalog = json.load(f)

    item_links = [link for link in catalog.get("links", []) if link.get("rel") == "item"]
    print(f"Found {len(item_links)} items to enrich")

    # Group items by domain for themed naming
    domain_items: dict[str, list[str]] = {}
    for link in item_links:
        href = link["href"]
        # Extract directory name from href like "./core--boat1/item.json"
        item_dir_name = href.replace("./", "").replace("/item.json", "")
        domain = determine_domain(item_dir_name)
        domain_items.setdefault(domain, []).append(item_dir_name)

    # Assign exercise names by domain for thematic coherence
    domain_exercise_series: dict[str, str] = {
        "core": "Saxon Warrior",
        "demo": "Joint Warrior",
        "s2r": "Dynamic Mongoose",
        "satc": "Silent Resolve",
        "multi-static": "Formidable Shield",
        "other-formats": "Talisman Sabre",
    }

    all_enriched: list[dict[str, Any]] = []

    for domain, item_dirs in sorted(domain_items.items()):
        series_name = domain_exercise_series.get(domain, "Exercise")
        print(f"\n  {domain}: {len(item_dirs)} items (series: {series_name})")

        for i, item_dir_name in enumerate(sorted(item_dirs)):
            item_dir = CATALOG_DIR / item_dir_name
            # Create unique exercise name within the series
            suffix = item_dir_name.split("--", 1)[1] if "--" in item_dir_name else item_dir_name
            # Clean up suffix for display
            clean_suffix = suffix.replace("-", " ").replace("_", " ").title()
            exercise_name = f"{series_name}: {clean_suffix}"

            enriched = enrich_item(item_dir, exercise_name, rng)
            if enriched:
                all_enriched.append(enriched)
                print(f"    [{i + 1:3d}] {item_dir_name} -> {exercise_name}")

    # Update catalog summaries
    update_catalog_summaries(CATALOG_DIR, all_enriched)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"Enriched {len(all_enriched)} items")

    all_vc = set()
    all_nat = set()
    all_tags = set()
    all_ft = set()
    for item in all_enriched:
        props = item["properties"]
        all_vc.update(props.get("debrief:vessel_classes", []))
        all_nat.update(props.get("debrief:nationalities", []))
        all_tags.update(props.get("debrief:tags", []))
        all_ft.update(props.get("debrief:feature_tags", []))

    print(f"  Unique vessel classes: {len(all_vc)}")
    print(f"  Unique nationalities:  {len(all_nat)} — {sorted(all_nat)}")
    print(f"  Unique tags:           {len(all_tags)}")
    print(f"  Unique feature tags:   {len(all_ft)}")
    print("Done.")


if __name__ == "__main__":
    main()
