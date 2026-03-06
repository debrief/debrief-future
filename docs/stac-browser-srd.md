# Software Requirements Document
## STAC Stack Browser — Discovery UI

**Version:** 0.4 Draft
**Date:** 06 March 2026
**Status:** Draft for Review

---

## 1. Purpose

This document describes the requirements for the analyst-facing discovery interface of the STAC Stack Browser. The scope is limited to the **discovery phase**: finding, filtering, and selecting exercises from the STAC archive. Analysis of selected exercises is handled by a separate editor component.

---

## 2. Standards and Specifications

The implementation shall adhere to the following open standards wherever possible:

| Standard | Usage |
|---|---|
| STAC Spec | Item and Collection structure for all exercise data |
| STAC API — Filter Extension | CQL2 expressions for all metadata, spatial, and temporal filtering |
| OGC CQL2 (Common Query Language 2) | Underlying filter logic; AND/OR model maps directly to CQL2 logical operators |
| OGC API — Features | Spatial query predicates (e.g. `S_INTERSECTS`) |
| ISO 8601 | Datetime representation throughout |

A **STAC Extension** shall be defined to accommodate fields not covered by the core STAC spec, specifically:

- **Plot-level tags** — stored in `item.properties` under a defined extension namespace
- **Feature-level tags** — stored within GeoJSON feature properties under the same extension
- **Vessel classification** — stored as a structured property (e.g. `vessel:class`) within the extension
- **Track metadata** — track names and nationalities stored as arrays in `item.properties`

The STAC Extension spec shall be authored as a separate document. The `plot-save` component must be updated to push plot and feature-level tags into `item.json` at save time, conforming to this extension.

---

## 3. User Flows

### 3.1 Continue Recent Work

Approximately 70% of analyst sessions begin by reopening a recently accessed exercise. The UI must provide prominent access to recently opened exercises (a "most recent files" list), enabling one-click resumption of prior work.

### 3.2 Discover Exercises

When analysts need to locate exercises they do not immediately recall, discovery is supported through three complementary mechanisms that may be used in any combination and in any order:

- **Metadata filtering** — filter by vessel taxonomy, tags, author, duration, track names, nationalities, title, and folder structure
- **Spatial filtering** — use the map view to narrow results geographically by panning and zooming
- **Temporal filtering** — use the Gantt/timeline view to narrow results by adjusting the visible time range

These flows are **iterative**. An analyst may apply metadata filters, inspect results on the map, apply further metadata filters, zoom in spatially, and so on. All three views are always synchronised with the combined active filter state, and update dynamically as any filter changes.

---

## 4. Filter Bar

### 4.1 Overview

A persistent filter bar sits above the results views. It displays all currently active metadata filters as **lozenges** (pill-shaped elements), one per filter. Spatial and temporal filters are applied implicitly via the map and timeline views respectively — they do not appear as lozenges.

### 4.2 Adding Filters

- A **plus (+) button** in the filter bar opens a dropdown of available filter types.
- The analyst selects a filter type, then selects or enters a value.
- A lozenge is added to the filter bar and results update dynamically.

### 4.3 Editing and Removing Filters

- Clicking a lozenge opens it for editing (value can be changed).
- Removing a lozenge deletes that filter and results update immediately.

### 4.4 Filter Types

| Filter Type | Input Method | Data Source |
|---|---|---|
| Vessel Class | Hierarchical dropdown (taxonomy) | Formal vessel taxonomy (see Section 6) |
| Plot Tag | Dropdown | Tags from `item.properties` via STAC |
| Feature Tag | Dropdown | Feature-level tags from `item.properties` via STAC |
| Author | Dropdown | Authors derived from STAC item metadata |
| Plot Duration | Dropdown: `<6H`, `<24H`, `<72H`, `<10D`, `>10D` | Computed from STAC datetime fields |
| Plot Title | Free text search | `item.properties.title` |
| Plot Contents | Free text search | Full-text index of plot contents (see note) |
| Track Name | Dropdown | Track names from `item.properties` via STAC |
| Track Nationality | Dropdown | Nationalities from `item.properties` via STAC |
| Folder / Collection | Dropdown / browse | STAC Collection structure |

