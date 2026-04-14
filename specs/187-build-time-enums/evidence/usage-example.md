# Usage Example: Build-Time Enum Extraction

## One-command invocation

From the repository root:

```bash
$ uv run python scripts/extract-enum-bundle.py
```

## Expected stdout

```text
[extract-enum-bundle] reading registry: /.../shared/data/platform-registry.json
[extract-enum-bundle] reading catalog : /.../preview/workspace/samples/local-store
[extract-enum-bundle] wrote           : /.../shared/data/enum-bundle.json
  vessel-class nodes : 14
  nationalities      : 4
  exercise names     : 1
  tags               : 20
  feature tags       : 16
```

The exact counts vary with the registry + catalog state; the operator uses
them for a quick sanity check (FR-011).

## What gets written

`shared/data/enum-bundle.json` — a committed artefact, 2.7 KB, containing:

- `_meta` — provenance header (tool name, source paths, parse rules).
- `vessel_class_tree` — interior nodes of the platform registry's vessel-class
  tree. Platform-instance leaves (e.g. `NELSON`, `MASON`) are stripped so the
  LLM reasons about classes, not individual ships.
- `nationalities` — deduplicated union of registry + catalog ISO codes.
- `exercise_names` — exercise prefixes harvested from item titles
  (`"Saxon Warrior: Boat1"` → `"Saxon Warrior"`).
- `tags` — deduplicated `debrief:tags` across the catalog (e.g. `ASW`, `training`).
- `feature_tags` — deduplicated `debrief:feature_tags` across the catalog
  (e.g. `sonar-contact`, `radar-detection`).

## Bundle shape (excerpt)

```json
{
  "_meta": {
    "canonicalisation": "trim + lowercase dedup, first-seen casing preserved",
    "exercise_parse_rule": "title prefix before ': '",
    "generated_from_catalog": "preview/workspace/samples/local-store",
    "generated_from_registry": "shared/data/platform-registry.json",
    "tool": "scripts/extract-enum-bundle.py"
  },
  "exercise_names": ["Saxon Warrior"],
  "feature_tags": ["active-search", "datum", "depth-charge", "helicopter-ops", ...],
  "nationalities": ["DE", "FR", "GB", "US"],
  "tags": ["AAW", "amphibious", "ASW", "boarding", ...],
  "vessel_class_tree": {
    "subsurface": { "_class": { "full_name": "Subsurface Vessel" }, ... },
    "surface": { "_class": { "full_name": "Surface Vessel" }, ... }
  }
}
```

## Custom inputs (tests / experiments)

```bash
$ uv run python scripts/extract-enum-bundle.py \
    --registry path/to/test-registry.json \
    --catalog  path/to/test-catalog-dir \
    --output   /tmp/test-bundle.json
```

All three flags are optional; omitting any falls back to the canonical
default.

## Integrating with the prompt builder (#188)

```python
from pathlib import Path
import json

ENUM_BUNDLE = Path("shared/data/enum-bundle.json")

with ENUM_BUNDLE.open() as fh:
    enums = json.load(fh)

# enums["_meta"] is informational; the prompt consumer looks at the five data sections.
system_prompt = build_system_prompt(
    nationalities=enums["nationalities"],
    tags=enums["tags"],
    feature_tags=enums["feature_tags"],
    exercises=enums["exercise_names"],
    class_tree=enums["vessel_class_tree"],
)
```
