# Architectural Decisions

Architectural Decision Records (ADRs) with context and trade-offs. Number decisions sequentially.

## Format

Each decision should include:
- Date and ADR number
- Context (why the decision was needed)
- Decision (what was chosen)
- Alternatives considered
- Consequences (trade-offs, implications)
- Evidence link (optional): reference to `specs/[feature]/evidence/` artifacts that validate the decision

---

<!-- Add new entries below this line -->

### ADR-001: Thick Services, Thin Frontends (2025-01-23)

**Context:**
- Building maritime tactical analysis platform with multiple frontends (VS Code, Electron, Jupyter)
- Need consistent behavior across all frontends
- Want to avoid duplicating domain logic

**Decision:**
- Domain logic lives in Python services
- Frontends handle orchestration and display only
- Services exposed via MCP (Model Context Protocol)

**Alternatives Considered:**
- Frontend-heavy architecture → Rejected: code duplication across frontends
- Monolithic app → Rejected: limits flexibility for different use cases

**Consequences:**
- ✅ Single source of truth for domain logic
- ✅ Easy to add new frontends
- ✅ Services testable independently
- ❌ IPC overhead between frontends and services
- ❌ More complex deployment

### ADR-002: Schema-First with LinkML (2025-01-23)

**Context:**
- Need consistent data models across Python and TypeScript
- Multiple services share common data structures
- Want type safety and validation in all languages

**Decision:**
- Use LinkML as master schema language
- Generate Pydantic models, JSON Schema, and TypeScript interfaces
- Run adherence tests before merge

**Alternatives Considered:**
- Pydantic-first → Rejected: TypeScript generation less mature
- Protobuf → Rejected: overkill, less human-readable
- Manual sync → Rejected: drift between languages

**Consequences:**
- ✅ Single source of truth for schemas
- ✅ Type safety in all languages
- ✅ Automatic validation
- ❌ LinkML learning curve
- ❌ Build step for schema generation

### ADR-003: STAC for Plot Storage (2025-01-23)

**Context:**
- Need to store maritime plots with geospatial metadata
- Want searchable catalog of plots
- Require offline-first capability

**Decision:**
- Use STAC (SpatioTemporal Asset Catalog) Items
- GeoJSON payloads for track data
- Local file-based catalog

**Alternatives Considered:**
- Custom JSON format → Rejected: reinventing the wheel
- GeoPackage → Rejected: less flexible for metadata
- Database → Rejected: conflicts with offline-first

**Consequences:**
- ✅ Industry-standard format
- ✅ Rich metadata support
- ✅ Works offline
- ❌ Less familiar to some developers
- ❌ File-based, not queryable like SQL

### ADR-004: Feature Kind Discriminator (2026-01-15)

**Context:**
- GeoJSON `type` field only indicates geometry type, not semantic type
- A `LineString` could be track, annotation, measurement, or sensor arc
- Inferring type by checking for specific fields is fragile

**Decision:**
- Add required `kind` field to `properties` of all GeoJSON Features
- Use `FeatureKindEnum` with values mapping 1:1 to property schemas
- Initial values: `TRACK`, `POINT`

**Alternatives Considered:**
- Geometry-based inference → Rejected: ambiguous, multiple semantic types share geometry
- Check for type-specific fields → Rejected: fragile, no single dispatch point
- Hierarchical category + subtype → Rejected: over-engineered
- Wrapper object → Rejected: breaks GeoJSON conventions

**Consequences:**
- ✅ Single-field dispatch for type handling
- ✅ Schema validation per kind
- ✅ Clear extension point for new feature types
- ❌ Required on all features, no gradual adoption
- ❌ Migration burden for existing data

### ADR-005: Closed-World Tool Matching (2026-01-30)

**Context:**
- Calc tools declare requirements as `SelectionRequirement[]` (kind + min/max counts)
- `checkRequirements()` only validated kinds listed in requirements, ignoring extra kinds
- Result layers, region tools, and mixed selections caused tools to appear active when they couldn't execute
- Three bugs: result layer IDs unresolvable, REGION tools always active, extra kinds silently ignored

**Decision:**
- Closed-world matching: a tool is only active if the selection contains *exactly* the kinds it accepts, in valid quantities
- `checkRequirements()` rejects selections containing kinds not listed in the tool's requirements
- REGION context tools require `kind: "REGION"` explicitly
- `resolveFeatures()` resolves tracks, locations, *and* result layers

**Alternatives Considered:**
- Skip/warn on unknown IDs → Rejected: masks selection errors, tool still runs with partial input
- Filter IDs at execution time → Rejected: tool appears active but silently drops features
- Open-world (ignore extra kinds) → Rejected: caused the bugs in the first place

**Consequences:**
- ✅ Tools only appear when selection exactly matches their input contract
- ✅ No runtime context-type mismatches
- ✅ Result layers are first-class selectable features
- ❌ New feature kinds must be added to tool requirements to be accepted
- ❌ REGION tools inactive until region selection UX is built

### ADR-006: Tool-Provided Undo via Inverse Slug (2026-02-12)

**Context:**
- Move-shape modifies a feature in-place; revert needs to restore the original
- Current approach: orchestrator deep-copies entire features before each operation (activitySnapshots in App.tsx)
- This scales badly — a track with 10,000 positions is ~1MB of JSON cloned every operation
- The orchestrator also needs per-tool knowledge of which tools are "in-place" vs "additive" (`replacesInPlace` flag) — leaky abstraction

