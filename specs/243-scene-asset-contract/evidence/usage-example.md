# Usage Example: Per-Scene Asset Key Contract

> **Walkthrough**: a hand-crafted Item assets block exercised through three states —
> (1) paired-valid, (2) `-sm` deleted, (3) ULID replaced with `foo`. Each state
> shows the exact failure path and which named rule is cited.

---

## Setup

```python
import json
from pathlib import Path
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from debrief_stac import (
    audit_scene_thumbnail_pairing,
    audit_scene_thumbnail_orphans,
    PAIR_RULE_ID,
    ORPHAN_RULE_ID,
)

REPO = Path("...")  # repo root
overlay = json.loads((REPO / "shared/schemas/contracts/scene-thumbnail-asset.schema.json").read_text())
bundle = json.loads((REPO / "shared/schemas/src/generated/json-schema/debrief.schema.json").read_text())
registry = Registry().with_resources([
    (overlay["$id"], Resource.from_contents(overlay)),
    (bundle["$id"], Resource.from_contents(bundle)),
])
validator = Draft202012Validator(overlay, registry=registry)
```

---

## State 1 — paired-valid

A Storyboarding capture has just produced a pair of asset entries:

```json
{
  "scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W": {
    "href": "./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png",
    "type": "image/png",
    "roles": ["thumbnail"],
    "title": "Scene thumbnail"
  },
  "scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W-sm": {
    "href": "./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W-sm.png",
    "type": "image/png",
    "roles": ["thumbnail"],
    "title": "Scene thumbnail (small)"
  }
}
```

**Schema check** (overlay):

```python
validator.validate(assets)   # raises nothing
```

**Audit check** (pairing + orphan, given the Storyboard lists the matching ULID):

```python
audit_scene_thumbnail_pairing({"assets": assets})  # → []
audit_scene_thumbnail_orphans({"assets": assets},
                              {"01HXYZ7K8M9N0P1Q2R3S4T5V6W"})  # → []
```

→ **PASS**. Both layers green. The Item is well-formed.

---

## State 2 — `-sm` variant deleted (regression)

A faulty migration removes the `-sm` key:

```json
{
  "scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W": {
    "href": "./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png",
    "type": "image/png",
    "roles": ["thumbnail"]
  }
}
```

**Schema check**:

```python
validator.validate(assets)   # ↑ still passes — the value shape is fine
                             #   and the overlay can't express pair-rule-001
                             #   in JSON Schema.
```

**Audit check**:

```python
violations = audit_scene_thumbnail_pairing({"assets": assets})
# → [Violation(
#     rule_id="scene-thumbnail-pair-rule-001",
#     message="scene-thumbnail-pair-rule-001: missing small counterpart "
#             "'scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W-sm' for asset "
#             "key 'scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W'",
#     asset_key="scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W",
#   )]
```

→ **FAIL** — caught by the audit, **not** the JSON Schema. The
violation message embeds the stable rule ID
`scene-thumbnail-pair-rule-001`; a CI failure can grep the rule ID and
land directly inside the LinkML class docstring (which references the
rule by name).

---

## State 3 — ULID replaced with `foo` (write-bug)

A bug in a writer leaks an unsanitised string into the asset key:

```json
{
  "scene-thumbnail-foo": {
    "href": "./scene-thumbnails/scene-foo.png",
    "type": "image/png",
    "roles": ["thumbnail"]
  }
}
```

**Schema check**:

```python
validator.validate(assets)
# jsonschema.ValidationError:
#   'scene-thumbnail-foo' does not match
#       '^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$'
#   Failed validating 'pattern' in schema['propertyNames']['then']:
#     {'pattern': '^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$'}
```

→ **FAIL** — caught by the JSON Schema overlay's `propertyNames` if/then
clause, which expresses `scene-thumbnail-key-format-rule-001`. The audit
module ignores keys that don't match the strict pattern, so the write-bug
never reaches the orphan/pair check; it's caught at the outer layer.

---

## Summary

| State | Rule violated | Caught by | Citation |
|-------|---------------|-----------|----------|
| 1 | none | both layers green | — |
| 2 | `scene-thumbnail-pair-rule-001` | audit module | `Violation.message` |
| 3 | `scene-thumbnail-key-format-rule-001` | JSON Schema overlay | `propertyNames.then.pattern` |

This three-state walk demonstrates the **two-layer enforcement strategy**
(SC-003): the schema layer covers value shape + key format; the audit
module covers pairing + orphaning. Both layers cite stable rule IDs that
are also embedded in the named LinkML class docstring — so a failing CI
job can be traced back to a single shape definition.
