# Feature Specification: Replace hand-written `Safe*` GeoJSON feature types with schema-derived equivalents

**Feature Branch**: `212-linkml-safe-feature-types`
**Created**: 2026-06-01
**Status**: Draft — ready for `/speckit.clarify` or `/speckit.plan`
**Input**: BACKLOG #212 (Tech Debt, approved): "Replace hand-written `SafeFeature` / `GeoJSONFeature` with LinkML-generated equivalents — two hand-written TypeScript feature types in `shared/utils/src/types.ts` … an Article II tripwire — any 'schema-adjacent' in-tree type should be LinkML-generated. #200 widens `calculateBounds` to a structural minimum that sidesteps the smell; this item closes it."

---

## How this spec was produced (audit-first)

The hand-written `SafeFeature` permits `geometry: null` and `coordinates: unknown`; the LinkML-generated `RawGeoJSONFeature` requires geometry and uses typed coordinate unions — so it is *not* a drop-in equivalent. Rather than guess, the stakeholder directed an **audit-first** approach: classify every usage site, report the concrete gaps, then choose a strategy.

- The gap analysis is delivered in **`evidence/audit-gap-report.md`** (User Story 1).
- The migration strategy for the shared permissive boundary was decided on 2026-06-01: **Strategy A — derive the permissive type structurally from the generated `RawGeoJSONFeature`** (see Migration Approach below).

## Problem / Context

`shared/utils/src/types.ts` still exports three **hand-written, schema-adjacent** GeoJSON feature types — `SafeGeometry`, `SafeFeature`, `SafeFeatureCollection`. Constitution **Article II (Schema Integrity)** requires that all data structures be derived from the LinkML master schema, "never hand-written," so these are an Article II tripwire.

Prior work narrowed the surface but deliberately did not close it:

- **#204 / ADR-021** removed the hand-written `GeoJSONFeature` types and unified parse-boundary features onto the generated `RawGeoJSONFeature` — but **kept `RawGeoJSONFeature.geometry` required** (rejecting a nullable variant to avoid spreading defensive `if (!f.geometry)` branches) and **retained `SafeFeature`** as the distinct *permissive* boundary type.
- **#200 / #219** reworked `calculateBounds` to read a **module-private structural minimum** (`BoundsInputFeature`), so the bounds utility depends on no named feature type.

So #212 is, precisely: make the retained permissive boundary type **schema-rooted instead of hand-written**, and remove the remaining hand-written `Safe*` family — without re-spreading nullable geometry through the common parse type.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evidence-based gap report (Priority: P1) — ✅ DELIVERED

A maintainer needs a precise, complete inventory of where `SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` are used, classified by whether the generated `RawGeoJSONFeature` can replace them cleanly, so the migration is driven by evidence.

**Why this priority**: The migration mechanism cannot be responsibly chosen until the concrete gaps are known. Gating deliverable.

**Independent Test**: The report enumerates 100% of semantic usage sites with a per-site classification and quotes code for every GENUINE-GAP; a reviewer can confirm each gap is real.

**Acceptance Scenarios**:

1. **Given** the current codebase, **When** the audit runs, **Then** every semantic usage is classified CLEAN-SWAP / NEEDS-NARROWING / GENUINE-GAP. → **Met**: 43 sites (21 / 8 / 14). See `evidence/audit-gap-report.md`.
2. **Given** the classified list, **When** a reviewer inspects each GENUINE-GAP, **Then** the rationale holds and the report states whether each gap needs a shared type or only a module-private minimum. → **Met**: category (a) coordinate-reads → private minimum; category (b) null-geometry/parse boundary → shared shape across 4 packages + a webview message DTO.

---

### User Story 2 - The permissive boundary type is schema-derived (Priority: P2)

A maintainer can rely on a single, schema-rooted permissive feature type for the genuine ingress/parse boundaries (REP import, MCP results, disk GeoJSON, the session-state→stac adapter, and the host→webview message DTOs), structurally derived from the generated `RawGeoJSONFeature` so it cannot silently drift when the schema grows.

**Why this priority**: This is the mechanism that lets the hand-written `Safe*` family be deleted while preserving the legitimate `geometry: null` channel. It is the linchpin of the close-out.

**Independent Test**: The derived type exists in one shared location, is consumed by all category-(b) sites and the `messages.ts` DTOs, and contains no hand-re-listed field set (it is expressed as `Omit`/`Pick`/`&` of the generated source).

**Acceptance Scenarios**:

1. **Given** the derived permissive type, **When** a new field is added to the generated `RawGeoJSONFeature`, **Then** the derived type gains it automatically (no manual edit), demonstrating structural derivation.
2. **Given** a host→webview `AddResultLayerMessage` / `UpdatePlotFeaturesMessage`, **When** its payload type is inspected, **Then** it references the schema-derived feature type, not a hand-written one (Article IV.5).

---

### User Story 3 - No hand-written schema-adjacent feature type remains (Priority: P2)

A contributor can no longer introduce or depend on a hand-written GeoJSON feature type in `shared/utils`. Canonical feature types come from `@debrief/schemas` (generated, or structurally derived from a generated source); residual coordinate-permissiveness is a module-private structural minimum.

**Why this priority**: This is the actual debt-closure outcome the backlog asks for.

**Independent Test**: After the change, `shared/utils` exports no hand-written `Safe*`/GeoJSON feature type, and a repo-wide guard finds no reintroduction.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** `shared/utils/src/types.ts` and `index.ts` are inspected, **Then** `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection` are no longer defined or exported.
2. **Given** a contributor later adds a hand-written `Safe*`/GeoJSON feature interface, **When** lint/CI runs, **Then** a regression guard fails (consistent with `check-no-geojson-feature.sh` / `no-redeclare-utils-exports`).

---

### User Story 4 - Zero behavioural regression across consumers (Priority: P2)

All consumers (VS Code extension, web-shell, services, shared components) build, lint, type-check, and pass tests after the migration, with no runtime behaviour change for plot loading, REP import, tool/MCP results, or bounds calculation.

**Why this priority**: A type-only refactor that changes runtime behaviour or breaks a consumer is a failure regardless of how cleanly the debt is closed.

**Independent Test**: Full CI (lint + typecheck + unit + Playwright E2E) is green; migrated boundaries introduce no new `as`-casts beyond explicit, reviewable narrowing gates at genuine ingress points.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** `task verify` and the Playwright E2E suites run, **Then** all steps pass.
2. **Given** a feature with `geometry: null` (an RFC 7946 "unlocated" feature — e.g. SYSTEM_RECORD, STORYBOARD, NarrativeEntry) flows through a migrated boundary, **When** it is processed, **Then** behaviour is unchanged from today (the null feature is preserved, not dropped).

---

### Edge Cases

- Features with `geometry: null` (RFC 7946 "unlocated" features) — must remain representable / handled where they occur today (these legitimately exist for SYSTEM, storyboard, and narrative features). The derived type's geometry is widened to admit `null`.
- Parse / MCP / disk boundaries casting an entire parsed value: a single boundary cast to the derived collection type is retained (the same trust level ADR-021 already accepted for `RawGeoJSONFeature`); no per-coordinate validation is added.
- Construction sites that build geometry from untyped input (e.g. `mocks/calcService.ts`): may retain a single explicit, reviewable narrowing cast at the ingress point — never `any`, never a double-cast.
- `FeatureCollection`-shaped inputs passed to `calculateBounds` (already handled via auto-unwrap + the private structural minimum).

## Migration Approach *(decided 2026-06-01: Strategy A — Derive)*

The shared permissive boundary type (category b) is defined as a **structural derivation** of the generated `RawGeoJSONFeature`, widening `geometry` to admit `null` — e.g. `Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null }`, with a matching collection type. It lives in one shared location (expected: `@debrief/schemas`, alongside the existing hand-maintained derivations in `unions.ts`; final name/home confirmed at `/speckit.plan`).

This closes the Article II smell using the constitution's own **Article IV.5** boundary-derivation idiom, with **no new LinkML class**, **no new schema-adherence fixtures**, and **no nullable spread on the common `RawGeoJSONFeature`** (preserving ADR-021's decision).