**Decision:**
- Tools provide their own undo capability via a lightweight metadata slug returned in the tool result
- The orchestrator stores the slug in the log entry and calls `tool.undo(features, slug)` on revert
- Three undo categories:
  1. **Additive tools** (bounding-box, analysis): undo = remove `generatedFeatureIds`. No slug needed — the orchestrator handles this generically from existing log entry data
  2. **Transform tools** (move-shape): undo = call `tool.undo(currentFeatures, slug)`. E.g. move 5nm @ 45° produces slug `{ distance_nm: 5, direction_deg: 225 }` — a few bytes, and the tool applies the inverse
  3. **Non-undoable tools**: declare themselves as such

**Alternatives Considered:**
- Orchestrator snapshots (full feature deep-copy) → Rejected: O(n) storage per operation where n = feature size; orchestrator needs per-tool revert logic
- Generic diff/patch (JSON Patch) → Rejected: still large for coordinate arrays, no semantic understanding of the operation
- Event sourcing (replay from initial state) → Rejected: expensive for long operation chains, loses tuned intermediate states

**Consequences:**
- ✅ Minimal storage — inverse metadata is typically a few bytes (parameter negation)
- ✅ Tools own their inverse logic — no leaky abstractions in the orchestrator
- ✅ Orchestrator stays generic — stores slug, calls undo, no per-tool branching
- ✅ Additive tools need no new code — existing `generatedFeatureIds` already sufficient
- ❌ Each transform tool must implement an `undo` method
- ❌ Not all transformations are cleanly invertible (e.g. lossy operations like snapping to grid)

### ADR-007: VS Code Webview E2E via code-server + Playwright (2026-02-23)

**Context:**
- Need end-to-end tests that exercise full extension workflows (open file → view tracks → run tool)
- VS Code webviews use a three-layer iframe architecture that is not directly accessible to test frameworks
- code-server (openvscode-server) provides a browser-accessible VS Code, but webview content never renders due to three distinct blockers
- Existing `@vscode/test-web` has no webview DOM access; WebdriverIO is viable but untested

**Decision:**
- Use code-server as the VS Code host for E2E tests, driven by Playwright
- Apply three automated patches via `tests/e2e/scripts/patch-webview.sh`:
  1. Disable service worker in `pre/index.html` (SW conflict blocks `workerReady`)
  2. Comment out CSP meta tag in `pre/index.html` (hash mismatch blocks modified script)
  3. Remove origin hash guard in `workbench.js` (silently drops `webview-ready` message)
- Work around code-server's missing `resolveWebviewView` call via MessagePort interception (`tests/e2e/helpers/webview-injector.ts`)
- Run in headed mode with `xvfb-run` for CI (required for webview iframe creation)
- Use `@sparticuz/chromium` for sandboxed environments where Playwright CDN is blocked

**Alternatives Considered:**
- `@vscode/test-web` → Rejected: no webview DOM access, designed for unit-level extension testing
- WebdriverIO → Viable fallback but not tested; Playwright already in project
- Jupyter test middleware → Good complement for state-only testing, not sufficient for UI flows
- openvscode-server without patches → Rejected: same VS Code webview architecture, same blockers
- Headless Chromium → Rejected: webview iframes not created without headed rendering

**Consequences:**
- ✅ Full DOM access to webview content (Leaflet map, React panels, tools)
- ✅ Real extension bundles tested end-to-end, not mocks
- ✅ Patches are automated and version-pinned to code-server release
- ✅ Two testing tiers: Storybook (component) + code-server (integration)
- ❌ Patches are fragile — tied to code-server internals, may break on upgrades
- ❌ Requires headed Chromium + xvfb-run in CI (heavier than headless)
- ❌ MessagePort injection is a workaround for a code-server bug, not a stable API

### ADR-008: Schema-Validated Tool Inputs and Outputs (2026-02-27)

**Context:**
- ADR-002 established schema-first development: LinkML generates Pydantic models (Python) and TypeScript interfaces
- The TypeScript renderer correctly uses generated types (`import type { TrackFeature, PositionStyle } from '@debrief/schemas'`)
- However, **all 12 calc tools** bypass generated schemas entirely, working with `dict[str, Any]` throughout
- `SelectionContext.features` is typed as `list[dict[str, Any]]` — no schema enforcement at the service boundary
- Tool parameters are validated via hardcoded enum sets that duplicate schema definitions (e.g., `valid_symbols = {"circle", "square", ...}` instead of importing `PointShapeEnum`)
- Tool metadata references schema types by name string only (`param_type="MarkerSymbol"`) with no actual import or validation
- `validate_tool_output()` checks structural GeoJSON validity and provenance, but not property types or field names

**Symptom that exposed this:**
- `apply-symbol-style` tool wrote `style.point.shape` (complete marker styling)
- The TypeScript renderer read from `default_position_style.symbol` (position-level control)
- Both fields exist in the schema for valid reasons, but the tool needed to update both
- Because the tool used raw dict access, no type checker caught the mismatch
- Had the tool validated its output against `TrackProperties`, the missing/inconsistent field would have been caught