> **Note:** Free-text search on plot contents requires full-text indexing in the backend. For Storybook/prototype purposes this is implemented as a client-side substring match on mock data. Production implementation is a backend concern.

### 4.5 AND / OR Logic

By default, all lozenges in the filter bar are combined with **AND** logic, mapping directly to CQL2 conjunctions.

To express OR logic, an **OR container lozenge** is available:

- The analyst adds an OR container via the **+** button (listed as a filter type: "OR group")
- An empty OR container appears in the filter bar with its own mini **+** button inside it
- The analyst either:
  - Drags existing lozenges from the main filter bar into the OR container (the lozenge **moves**, it is not copied), or
  - Uses the mini **+** inside the OR container to add new filter lozenges directly
- Lozenges within an OR container are combined with OR logic
- The OR container itself is AND'd with all other top-level lozenges
- One level of OR nesting is supported; nested OR containers are not supported in this version

**Example:** `[Duration: <24H] [OR: [Vessel: Type23] [Vessel: Type45]] [Nationality: French]`

Reads as: duration under 24 hours, AND (Type23 OR Type45), AND French nationality.

This logic model maps directly to OGC CQL2 filter expressions and shall be serialised as CQL2 JSON for API queries.

### 4.6 Saved Filter Configurations

- A **Save** button in the filter bar saves the current set of lozenges as a named filter configuration. The analyst is prompted to optionally provide a name.
- A separate **Historic Filters** dropdown (outside the filter bar) lists previously saved configurations for quick reapplication.
- Selecting a saved configuration restores that full filter set.
- Saved configurations can be **deleted** from the historic filters dropdown.
- Saved configurations are serialised as CQL2 JSON for portability and persistence.

---

## 5. Results Views

### 5.1 Three Synchronised Views

Results are presented across three views, all reflecting the same combined filter state at all times:

1. **List view** — scrollable list of matching exercises
2. **Map view** — spatial footprints of matching exercises
3. **Timeline / Gantt view** — temporal extents of matching exercises

All three views update dynamically as filters change. When no exercises match the current filters, all views display **"No matches"**.

### 5.2 List View

Each item displays:

- Exercise name / title
- Relevant metadata summary (vessel classes, tags, author, duration)
- A **spatial thumbnail** — sufficient for visual recognition of the exercise's track pattern
- Date / temporal summary

The list supports **flexible sorting**, configurable by the analyst. Sort dimensions include at minimum: recency, alphabetical, duration. The sort model is extensible.

### 5.3 Map View

- Displays spatial footprints of all matching exercises.
- **Panning or zooming the map acts as a live spatial filter**, dynamically narrowing the list and timeline to exercises whose spatial extent overlaps the current map viewport.
- Exercises coloured according to the current colour scheme (see Section 7).

### 5.4 Timeline / Gantt View

- Displays temporal extents of all matching exercises.
- **Adjusting the visible time range acts as a live temporal filter**, dynamically narrowing the list and map to exercises with activity within the current time window.
- Exercises coloured according to the current colour scheme (see Section 7).

---

## 6. Vessel Taxonomy

A formal hierarchical taxonomy classifies vessels. Filtering on a parent node returns all exercises involving any vessel in that subtree.

- Taxonomy **structure** is defined by the development team.
- Taxonomy **contents** (specific vessel classes and types) are populated in collaboration with analysts, and maintained separately.
- The taxonomy is expressed as a STAC extension property (e.g. `vessel:class`) to ensure data and query interoperability.

---

## 7. Colour Scheme

### 7.1 Configurable Colour Mapping

Both the map and timeline views share a single configurable colour dimension applied to exercise representations.

### 7.2 Available Colour Dimensions (initial set)

| Dimension | Description |
|---|---|
| Age | Gradient encoding recency of the exercise |
| Vessel Class | One colour per vessel class from the taxonomy |
| Tag | Colour by a selected tag value |

The colour dimension list is extensible.

### 7.3 Legend

A legend is displayed alongside both the map and timeline views, explaining the current colour encoding.

---

## 8. Opening an Exercise

Selecting an exercise from any view (list, map, or timeline) opens it in a **new editor tab**. The Stack Browser remains open with all current filters and results intact.

---

## 9. Storybook / Development Approach

