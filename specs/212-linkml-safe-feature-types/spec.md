# Feature Specification: Replace hand-written `Safe*` GeoJSON feature types with schema-derived equivalents

**Feature Branch**: `212-linkml-safe-feature-types`
**Created**: 2026-06-01
**Status**: Draft — **work in progress** (usage-site audit complete; **migration strategy under discussion** per stakeholder decision 2026-06-01)
**Input**: BACKLOG #212 (Tech Debt, approved): "Replace hand-written `SafeFeature` / `GeoJSONFeature` with LinkML-generated equivalents — two hand-written TypeScript feature types in `shared/utils/src/types.ts` … an Article II tripwire — any 'schema-adjacent' in-tree type should be LinkML-generated. #200 widens `calculateBounds` to a structural minimum that sidesteps the smell; this item closes it."

---

## ⚠️ Workflow Note (why this spec is incomplete)

The triggering clarification revealed a genuine fork that should not be guessed, so the stakeholder directed: **audit every usage site, report where there is a concrete gap, then discuss the migration strategy.**

- The hand-written `SafeFeature` permits `geometry: null` and `coordinates: unknown` (used at `JSON.parse` / MCP / file boundaries).
- The LinkML-generated `RawGeoJSONFeature` **requires** geometry and uses **typed** coordinate unions — so it is *not* a drop-in equivalent.

**The audit is complete** (see `evidence/audit-gap-report.md`). It found that `RawGeoJSONFeature` cleanly serves 29 of 43 sites, but **14 GENUINE-GAP sites** genuinely need the permissive shape — and 7 of those are a *shared* cross-package boundary concern that cannot be reduced to a purely local type.

**Open:** the migration mechanism for the shared permissive boundary (see **Strategy Options** below) — pending stakeholder decision. The strategy-dependent functional requirements (FR-007+) and the strategy-dependent success criteria are not yet finalised.

---

## Problem / Context

`shared/utils/src/types.ts` still exports three **hand-written, schema-adjacent** GeoJSON feature types — `SafeGeometry`, `SafeFeature`, `SafeFeatureCollection`. Constitution **Article II (Schema Integrity)** requires that all data structures be derived from the LinkML master schema, "never hand-written," so these are an Article II tripwire.

Prior work narrowed the surface but deliberately did not close it:

- **#204 / ADR-021** removed the hand-written `GeoJSONFeature` types and unified parse-boundary features onto the generated `RawGeoJSONFeature` — but **kept `RawGeoJSONFeature.geometry` required** (rejecting a nullable variant to avoid spreading defensive `if (!f.geometry)` branches) and **retained `SafeFeature`** as the distinct *permissive* boundary type.
- **#200 / #219** reworked `calculateBounds` to read a **module-private structural minimum** (`BoundsInputFeature`), so the bounds utility depends on no named feature type.

So #212 is, precisely: make the retained permissive boundary type **schema-rooted instead of hand-written**, and remove the remaining hand-written `Safe*` family.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evidence-based gap report (Priority: P1) — ✅ DELIVERED

A maintainer needs a precise, complete inventory of where `SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` are used, classified by whether the generated `RawGeoJSONFeature` can replace them cleanly, so the migration strategy is chosen on evidence rather than assumption.

**Why this priority**: The migration mechanism cannot be responsibly chosen until the concrete gaps are known. Gating deliverable.

**Independent Test**: The report enumerates 100% of semantic usage sites with a per-site classification and quotes code for every GENUINE-GAP; a reviewer can confirm each gap is real.

**Acceptance Scenarios**:

1. **Given** the current codebase, **When** the audit runs, **Then** every semantic usage is classified CLEAN-SWAP / NEEDS-NARROWING / GENUINE-GAP. → **Met**: 43 sites (21 / 8 / 14). See `evidence/audit-gap-report.md`.
2. **Given** the classified list, **When** a reviewer inspects each GENUINE-GAP, **Then** the rationale holds and the report states whether each gap needs a shared type or only a module-private minimum. → **Met**: two categories — (a) coordinate-reads → private minimum; (b) null-geometry/parse boundary → shared shape across 4 packages + a webview message DTO.