**Scope of the problem (audit results):**
- 0 of 12 tools import from `debrief_schemas`
- 0 of 12 tools validate input features against schema models
- 0 of 12 tools validate output features against schema models
- `debrief_calc` has no dependency on `debrief_schemas`
- Every tool that accepts enums (symbol shape, color, direction) hardcodes the valid set
- Property field names are convention-based with no schema cross-reference

**Decision:**
- Tools must validate inputs against generated Pydantic models at the service boundary
- Tools must validate outputs against generated Pydantic models before returning
- `debrief_calc` must depend on `debrief_schemas`
- `SelectionContext.features` should carry typed feature models, not raw dicts
- Tool parameter enums must import from schema-generated enums, not hardcode values
- Validation failures at the boundary are errors, not warnings

**Implementation approach:**
1. Add `debrief_schemas` as a dependency of `debrief_calc`
2. Create a `parse_feature()` utility that dispatches on `kind` and returns the appropriate typed model (e.g., `TrackFeature`, `PointFeature`)
3. Tools receive typed models; internal logic works with validated, typed data
4. Tool outputs are constructed via Pydantic models (or validated against them before return)
5. Executor validates tool output against the declared `output_kind` schema before passing results back
6. Replace hardcoded enum sets with imports from `debrief_schemas` (e.g., `PointShapeEnum`, `NamedColor`)

**Alternatives Considered:**
- Keep raw dicts, add runtime assertions → Rejected: still no type-checker coverage, assertions are just manual schema reimplementation
- Validate only at MCP boundary (entry/exit of the service) → Rejected: tools still work with untyped data internally, same class of bugs possible
- Generate tool-specific input/output types → Rejected: duplicates schema; the schema already defines these types

**Consequences:**
- ✅ Type mismatches between Python tools and TypeScript renderers caught at development time
- ✅ Schema changes automatically surface as validation errors in affected tools
- ✅ Eliminates duplicated enum definitions across tools
- ✅ Enforces ADR-002 (schema-first) through the full stack, not just at the edges
- ✅ Tool authors get IDE autocompletion and type checking on feature properties
- ❌ All existing tools need migration (12 tools)
- ❌ Slight performance cost for Pydantic validation on every tool invocation
- ❌ Tools can no longer add ad-hoc properties without updating the schema first (this is intentional — specs before code)

### ADR-009: TypeScript `module` Setting Rationale (2026-03-20)