### 9.1 No Backend Required for Review

The Discovery UI can be fully developed and reviewed in **Storybook** without a live STAC backend. All components are driven by static mock data shaped to match the STAC item/collection structure.

### 9.2 Mock Data Strategy

A set of fixture `item.json` files shall be created to represent a realistic spread of exercises, covering:

- Variety of vessel classes, tags, authors, durations, nationalities
- Different geographic extents and time ranges
- Plot-level and feature-level tag examples
- Edge cases: zero results, single result, large result sets

### 9.3 Client-Side Filter Simulation

For Storybook purposes, the CQL2 filter logic shall be implemented as a **client-side filter function** operating on the mock data array. This:

- Validates the AND/OR lozenge logic without a backend
- Provides a reference implementation of the CQL2 query model
- Makes the filter behaviour fully reviewable and testable in isolation

### 9.4 Mock Data Contract

The mock `item.json` structure must be agreed **before Storybook development begins**, as it defines the contract between the Discovery UI and the backend. The following must be settled:

- `item.properties` field names for vessel class, plot tags, feature tags, author, track names, and nationalities
- The STAC extension namespace
- Duration representation (computed field vs. stored property)

This contract shall be documented in the STAC Extension spec (separate document).

### 9.5 Production Transition

When transitioning from Storybook to production, the client-side filter function is replaced by CQL2 API calls to the STAC backend. Component interfaces do not change. The one exception is **full-text search on plot contents**, which requires a backend full-text index and cannot be fully simulated client-side.

---

## 10. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Dynamic updates | All results views update in real time as filters change; no manual refresh |
| Filter persistence | Analysts can save, name, retrieve, and delete filter configurations |
| Standards adherence | All filtering uses CQL2; all data structures use STAC spec + defined extension |
| Extensibility | Filter types, taxonomy contents, and colour dimensions are extensible |
| Zero results | All views display "No matches" when no exercises satisfy current filters |
| Thumbnail fidelity | Spatial thumbnails must allow visual recognition of an exercise at a glance |

---

## 11. Out of Scope

- Exercise analysis / editor functionality
- Track playback or animation
- Collaboration or sharing features
- User account management
- Backend STAC API implementation (covered separately)

---

## 12. Open Items

| # | Item | Owner |
|---|---|---|
| 1 | Define STAC Extension spec (property names, namespace, schema) | Development team |
| 2 | Update `plot-save` to push plot and feature tags into `item.json` | Development team |
| 3 | Develop vessel taxonomy contents with analysts | Doc Boeuf + analysts |
| 4 | Agree mock data fixture set before Storybook development | Development team |
| 5 | Confirm full-text search on plot contents — scope and backend approach | TBC |

---

## 13. STAC Best Practices Compliance Review

