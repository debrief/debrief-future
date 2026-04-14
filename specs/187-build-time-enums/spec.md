# Feature Specification: Build-Time Enum Extraction

**Feature Branch**: `187-build-time-enums`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "item 187 off the BACKLOG.md — [E10] Build-time enum extraction: script to extract vessel class tree, nationalities, exercise names, tags, feature_tags from registry + catalog; compact JSON for LLM prompt (requires #180, #184)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate enum bundle for the LLM prompt (Priority: P1)

A prompt-builder for the natural-language search feature (Epic E10) needs a single, compact, machine-readable description of every controlled vocabulary the analyst can reference: vessel taxonomy, nationality codes, exercise names, plot-level tags, and feature-level tags. Today these vocabularies are scattered across the platform registry and the STAC item metadata; the prompt-builder cannot reliably enumerate them, so the LLM either hallucinates field values or has to be shown the entire catalog. This story delivers a single command that walks the registry and catalog, produces a compact JSON enum bundle, and writes it to a known location for downstream consumption.

**Why this priority**: Without this enum bundle, the NL→CQL2 prompt design (item #188) cannot be authored — the prompt depends on knowing every legitimate value the LLM is allowed to emit. P1 because it is the blocking dependency for the rest of Phase 3 of the epic.

**Independent Test**: Run the script against the real platform registry and the regenerated sample catalog. Inspect the output file: it contains a vessel-class tree matching the registry, a deduplicated alphabetical list of nationality codes, exercise names, tags, and feature_tags. Total file size is small enough to fit comfortably inside an LLM system prompt. Compare a hand-counted set of values from a few sample item.json files with the bundle and confirm every value is present.

**Acceptance Scenarios**:

1. **Given** a populated platform registry and a catalog with at least one item, **When** the extraction script is run, **Then** a compact JSON file is written that contains five top-level sections (vessel class tree, nationalities, exercise names, tags, feature_tags) and the file is well-formed JSON.
2. **Given** the registry contains nationality codes that also appear on catalog items, **When** the script is run, **Then** the nationalities list is the union of both sources with each code appearing exactly once.
3. **Given** the catalog contains items whose `debrief:tags` or `debrief:feature_tags` differ across items, **When** the script is run, **Then** the bundle's `tags` and `feature_tags` lists are the deduplicated unions across all items.
4. **Given** the registry contains a vessel class hierarchy, **When** the script is run, **Then** the bundle preserves the full taxonomy tree (interior class nodes only — platform-instance leaves are excluded) so the LLM can reason about parent-class queries like "frigates" or "submarines".
5. **Given** a catalog item whose title encodes an exercise name (e.g. `"Saxon Warrior: Boat1"`), **When** the script is run, **Then** `"Saxon Warrior"` appears in the exercise-names list exactly once even if many items share that exercise.

---

### User Story 2 - Detect drift when registry or catalog changes (Priority: P2)

When the platform registry gains a new vessel class, or the sample catalog is regenerated with new exercise names or tags, the enum bundle becomes stale. A developer working on the NL search feature needs a way to detect that drift before pushing changes, so the bundle that ships with the feature stays in sync with the data the LLM is being asked to interpret.

**Why this priority**: Important for ongoing maintenance and for keeping the LLM prompt accurate, but the feature can ship with a manually re-run script. P2 because catching drift is a correctness safeguard rather than an enabling capability.

**Independent Test**: Modify the registry to add a new nationality, then re-run the script. Confirm the new nationality appears in the bundle. Repeat for a new tag added to a catalog item.

**Acceptance Scenarios**:

1. **Given** the bundle is up to date, **When** a new vessel class is added to the registry and the script is re-run, **Then** the new class appears in the vessel-class tree section of the bundle.
2. **Given** the bundle is up to date, **When** a new tag is added to a catalog item and the script is re-run, **Then** the new tag appears in the bundle's `tags` list.
3. **Given** the bundle was previously generated, **When** the script is re-run with no changes to inputs, **Then** the regenerated bundle is byte-identical to the previous one (deterministic ordering).

---

### User Story 3 - Discover unknown vocabulary during catalog evolution (Priority: P3)

As the catalog grows, new exercise names, tags, or nationalities will appear that were never in the registry's seed data. The extraction script should make these visible so a developer can decide whether they are intentional additions or typos.

**Why this priority**: Useful diagnostic that improves data hygiene over time, but not required for the immediate NL prompt-building task. P3 because it enhances rather than enables the core capability.

**Independent Test**: Introduce a deliberately misspelled tag in a sample item, run the script, and confirm the misspelled tag shows up in the output (proving the script does not silently drop unfamiliar values).

**Acceptance Scenarios**:

1. **Given** a catalog item contains a tag value that is not present in any other item, **When** the script is run, **Then** that tag still appears in the bundle.
2. **Given** the catalog contains a nationality code that is not in the registry, **When** the script is run, **Then** that code is included in the nationalities list.

---

### Edge Cases

- **Empty catalog**: If the catalog has no items, the bundle still produces valid JSON with empty lists for catalog-derived sections; the registry-derived sections (vessel class tree, registry nationalities) are still populated.
- **Empty registry**: If the registry contains no platforms, the vessel-class tree section is empty; catalog-derived sections are unaffected.
- **Items missing optional fields**: If an item has no `debrief:tags`, `debrief:feature_tags`, or no parseable exercise prefix in its title, the script must skip the missing values gracefully without crashing or polluting the bundle with `null` entries.
- **Title without exercise prefix**: Items whose title does not match the exercise-name convention (no `":"` separator, or a separator that is part of a sentence) must not contribute spurious exercise names. The script must apply a conservative parsing rule and document it.
- **Case and whitespace variation**: Two values that differ only in casing or surrounding whitespace (e.g. `"training"` vs `"Training "`) must collapse to a single canonical entry and the canonicalisation rule must be documented.
- **Non-ASCII or unusual characters**: The bundle must remain valid JSON; values are preserved as-is (no transliteration) so the LLM sees what the data actually contains.
- **Registry tree depth changes**: If the registry tree gains or loses depth levels in future, the extraction must continue to emit the full tree without hard-coding specific depths.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single command that, when executed at the repository root, produces an enum bundle file without requiring additional arguments.
- **FR-002**: System MUST read the platform registry from its canonical location (`shared/data/platform-registry.json`) and the regenerated sample catalog from its canonical location (`preview/workspace/samples/local-store/`).
- **FR-003**: The bundle MUST contain a vessel-class taxonomy section that mirrors the interior nodes of the registry tree (excluding individual platform-instance leaves) so the LLM can reason about class-level queries.
- **FR-004**: The bundle MUST contain a deduplicated, sorted list of every nationality code present in either the registry or any catalog item.
- **FR-005**: The bundle MUST contain a deduplicated, sorted list of every exercise name found in catalog item titles (using a documented parsing rule).
- **FR-006**: The bundle MUST contain a deduplicated, sorted list of every value that appears in any item's `debrief:tags`.
- **FR-007**: The bundle MUST contain a deduplicated, sorted list of every value that appears in any item's `debrief:feature_tags`.
- **FR-008**: The bundle MUST be deterministic — running the script twice on identical inputs MUST produce byte-identical output.
- **FR-009**: The bundle MUST be small enough to fit comfortably inside an LLM system prompt for the catalog sizes anticipated by Epic E10 (currently ~70 items, scaling to several hundred).
- **FR-010**: The script MUST exit with a non-zero status if either the registry file or the catalog directory is missing or unreadable, with an error message that names the missing input.
- **FR-011**: The script MUST report a count summary on completion (number of vessel-class nodes, nationalities, exercises, tags, feature_tags) so the operator can sanity-check the output without opening the file.
- **FR-012**: The script MUST write the bundle to a stable, documented output path that downstream tooling (the prompt builder in #188) can rely on.
- **FR-013**: The script MUST be runnable from the toolchain already used to maintain the platform registry and the STAC catalog, without requiring new third-party dependencies beyond those already in use.
- **FR-014**: The script MUST handle missing optional fields on individual catalog items gracefully (no crash, no `null` entries in output lists).
- **FR-015**: The script MUST apply a documented canonicalisation rule (case, whitespace) when deduplicating string values so equivalent values collapse to a single entry.

### Key Entities *(include if feature involves data)*

- **Enum Bundle**: The compact JSON artefact emitted by the script. Contains five sections — vessel-class tree, nationalities, exercise names, plot tags, feature tags — and is the sole output the script is responsible for. Consumed by the LLM prompt builder; never read by end users directly.
- **Vessel-Class Tree**: Hierarchical projection of the platform registry showing only interior class nodes (e.g. `surface → warship → frigate → type23`) with their human-readable display names. Platform-instance leaves are excluded because the LLM reasons about classes, not specific ships.
- **Nationality Code**: An ISO 3166-1 alpha-2 country code (e.g. `GB`, `US`). Sourced from both the registry's platform leaves and from `debrief:platforms[].nationality` on catalog items.
- **Exercise Name**: A free-text label identifying the operational exercise an item belongs to (e.g. `Saxon Warrior`). Currently encoded as a prefix in the item title rather than a discrete field.
- **Plot Tag**: A free-text label applied to an entire plot, stored on `debrief:tags` on item.json (e.g. `ASW`, `training`).
- **Feature Tag**: A free-text label applied to an individual feature, aggregated to plot level on `debrief:feature_tags` (e.g. `sonar-contact`, `radar-detection`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can produce an up-to-date enum bundle by running a single command, with no manual editing of the output required.
- **SC-002**: For the current sample catalog (~70 items) and the seed platform registry, the generated bundle is at most a few tens of kilobytes — small enough to embed in an LLM prompt without consuming a disproportionate share of the context window.
- **SC-003**: Every controlled vocabulary visible on a catalog item (nationalities, vessel classes, tags, feature_tags, exercise) is reachable from the bundle — i.e. an audit of any sample item finds zero values missing from the bundle.
- **SC-004**: Re-running the script with no input changes produces a byte-identical bundle, demonstrating that the output is reproducible and safe to commit alongside the script.
- **SC-005**: A reviewer reading the bundle can answer "what nationalities does the catalog know about?" and "what vessel classes does the registry define?" in under one minute, without consulting any other file.
- **SC-006**: The script completes in 5 seconds or less on the current ~70-item sample catalog, and within 30 seconds on a catalog of ~700 items, so it can be re-run interactively during prompt-design iteration without disrupting the developer's flow.

## Assumptions

- The platform registry's canonical location and JSON shape (as established by item #180) are stable for the duration of this feature; if those change, the script's loader is updated alongside them.
- The sample catalog has already been regenerated through the enriched import pipeline (item #184) so that `debrief:platforms`, `debrief:tags`, and `debrief:feature_tags` are present on items and reliable for extraction.
- Exercise names are encoded as a prefix in the item title, separated by `": "` — the same convention already used by the enrichment script. If a future change introduces a discrete `debrief:exercise` field, the extraction logic switches to that field.
- The LLM prompt-builder (item #188) consumes the bundle as JSON; no additional output formats (YAML, TOML, JS module) are needed at this stage.
- The bundle is regenerated on demand by the developer, not as an automatic CI step; the regenerated file is committed to the repository alongside the script so reviewers can see what the LLM will actually be shown.
- Sorting is alphabetical (case-insensitive) for human readability; the LLM does not require a specific order, but determinism across runs is required.
- Canonicalisation collapses values that differ only by case or surrounding whitespace; values that differ in any other way are treated as distinct (no spelling-correction, no fuzzy matching).

## Dependencies

- **Item #180 (Platform registry)**: Provides the canonical registry file and the loader used to walk the vessel-class tree. The extraction script reuses the existing loader rather than re-implementing tree traversal.
- **Item #184 (Sample catalog regeneration)**: Provides a catalog populated with realistic `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, and exercise-prefixed titles. Without this, the catalog-derived sections of the bundle would be empty or inaccurate.
- **Downstream consumer — Item #188 (NL → CQL2 prompt design)**: Consumes the bundle to construct the LLM system prompt. The contract between the bundle and the prompt builder is finalised in #188; this feature only needs to make the contents available.

## Out of Scope

- Building the LLM prompt itself (item #188).
- Wiring the bundle into a UI or live application — the bundle is a build-time artefact, not a runtime data source.
- Producing language-specific bindings (TypeScript types, Pydantic models) for the bundle — JSON is consumed directly by the prompt builder.
- Detecting "missing" vocabulary — the script reports what is present; deciding whether anything is missing is a prompt-design concern, not an extraction concern.
- Validating that catalog values conform to a schema (e.g. nationality codes are real ISO codes) — extraction is a faithful mirror of what the data contains.
- Automatic regeneration on commit, in CI, or as part of the import pipeline — manual invocation is sufficient for this epic.
- `contrib/` organisation-specific overlays of the registry — the script reads only the base registry.
