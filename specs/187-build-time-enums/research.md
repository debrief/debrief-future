# Phase 0 Research: Build-Time Enum Extraction

**Feature**: 187-build-time-enums
**Date**: 2026-04-14

This document captures the design decisions taken before implementation, alternatives considered, and rationale. There were no `NEEDS CLARIFICATION` markers in the Technical Context — the extraction script sits squarely inside the existing toolchain. Research focused on choosing the right convention for each open question rather than discovering anything novel.

## Decision 1 — Output location and naming

**Decision**: Write the bundle to `shared/data/enum-bundle.json` and commit it alongside the script.

**Rationale**:
- The bundle is derived from the platform registry that already lives at `shared/data/platform-registry.json`. Co-locating the derivative artefact next to its primary source makes the relationship obvious and survives any future refactor that moves the registry.
- Committing the artefact lets PR reviewers see the diff that any registry/catalog change will introduce into the LLM prompt — a critical review surface, since changes here directly alter what the LLM is told. (Constitution Article XII — public by default; Article VIII — decisions visible.)
- The prompt builder in #188 can import a stable, well-known path without needing a build step.

**Alternatives considered**:
- *Generate at build time, never commit*: rejected — hides the artefact from review and forces every consumer (including the LLM-prompt unit tests) to run the script first.
- *Place under `services/` or `apps/`*: rejected — neither owns the bundle. It is shared reference data, exactly what `shared/data/` is for.
- *Multiple output files (one per enum type)*: rejected — the prompt builder wants a single import; deduplication of nationality codes happens across registry + catalog, so a single producer module keeps that logic in one place.

## Decision 2 — Reuse `debrief-data` registry loader vs re-parse

**Decision**: Import `load_registry()` from `debrief_data.registry` and reuse the existing tree walker.

**Rationale**:
- `registry.py` already validates the registry shape, raises `RegistryError` on malformed input, and exposes a `PlatformRegistry` object that holds the raw tree. Re-implementing tree traversal would duplicate ~40 lines of carefully-tested code and create a second site that has to evolve when the registry shape changes.
- The vessel-class tree section of the bundle is the same tree minus the leaf platform entries — a one-pass filter on the tree the loader already exposes.

**Alternatives considered**:
- *Re-implement a slim parser inside the script*: rejected — duplicate logic, duplicate failure modes, no benefit. The script becomes harder to keep consistent with the loader.
- *Add a `tree_classes_only()` method to `PlatformRegistry`*: deferred — keep the responsibility for the bundle inside `enum_bundle.py` for now. If a second consumer ever needs the same projection, lift it into the registry then.

## Decision 3 — Where to put the bundle-building logic

**Decision**: A new module `shared/data/src/debrief_data/enum_bundle.py` that exposes pure functions (`build_bundle(registry, catalog_dir) -> EnumBundle`, `extract_class_tree(...)`, `scan_catalog(...)`, `serialize(bundle) -> str`). The CLI script in `scripts/extract-enum-bundle.py` is a thin wrapper that handles argument parsing, IO, error messages, and the count summary.

**Rationale**:
- Pure functions are unit-testable without mocking the filesystem (Article VI; Article VII — tests as the spec).
- Matches the precedent set by `registry.py`, which is a library other code imports rather than a script-only helper.
- Lets the bundle structure live in typed dataclasses / `TypedDict`, not loose dicts (Article XV — strict typing, no `Any`).

**Alternatives considered**:
- *Everything in the script*: rejected — couples filesystem IO to logic; harder to test edge cases like deduplication and canonicalisation.
- *Bundle module inside `services/stac/`*: rejected — `services/stac/` deals with catalog persistence; this is a derivative for downstream LLM prompting and belongs with the registry it shares a source with.

## Decision 4 — Vessel-class tree projection (interior nodes only)

**Decision**: The bundle's vessel-class section preserves the registry's hierarchical shape but strips platform-instance leaves. A node is considered a "platform leaf" if it has a `name` field (matching the existing `_is_platform_entry` predicate in `registry.py`); everything else (including `_class` metadata) is preserved.

**Rationale**:
- The LLM reasons about classes ("frigates", "submarines", "Type 23"), not specific ships ("HMS Nelson"). Including platform leaves would inflate the bundle and invite the LLM to over-fit to specific vessel names.
- The class-only projection still answers every NL query the prototype validated ("UK submarines", "German frigates", "Type 23 frigates") because those queries match by `domain`, `vessel_role`, `vessel_type`, or `vessel_class` — all of which are interior-node names.
- Reusing the same `_is_platform_entry` predicate the registry loader already trusts ensures the projection stays correct as the registry shape evolves.

