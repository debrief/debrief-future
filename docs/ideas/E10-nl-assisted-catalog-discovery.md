# Epic: NL-Assisted Catalog Discovery

Natural language search over the STAC catalog, integrated with the existing CQL2 filter engine.

## Context

A throwaway prototype on branch `claude/stac-catalog-exploration-8LPDV` validated the core concept: an LLM can interpret analyst queries like "UK submarines in the 1990s" and return matching plots from a 70-item STAC catalog. Key findings from the prototype:

- **Per-platform records are essential.** The original item-level metadata aggregated nationalities and vessel classes into flat lists (`debrief:nationalities: ["GB", "US"]`, `debrief:vessel_classes: ["type45", "ssn"]`), making joined queries like "UK submarine" structurally unanswerable. Restructuring to per-platform records (`platforms: [{nationality: "GB", domain: "subsurface", ...}]`) made these queries work — validated by 9/9 integration tests including UK submarines (18 hits), German frigates (1 hit), Type 23 frigates (25 hits).
- **Embedding the full catalog in the prompt doesn't scale.** At 70 items the compact catalog was 68 KB — workable but already heavy. At 700+ items it's untenable. The scalable architecture is: LLM receives a fixed-size schema description (field names, value enums, vessel class taxonomy) and generates CQL2 filter expressions rather than returning matched IDs.
- **The existing CQL2 filter engine (#126) almost handles this.** It already evaluates flat array containment (`a_containedBy` for nationality, tags). It needs one extension — `array_filter()` evaluation — to handle compound predicates on nested arrays-of-objects (the per-platform records).
- **The platform registry is the missing piece.** The prototype used a hardcoded 10-entry `PLATFORM_VESSEL_MAP`. A proper shared data file, consulted at import time, would make the enrichment durable and extensible.

The prototype branch will be deleted. All technical decisions and validated designs are captured in this document.

## Problem

Analysts need to find relevant plots in a growing STAC catalog using natural language. The current architecture has three gaps:

1. **No NL interface.** Discovery is manual browsing or structured CQL2 filters via the filter bar.
2. **Flat aggregates lose joins.** Item-level `debrief:nationalities` and `debrief:vessel_classes` are independent lists — the system cannot answer "which plots have a German frigate" because it doesn't know which nationality owns which vessel.
3. **No platform registry.** Per-platform metadata (nationality, vessel class, display name) has no canonical home. The enrichment script bakes it into a hardcoded Python dict that doesn't survive regeneration or serve new data loads.

## Proposed Solution

### 1. Platform Registry (`shared/data/platform-registry.yaml`)

A static YAML file defining the vessel class taxonomy and known platforms. Structure:

```yaml
# Vessel class taxonomy — tree of domain / category / role / class
vessel_classes:
  surface:
    warship:
      frigate:
        type23: { full_name: "Type 23 (Duke-class)" }
        type26: { full_name: "Type 26 (City-class)" }
        fremm:  { full_name: "FREMM" }
      destroyer:
        type45:        { full_name: "Type 45 (Daring-class)" }
        arleigh-burke: { full_name: "Arleigh Burke-class" }
      # ...
    auxiliary:
      # ...
  subsurface:
    submarine:
      ssn:
        astute:    { full_name: "Astute-class" }
        trafalgar: { full_name: "Trafalgar-class" }
        virginia:  { full_name: "Virginia-class" }
      ssk:
        type212: { full_name: "Type 212" }
        gotland: { full_name: "Gotland-class" }

# Known platforms — looked up by platform_id at import time
platforms:
  NELSON:
    name: "HMS Nelson"
    short_name: "NLSN"
    nationality: "GB"
    vessel_class: "surface/warship/frigate/type23"
  COLLINGWOOD:
    name: "HMS Collingwood"
    short_name: "CLWD"
    nationality: "GB"
    vessel_class: "surface/warship/destroyer/type45"
  # ... (seeded with existing 10 entries, expanded as sample data is processed)
```

**Design decisions:**
- Lives in `shared/data/`, not in a service — the registry is domain knowledge, not storage infrastructure. If the storage backend changes, the registry survives.
- Loaded by both Python (via PyYAML) and TypeScript (via js-yaml or build-time JSON conversion) at import/build time.
- Extensible: organisations can overlay via `contrib/` in future (out of scope for this epic).

### 2. LinkML Schema Updates

**TrackProperties** (`shared/schemas/src/linkml/geojson.yaml`): Add optional fields:

| Field | Type | Notes |
|-------|------|-------|
| `display_name` | string, optional | Human-readable name (e.g. "HMS Nelson") |
| `nationality` | string, optional | ISO 2-letter country code |
| `vessel_class` | string, optional | Full taxonomy path (e.g. "surface/warship/frigate/type23") |
| `vessel_type` | string, optional | Leaf of class path (e.g. "type23") |
| `vessel_role` | string, optional | Parent of leaf (e.g. "frigate") |
| `domain` | string, optional | First segment of class path ("surface" \| "subsurface") |

All fields are **optional** — analysts may load data for vessels not in the registry, or where platform details aren't known. Fields can be left empty and filled in later (e.g. via a track feature property editor — out of scope for this epic).

**STAC extension** (`debrief:platforms`): Replace the three flat aggregate properties with a single structured array:

```jsonc
// OLD (removed)
"debrief:nationalities": ["GB", "US"],
"debrief:vessel_classes": ["surface/warship/frigate/type23", "subsurface/submarine/ssn/astute"],
"debrief:track_names": ["HMS Nelson", "Contact Alpha"],

// NEW
"debrief:platforms": [
  {
    "id": "NELSON",
    "name": "HMS Nelson",
    "nationality": "GB",
    "vessel_class": "surface/warship/frigate/type23",
    "vessel_type": "type23",
    "vessel_role": "frigate",
    "domain": "surface"
  }
]
```

Regenerate Pydantic models, JSON Schema, and TypeScript types from the updated LinkML.

### 3. Import Pipeline Enrichment

When `services/io/handlers/dpf.py` or `rep.py` processes a legacy file:

1. Extract `platform_id` from the source data (as today).
2. Look up `platform_id` in the platform registry.
3. **If found:** populate `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain` on the TRACK feature.
4. **If not found:** leave enrichment fields empty. Log a warning listing all unregistered `platform_id` values encountered during this import — gives the analyst a "to-do list" of platforms to register.

The enrichment script (`scripts/enrich-legacy-catalog.py`) is **not** updated. Import-time enrichment replaces it for this use case.

### 4. Save-Time Item Regeneration

When a plot is saved, `services/stac/` regenerates `item.json` from `features.geojson`:

- Walk TRACK features, build `debrief:platforms` array from the per-feature enrichment fields.
- Derive convenience aggregates if needed (e.g. `has_submarine`, `nationalities` as a flat list for simple CQL2 queries) — or drop flat aggregates entirely if the `array_filter` extension handles all queries.
- Record provenance in the TRACK feature's `provenance` block: how each platform's metadata was derived (registry lookup vs. empty/unknown).

### 5. CQL2 `array_filter` Extension

Extend `shared/components/src/filter-engine/`:

- **Evaluator:** Implement `array_filter()` visitor in `engine.ts` — iterates array elements and applies a compound predicate per element.
- **Matcher:** New `matchArrayFilter()` in `matchers.ts` — handles `array_filter(platforms, p -> p.nationality = 'GB' AND p.domain = 'subsurface')`.
- **Serialization:** Update `cql2-json.ts` to serialize/deserialize `array_filter` expressions. The third-party `cql2-filters-parser` already supports the syntax at the parse level.
- **Filter bar:** Update `FilterBar.tsx` to handle platform-based filter chips (compound nationality + domain, vessel type, etc.).

### 6. NL → CQL2 Generation

The LLM receives a **fixed-size prompt** containing:
- The CQL2 schema: field names, types, operators, `array_filter` syntax.
- Value enums extracted at build time: vessel class taxonomy tree, all nationality codes, all exercise names, all known tags, all feature_tags.
- Instructions to output a CQL2 filter expression + a chips summary for the UI.

The LLM **never sees the catalog items**. The client applies the generated CQL2 against the local catalog using the extended filter engine. This scales to any catalog size.

**Build-time extraction script:** walks the platform registry + sample catalog, extracts all unique values, outputs a compact JSON consumed by the prompt builder.

**Auth/transport:** TBD — options include an MCP tool on the STAC server, a local proxy, or direct browser API call. To be determined during implementation based on the deployment context for the demo.

### 7. Stakeholder Demo UI

No-build-step HTML/React playground (same approach as the prototype). Components:

- **Query bar:** full-width text input, Enter to search.
- **Filter chips:** colour-coded by type (nationality=blue, vessel=green, exercise=purple, tag=amber, year=coral, domain=teal). "Clear all" button.
- **Results count:** "N of M plots" when filtered.
- **Card grid:** CSS auto-fill, min 280px. Each card: title + year, description (truncated), nationality badges, vessel type badges, up to 3 tag badges.
- **Empty state:** rephrasing suggestion when no results match.

NL input produces CQL2 chips → chips filter the card grid via the extended CQL2 engine. The NL capability is just another way to add chips to the filter bar.

### 8. Sample Catalog Regeneration

1. Delete `preview/workspace/samples/local-store/` entirely.
2. Re-import all legacy files (72 `.dpf`/`.rep` files from the existing `assets/` directories) through the enriched import pipeline.
3. Platform registry is populated as we process — known platforms get full entries, unknown ones produce import warnings.
4. Item-level metadata carries `debrief:platforms` (no flat aggregates).
5. All schema tests pass against the regenerated data.

## Success Criteria

- [ ] Platform registry exists at `shared/data/platform-registry.yaml` with vessel class taxonomy and known platforms
- [ ] LinkML schema declares optional per-platform fields on TrackProperties
- [ ] Pydantic + TypeScript types regenerated and passing adherence tests
- [ ] Import handlers consult registry; unregistered platforms log warnings
- [ ] Sample catalog regenerated cleanly from legacy sources through enriched pipeline
- [ ] `debrief:platforms` replaces flat aggregates on item.json
- [ ] CQL2 engine evaluates `array_filter()` expressions
- [ ] LLM generates CQL2 from NL queries using schema + enum prompt (no catalog in prompt)
- [ ] Stakeholder can type a query, see chips appear, see filtered card grid update
- [ ] "UK submarines", "German frigates", "Type 23 frigates" all produce correct results
- [ ] `task verify` passes on the final branch

## Constraints

- Enrichment fields on TrackProperties are **optional** — the system must function correctly when they are empty (unregistered platforms, incomplete data)
- Platform registry is a static file, not a runtime service
- No build step for the demo UI (HTML + CDN React + Babel standalone)
- Auth/transport for LLM calls is TBD — the epic must not be blocked by this decision

## Out of Scope

- Map view / timeline view (card grid only)
- Opening/loading plots from search results (browse-only)
- Track feature property editor (analyst manually filling in platform metadata)
- `contrib/` org-specific registry overlays
- Prompt caching / token optimisation
- Security / redaction for classified data
- Persisting NL search history across sessions
- Real sensor/propagation models

## Cross-Epic Dependencies

| Epic | Relationship |
|------|-------------|
| E01 (Tool Implementation) | None — NL search is independent of calc tools |
| E03 (Buffer Zone Demo) | None |
| E04 (Results Visualization) | None |
| E07 (Sensor Data Pipeline) | None |
| E08 (Catalog Overview) | E10 produces CQL2-compatible filters that E08's catalog view could consume in future |
| #126 (CQL2 Filter Engine) | **Extended** — E10 adds `array_filter` evaluation |
| #127 (Filter Bar Lozenge UI) | **Extended** — E10 adds platform-based compound chips |
| #125 (STAC Extension Mock Data) | **Affected** — mock data must use new `debrief:platforms` structure |
| #144 (Import Legacy Sample Data) | **Superseded** — E10 re-imports from the same legacy sources with enrichment |

## Epic Breakdown

### Phase 0: Foundation

| Item | Description | Dependencies |
|------|-------------|--------------|
| 180 | [E10] Platform registry schema + seed data — define vessel class taxonomy and known platforms in `shared/data/platform-registry.yaml`; create Python + TypeScript loaders | None |
| 181 | [E10] LinkML schema update — add optional per-platform fields to TrackProperties (`display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`); update STAC extension with `debrief:platforms` replacing flat aggregates; regenerate Pydantic + TS types; update golden fixtures | #180 |

### Phase 1: Import Pipeline

| Item | Description | Dependencies |
|------|-------------|--------------|
| 182 | [E10] Import handler enrichment — update `services/io/handlers/dpf.py` and `rep.py` to consult platform registry at import time; populate enrichment fields for known platforms; log warnings for unregistered platform_ids | #180, #181 |
| 183 | [E10] Save-time item regeneration — update `services/stac/` to regenerate `item.json` from enriched `features.geojson` with `debrief:platforms` array (no flat aggregates); record enrichment provenance | #181, #182 |
| 184 | [E10] Nuke + regenerate sample catalog — delete `preview/workspace/samples/local-store/`, re-import all 72 legacy files through the enriched pipeline; populate registry as we process; all schema tests pass | #182, #183 |

### Phase 2: CQL2 Extension

| Item | Description | Dependencies |
|------|-------------|--------------|
| 185 | [E10] CQL2 `array_filter` evaluator — extend `shared/components/src/filter-engine/` to evaluate `array_filter()` for compound predicates on `platforms[]`; add matchers and CQL2-JSON serialization; unit tests | #181 |
| 186 | [E10] Filter bar platform chips — update `FilterBar.tsx` to generate and display compound platform-based chips (nationality + domain, vessel type); wire to `array_filter` CQL2 expressions | #185 |

### Phase 3: NL → CQL2

| Item | Description | Dependencies |
|------|-------------|--------------|
| 187 | [E10] Build-time enum extraction — script that walks platform registry + catalog to extract all unique values (vessel class tree, nationalities, exercise names, tags, feature_tags); outputs compact JSON for the LLM prompt | #180, #184 |
| 188 | [E10] NL → CQL2 prompt design + generation — system prompt with CQL2 schema, extracted enums, and `array_filter` syntax; LLM outputs CQL2 filter + chips summary; headless test harness with typical analyst phrases | #185, #187 |
| 189 | [E10] LLM transport integration — wire NL input to LLM call; auth/transport mechanism TBD (MCP tool, local proxy, or other) | #188 |

### Phase 4: Stakeholder Demo

| Item | Description | Dependencies |
|------|-------------|--------------|
| 190 | [E10] Prototype UI — no-build-step HTML/React playground; filter bar with NL input + CQL2 chips + card grid; NL queries produce chips that filter via the extended CQL2 engine; stakeholder-ready | #186, #189 |