*Reference: [radiantearth/stac-spec best-practices.md](https://github.com/radiantearth/stac-spec/blob/master/best-practices.md)*

This section audits the current `debrief-stac` implementation (Python service + TypeScript consumer) against the official STAC Best Practices, identifies gaps, and records decisions where Debrief intentionally diverges.

### 13.1 Compliance Summary

| Best Practice | Status | Notes |
|---|---|---|
| STAC version 1.0.0 | **Compliant** | Enforced in `types.py:STAC_VERSION` and validated in `test_stac_validation.py` |
| `type` field for differentiation | **Compliant** | Catalog uses `"Catalog"`, Items use `"Feature"` — matches spec identification logic |
| Catalog named `catalog.json` | **Compliant** | Hardcoded in `catalog.py` and validated in TS `StacService` |
| Items named `<id>.json` | **Diverges (intentional)** | Items use `item.json` inside `<id>/` subdirectory. See §13.2.1 |
| Items in subdirectories | **Compliant** | Each plot is in its own `<plot-id>/` directory with sidecar files (`features.geojson`, `assets/`) |
| Relative structural links | **Compliant** | All `root`, `parent`, `self` links use relative paths (`../catalog.json`, `./item.json`) |
| `self` link on Items | **Compliant** | Every Item includes `{"rel": "self", "href": "./item.json"}` |
| `parent` and `root` links on Items | **Compliant** | Both present and point to `../catalog.json` |
| `root` and `self` on Catalog | **Compliant** | Both point to `./catalog.json` |
| Item links in Catalog | **Compliant** | Catalog links include `rel: "item"` with `type: "application/geo+json"` |
| Link `type` field | **Compliant** | All links include `type` — `application/json` for catalogs, `application/geo+json` for items |
| Link `title` field | **Partial** | Item links in catalog use `item_id` as title; item-level links (root, parent, self) lack titles. See §13.2.2 |
| Asset roles | **Compliant** | All assets have roles: `data`, `source`, `result`, `thumbnail` |
| Asset media types | **Compliant** | `application/geo+json` for features, `image/png` for thumbnails, auto-detected for source files |
| `datetime` property | **Compliant** | Required field on all Items, ISO 8601 format |
| `start_datetime` / `end_datetime` | **Compliant** | Sample fixture uses both; TS consumer reads them into `StacItemSummary` |
| `bbox` present with geometry | **Compliant** | Computed from features in `_calculate_bbox()`; bbox and geometry always set/null together |
| Null geometry for unlocated items | **Compliant** | New plots start with `geometry: null, bbox: null` before features are added |
| No `bbox` when geometry is null | **Compliant** | `bbox` is only set when features are added; null otherwise |
| Item IDs unique per collection | **Compliant** | UUIDs by default (`uuid.uuid4()`), plus duplicate-link guard in `_add_item_link()` |
| Item ID avoids reserved characters | **Compliant** | UUID format contains only hex + hyphens, no `:`, `/`, or URI-reserved chars |
| Collection summaries | **Not applicable (yet)** | Debrief uses flat Catalogs, not Collections. See §13.2.3 |
| CORS for web access | **Not applicable** | Local filesystem catalogs; no HTTP serving. Future STAC API would need CORS |
| HTML representation | **Not applicable** | Offline desktop tool; no web crawling requirement |
| Versioning of records | **Not implemented** | No version history per Item. See §13.2.4 |
| Self-contained catalog (portability) | **Compliant** | All links relative; asset hrefs relative; catalog is fully portable/copyable |
| Consistent STAC version across catalog | **Compliant** | Single `STAC_VERSION` constant used for both Catalog and Items |

### 13.2 Detailed Findings

#### 13.2.1 Item Naming Convention — Intentional Divergence

**Best practice:** Name Items `<id>.json` directly in a subdirectory.

**Debrief approach:** Items are named `item.json` inside a `<plot-id>/` directory (e.g., `<plot-id>/item.json`).

**Rationale:** Each plot has sidecar files (`features.geojson`, `assets/`, `results/`) that must live alongside the Item. Using `<id>/item.json` keeps the directory self-contained and mirrors the pattern used by STAC Browser for traversal. The TS consumer resolves items via catalog links rather than filename conventions, so this divergence has no interoperability impact within Debrief. If publishing to external STAC catalogs, a build step can rename to `<id>.json`.

**Risk:** Low. The best practice is a recommendation, not a requirement. Both approaches are valid for self-contained static catalogs.

#### 13.2.2 Link Titles — Improvement Opportunity

**Best practice:** "Always provide titles for links. Link title should exactly match referenced entity's title."

**Current state:** Item links in the catalog use the `item_id` as title (via `_add_item_link()`), which is a UUID — not human-readable. Structural links within Items (`root`, `parent`, `self`) have no titles.

**Recommendation:**
1. Pass the plot title into `_add_item_link()` so catalog item-links carry meaningful titles
2. Add titles to structural links within Items (e.g., `"title": "Catalog root"` for root/parent)
3. This directly benefits the STAC Browser SRD — link titles prevent UI flickering during navigation

#### 13.2.3 Collections vs Catalogs

**Best practice:** Use Collections (with summaries) for groups of related Items.

**Current state:** Debrief uses flat Catalogs only. The SRD references "Folder / Collection" as a filter type (§4.4), but the backend currently has no Collection support.

**Recommendation:** When the STAC Browser backend is implemented, consider promoting the root Catalog to a Collection with summaries for:
- `datetime` range (min/max across all items)
- `bbox` extent (union of all item bboxes)
- Extension fields: vessel classes, nationalities, tags

This would enable efficient filtering without loading every Item. The SRD's CQL2 filter model maps naturally to Collection-level summaries.

#### 13.2.4 Versioning

**Best practice:** Implement versioning via the Versioning Indicators Extension — version each record with separate versioned copies.

**Current state:** No versioning. Items are overwritten in place.

**Recommendation:** Defer. Debrief is an analyst tool where plots are edited interactively — STAC-level versioning would create excessive file proliferation. The provenance system (`debrief:provenance` on assets) already tracks lineage. If version history is needed, it should be implemented at the application layer (undo/redo) rather than STAC catalog level.

#### 13.2.5 Media Type Specificity

**Best practice:** "Use most specific media type possible. Prefer IANA-registered types."

**Current state:**
- `application/geo+json` for features — **correct**
- `application/json` for catalog links — **correct**
- `image/png` for thumbnails — **correct**
- `application/x-rep` for REP files — uses `x-` prefix correctly per RFC 6838 for unregistered formats
- `application/octet-stream` as fallback — **acceptable**

**No action required.** The `application/x-rep` type follows the `vnd.` / `x-` convention recommended by best practices for custom formats.

#### 13.2.6 Thumbnail / Overview / Visual Assets

**Best practice:** Distinguish between `thumbnail` (<600x600), `overview` (<5000x5000), and `visual` (full resolution) asset roles.

**Current state:** Sample fixture includes a `thumbnail` role with `preview.png`. No `overview` or `visual` roles.

**Recommendation:** For the STAC Browser list view (§5.2), `thumbnail` is the correct role for spatial thumbnails used in quick visual recognition. If the Browser later needs full-resolution spatial previews, add `overview` role assets. No change needed now.

#### 13.2.7 Searchable Identifiers

**Best practice:** "Use only lowercase characters, numbers, underscores, and hyphens" for IDs to ensure search consistency.

**Current state:** Default IDs are UUIDs (lowercase hex + hyphens) — **compliant**. Custom IDs (e.g., `exercise-alpha-2024` in the sample fixture) also follow this convention.

**No action required**, but document this convention for contributors.

#### 13.2.8 Datetime Field Selection

**Best practice:** Populate the single `datetime` field when possible with a representative value; use `start_datetime` / `end_datetime` for time ranges.

**Current state:** All Items have `datetime` set to creation timestamp. The sample fixture also includes `start_datetime` and `end_datetime` for exercise temporal extent.

**Recommendation:** When the REP file loader populates temporal data, ensure `datetime` is set to a representative value (e.g., midpoint or start of the exercise) and `start_datetime`/`end_datetime` bracket the full temporal extent. This directly supports the Timeline / Gantt view (§5.4) and the Duration filter (§4.4).

#### 13.2.9 Self-Contained Catalog for Offline Use

**Best practice:** Self-contained catalogs use relative structural links only, no `self` link required, and enable offline use with relative asset hrefs.

**Current state:** Debrief catalogs are self-contained with all relative links and relative asset hrefs. The `self` link is present (which is permitted, not prohibited, in self-contained catalogs).

**Fully compliant.** This aligns with the Constitution's "offline by default" principle.

#### 13.2.10 `derived_from` Link for Provenance

**Best practice:** Use `derived_from` link relation to track provenance of data.

**Current state:** Provenance is tracked via custom `debrief:provenance` properties on assets (source path, timestamp, tool version). No `derived_from` links are used.

**Recommendation:** Consider adding `derived_from` links at the Item level when plots are created from source files. This would complement the asset-level provenance and enable STAC-native provenance traversal. Low priority — current approach is functional.

### 13.3 Action Items from Compliance Review

| # | Item | Priority | Owner |
|---|---|---|---|
| BP-1 | Pass plot title to `_add_item_link()` for meaningful link titles | Medium | Development team |
| BP-2 | Add titles to structural links in Items (`root`, `parent`, `self`) | Low | Development team |
| BP-3 | Design Collection summaries for STAC Browser backend | Medium | Development team |
| BP-4 | Ensure REP loader sets `start_datetime`/`end_datetime` alongside `datetime` | High | Development team |
| BP-5 | Document ID naming convention (lowercase, hyphens, no reserved chars) | Low | Development team |
| BP-6 | Consider `derived_from` links for STAC-native provenance | Low | Development team |

---