**Alternatives considered and rejected** (full rationale in the gap report and the strategy discussion):
- **Extend the LinkML schema** with a permissive ingress class — adds a second loose-feature class (ADR-021 cautioned against this), plus fixtures, regeneration, and a possible version bump. Heavier; not needed since structural derivation suffices.
- **Partial close + ADR** (keep one hand-written boundary type) — lowest effort but leaves the Article II tripwire open, which is exactly what #212 exists to close.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST produce a complete usage-site audit/gap report covering every semantic usage of `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection`, each classified CLEAN-SWAP / NEEDS-NARROWING / GENUINE-GAP, with code quoted for each GENUINE-GAP. → **delivered** (`evidence/audit-gap-report.md`).
- **FR-002**: The feature MUST remove the `SafeFeature`, `SafeGeometry`, and `SafeFeatureCollection` definitions and their exports from `@debrief/utils`.
- **FR-003**: The feature MUST migrate every CLEAN-SWAP and NEEDS-NARROWING site (29 of 43) to the generated `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection`, removing now-redundant null-guards where geometry becomes required.
- **FR-004**: Category-(a) coordinate-read gaps MUST be covered by module-**private** structural minimums (the `bounds.ts` `BoundsInputFeature` pattern), not by any new exported feature type.
- **FR-005**: The shared permissive boundary type (category b) MUST be a **structural derivation** of the generated `RawGeoJSONFeature` (widening `geometry` to admit `null`), defined in a single shared location and consumed by all category-(b) sites. It MUST NOT re-list the source's fields by name (Constitution Article IV.5).
- **FR-006**: The host→webview message DTOs in `apps/vscode/src/webview/messages.ts` (`AddResultLayerMessage`, `UpdatePlotFeaturesMessage`) MUST reference the schema-derived feature type from FR-005, satisfying Article IV.5 (currently they reference the hand-written `SafeFeatureCollection`).
- **FR-007**: A lint/CI regression guard MUST prevent reintroduction of a hand-written `Safe*`/GeoJSON feature type in-tree, extending the existing `check-no-geojson-feature.sh` / `no-redeclare-utils-exports` mechanisms.
- **FR-008**: The change MUST be behaviour-preserving: full CI (lint, typecheck, unit, Playwright E2E) MUST pass; features with `geometry: null` MUST continue to be preserved (not dropped) through every migrated boundary; and no new casts may be introduced beyond explicit, reviewable narrowing gates confined to genuine ingress/parse boundaries (no `any`, no double-casts).
- **FR-009**: The feature MUST NOT add a new LinkML class or new schema-adherence fixtures (Strategy A is type-level only); the generated artefacts under `shared/schemas/src/generated/` MUST be unchanged by this work.

### Key Entities

- **`SafeFeature` / `SafeGeometry` / `SafeFeatureCollection`** — hand-written, schema-adjacent types in `@debrief/utils`, targeted for removal.
- **`RawGeoJSONFeature` / `RawGeoJSONFeatureCollection`** — LinkML-generated types in `@debrief/schemas`; replacement for the 29 clean/narrowing sites (required geometry, typed coordinate unions) and the derivation source for the permissive type.
- **Derived permissive boundary type** (e.g. `IngressFeature` / `IngressFeatureCollection`) — `Omit`/`&`-derived from `RawGeoJSONFeature` with `geometry` widened to `… | null`; the schema-rooted replacement for the category-(b) shared shape.
- **`BoundsInputFeature`** — existing module-private structural minimum in `shared/utils/src/bounds.ts`; precedent for category-(a) coordinate gaps.

## Assumptions

- **A-1**: Features with `geometry: null` legitimately exist in the domain (SYSTEM_RECORD, STORYBOARD, NarrativeEntry) and must be preserved through every migrated boundary — confirmed by existing null-geometry fixtures referenced in the gap report.
- **A-2**: At parse/MCP/disk boundaries, casting an entire parsed value to the derived collection type carries the same trust level ADR-021 already accepted for `RawGeoJSONFeature` (typed coordinate union); this feature adds **no** new runtime coordinate validation.
- **A-3**: The derived type's typed-union coordinates (rather than `unknown`) are acceptable, because every genuine `coordinates: unknown` read is a category-(a) site handled by a module-private minimum.
- **A-4**: The derived type's canonical home is `@debrief/schemas` (alongside the hand-maintained derivations already in `unions.ts`); the exact name and module are confirmed during `/speckit.plan`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero hand-written *exported* GeoJSON feature types remain in `shared/utils` (and repo-wide), verified by inspection and the regression guard.
- **SC-002**: Full CI (lint, typecheck, unit, Playwright E2E) is green after the migration.
- **SC-003**: The gap report classifies 100% of semantic usage sites, and every GENUINE-GAP entry is independently verifiable. → **delivered**.
- **SC-004**: No `geometry: null` feature is dropped by any migrated boundary (verified by the existing null-geometry fixtures/tests).
- **SC-005**: The derived permissive type and the `messages.ts` DTOs are structurally derived — adding a field to `RawGeoJSONFeature` propagates to them with no manual edit (demonstrable by a type-level check), and neither re-lists the source's fields.
- **SC-006**: No new LinkML class and no new schema-adherence fixtures are added; `git diff` shows `shared/schemas/src/generated/` unchanged.
- **SC-007**: Any new casts are explicit, reviewable narrowing gates confined to genuine ingress/parse boundaries — no `any`, no double-casts (verified by review + lint).
