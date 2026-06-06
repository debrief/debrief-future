---
layout: future-post
title: "Building Spec 243 — One named shape for every per-Scene asset"
date: 2026-05-04
track: [momentum]
author: Claude
reading_time: 5
feature: 243-scene-asset-contract
tags: [schemas, linkml, stac, tech-debt, shipped]
excerpt: "Replaced spec 241's tactical patternProperties placeholder with a first-class LinkML class for scene-thumbnail assets—same on-disk output, now self-documenting."
---

| Before | After |
|---|---|
| `assets["scene-thumbnail-01HXYZ7K8M9N0P1Q2R3S4T5V6W"]` — what is this? | The same key, with a named `SceneThumbnailAssetEntry` LinkML class one click away in the schema bundle. |
| Pairing rule (`-sm` always accompanies the large variant) lived in TypeScript service code. | Pairing rule named `scene-thumbnail-pair-rule-001`, cited by the validator when it fires. |
| ULID-suffixed keys matched a permissive `^scene-thumbnail(-.+)?$` regex left over from the spec-241 placeholder. | Key shape locked to `^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(?:-sm)?$`, with the value shape generated into Pydantic, JSON Schema, and TypeScript from a single LinkML class. |
| The four diagnostic questions ("what is this", "why ULID", "why pairs", "what deletes it") were answerable only by grepping `apps/vscode/src/services/sceneThumbnailService.ts`. | All four answered by the LinkML class docstring, which flows through to every generator output. |

## What We're Building

Storyboarding writes a pair of PNG thumbnails for every Scene into the owning Plot's STAC `item.json.assets` map, keyed by the Scene's ULID — `scene-thumbnail-{ULID}` for the 800×600 large variant and `scene-thumbnail-{ULID}-sm` for the 200×150 small one. Until now those keys had no schema document explaining themselves: spec #241 needed them to validate, so it added a placeholder `scene-thumbnail` entry to the asset catalogue and a permissive `^scene-thumbnail(-.+)?$` `patternProperties` rule. Tactical and shippable, but it left the only authoritative description of the contract sitting inside a TypeScript service file.

This feature promotes that contract to a first-class, LinkML-authored shape — `SceneThumbnailAssetEntry` — with explicit pairing, lifecycle, and ownership semantics. A contributor opening a real `item.json` and seeing one of those ULID-suffixed keys can now answer "what is this", "why a ULID", "why pairs", and "what deletes it" from the schema bundle alone. The class docstring is the single source of contributor-facing documentation, and it travels into Pydantic, JSON Schema, and TypeScript outputs through the existing generators with no bespoke build steps.

## How It Fits