---

### User Story 2 - No hand-written schema-adjacent feature type remains (Priority: P2)

A contributor can no longer introduce or depend on a hand-written GeoJSON feature type in `shared/utils`. Canonical feature types come from `@debrief/schemas` (generated) or from a clearly-scoped derivation/structural minimum, per the agreed strategy.

**Why this priority**: This is the actual debt-closure outcome the backlog asks for. Depends on US1's findings and the chosen strategy.

**Independent Test**: After the change, `shared/utils` exports no hand-written `Safe*`/GeoJSON feature type, and a repo-wide search finds no reintroduction.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** `shared/utils/src/types.ts` and `index.ts` are inspected, **Then** `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection` are no longer defined or exported.
2. **Given** a contributor later adds a hand-written feature type, **When** lint/CI runs, **Then** a regression guard fails (consistent with `check-no-geojson-feature.sh` / `no-redeclare-utils-exports`).

---

### User Story 3 - Zero behavioural regression across consumers (Priority: P2)

All consumers (VS Code extension, web-shell, services, shared components) build, lint, type-check, and pass tests after the migration, with no runtime behaviour change for plot loading, REP import, tool/MCP results, or bounds calculation.

**Why this priority**: A type-only refactor that changes runtime behaviour or breaks a consumer is a failure regardless of how cleanly the debt is closed.

**Independent Test**: Full CI (lint + typecheck + unit + Playwright E2E) is green; migrated boundaries introduce no new `as`-casts beyond explicit, reviewable narrowing gates.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** `task verify` and the Playwright E2E suites run, **Then** all steps pass.
2. **Given** a feature with `geometry: null` (an RFC 7946 "unlocated" feature — e.g. SYSTEM_RECORD, STORYBOARD, NarrativeEntry) flows through a migrated boundary, **When** it is processed, **Then** behaviour is unchanged from today (the null feature is preserved, not dropped).

---

### Edge Cases

- Features with `geometry: null` (RFC 7946 "unlocated" features) — must remain representable / handled where they occur today (these legitimately exist for SYSTEM, storyboard, and narrative features).
- Tool / MCP / disk results carrying not-yet-validated `coordinates` before any narrowing step.
- REP-import features produced before narrowing to a domain feature type.
- `FeatureCollection`-shaped inputs passed to `calculateBounds` (already handled via auto-unwrap + the private structural minimum).

## Strategy Options *(decision pending — to be resolved before FR-007+ are written)*

The audit narrows the category-(b) shared-boundary decision to three approaches:

- **Strategy A — Schema-DERIVED permissive type (structural derivation, no new schema class).** Define the permissive boundary type as a structural widening of the generated `RawGeoJSONFeature` (e.g. `Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null }`) in one shared location. Migrate category-(b) boundaries + the `messages.ts` DTO to it; category-(a) reads to module-private minimums; the 29 clean/narrowing sites to `RawGeoJSONFeature`. Closes the Article II smell via the Article IV.5 `Omit`/`Pick` idiom, with no new LinkML class, no adherence fixtures, and no nullable spread on the common type. *Trade-off: the derived type's coordinates are the typed union rather than `unknown` (acceptable per the audit — `unknown` reliance is category (a), handled locally).*
- **Strategy B — Extend the LinkML schema with a permissive ingress class.** A new generated class (nullable geometry, free-form coordinates). Most "schema-first," keeps `coordinates` genuinely free-form — but adds a second loose-feature class (ADR-021 cautioned against near-identical loose classes), plus adherence fixtures, regeneration, and a possible version bump.
- **Strategy C — Partial close: centralise + document.** Migrate the 29 clean/narrowing sites; cover category (a) locally; keep ONE hand-written `SafeFeature`/`SafeFeatureCollection` for the shared boundary, documented via a new ADR as a deliberate, narrowly-scoped Article II exception. Lowest effort; shrinks the smell from 43 to ~7 sites — but does **not** fully close the tripwire.

