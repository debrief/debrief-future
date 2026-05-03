# Implementation Plan: Per-Scene Asset Key Contract Formalisation

**Branch**: `243-scene-asset-contract` (cloud-session branch: `claude/speckit-specify-243-hCTAh`) | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/243-scene-asset-contract/spec.md`

## Summary

Promote the `scene-thumbnail-{ulid}` / `scene-thumbnail-{ulid}-sm` STAC asset
keys from spec #241's tactical `^scene-thumbnail(-.+)?$` `patternProperties`
workaround into a first-class **LinkML-modelled** shape with explicit
pairing, lifecycle, and ownership semantics. The new shape becomes the
single source of truth for the per-Scene asset entry value; a
deterministically-generated JSON-Schema overlay layered on top expresses
the patternProperties wrapper plus the ULID key format. Pairing and
orphan-detection invariants — which are awkward to express in pure JSON
Schema — are enforced by a thin Python audit module that references the
named schema rule by ID. Replaces the spec-241 contract's inline regex,
removes the placeholder `scene-thumbnail` entry from the `item_assets`
template, and updates the only documentation reference
(`apps/vscode/src/services/sceneThumbnailService.ts`) to point at the
generated shape.

## Technical Context

**Language/Version**: Python 3.11 (LinkML, Pydantic v2, services), TypeScript 5.x (generated types only — no runtime changes)
**Primary Dependencies**: LinkML ≥ 1.7.0 (existing — `gen-pydantic`, `gen-json-schema`, `gen-typescript`); Pydantic v2 (existing); `jsonschema` (existing — Python validator); `stac_validator` (existing — STAC 1.1)
**Storage**: N/A (schema/contract feature — touches `shared/schemas/src/linkml/`, `services/stac/src/debrief_stac/`, and one `specs/241-…/contracts/` artefact only)
**Testing**: pytest (Python schema adherence + service audit tests); existing `validate-jsonschema.js` round-trip; vitest is **not** required (no TS runtime code introduced — generated types only flow through `pnpm -r typecheck`)
**Target Platform**: Schema bundle (consumed by Python services, TypeScript generators, and per-spec contract artefacts)
**Project Type**: Single-project-per-package monorepo (no new packages)
**Performance Goals**: Schema adherence test suite stays under 30 s wall-clock (existing budget); per-Item validation overhead stays O(scenes-per-item) and remains < 5 ms p95 for a 50-scene Item (audit module only)
**Constraints**: No new runtime dependencies (Constitution Article IX); generated TypeScript and Pydantic outputs MUST remain strict-typed (Article XV); no on-disk data migration (Assumption verified — see Phase 0 §A1)
**Scale/Scope**: ~1 new LinkML class (`SceneThumbnailAssetEntry`); 1 generated JSON Schema overlay artefact; 4 golden fixtures (1 valid + 3 invalid); 1 Python audit module (~80 LOC); ~15 LOC removed from existing artefacts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| **I. Defence-Grade Reliability** | ✅ PASS | Pure schema/contract work; no network, no silent failure paths introduced; all validation explicit. |
| **II. Schema Integrity** | ✅ PASS — *core deliverable* | Whole feature is the embodiment of this article: replaces a hand-written `patternProperties` regex with a LinkML class, restoring the single source of truth. Adherence tests required and added. |
| **III. Data Sovereignty** | N/A | No data semantics change; provenance / lineage paths untouched. |
| **IV. Architectural Boundaries** | ✅ PASS | Schema-side change only; services and frontends untouched apart from a documentation pointer (`sceneThumbnailService.ts`) and a placeholder template removal in `collection.py`. No persistence boundary change. |
| **V. Extensibility** | ✅ PASS | Named shape is *more* extensible than the current regex — future variants (e.g. `-md`) can be added by extending the LinkML class without re-engineering the contract. |
| **VI. Testing** | ✅ PASS | New shape gated by golden fixtures (valid + 3 invalid) and round-trip; orphan audit gated by Python unit tests. |
| **VII. Test-Driven AI Collaboration** | ✅ PASS | Spec acceptance scenarios in `spec.md` §User Stories 1-3 are the test specification; tasks (next phase) translate them 1:1. |
| **VIII. Documentation** | ✅ PASS | The named LinkML class docstring is the durable contributor-facing documentation per FR-014; flows through to all three generator outputs. |
| **IX. Dependencies** | ✅ PASS | Zero new dependencies. Audit module uses Python stdlib only. |
| **X. Security** | N/A | No secret-handling, no classification-sensitive surface. |
| **XI. Internationalisation** | N/A | No user-facing strings. |
| **XII. Community Engagement** | N/A | Internal contributor-facing improvement; no preview deliverable. |
| **XIII. Contribution Standards** | ✅ PASS | Atomic commits by phase; PR review applies; CI gate is the existing schema adherence + Python typecheck pipeline. |
| **XIV. Pre-Release Freedom** | ✅ PASS — *invoked* | Replaces the spec-241 contract's `^scene-thumbnail(-.+)?$` rule and removes the `item_assets` placeholder without a deprecation cycle (pre-v4.0.0). Justified: tactical workaround, no external consumers. |
| **XV. Strict Type Safety** | ✅ PASS | Generated Pydantic / TS outputs remain `strict: true` / no `Any`. New audit module uses concrete types throughout (`pyright --strict` clean). |

**Result**: All gates pass. No entries required in **Complexity Tracking**.

## Project Structure

### Documentation (this feature)

```text
specs/243-scene-asset-contract/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── scene-thumbnail-asset.schema.json    # Hand-authored overlay reference (the artefact this feature ships)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   └── storyboard.yaml                            # MODIFIED — adds SceneThumbnailAssetEntry class + pairing-rule annotation
├── contracts/                                     # NEW directory (or under src/contracts/) — schema-authored overlay artefacts
│   └── scene-thumbnail-asset.schema.json          # NEW — generated/curated overlay wrapping the LinkML-derived value shape with patternProperties + ULID key format
├── fixtures/scene-thumbnail-asset/                # NEW directory
│   ├── paired-valid.json
│   ├── unpaired-large-invalid.json
│   ├── unpaired-small-invalid.json
│   ├── malformed-ulid-invalid.json
│   └── coexists-with-plot-thumbnails-valid.json
└── tests/
    └── test_scene_thumbnail_asset_fixtures.py     # NEW — adherence tests (golden fixtures + round-trip)