**Context:** Four `tsconfig.json` files use different `module` settings: `apps/vscode` uses `ES2022`, all others use `ESNext`. This was flagged as potential inconsistency during the March 2026 technical debt review (#172).

**Decision:** Keep `ES2022` for `apps/vscode` and `ESNext` for all other packages. The difference is intentional:
- **`apps/vscode`** targets the VS Code extension host, which runs in a Node.js environment with a specific ES module baseline. `ES2022` ensures compatibility with the extension host runtime.
- **All other packages** (shared libraries, web-shell, session-state) are bundled by Vite/esbuild/tsup and can use `ESNext` safely since the bundler handles downleveling.

**Alternatives Considered:**
- Align all to `ESNext` → Rejected: may cause runtime issues in the VS Code extension host if top-level await or other later-stage features are emitted.
- Align all to `ES2022` → Rejected: unnecessarily conservative for bundled packages.

**Consequences:**
- ✅ Each package targets the appropriate runtime
- ✅ Documented rationale prevents future cleanup attempts
- ❌ Minor inconsistency in tsconfig files (acceptable given different deployment targets)

**Evidence:** `specs/172-review-technical-debt/evidence/`

### ADR-010: JSON Wire Format Uses snake_case (2026-03-23)

**Context:** Python services write JSON consumed by TypeScript frontends. LinkML schemas define fields in snake_case (Python convention). TypeScript conventionally uses camelCase (JavaScript convention). Without a single enforced convention, data is silently dropped at serialization boundaries — as demonstrated by the provenance data loss incident (see `docs/project_notes/failure-pattern-type-erasure-at-boundaries.md`).

The project already has a pre-existing naming specification: **STAC** (SpatioTemporal Asset Catalogs). STAC uses snake_case throughout (`stac_version`, `stac_extensions`, `start_datetime`, `end_datetime`). GeoJSON properties also follow this convention. Since STAC is the storage backbone (ADR-003) and our JSON files on disk are STAC items, the wire format must align with STAC.

**Decision:** All JSON written to disk or sent over IPC uses **snake_case** keys. This is the wire format convention for the entire project, matching the STAC specification.

Implementation:
1. LinkML schemas define fields in snake_case — this is the source-of-truth naming **and** the wire format
2. Python `model_dump(mode="json")` outputs snake_case natively — no alias configuration needed
3. TypeScript types generated from LinkML already use snake_case field names (in `@debrief/schemas`)
4. TypeScript consumer code (session-state, components) must use the generated types with snake_case field names, not hand-written camelCase interfaces
5. The `normaliseEntry()` snake→camel converter in `timeline.ts` is no longer needed and should be removed — TypeScript reads snake_case directly from the generated types

**Alternatives Considered:**
- camelCase everywhere → Rejected: conflicts with STAC specification (the pre-existing naming standard in the project), requires alias_generator machinery in Pydantic, and means JSON files on disk don't match their governing spec.
- Per-service choice → Rejected: this is exactly the ambiguity that caused the incident.

**Consequences:**
- ✅ Single convention eliminates naming-mismatch bugs at serialization boundaries
- ✅ Aligns with STAC specification — JSON files on disk are valid STAC items
- ✅ Python reads/writes natively — no alias configuration needed
- ✅ Generated TypeScript types already use snake_case — no transformation needed
- ❌ TypeScript developers must use snake_case property access (`entry.activity_id` not `entry.activityId`) — unfamiliar in JS ecosystem but consistent with schema
- ❌ Hand-written TypeScript types in session-state need migration to use generated types or snake_case field names

**Triggered by:** Provenance data loss incident, March 2026

### ADR-011: Type Assertions at Boundaries Require Human Approval (2026-03-23)

**Context:** TypeScript `as` casts and Python `cast()` calls are developer assertions that bypass the type checker. When used at data boundaries (JSON parsing, file I/O, IPC), they create a gap where the compiler assumes type safety that doesn't exist. The provenance data loss incident was caused by `as Record<string, unknown>` masking a naming convention mismatch. Article XV of the Constitution prohibits `any` but does not address type assertions, which are equally dangerous at boundaries.

**Decision:** Loose-type assertions are treated as **expert overrides** that require justification and human review.

Specifically:
1. **Banned patterns** (CI-enforced via ESLint):
   - `as Record<string, unknown>` — type erasure; use a generated type or Zod schema instead
   - `as unknown as T` — double-cast escape hatch; indicates a design problem
   - `JSON.parse(...)` without subsequent validation — must be followed by a schema parse (Zod, type guard, or equivalent)
2. **Restricted patterns** (require `// SAFETY: <justification>` comment and PR review approval):
   - `as T` where `T` is a concrete type — acceptable only when the developer can prove the cast is safe (e.g., narrowing from a validated union)
3. **Python equivalent**: `dict` literals must not duplicate the shape of a generated Pydantic model. If a model exists, use it.

**Alternatives Considered:**
- Ban all `as` casts → Rejected: some are legitimate (e.g., narrowing after a type guard check). The goal is to require justification, not prohibition.
- Rely on code review alone → Rejected: reviewers miss casts in large diffs. CI enforcement catches them consistently.

**Consequences:**
- ✅ Type erasure at boundaries becomes visible and reviewable
- ✅ Developers must justify why they're bypassing the type system
- ✅ Encourages use of generated types and runtime validators (Zod, Pydantic)
- ❌ Legitimate casts require a comment — minor friction
- ❌ New ESLint rules may flag existing code that needs migration

### ADR-012: VesselDomainEnum Placement in common.yaml (2026-04-13)

**Context:**
Feature 181 (LinkML platform overrides) added a `domain` field to both `TrackProperties` in `geojson.yaml` and `PlatformRecord` in `stac-extension.yaml`. Both fields use `VesselDomainEnum` (surface/subsurface/unknown). The enum was previously defined in `stac-extension.yaml`, but `geojson.yaml` does not import `stac-extension.yaml` — and having GeoJSON depend on the STAC extension module is semantically backwards. GeoJSON features are more fundamental than STAC extensions; the dependency should flow from extension to core, not the reverse.

**Decision:**
Move `VesselDomainEnum` from `stac-extension.yaml` to `common.yaml`. The `common.yaml` module is the shared foundation already imported by both `geojson.yaml` and `stac-extension.yaml`, making it the natural home for domain-level classification enums alongside `TrackTypeEnum` and `FeatureKindEnum`.

Note: this decision was documented in 181's research.md and planning post. As of this writing, the enum has not yet been physically moved — it remains in `stac-extension.yaml` with `geojson.yaml` using a direct import. This ADR is the definitive record that the move to `common.yaml` is the intended target state.

**Alternatives Considered:**
- Add `stac-extension` import to `geojson.yaml` → Rejected: creates a backwards semantic dependency where GeoJSON features depend on a STAC extension module.
- Duplicate the enum in both files → Rejected: violates single source of truth (Constitution Article II.1). Two copies would inevitably drift.
- Use a string with pattern constraint instead of enum → Rejected: loses schema-level validation and type safety. Downstream consumers would need to validate domain values themselves, duplicating logic.

**Consequences:**
- ✅ Both `geojson.yaml` and `stac-extension.yaml` can reference the enum through their existing `common.yaml` import
- ✅ Dependency direction is clean: extension modules depend on core, never the reverse
- ✅ Consistent with the placement of other domain-level enums (`TrackTypeEnum`, `FeatureKindEnum`) in `common.yaml`
- ❌ `stac-extension.yaml` gains a `common.yaml` import (minor — consistent with project patterns)
- ❌ Downstream features must import from `common` module rather than `stac-extension` for this enum

**Originating feature:** 181 (LinkML platform overrides), E10 epic (NL-Assisted Catalog Discovery)

### ADR-013: PlatformRecord Is a STAC Extension Entity (2026-04-13)

**Context:**
Feature 181 introduced `PlatformRecord` — a class representing fully-resolved platform metadata (id, name, nationality, vessel_class, vessel_type, vessel_role, domain). This record is produced at save-time by merging platform registry lookups (#180) with analyst-set overrides on `TrackProperties`. The question was where to define this class in the LinkML schema hierarchy: `common.yaml` (shared foundation), `geojson.yaml` (GeoJSON features), or `stac-extension.yaml` (STAC extension properties).

**Decision:**
Define `PlatformRecord` in `stac-extension.yaml`. It is a STAC extension concept — it represents the fully-resolved metadata that appears on STAC items via the `debrief:platforms` array. Both of its consumers (`StacExtensionProperties.platforms` and `StacItemSummary.platforms`) are already defined in `stac-extension.yaml`.

`PlatformRecord` is not a general-purpose domain type. It exists specifically to carry the resolved output of the save-time enrichment pipeline onto STAC items, where it enables compound catalog queries like "British submarines." The GeoJSON `TrackProperties` carries the raw override fields; `PlatformRecord` carries the resolved result.

**Alternatives Considered:**
- Define in `common.yaml` → Rejected: `PlatformRecord` is STAC-specific (resolved metadata on STAC items), not a general-purpose domain type. Placing it in `common.yaml` would blur the boundary between core domain types and extension-specific structures.
- Define in `geojson.yaml` → Rejected: `PlatformRecord` is not a GeoJSON concept. GeoJSON carries per-track override fields; the resolved platform record belongs to the STAC catalog layer.

**Consequences:**
- ✅ Clear separation: `TrackProperties` (GeoJSON) has raw overrides; `PlatformRecord` (STAC extension) has resolved metadata
- ✅ Both consumers are co-located in the same schema module
- ✅ After ADR-012, `stac-extension.yaml` imports `common.yaml`, giving access to `VesselDomainEnum` for the `domain` field
- ❌ Consumers outside the STAC extension layer must import from `stac-extension` types to work with platform records

**Originating feature:** 181 (LinkML platform overrides), E10 epic (NL-Assisted Catalog Discovery)

### ADR-014: Flat Aggregate Fields Removed, Not Retained (2026-04-13)

**Context:**
Prior to feature 181, STAC items carried platform metadata as three flat aggregate arrays: `debrief:vessel_classes` (list of vessel class paths), `debrief:nationalities` (list of ISO country codes), and `debrief:track_names` (list of platform display names). These lists were disconnected — there was no way to associate which nationality belonged to which vessel, making compound queries like "British submarines" impossible.

Feature 181 introduced `debrief:platforms` — an array of `PlatformRecord` objects where each platform carries its own nationality, vessel class, domain, and type as a unit. The question was whether to retain the flat fields alongside `debrief:platforms` during a transition period, or remove them immediately.

The 181 planning post initially proposed keeping flat fields during the transition. This ADR records the revised decision that was actually implemented, which aligns with Constitution Article XIV.

**Decision:**
The flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) are **removed** from both `StacExtensionProperties` and `StacItemSummary`. `debrief:platforms` is the sole mechanism for per-item platform metadata. All existing fixtures and sample data are regenerated to conform to the new structure.

This is a clean break, not a gradual transition. The governing rationale:
- **Article XIV.1** (breaking changes permitted): there are no production users of the pre-release schema — no backward compatibility obligation exists.
- **Article XIV.3** (deprecation rules suspended): no deprecation period is required before v4.0.0.
- **Article XIV.4** (strict on import): maintaining two parallel representations (flat fields + platforms array) would require consumers to accept multiple input formats, which is explicitly prohibited.
- **Article XIV.5** (fix the data, never relax the schema): existing fixtures that use the old flat format must be fixed to conform to the current schema, not preserved alongside new-format fixtures.

**Alternatives Considered:**
- Keep flat fields during transition, remove later → Rejected: creates dual-representation ambiguity with no production users to protect. Every downstream feature (#185 CQL2 array filter, #186 filter bar UI, #188 NL queries) would need to handle both formats. Constitution Article XIV.4 explicitly prohibits accepting multiple input formats.
- Formal deprecation period → Rejected: Constitution Article XIV.3 suspends deprecation rules before v4.0.0. A deprecation period would delay a clean break with no benefit — there are no external consumers.

**Consequences:**
- ✅ Single canonical format eliminates ambiguity about which fields are authoritative
- ✅ Downstream features build against one structure (`debrief:platforms`), not two
- ✅ No tech debt from maintaining parallel representations or planning a future removal
- ✅ Aligns with Constitution Article XIV principles for pre-release development
- ❌ All consumers must migrate atomically in the same feature (see research.md Decision 6 for blast radius: ~15 TypeScript files, ~5 Python files, ~10 test files, ~100 exercise fixtures)
- ❌ Any code searching for flat field names (e.g., `debrief:nationalities`) must be updated

**Originating feature:** 181 (LinkML platform overrides), E10 epic (NL-Assisted Catalog Discovery)

### ADR-015: PlatformRecord Only Requires `id` (2026-04-13)

**Context:**
`PlatformRecord` carries up to seven fields: `id`, `name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, and `domain`. The question was which fields to make required. In practice, a track's `platform_id` may not match any entry in the platform registry (#180), and the analyst may not have set any override fields on the track. This results in a platform record where only the identifier is known.

**Decision:**
Only `id` is required on `PlatformRecord`. All other fields (`name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`) are optional. A record with just `{id: "UNKNOWN_CONTACT"}` is valid.

Sparse records are a natural state in the data lifecycle, not an error condition:
- **Unregistered platform**: A track with `platform_id: "UNKNOWN_CONTACT"` has no registry entry and no analyst overrides. The resulting `PlatformRecord` is `{id: "UNKNOWN_CONTACT"}` — all metadata fields are absent.
- **Partial registry match**: A platform exists in the registry but with incomplete data (e.g., known nationality but unknown vessel class). The record carries what's available.
- **Analyst-enriched**: An analyst has set overrides that fill in the gaps. The record carries both registry-derived and analyst-provided values.

**Alternatives Considered:**
- Require all fields, using sentinel values for unknowns (e.g., `nationality: "XX"`, `vessel_class: "unknown"`) → Rejected: sentinel values corrupt queries. A CQL2 filter for `nationality = 'XX'` would match "explicitly unknown" and "not yet resolved" indistinguishably. Absent fields are semantically distinct from sentinel values.
- Require a minimum set (e.g., `id` + `domain`) → Rejected: `domain` is not always derivable. An unregistered platform with no analyst input has no known domain. Requiring it would force a sentinel value or prevent valid records from being created.

**Consequences:**
- ✅ Accurately models the real-world data lifecycle from unknown contact to fully-resolved platform
- ✅ Downstream consumers can progressively enrich records without structural changes
- ✅ No sentinel values to pollute queries or complicate filter logic
- ✅ CQL2 `array_filter` (#185) can distinguish "field absent" from "field has value" naturally
- ❌ Consumers must handle missing fields (null checks) — cannot assume any field beyond `id` is populated
- ❌ Display code must have fallback rendering for sparse records (e.g., showing just the ID when name is absent)

**Originating feature:** 181 (LinkML platform overrides), E10 epic (NL-Assisted Catalog Discovery)

### ADR-016: Override Field Pattern Constraints (2026-04-13)

**Context:**
Feature 181 added six optional override fields to `TrackProperties` in `geojson.yaml`: `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, and `domain`. These are analyst-set overrides — populated only when someone explicitly provides values that differ from the platform registry (#180). The question was what validation constraints to apply to each field to ensure data quality while remaining compatible with established project conventions.

**Decision:**
Apply the following pattern constraints, reusing existing conventions where they exist:

| Field | Type | Constraint | Rationale |
|-------|------|-----------|-----------|
| `display_name` | string | None | Free-text, any human-readable name |
| `nationality` | string | `^[A-Z]{2}$` | ISO 3166-1 alpha-2, matches existing `nationalities` pattern on `StacExtensionProperties` |
| `vessel_class` | string | `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$` | 1–4 slash-delimited lowercase segments, matches existing `vessel_classes` pattern and the platform registry tree structure (#180) |
| `vessel_type` | string | `^[a-z0-9-]+$` | Leaf segment of vessel class path — single lowercase segment |
| `vessel_role` | string | `^[a-z0-9-]+$` | Parent of leaf segment — single lowercase segment |
| `domain` | VesselDomainEnum | Enum constraint | Reuses existing enum (surface/subsurface/unknown) from `common.yaml` (ADR-012) |

The same constraints apply to the corresponding fields on `PlatformRecord` in `stac-extension.yaml`, ensuring that override values and resolved values are validated identically.

**Alternatives Considered:**
- No pattern constraints (free-text strings) → Rejected: allows invalid data to enter the system. A nationality of "British" instead of "GB" would silently break CQL2 queries that expect ISO codes. Constitution Article XIV.4 mandates strict input validation.
- Stricter constraints (e.g., nationality validated against a known country code list) → Rejected for now: a pattern constraint catches format errors (wrong length, wrong case) without requiring a maintained enumeration of valid country codes. The platform registry (#180) provides the authoritative list at runtime; schema-level validation catches structural violations.
- Derive `vessel_type` and `vessel_role` at runtime instead of storing them → Considered but deferred: these fields provide query convenience. Whether to keep or drop them is a question about query patterns that will be informed by the CQL2 array filter implementation (#185). Recorded as a feedback question in the planning post.

**Consequences:**
- ✅ No new conventions to learn — all patterns reuse existing project conventions
- ✅ Schema-level validation catches format errors before data reaches consumers
- ✅ Consistent constraints between `TrackProperties` overrides and `PlatformRecord` resolved values
- ✅ Compatible with the platform registry tree structure (#180)
- ❌ Pattern constraints cannot validate semantic correctness (e.g., "ZZ" matches `^[A-Z]{2}$` but is not a real country code)
- ❌ `vessel_class` depth limit (4 segments) is a design choice that may need revision if the vessel class taxonomy deepens

**Originating feature:** 181 (LinkML platform overrides), E10 epic (NL-Assisted Catalog Discovery)

### ADR-017: Complete Fixture Regeneration for Schema Changes (2026-04-13)

**Context:**
Feature 181 removed the flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) and replaced them with `debrief:platforms` (ADR-014). This left all existing fixtures in a non-compliant state: 100 exercise STAC items (generated by `shared/schemas/scripts/generate-stac-fixtures.py`), STAC browser validation fixtures (`shared/schemas/fixtures/stac-browser/`), and legacy sample catalog items.

The 181 planning post initially proposed targeted fixtures — adding ~7 new golden fixtures for the new structures without modifying the existing 100-item exercise set (deferring exercise regeneration to #184). This ADR records the revised decision that follows from ADR-014: if flat fields are removed (not retained), existing data must be fixed to conform.

**Decision:**
All existing fixtures are regenerated to use the `debrief:platforms` structure and remove the flat aggregate fields. Additionally, ~7 new golden fixtures are created for the new structures. Specifically:

1. **Exercise fixtures** (100 items): The generation script (`generate-stac-fixtures.py`) is updated to produce `debrief:platforms` format. All 100 exercises are regenerated. No old-format exercises are retained.
2. **STAC browser fixtures**: Existing valid fixtures (`extension-basic.json`, `extension-partial-path.json`, `extension-empty-arrays.json`) are updated to use `platforms` instead of flat fields. Invalid fixtures are updated or repurposed to test new structure constraints.
3. **New golden fixtures** (~7): Cover fully-populated platform records, sparse records (id-only), and invalid values (bad nationality pattern, invalid domain).
4. **Legacy sample catalog** (#184): Regenerated separately in a downstream feature, but the schema and fixture generation tooling established here applies.

This follows directly from ADR-014 (flat field removal) and Constitution Article XIV.5 (fix the data, never relax the schema).

**Alternatives Considered:**
- Targeted fixtures only (add new, don't modify existing) → Rejected: directly contradicts ADR-014. If the flat fields are removed from the schema, existing fixtures that reference them will fail validation. Constitution Article XIV.5 mandates fixing data to conform to the current schema.
- Manual fixture updates → Rejected: the 100 exercise items are script-generated. Manually editing generated files creates maintenance burden and drift risk. Update the script and regenerate.

**Consequences:**
- ✅ All fixtures validate against the current schema — no legacy-format holdouts
- ✅ Test suite runs against the actual data structures that downstream features (#185, #186, #188) will consume
- ✅ Single fixture format eliminates test ambiguity about which structure to assert against
- ✅ Fixture generation script serves as executable documentation of the expected data shape
- ❌ Large diff in a single feature (~100 regenerated JSON files) — mitigated by the fact that these are script-generated, not hand-written
- ❌ Downstream feature #184 (sample catalog regeneration) becomes simpler but still needed for the preview workspace data

**Originating feature:** 181 (LinkML platform overrides), E10 epic (NL-Assisted Catalog Discovery)


---

### ADR-018: Drop Fly.io Demo Hosting, Heroku Review Apps Take Over (2026-04-17)

**Context:**
- The original browser-accessible demo was a single persistent Fly.io app at `https://debrief-demo.fly.dev` — an `linuxserver/webtop:ubuntu-xfce` image running noVNC, built and bundled via `demo/Dockerfile` + `demo/fly.toml` and fed by the `debrief-demo.tar.gz` artifact produced by `.github/workflows/build-demo-artifact.yml`. Portability tests lived in `.github/workflows/test-demo.yml` and probed the Fly URL in 7 layers.
- In parallel, Heroku Review Apps were introduced and matured to the point where each open PR auto-provisions its own preview app at `https://<app>-pr-<n>.herokuapp.com` via `heroku.yml` + `app.json` + `Dockerfile.preview` (Container-stack review environment `debrief-preview`). Preview links are posted back to the PR by a GitHub Actions bot; Playwright against each review app runs via `.github/workflows/heroku-e2e.yml`.
- With two demo paths running side by side, the Fly side accumulated bit-rot: `test-demo.yml` had been red on main for weeks (Fly app unreachable — HTTP 000 from the URL-availability check, `Build Demo Artifact` failing on `npm ci` before #458 and on non-shebang activate scripts before #460).
- Heroku Review Apps solve a better problem (per-PR previews with the reviewer-in-the-loop) than Fly's single persistent demo, at lower cost and without the auto-stop/auto-start UX friction Fly imposed.

**Decision:**
- Retire the Fly.io hosting entirely.
- Delete:
  - `demo/` (all of it — `Dockerfile`, `fly.toml`, `bin/test-url.sh`, `desktop/`, `samples/`, `99-debrief-setup/`). Fly-only infrastructure; nothing outside `specs/**` historical records consumes it.
  - `.github/workflows/build-demo-artifact.yml` — produced the `.tar.gz` consumed only by `demo/Dockerfile`.
  - `.github/workflows/test-demo.yml` — probed only the Fly URL; with per-PR Heroku review apps there is no single production URL to probe. E2E coverage of the deployed preview now lives in `heroku-e2e.yml`.
- Rewrite the "Demo Environment" sections of `CLAUDE.md` and `docs/project_notes/key_facts.md` to document the Heroku path.
- Keep all `specs/**` historical references untouched — they are immutable record of what was shipped at the time.

**Alternatives considered:**
- **Run both in parallel**: rejected — the Fly app has been unreachable for weeks with no user impact, proving the Fly demo is unused. Continuing to maintain a red CI check for a dead system adds noise and erodes "green main" discipline.
- **Archive `demo/` under `.archived/` rather than delete**: rejected — git history is the archive. `demo/` on main carries 7 unrelated files and a Dockerfile that lies about the deployment path if anyone follows it.
- **Keep `test-demo.yml` pointed at a specific Heroku review app**: rejected — review apps are ephemeral, so the URL is not stable. The right pattern is `heroku-e2e.yml`'s manual-dispatch-per-URL model, which already exists.

**Consequences:**
- ✅ Green CI restored — `Build Demo Artifact` and `Test Demo Environment` stop failing on every main merge.
- ✅ One demo path to reason about: Heroku review apps + the existing preview-comment bot.
- ✅ `npm ci`-in-a-pnpm-repo and venv-activate-rewrite fixes (#458, #460) become dead-code cleanups, which is fine — they documented the failure modes in case we ever return to a container-build workflow.
- ❌ If Heroku Review Apps ever become too expensive or are discontinued, we would need to re-provision equivalent infrastructure. The Fly recipe is recoverable from git history at commit `d7c0d56d` (tip of main before this ADR).
- ❌ Anyone who had bookmarked `https://debrief-demo.fly.dev` gets a dead link. Mitigation: the `CLAUDE.md` edit in this change points to the Heroku preview-comment flow as the replacement entry point.

**Reversal recipe (for future archaeology):**
- The last known-good Fly configuration is at commit `d7c0d56d` — `git show d7c0d56d:demo/fly.toml` and `git show d7c0d56d:demo/Dockerfile`.
- The 7-layer test suite is at `d7c0d56d:.github/workflows/test-demo.yml`.
- The artifact builder is at `d7c0d56d:.github/workflows/build-demo-artifact.yml` (with #458 and #460 patches applied, so the `npm ci` → pnpm and activate-script fixes are already baked in if you revive it).
- The Fly app `debrief-demo` itself needs manual teardown via `fly apps destroy debrief-demo` — the workflow-delete does not tear down the running Fly infrastructure.

**Originating issue:** none (driven by red-main CI review after #460 landed)

### ADR-019: Accept Type-Only Cycles in VS Code Extension View↔Service Layer (2026-04-18)

**Context:**
- The VS Code extension contains two `import type`-only cycles between view providers and the services they delegate to:
  - **3-node cycle:** `apps/vscode/src/webview/mapPanel.ts` ↔ `apps/vscode/src/views/activityPanelView.ts` ↔ `apps/vscode/src/services/calcService.ts` ↔ back to `mapPanel.ts`. Specifically, `mapPanel.ts:25` does `import type { ActivityPanelViewProvider } from '../views/activityPanelView'`, `activityPanelView.ts:25` does `import type { CalcService } from '../services/calcService'`, and `calcService.ts:33` does `import type { MapPanel } from '../webview/mapPanel'`.
  - **2-node cycle:** `apps/vscode/src/views/activityPanelView.ts` ↔ `apps/vscode/src/services/resultsPanelService.ts`. Specifically, `activityPanelView.ts:29` does `import type { ResultsPanelService } from '../services/resultsPanelService'` and `resultsPanelService.ts:16` does `import type { ActivityPanelViewProvider } from '../views/activityPanelView'`.
- All edges in both cycles are **type-only** (`import type` declarations). Per the TypeScript handbook, `import type` declarations are erased at the JS-emit step — they leave no runtime require/import edge in the compiled output, so there is no actual runtime module graph cycle and no risk of partially-initialised module objects.
- PR #465 surfaced these cycles during a code-quality review pass. The review concluded they were benign but undocumented, and that an undocumented benign cycle is a footgun: a future contributor sees the cycle, assumes it must be "wrong", and spends time on a refactor that adds churn without value. Documenting the trade-off prevents that.

**Decision:**
- Accept both cycles as-is for now. Do not refactor.
- Document in this ADR (a) the exact module pairs and import-line numbers, (b) the fact that every edge is `import type` only and erased at runtime, and (c) the eventual remediation path so future readers do not have to re-derive it.
- The eventual fix, when one of these layers next gets non-trivial work, is **interface extraction**: define the cross-cutting type contract in a separate, dependency-free module (e.g. `apps/vscode/src/views/types.ts` for the view-provider contract, `apps/vscode/src/services/types.ts` for the service contracts). Both the view and the service then depend on the contract module, removing the back-edge. This is a textbook structural fix and is incrementally applicable — one cycle at a time — so it does not need to land in one PR.

**Alternatives considered:**
- **Refactor now to interface extraction:** rejected — the cycles are runtime-inert, the refactor would touch six files across the most stable part of the extension, and the cleanup item that surfaced them (#199) is explicitly scoped to bundle small, low-risk follow-ups. Lifting interface extraction in this PR would inflate scope and reviewer cost without changing behaviour.
- **Suppress the cycle warning in tooling:** rejected — the cycles are not currently flagged by tsc, ESLint, or knip; nothing needs suppressing. The risk being managed here is human (a contributor refactoring on autopilot), not tooling. An ADR addresses the human risk; a suppression rule does not.
- **Add inline comments at each import line:** rejected — five separate inline notes drift independently and lack the "rationale + remediation" structure of an ADR. One ADR is the correct unit.

**Consequences:**
- ✅ A new contributor encountering either cycle can search `decisions.md` for "cycle" and "type-only" and immediately see (a) which cycles are accepted, (b) why, and (c) what the eventual fix is.
- ✅ The fix path (interface extraction) is named, so a future PR that touches this code can pick it up incrementally without re-litigating the design.
- ✅ Zero runtime change. Zero behaviour change. Zero CI-surface change.
- ❌ If a future PR converts one of these `import type` edges into a runtime `import` (e.g. by needing the imported value rather than just its type), the cycle becomes a real runtime module-graph cycle. This ADR does not protect against that — the protection lives in the absence of such a conversion. A reviewer encountering a value-level import added to one of these files should treat it as an ADR-violation and require interface extraction first.

**Originating issue:** PR #465 code-quality review pass (April 2026) — captured as backlog item #199 and resolved by feature spec `199-code-quality-cleanup`.