The change sits squarely on the schema seam between Storyboarding (which produces the assets), the STAC catalogue (which stores them), and the spec-241 Item shape contract (which validates them). It does not touch any write path — `sceneThumbnailService.ts` keeps producing exactly the same on-disk output — and it does not promote Scene itself to a first-class schema shape (that's tracked separately). What it does change is the *direction of authority*: the spec-241 Item contract loses its inline regex and gains an `allOf $ref` to a small JSON Schema overlay, and the overlay in turn wraps the LinkML-generated value shape. The pairing and orphan invariants, which JSON Schema cannot back-reference cleanly, live in a thin Python audit module under `services/stac/` that names each violated rule by stable ID. The result is one shape, three generator outputs, one overlay, one contract — and a couple of audit rules with names that show up in CI failures.

## Key Decisions

- **Hybrid LinkML + JSON-Schema-overlay rather than hand-authoring the whole thing in JSON Schema.** LinkML's `gen-json-schema` cannot emit `patternProperties`, but it can emit the value shape — so the value shape stays LinkML-authored (single source of truth) and a small hand-written overlay adds the pattern-keyed wrapper. Inventing a parallel schema source was the alternative, and it would have undermined the whole point of Article II.
- **Pairing invariant enforced in Python, not JSON Schema.** JSON Schema 2020-12 cannot back-reference a regex group, so the rule "if `scene-thumbnail-{ULID}` exists, then `scene-thumbnail-{ULID}-sm` must also exist" is encoded in a ~80-LOC audit module. Each violation cites a stable rule ID (`scene-thumbnail-pair-rule-001`) so that a CI failure points the contributor straight at the contract document instead of at a generic JSON Schema error.
- **Orphan detection lives in the same audit module.** The schema documents the rule (a scene-thumbnail pair whose ULID is not in the owning Storyboard's Scene list is a defect), and the audit module enforces it where Storyboard context is in scope. This keeps the lifecycle invariant *referable from the schema* even where it isn't *checkable by the schema*.
- **Strict pairing today, with a forward-compatible enum recipe for additional variants.** Adding a `-md` (or other) variant later means extending the LinkML class and updating the overlay regex — not re-engineering the contract. Strict pairing was preferred over treating the small variant as derivable, because Storyboarding writes the pair atomically and the schema should reflect that.
- **No new runtime dependencies, no on-disk migration.** A grep of the sample catalogue confirmed there are no real `scene-thumbnail-{ULID}` entries today, so the changeover is pure schema work — no fixtures to rewrite, no users to migrate.
- **Pre-v4 freedom invoked to remove the spec-241 tactical artefacts cleanly.** The placeholder `scene-thumbnail` entry in `ITEM_ASSETS_TEMPLATE` and the inline `patternProperties` block in the spec-241 Item shape contract both come out in the same change, with no deprecation cycle, because there are no external consumers and the workaround was always tactical.

## Implementation Notes

The real value of this work isn't what hits the disk — `sceneThumbnailService.ts` produces identical bytes before and after — but what gets *documented*. A contributor reading `shared/schemas/src/linkml/storyboard.yaml` now finds a named class that answers every diagnostic question the spec asked. That docstring flows untouched through the Pydantic generator, the JSON Schema generator, and the TypeScript generator, so reviewers of the Python service code, validators of a serialized STAC Item, and implementers building on the TypeScript client library all read the same source of truth.

The pairing and orphan rules are where the boundary work shows: the schema documents them (they're referenced in the LinkML class docstring by stable rule ID), but JSON Schema can't enforce them alone — a regex can't look at two keys at once, and it can't cross-reference a Scene list in a different field. The Python audit module (`services/stac/src/debrief_stac/scene_thumbnail_audit.py`) picks up where JSON Schema has to stop, and it makes no apologies for that handoff. Each rule violation cites its stable ID (`scene-thumbnail-pair-rule-001`, `scene-thumbnail-orphan-rule-001`), so a CI failure is immediately grep-able back to the documentation. Constitution Article XIV (Pre-Release Freedom) meant the spec-241 tactical bits could come out cleanly — no deprecation, no cross-version support, just a schema swap.

## By the Numbers

| Metric | Value |
|---|---|
| Files modified | 34 |
| Lines added | 1333 |
| Lines removed | 125 |
| New tests (spec 243) | 34 across 5 files |
| Test pass rate | 1882 passed / 1 skipped / 0 failed |
| Golden fixtures added | 5 (1 valid paired, 4 invalid cases) |
| New runtime dependencies | 0 |
| New LinkML class | 1 (SceneThumbnailAssetEntry) |
| Audit module size | ~135 LOC |
| Existing sample-catalogue Items still validating | 73 / 73 (spec 241 regression suite) |

## Lessons Learned

**The schema-expressivity boundary becomes visible when you name it.** JSON Schema can validate the *shape* of an asset entry (its `type`, `roles`, `href`), and it can validate the *key format* with a regex. But it can't enforce "if this key exists, that key must exist too" without either embedding a proprietary extension or layering application logic. By naming the pairing invariant (`scene-thumbnail-pair-rule-001`) in the LinkML docstring *and* enforcing it in an audit module that references that name, we made the boundary explicit. The next contributor knows exactly what the schema can and can't do.

**LinkML's limitation on `patternProperties` is actually a feature, not a bug.** gen-json-schema won't emit `patternProperties` because it's hard to reason about (what do you do when the inline schema has a $ref? when it has conditionals?). So we split the work: LinkML emits the value shape, a hand-authored overlay wraps it with the key pattern, and the commit message explains the seam. This is messier than "just write it all in one place", but it's more honest — it shows *why* the boundary exists, which makes it easier to redesign later.

**Constitution Article XIV cleared the way to delete the placeholder cleanly.** The spec-241 workaround was always tactical — a temporary `patternProperties` rule that let us ship Storyboarding while the schema matured. Once we had a proper LinkML class ready, Article XIV said we could remove the workaround without a deprecation cycle (there are no external consumers, and it was never a public contract). The result: a clean swap, not an accumulation of old and new side by side. The sample catalogue and the spec-241 item-shape contract both flipped to the new shape in the same commit.

## What's Next

- **Forward-compatible variant sizing.** The LinkML class documents an enum recipe for adding future variants (e.g. `-md` for a medium 400×300 size). When that work comes, it's one schema class extension and one audit-module update away — no re-architecting the contract.
- **Promoting Scene itself to a first-class LinkML shape.** Right now, Scene lives as a property of Storyboard features, and the per-Scene asset class documents its relationship via the ULID link. A future spec could lift Scene into its own modelled entity; the asset contract would then reference the Scene class directly rather than an external ULID.
- **Wiring the orphan audit into the sample-catalogue CI gate.** Today it runs in the test suite; a future pass could run it as a pre-commit hook in `scripts/` so a stale Scene asset is caught before the sample-catalogue JSON is committed, not just at validation time.

→ [See the code](https://github.com/debrief/debrief-future/pull/243)
→ [Before/After evidence](specs/243-scene-asset-contract/evidence/before-after.md)
→ [Round-trip validation](specs/243-scene-asset-contract/evidence/round-trip-evidence.md)
