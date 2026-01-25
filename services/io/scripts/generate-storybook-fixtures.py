#!/usr/bin/env python3
"""
Generate GeoJSON fixtures for Storybook verification.

This script parses REP files with shape annotations and outputs GeoJSON
FeatureCollections for use in Storybook stories.

Usage:
    python generate-storybook-fixtures.py [input.rep] [output.json]

    If no arguments provided, uses default paths:
    - Input: services/io/tests/fixtures/valid/shapes.rep
    - Output: shared/components/src/fixtures/all-shapes.json
"""

import json
import sys
from pathlib import Path

# Add the src directory to the path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from debrief_io.parser import parse_rep  # noqa: E402


def main() -> int:
    """Generate Storybook fixtures from REP files."""
    # Determine paths
    repo_root = Path(__file__).parent.parent.parent.parent

    if len(sys.argv) >= 2:
        input_path = Path(sys.argv[1])
    else:
        input_path = repo_root / "services/io/tests/fixtures/valid/shapes.rep"

    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2])
    else:
        output_path = repo_root / "shared/components/src/fixtures/all-shapes.json"

    # Verify input exists
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        return 1

    # Parse REP file
    print(f"Parsing: {input_path}")
    try:
        result = parse_rep(input_path)
    except Exception as e:
        print(f"Error parsing REP file: {e}", file=sys.stderr)
        return 1

    # Extract all features (tracks + annotations)
    all_features = result.features
    if not all_features:
        print("Warning: No features found in REP file", file=sys.stderr)

    # For shapes demo, we only want annotations (non-TRACK features)
    annotations = [f for f in all_features if f.get("properties", {}).get("kind") != "TRACK"]
    if not annotations:
        print("Warning: No annotation shapes found in REP file", file=sys.stderr)

    # Create GeoJSON FeatureCollection
    feature_collection = {
        "type": "FeatureCollection",
        "features": annotations,
    }

    # Add metadata
    feature_collection["metadata"] = {
        "source": str(input_path.name),
        "feature_count": len(annotations),
        "shape_types": list(set(
            f.get("properties", {}).get("kind", "unknown")
            for f in annotations
        )),
    }

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    print(f"Writing: {output_path}")
    with open(output_path, "w") as f:
        json.dump(feature_collection, f, indent=2)

    # Print summary
    shape_counts = {}
    for feature in annotations:
        kind = feature.get("properties", {}).get("kind", "unknown")
        shape_counts[kind] = shape_counts.get(kind, 0) + 1

    print(f"\nGenerated {len(annotations)} features:")
    for kind, count in sorted(shape_counts.items()):
        print(f"  {kind}: {count}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