**Alternatives considered**:
- *Flatten the tree to a list of class paths*: rejected — loses the parent-child relationships the LLM uses to answer "warships" (i.e. anything under `surface/warship/`).
- *Include platform leaves with a flag*: rejected — bloats the bundle and risks the LLM emitting filters that name specific ships.

## Decision 5 — Exercise-name extraction rule

**Decision**: For each item.json's `properties.title`, parse the exercise name as the substring before the first `": "` (literal colon-space). If the title contains no `": "`, the item contributes no exercise name. The rule is documented in `enum_bundle.py` and in the bundle's metadata header.

**Rationale**:
- The enrichment script (`scripts/enrich-legacy-catalog.py`) already produces titles in this exact shape (e.g. `"Saxon Warrior: Boat1"`), so the rule has 100% recall on the regenerated catalog.
- Requiring the literal `": "` (not just `:`) avoids false positives like `"AIS:dropoff_2010"` or `"12:00 patrol"` that might appear in future imports.
- Conservative parsing (skip rather than guess when the format doesn't match) means the bundle never invents exercise names that don't exist in the data.

**Alternatives considered**:
- *Add a discrete `debrief:exercise` field to the STAC extension*: deferred — that is a schema change with broader consequences; this feature consumes what is already there. If a future schema change adds the field, swap the parser for a direct lookup.
- *Regex with optional whitespace*: rejected — less predictable, harder to explain in the bundle metadata.
- *Heuristic that splits on any colon*: rejected — false positives outweigh the small additional recall.

## Decision 6 — Canonicalisation rule

**Decision**: For tag/feature_tag/nationality values, canonicalise by stripping leading/trailing whitespace and lowercasing for the deduplication key, but preserve the **first-seen** original casing in the output. Sort alphabetically (case-insensitive) for deterministic ordering.

**Rationale**:
- Strip + lowercase deduplication key collapses obvious accidents (`"training"` vs `"Training "`) without erasing intentional casing differences in the displayed value (the original-cased token stays visible in the bundle for human reviewers).
- First-seen-wins is deterministic when combined with a deterministic input-walk order (alphabetical by item directory name — already the case in the regenerated catalog).
- Case-insensitive alphabetical sort makes the bundle scannable for reviewers (`"AAW"` next to `"amphibious"`, etc.).

**Alternatives considered**:
- *Lowercase everything in the output*: rejected — loses information for tags like `"NGFS"`, `"AAW"`, `"MCM"` that the catalog stores in upper-case for a reason.
- *Strict literal deduplication (no canonicalisation)*: rejected — leaves obvious duplicates in the bundle, wastes prompt budget, and makes the bundle visibly inconsistent.
- *Case-sensitive sort*: rejected — splits acronyms and lowercase tags into two clusters, hurting human review.

## Decision 7 — Determinism strategy

**Decision**: Iterate inputs in sorted order (item directories sorted by name; tag lists sorted before union; tree walked in `sorted(node.keys())` order). Serialise with `json.dumps(..., indent=2, sort_keys=True, ensure_ascii=False)` and a trailing newline.

**Rationale**:
- Filesystem iteration order is not guaranteed; explicit sorting kills that source of non-determinism.
- `sort_keys=True` plus consistent input ordering means rerunning with no input changes produces a byte-identical file (FR-008, SC-004), so the committed artefact is safe to compare in diffs and the script can be safely re-run in CI as a sanity check.
- `ensure_ascii=False` keeps any non-ASCII tag values readable in the committed file.
- Indent=2 matches the project's existing JSON style (e.g. `platform-registry.json`).

**Alternatives considered**:
- *Compact JSON (no indent)*: rejected — saves a few hundred bytes at the cost of unreadable diffs in PRs. The bundle is still well under a few tens of KB.
- *YAML output*: rejected — the consumer (LLM prompt builder) wants JSON; introducing YAML would add `PyYAML` as a runtime dependency.

## Decision 8 — Bundle metadata header

**Decision**: Include a small `_meta` object at the top of the bundle: `{ "generated_from_registry": "shared/data/platform-registry.json", "generated_from_catalog": "preview/workspace/samples/local-store", "exercise_parse_rule": "title prefix before ': '", "canonicalisation": "trim + lowercase dedup, first-seen casing preserved", "tool": "scripts/extract-enum-bundle.py" }`.

**Rationale**:
- Reviewers reading the committed bundle can verify provenance without consulting the script (Article III — provenance always; SC-005 — answer "where did this come from?" in under a minute).
- The prompt builder can ignore `_meta` cleanly (underscore prefix is the established convention in the registry — see `_class`).
- Documents the exercise-name parse rule and canonicalisation rule next to the data they shaped, so a future maintainer doesn't have to re-discover them.

**Alternatives considered**:
- *Comment in the JSON*: rejected — JSON has no comment syntax.
- *Sidecar `.meta.json` file*: rejected — splits the artefact and adds a second commit-review surface.
- *No header*: rejected — loses provenance, which Article III treats as non-negotiable.

## Decision 9 — Error handling and CLI ergonomics

**Decision**: Use `argparse` with optional flags `--registry PATH`, `--catalog PATH`, `--output PATH`, all defaulting to the canonical locations. Exit code `0` on success, `1` on missing/unreadable input, `2` on malformed registry, with errors printed to `stderr` naming the offending file. On success, print the count summary (FR-011) to `stdout`.

**Rationale**:
- Defaults mean the standard developer flow is `uv run python scripts/extract-enum-bundle.py` with no arguments (FR-001).
- Optional flags let the tests point the script at fixture catalogs without modifying global state.
- Distinct exit codes (0 / 1 / 2) let CI workflows detect which class of failure occurred without parsing stderr.
- Splitting summary on stdout from errors on stderr matches Unix conventions and keeps machine-readable summaries available for future automation.

**Alternatives considered**:
- *No CLI flags, hard-coded paths*: rejected — makes the script unit-test-hostile because tests would have to manipulate the real registry/catalog to exercise edge cases.
- *Click instead of argparse*: rejected — Click is not currently a project dependency; argparse is in the standard library and sufficient.

## Decision 10 — Scope of catalog-side scanning

**Decision**: Walk every directory directly under `preview/workspace/samples/local-store/` that contains an `item.json`. Ignore the top-level `catalog.json` for enum extraction (it is link metadata, not item content). Do not follow `derived_from` or external href links.

**Rationale**:
- The regenerated sample catalog (#184) follows a flat `local-store/<item-id>/item.json` layout. A simple directory walk is enough.
- `catalog.json` lists items but contains no tags/exercise/platform metadata of its own, so reading it would add complexity for zero new values.
- The script is intentionally local-only (Article I — offline by default); it must not chase remote hrefs.

**Alternatives considered**:
- *Use a STAC SDK (`pystac`) to traverse the catalog*: rejected — adds a dependency for behaviour we can do in 20 lines of `pathlib`. The catalog layout is known and stable for our purposes.
- *Recursively walk arbitrary depth*: rejected — the current layout is one level deep; any future change to a nested layout should be an explicit, reviewed update to the script.

## Decision 11 — Hand-written JSON Schema for the bundle (Article II exemption)

**Decision**: `contracts/enum-bundle.schema.json` is authored by hand rather than generated from a LinkML source model.

**Rationale**:
- Article II principle 1 states that LinkML master schemas define "all data structures", with Pydantic, JSON Schema and TypeScript representations derived from them. The constitutional intent is to prevent the derived representations of *domain* data (tracks, plots, items, features) from drifting out of sync with the master model.
- The enum bundle is **not a domain data structure**. It is a build-time artefact consumed by one consumer (the LLM prompt builder in #188) and thrown away on every rerun. It carries no user data, no provenance of analytical value, and no exchange format obligations between services.
- Promoting the bundle to LinkML would add a LinkML source, a Pydantic model, a TypeScript type and an adherence test for a schema whose only consumer reads a JSON file. The round-trip ceremony would outweigh the benefit.
- The hand-written JSON Schema still serves its real purpose: it is the contract pinned in the PR review so that the prompt builder in #188 can validate against a stable shape, and T014 enforces conformance in the test suite.

**Alternatives considered**:
- *Author the schema in LinkML and derive the JSON Schema*: rejected — pays the cost for zero domain benefit; see above.
- *No schema at all*: rejected — then the contract with #188 is implicit, and any drift in the script silently breaks the prompt builder.

**Promotion trigger**: If the bundle ever becomes an exchange format consumed by more than one subsystem (e.g. a second LLM integration, a service API, or a user-facing export), re-author the schema in LinkML at that point and derive the JSON Schema. Revisit this decision as part of that work.

## Open Questions Carried Forward

None. All decisions above are final for this feature. Future work (a discrete `debrief:exercise` field, multiple-format output, automatic CI regeneration) is captured in the spec's Out of Scope section.
