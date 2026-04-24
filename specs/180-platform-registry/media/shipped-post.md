---
layout: future-post
title: "Shipped: Platform Registry"
date: 2026-04-13
track: [credibility]
author: Ian
reading_time: 4
tags: [platform-registry, e10-catalog-discovery, shared-data, tracer-bullet]
excerpt: "A vessel class tree that turns NELSON into a frigate, a nationality, and a domain — in Python and TypeScript, from one file."
---

## What We Built

The platform registry is live. It's a single JSON file — `shared/data/platform-registry.json` — that defines a vessel class hierarchy as a tree. Vessel classes are interior nodes; real platforms are leaves. `NELSON` sits at `surface/warship/frigate/type23/NELSON`, so its domain, role, type, and class are structural consequences of where it lives, not fields someone had to type twice.

Both Python (`debrief-data`) and TypeScript (`@debrief/data`) ship loaders with an identical API: `resolve()`, `list_platforms()`, `find_by_class()`, `is_valid_class()`. A golden fixture file defines the expected output for all 10 seeded platforms; both test suites assert against it field-by-field. Cross-language drift becomes a test failure, not a production surprise.

The registry ships with 10 platforms covering frigates, destroyers, and submarines — the same set previously hardcoded in the enrich script, now replaced by a single authoritative source.

## By the Numbers

| | |
|---|---|
| Tests passing | 66 |
| Tests failed | 0 |
| Python tests | 33 |
| TypeScript tests | 33 |
| Platforms seeded | 10 |
| New runtime dependencies | 0 |

## Validation in Practice

Load-time validation catches structural errors before they reach any service. A duplicate ID reports exactly where both copies live:

```
RegistryError: Duplicate platform ID 'DUPE' found at paths 'surface/a' and 'surface/b'
```

Missing fields, malformed JSON, and a missing `vessel_classes` root all produce similarly specific messages. The registry either loads cleanly or fails loudly — there's no silent partial load.

## A Query That Now Works

```python
from debrief_data import load_registry

registry = load_registry()
frigates = registry.find_by_class("surface/warship/frigate")
# ['FRIGATE', 'NELSON', 'OWNSHIP_A', 'SENSOR']
```

The same call works in TypeScript:

```typescript
const frigates = registry.findByClass('surface/warship/frigate');
// ['FRIGATE', 'NELSON', 'OWNSHIP_A', 'SENSOR']
```

Before this, answering "which platforms are UK frigates?" meant writing a bespoke filter against flat attributes scattered across multiple files. Now it's one call with a path argument.

## Lessons Learned

The `_class` convention for class-level metadata (`_name`, `_display`) turned out clean in practice. A node is a platform if it has a `name` property; everything else is either a child class or metadata about the class itself. The discriminator is simple enough that both implementations derived it independently from the spec and agreed.

Writing the golden fixture before either loader was the right call. It forced a concrete decision about what the API should return before any code existed — and caught one field-naming inconsistency between the Python and TypeScript drafts before it became a bug.

## What's Next

The registry is the foundation for the rest of E10. The next items in sequence:

- **#181** — Update the LinkML schema to carry registry-derived fields
- **#182** — Warn on unrecognised platforms during import
- **#183** — Resolve platform metadata at save time

None of those could start without this. They can now.

→ [See the spec](../spec.md)
→ [See the usage examples](../evidence/usage-example.md)
