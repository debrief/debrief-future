# Software Requirements Document
## STAC Stack Browser — Discovery UI

**Version:** 0.3 Draft
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