services/stac/
├── src/debrief_stac/
│   ├── collection.py                              # MODIFIED — remove "scene-thumbnail" placeholder from ITEM_ASSETS_TEMPLATE; update preceding comment
│   └── scene_thumbnail_audit.py                   # NEW — pairing + orphan detection (~80 LOC), references named schema rule
└── tests/
    └── test_scene_thumbnail_audit.py              # NEW — pairing & orphan unit tests

specs/241-stac-best-practices-upgrade/contracts/
└── item-shape.schema.json                         # MODIFIED — replace inline ^scene-thumbnail(-.+)?$ patternProperties block with $ref to shared/schemas/contracts/scene-thumbnail-asset.schema.json (or inline equivalent driven from the same source)

apps/vscode/src/services/
└── sceneThumbnailService.ts                       # MODIFIED — file-header docstring updated to reference the LinkML class as the contract source-of-truth (replaces "the only documentation" claim called out in spec.md Background)

preview/workspace/samples/local-store/
└── catalog.json                                   # MODIFIED — placeholder "scene-thumbnail" entry removed from collection.item_assets (regenerated from collection.py via existing script)
```

**Structure Decision**: Hybrid LinkML + JSON-Schema-overlay. The
**value shape** (per-key payload: `href`, `type`, `roles`, optional
`title`, etc.) is modelled in LinkML (single source of truth) and
flows through the existing Pydantic / JSON Schema / TypeScript
generators. A small **JSON Schema overlay artefact** wraps the
generated value shape with a `patternProperties` rule keyed on
`^scene-thumbnail-(?<ulid>[0-9A-HJKMNP-TV-Z]{26})(?:-sm)?$`, expressing
the parts of the contract (pattern-keyed maps, ULID key format)
that LinkML's `gen-json-schema` cannot emit natively. The **pairing
invariant and orphan detection** — which are also beyond JSON Schema's
practical reach — are enforced by a Python audit module that names
the violated rule by stable ID (`scene-thumbnail-pair-rule-001`,
`scene-thumbnail-orphan-rule-001`). Both gates are wired into existing
CI (schema adherence tests + `services/stac` pytest suite).

This avoids inventing parallel schema sources and keeps Article II
(schema integrity) intact: the value shape is LinkML-authored
end-to-end, and only the schema-expressivity-bound surfaces (key
patterns, pair invariant) are layered on top — explicitly named, not
embedded in service code.

## Media Components

None — backend / schema feature. No visual components, no Storybook
stories, no blog-post demo target. The contributor-facing artefact is
the named LinkML class docstring + generated TSDoc / JSON Schema
`description`, which renders inside the project's existing schema
documentation site (`shared/schemas/mkdocs.yml`) without bespoke media
work.

## Storybook E2E Testing

None — no interactive UI components.

## Web-Shell E2E Testing

None — no extension workflow changes. The Storyboarding capture path
that *produces* scene-thumbnail assets is unchanged; only the schema
that *describes* them moves.

## Complexity Tracking

> Constitution Check has no violations. Section intentionally empty.