## Requirements *(mandatory — partial; strategy-dependent items pending)*

### Functional Requirements (strategy-independent)

- **FR-001**: The feature MUST produce a complete usage-site audit/gap report covering every semantic usage of `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection`, each classified CLEAN-SWAP / NEEDS-NARROWING / GENUINE-GAP, with code quoted for each GENUINE-GAP. → **delivered** (`evidence/audit-gap-report.md`).
- **FR-002**: The feature MUST migrate every CLEAN-SWAP and NEEDS-NARROWING site (29 of 43) to the generated `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection`, removing now-redundant null-guards where geometry becomes required.
- **FR-003**: Category-(a) coordinate-read gaps MUST be covered by module-**private** structural minimums (the `bounds.ts` `BoundsInputFeature` pattern), not by any new exported feature type.
- **FR-004**: The feature MUST NOT introduce a new hand-written *exported* GeoJSON feature type that re-lists fields; any shared boundary type MUST be schema-derived (generated, or `Pick`/`Omit`/`Partial` of a generated source) per Article IV.5 — unless Strategy C is explicitly chosen and recorded in an ADR.
- **FR-005**: The host→webview message DTOs in `apps/vscode/src/webview/messages.ts` (`AddResultLayerMessage`, `UpdatePlotFeaturesMessage`) MUST reference a schema-derived feature type, satisfying Article IV.5 (currently they reference the hand-written `SafeFeatureCollection`).
- **FR-006**: The change MUST be behaviour-preserving: full CI (lint, typecheck, unit, Playwright E2E) MUST pass, and features with `geometry: null` MUST continue to be preserved (not dropped) through every migrated boundary.

- **FR-007 _(DECISION PENDING — shared permissive boundary mechanism)_**: The mechanism for the category-(b) shared permissive boundary is deferred to the Strategy Options decision above. _Finalised once a strategy is chosen._
- **FR-008 _(DECISION PENDING — regression guard)_**: A lint/CI regression guard MUST prevent reintroduction of a hand-written permissive `Safe*` feature type, scoped to the chosen strategy. _Finalised once a strategy is chosen._

### Key Entities

- **`SafeFeature` / `SafeGeometry` / `SafeFeatureCollection`** — hand-written, schema-adjacent types in `@debrief/utils` targeted for removal.
- **`RawGeoJSONFeature` / `RawGeoJSONFeatureCollection`** — LinkML-generated types in `@debrief/schemas`; replacement for the 29 clean/narrowing sites (required geometry, typed coordinate unions).
- **Permissive boundary type** — the schema-derived (Strategy A/B) or documented (Strategy C) replacement for the category-(b) shared shape.
- **`BoundsInputFeature`** — existing module-private structural minimum in `shared/utils/src/bounds.ts`; precedent for category-(a) coordinate gaps.

## Success Criteria *(mandatory — partial; strategy-dependent items pending)*

### Measurable Outcomes

- **SC-001**: Zero hand-written *exported* GeoJSON feature types remain in `shared/utils` (verified by inspection + regression guard) — subject to the Strategy C exception if chosen.
- **SC-002**: Full CI (lint, typecheck, unit, Playwright E2E) is green after the migration.
- **SC-003**: The gap report classifies 100% of semantic usage sites, and every GENUINE-GAP entry is independently verifiable. → **delivered**.
- **SC-004**: No `geometry: null` feature is dropped by any migrated boundary (verified by the existing null-geometry fixtures/tests).
- **SC-005**: No new `as`-casts are introduced at migrated sites beyond explicit, reviewable narrowing gates.

_(Strategy-dependent success criteria — e.g. schema-adherence tests if Strategy B is chosen, or an ADR recording the deliberate exception if Strategy C is chosen — to be added once a strategy is agreed.)_
