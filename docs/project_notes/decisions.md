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

---

### ADR-020: Drift-prevention guards as ESLint rules — generalised factory, wired meta-check, and grandfathered shell scripts (2026-04-20)

**Context.** Backlog item #214 followed #200's `calculateBounds` consolidation. The SC-001 guarantee from #200 ("exactly one match per symbol, all inside `shared/utils/`") is a point-in-time assertion — without a guard, any future PR could reintroduce a local `bounds.ts` without friction. The scope expanded during `/speckit.review` to cover every `@debrief/*` package (`@debrief/utils`, `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/data`), add a wiring-forgotten meta-check, and wire in the pre-existing but unwired `scripts/check-no-geojson-feature.sh`.

**Decision.** Drift-prevention guards in this monorepo are implemented as parameterised ESLint `no-restricted-syntax` entry generators, wired via spreads in each `apps/*/.eslintrc.cjs`. A single `shared/eslint-rules/drift-rule-factory.cjs` accepts `(packageName, indexPath)` and parses the package's TypeScript barrel (including transitive `export *` walks within the package's own `src/`) to produce the selector entries. Five thin caller modules — one per `@debrief/*` package — invoke the factory and expose `{ rules }`. A plain-Node meta-check script (`scripts/check-eslint-drift-wiring.cjs`, invoked from `task lint`) asserts every `apps/*/.eslintrc.cjs` spreads every caller module; identity comparison ensures the guarantee is structural, not lexical.

The pre-existing `scripts/check-no-geojson-feature.sh` is grandfathered — wired into `task lint` as-is, not rewritten. Its `shared/` + `services/` coverage is strictly broader than the ESLint rules' `apps/*` scope, so it complements rather than duplicates them. A later spec may migrate its logic into the drift-rule factory; that migration is not scheduled.

**Consequences.**
- ✅ Future drift-prevention guards SHOULD be ESLint rules (same pattern); unwired guard scripts are anti-precedent (the grandfathered exception is `check-no-geojson-feature.sh`, now wired).
- ✅ Adding coverage for a sixth `@debrief/*` package is a three-line caller module + one line in `scripts/check-eslint-drift-wiring.cjs`'s `CALLER_MODULES` array + one require + spread per `apps/*/.eslintrc.cjs`.
- ✅ Adding a new export to any `@debrief/*` index barrel automatically extends the guard with zero rule-module edits (FR-010 / SC-004 / SC-011).
- ✅ Adding a new `apps/*` sibling with a `.eslintrc.cjs` is automatically enforced by the meta-check; no edit to the check script is required (FR-017).
- ❌ Pre-existing name-collisions surfaced by the new guard (11 lines across `apps/vscode/src/types/`, `apps/vscode/src/webview/`, `services/session-state/src/types/results.ts`, and `shared/schemas/src/generated/typescript/types.ts`) are suppressed with explicit `// eslint-disable-next-line no-restricted-syntax -- … #214 scope-adjacent` annotations or `// canonical` tags. Follow-up specs will consolidate or rename each.
- ❌ ESLint's `no-restricted-syntax` uses one severity per rule array; to set the drift rules at `'error'` we also elevated the pre-existing `snakeCaseRules` / `TSAsExpression Record | unknown` entries to `'error'`. Twenty pre-existing ADR-010/ADR-011 violations were suppressed inline with `-- pre-existing ADR-010/011, unrelated to #214` notes rather than fixed, since that cleanup is out of scope.

**Originating issue:** Backlog item #214 (follow-up to #200). Spec: `specs/214-utils-drift-guard/`.

---

### ADR-021: Unify parse-boundary GeoJSON Feature types into schema-rooted `RawGeoJSONFeature` (2026-04-21)

**Context.**
Backlog item #204 surfaced three drifted parse-boundary types for
"some GeoJSON Feature, not yet narrowed to a Debrief variant":

1. `interface GeoJSONFeature` in `shared/utils/src/types.ts`
   (`id?: string`, typed-array coordinates, `properties: Record<string, unknown> | null`).
2. `interface GeoJSONFeature` in `services/session-state/src/types/results.ts`
   (`id?: string | number`, `coordinates: unknown`, similar properties shape).
3. `GeoJSONFeature: TypeAlias = dict[str, Any]` (and the matching
   `GeoJSONFeatureCollection` alias) in
   `services/stac/src/debrief_stac/types.py` — an Article XV violation.

No LinkML class described this shape, so every new parse-boundary
consumer (~ 22 TypeScript files + 3 Python files across `apps/vscode`,
`apps/loader`, `apps/web-shell`, `shared/components`, `services/*`)
reached for one of the three drifted copies or invented a fourth local
one. A `SafeFeature as GeoJSONFeature` alias in
`apps/vscode/src/types/import.ts` quietly papered over the divergence
inside the VS Code extension.

**Decision.**
Introduce two schema-rooted classes in a new LinkML submodule
`shared/schemas/src/linkml/raw-geojson.yaml`:

- `RawGeoJSONFeature` — discriminated `type = "Feature"`, optional
  `id: string | integer`, required `geometry` as an `any_of` union
  over the seven existing geometry classes in `geojson.yaml`, optional
  free-form `properties`, optional `bbox`.
- `RawGeoJSONFeatureCollection` — discriminated
  `type = "FeatureCollection"`, `features: RawGeoJSONFeature[]`,
  optional `bbox`.

Supporting infrastructure:
- An in-module `Any` class (`class_uri: linkml:Any`) wraps the LinkML
  idiom for free-form JSON object ranges. The generator post-processor
  maps this to `Optional[dict[str, object]]` in Pydantic and
  `Record<string, unknown> | null` in TypeScript — schema-sourced, NOT
  authored `any`, so Article XV is upheld.
- The pre-existing under-specified `GeoJSONFeature` +
  `GeoJSONGeometry` classes in `session-state.yaml` are deleted;
  `ResultsSlice.result_layers` now ranges over `RawGeoJSONFeature`.
- The schema-adherence fixture set is extended with 12 valid and 5
  invalid fixtures under `shared/schemas/fixtures/raw-geojson/`; a new
  `test_raw_geojson_fixtures.py` exercises round-trip + a 10 000-feature
  Pydantic validation micro-bench (budget ≤ 500 ms; observed ~250 ms).

Migration:
- The two hand-typed TypeScript interfaces are deleted.
- Every consumer imports the new name — directly from `@debrief/schemas`
  where ergonomic, or via an in-package re-export (e.g.
  `services/session-state/src/types/results.ts` re-exports
  `RawGeoJSONFeature as GeoJSONFeature`) where minimising ripple matters.
- The `SafeFeature as GeoJSONFeature` alias in `apps/vscode` is deleted;
  the three VS Code call sites (importRep.ts, ioService.ts, mapPanel.ts)
  now import `SafeFeature` directly — that was always the actual type.
- The grandfathered `scripts/check-no-geojson-feature.sh` regression
  guard (wired into `task lint` by ADR-020 / spec #214) is tightened:
  the `shared/utils/src/types.ts` exclusion is removed (the interface
  there is deleted by #204) and the diagnostic message now points
  readers at `RawGeoJSONFeature` instead of `SafeFeature`.

**Alternatives considered:**

- **Add `RawGeoJSONFeature` alongside the existing thin
  `GeoJSONFeature` class** — rejected. Keeping two near-identical
  "loose Feature" LinkML classes replicates the exact drift this ADR
  exists to eliminate.
- **Make `RawGeoJSONFeature.geometry` nullable** — rejected. Would
  propagate the nullable type through every consumer, forcing
  defensive `if (!f.geometry)` branches everywhere. Reintroduces the
  silent-drop pattern of `mapPanel.ts:1199` at every new site.
- **Add `designates_type: true` to each geometry class's `type` slot
  (review decision 13A)** — proposed by the review phase to make the
  `any_of` a discriminated union with O(1) Pydantic dispatch.
  Evaluated and **deferred**: `gen-pydantic` 1.9.6 emits
  `Literal["GeoJSONPoint"]` (the class name) instead of
  `Literal["Point"]` (the `equals_string` value), breaking every real
  GeoJSON payload. Without the annotation, Pydantic's un-discriminated
  union validation costs ~250 ms for 10 000 features on the CI runner
  — comfortably under the 500 ms budget — so the optimisation is not
  required to meet the spec's perf criterion. Revisit when
  `gen-pydantic` honours `equals_string` alongside `designates_type`.
- **Apply the null-geometry → GeoJSONEmptyPoint coercion at the two
  ingress sites (review decision 5-alt) and delete `mapPanel.ts:1199`
  silent-drop guard (review 14A)** — evaluated and **deferred**. The
  coercion conflicts with the existing `NarrativeEntry` schema, which
  legitimately accepts `geometry == null` and rejects a Point with
  empty coordinates (its geometry range is `GeoJSONPoint` with
  `minimum_cardinality: 2`). Applying the coercion globally at the
  REP-parse or STAC-load boundary regresses three narrative-related
  tests (`test_import_dpf_files`, `test_import_mixed_formats`,
  `test_add_features_null_geometry`). The `_coerce_null_geometry`
  shim is retained in `services/io/src/debrief_io/parser.py` as an
  opt-in utility with unit tests, but is not applied automatically.
  The `mapPanel.ts:1199` guard therefore stays as belt-and-braces;
  removing it requires first widening `NarrativeEntry` to accept
  `GeoJSONEmptyPoint`, which is out of scope for #204. Tracked as a
  follow-up.
- **Refactor `services/stac/src/debrief_stac/types.py` aliases from
  `dict[str, Any]` to `dict[str, object]`** — evaluated and
  **deferred**. The narrower alias produced ten pyright errors in
  `features.py` that would each require a cast or narrowing shim.
  That refactor is not essential to the consolidation goal. A type
  hygiene note has been added in-file pointing at this ADR.

**Consequences:**

- ✅ Exactly zero hand-written `interface GeoJSONFeature` or
  `interface GeoJSONFeatureCollection` declarations exist anywhere
  under `apps/`, `shared/`, or `services/` (grep-verified; the
  `scripts/check-no-geojson-feature.sh` guard now enforces this
  indefinitely).
- ✅ A developer reaching for a "loose GeoJSON Feature type" at a
  parse boundary has exactly one schema-rooted target:
  `import type { RawGeoJSONFeature } from '@debrief/schemas'`. The
  generated TypeScript declaration carries a schema-sourced
  parse-boundary docstring that directs the reader to narrow to
  `DebriefFeature` via the existing type guards in `unions.ts`.
- ✅ `@debrief/schemas` now models the RFC 7946 §3.2 loose-Feature
  shape precisely — discriminated `"Feature"` literal,
  `string | number` id, 7-class geometry union, free-form properties,
  optional bbox. Contrib extensions and future features inherit the
  shape without rediscovering it.
- ✅ 1081 Python tests + 618 session-state tests + 254 utils tests +
  1682 components tests pass unchanged; the migration is structural,
  not behavioural.
- ❌ The two review-phase optimisations (`designates_type: true` for
  discriminated-union perf; ingress `_coerce_null_geometry` for
  silent-drop elimination) are recorded as explicit deferrals above
  — both blocked by generator / schema constraints outside #204's
  control. Either can be revisited independently.
- ❌ `services/stac/src/debrief_stac/types.py` still uses
  `dict[str, Any]` for `GeoJSONFeature` / `GeoJSONFeatureCollection`.
  This is a documented narrowing-refactor out of scope for #204.

**Scope-adjacent decisions locked in by this ADR:**

- The `camelCase` vs `snake_case` drift flagged in
  `services/session-state/src/types/results.ts` is NOT resolved here
  — that is a separate consolidation tracked by backlog #206.
- The `SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` family
  in `@debrief/utils` is left untouched — a different "permissive
  boundary" type family used at MCP/service call sites, with its own
  established usage.
- Contrib-side extensions (`contrib/`) and any consumers outside the
  monorepo SHOULD migrate to `RawGeoJSONFeature` on their next touch;
  this ADR does not mandate a deadline.

**Originating issue:** Backlog item #204 (Tech Debt). Spec:
`specs/204-rawgeojsonfeature-linkml/`.

### ADR-022: Schema-Rooted DisplayMode and PlaybackState — 2026-04-21

**Context.** Two enum-style types were defined twice in TypeScript with drifted
vocabularies: `DisplayMode` as `'full' | 'trail'` (components) vs `'normal' |
'snailTrail'` (session-state); `PlaybackState` as `'playing' | 'paused'`
(components) vs `'stopped' | 'playing' | 'paused'` (session-state). Seven-plus
translation ternaries bridged the two vocabularies at host↔webview and
session-state↔component boundaries, plus one disguised silent-narrowing
translator at `apps/vscode/src/views/timeRangeView.ts:241` that silently
collapsed `'stopped'` → `'paused'` in session-state. `persistence/load.ts`
contained two `as never` bypass casts (lines 117, 123) that silently accepted
any persisted value. LinkML already had enum definitions generating to
Pydantic and TypeScript — `PlaybackStateEnum` with three canonical values;
`DisplayModeEnum` with the legacy `normal|snailTrail` strings — but
`gen-typescript` emitted `TemporalSlice.playbackState` / `.displayMode` as
`string`, defeating narrowing at the read point. See spec in
`specs/205-displaymode-playbackstate-linkml/spec.md`.

**Decision.**

1. Rename `DisplayModeEnum` permissible values from `normal|snailTrail` to
   `full|trail` (aligning LinkML with the visible UI button labels).
2. Keep `PlaybackStateEnum` as `stopped|playing|paused` (already canonical).
3. Extend `shared/schemas/scripts/generate.py` with a template-literal
   post-processor for both enums, matching the Feature 201 / FR-014
   `PointShape` precedent; the post-processor also narrows
   `TemporalSlice.playbackState` / `.displayMode` from `string` to the
   derived template-literal types.
4. Delete four hand-typed declarations:
   - `shared/components/src/utils/types.ts:80` (`DisplayMode`)
   - `shared/components/src/TimeController/types.ts:17` (`PlaybackState`)
   - `services/session-state/src/types/temporal.ts:105` (`PlaybackState`)
   - `services/session-state/src/types/temporal.ts:110` (`DisplayMode`)
5. Delete all translator ternaries and helpers (8 sites across 4 files in
   `apps/vscode/` and `apps/web-shell/`); both sides now speak the canonical
   vocabulary. Delete the silent-narrowing PlaybackState translator at
   `apps/vscode/src/views/timeRangeView.ts:241` (Article I.3 closure — no
   more silent `'stopped'` → `'paused'` collapse).
6. Retype 5 IPC message shapes and 4 callback/method-type declarations
   across `activityPanelView.ts`, `timeRangeView.ts`, and
   `webview/messages.ts` using the schema-rooted `PlaybackState` /
   `DisplayMode` types.
7. Add runtime validation at `services/session-state/src/persistence/load.ts`
   that rejects legacy `'normal'` / `'snailTrail'` values (and any other
   out-of-spec value) with a typed error, returning the existing
   `LoadResult { success: false, error }` shape — no new error class, no
   throw, preserving the module's caller contract. Replace the two
   `as never` casts at lines 117 and 123 with typed setter calls (Article
   XV closure for these two sites; other `as`-style coercions in the same
   file remain out of scope).
8. **Component-side rendering rule — `stopped ≡ paused`.** The component
   layer has historically only known `'playing'` and `'paused'`. After
   this feature widens the component-side `PlaybackState` surface to the
   full three-state vocabulary, the `stopped` state MUST render
   identically to `paused`:
   - `PlaybackControls` shows the play glyph (VS Code icon
     `debug-start`) with `aria-label="Play"` and `title="Play (Space)"`.
   - The play/pause button is **enabled** (so the user can resume).
   - The pause branch is not taken — `isPlaying = playbackState === 'playing'`
     naturally treats `'stopped'` and `'paused'` identically.
   - The `useTimePlayback` animation tick stays inactive (the condition
     `playbackState !== 'playing'` already short-circuits on `'stopped'`),
     so the playhead does not advance.
   - The LinkML schema description for `PlaybackStateEnum` cites this
     ADR for the rendering rule rather than describing UI elements
     directly (Article IV — schema sits beneath services and should not
     name play/pause buttons).
9. Adopt the LinkML-description cross-reference convention
   `See ADR-NN in docs/project_notes/decisions.md` for schema ↔ ADR links,
   validated at lint time by `scripts/check-adr-refs.sh` (the two-digit
   placeholder in the source YAML is the template token; it is replaced
   with the real three-digit ADR number — `ADR-022` — at feature
   implementation time).
10. Add `scripts/check-no-hand-typed-temporal-enums.sh` (following the
    `check-no-geojson-feature.sh` / `#204`/`#214` precedent) to prevent
    reintroduction of hand-typed `type DisplayMode` / `type PlaybackState`
    declarations and legacy-vocabulary translators.

**Consequences.**

- Single schema-rooted vocabulary end to end; no translation logic to
  maintain. `pnpm -r typecheck` passes on a clean tree.
- `DEFAULT_TEMPORAL_SLICE.displayMode` changes from `'normal'` to `'full'`
  — no semantic change (both described "Standard track display" / "full
  track"). Three session-state test assertion sites are migrated in step
  (review 8A).
- Articles I (Defence-Grade Reliability — I.3 silent-failure closure for
  the two uncovered translators), II (Schema Integrity), IV
  (Architectural Boundaries — schema no longer names UI elements), and
  XV (Strict Type Safety — removed the two `as never` bypasses) are all
  strengthened. Article VIII (Documentation) gains a machine-validated
  schema ↔ ADR cross-reference convention.
- No installed base affected (Article XIV pre-release freedom; verified
  no JSON fixtures carry the legacy values).
- CI adds a ~20–30 s regen-idempotency pytest
  (`test_regen_idempotent.py`) that runs per-PR and sandboxes the regen
  in `tmp_path` — local `uv run pytest` NEVER mutates the working-tree
  generated artefacts (R2-4A).
- The `PlaybackControls.test.tsx` unit test fixes the `stopped ≡ paused`
  rendering rule as a red-on-regress pin. A visual story
  (`TimeController.stories.tsx` → `PlaybackStateStoppedEquivPaused`)
  displays the three states side-by-side so a reviewer can see at a
  glance that the first two are indistinguishable.

**Originating issue:** Backlog item #205 (Tech Debt). Spec:
`specs/205-displaymode-playbackstate-linkml/`.

---

### ADR-023: Schema-Rooted `kind` Discriminator on `TimelineEntry` (2026-04-22)

**Context.**

Feature 176 Decision 2A introduced a short-term technique for detecting "manual checkpoint" entries in the LogPanel: the consumer checked whether the tool's visual `ToolCategory` was `'snapshot'` (i.e. `resolveToolCategory(entry.toolName).category === 'snapshot'`). The pattern landed as explicit tech debt — the rule conflates *entry semantics* ("what is this record?") with *visual category* ("how should it look?"). Two concrete failure modes followed:

1. **Export-tool conflation.** `export-png`, `export-csv`, `export-geojson` are listed in `TOOL_ID_TO_CATEGORY` as `'snapshot'` because of their icon / colour grouping. The consumer therefore rendered every export row with the "Manual checkpoint" placeholder and a suppressed duration — plainly wrong.
2. **Manual-checkpoint invisibility.** A record whose `toolName` is literally `manual-checkpoint` is *not* in `TOOL_ID_TO_CATEGORY`, so it resolves to the neutral fallback and renders as a regular tool row — the exact opposite of the intended snapshot rendering.

Backlog item #208 captured the follow-up work, describing the dependency on a "PROV-side signal". Two parallel Claude sessions ran `/speckit.plan` and reached different architectures:

- **PR #508 (UI-projection-only).** Added `kind` to the `TimelineEntry` UI projection type; derived it in the host via `classifyKind(toolName) = resolveToolCategory(toolName).category === 'snapshot' ? 'snapshot' : 'tool'`. Its own `visual-parity.md` proved `kind === 'snapshot'` is identically equal to `ToolCategory === 'snapshot'` as predicates over `toolName`. That rename moved the coupling from the renderer to the populator; it did not remove it. Both failure modes above persisted.
- **PR #507 (schema-rooted, planning-only).** Added an optional `activity_type` enum on the LinkML `LogEntry`, regenerated Pydantic / TypeScript / JSON Schema, projected onto `TimelineEntry.kind`. Rejected all tool-name-matching heuristics in FR-005. Identified the export-tool / manual-checkpoint failure modes as intentional correctness fixes, not collateral damage.

**Decision.**

Adopt the schema-rooted approach. Concretely:

1. Add `ActivityType: 'snapshot' | 'tool' | 'tune'` as a LinkML enum on `LogEntry.activity_type` (optional — existing records remain valid, Article XIV.4 pre-release freedom makes the additive change cheap).
2. Regenerate Pydantic, TypeScript, JSON Schema via the existing `shared/schemas/Makefile generate` pipeline. Post-process the TS output to narrow `activity_type?: string` to `activity_type?: ActivityType` (same pattern as `TemporalSlice` / `RawGeoJSONFeature` — `gen-typescript` flattens enum ranges to `string` at interface fields).
3. VS Code host populates `TimelineEntry.kind` via `kindFromActivityType(entry.activity_type)` — a total, non-throwing, closed-union projection that reads *only* the schema field. No `toolName` reference, no tool-ID literal, no `resolveToolCategory` call in the kind-resolution path.
4. Consumer `LogEntry.tsx` gates on `entry.kind === 'snapshot'`. The `resolveToolCategory` import is removed from this file. `ToolCategoryIcon` retains its internal `resolveToolCategory` call — that path is correctly scoped to *visual* decisions.
5. The two latent-bug failure modes are fixed as direct consequences:
   - An `export-png` row with no `activity_type` renders as a tool row (chips visible, duration visible).
   - A record with `activity_type: 'snapshot'` renders the placeholder, whatever its `toolName`.
6. Two CI-run drift tests lock SC-001 (semantic-gate drift) and SC-005 (projection-purity drift) against reintroduction of the anti-pattern. See `shared/components/src/LogPanel/__tests__/semantic-gate-drift.test.ts` and `apps/vscode/tests/unit/projection-purity.test.ts`.

**Alternatives Considered.**

- **Do nothing / defer.** Leave feature 176 Decision 2A in place. Rejected: conflation is active user-visible behaviour, not just a code-smell — export tools actively misrepresent themselves. Deferring means every new entry-type feature (manual snapshot button, tune markers, manual rationale entries — on the upcoming roadmap) has to either add its own ToolCategory entry or fight the rule per-feature.
- **UI-projection-only `kind` populated by `classifyKind(toolName)` (PR #508).** Rejected: renames the coupling without removing it. `kind === 'snapshot'` would remain identically equal to `ToolCategory === 'snapshot'`, so the export-tool bug persists and the spec claim of "decoupling" is false by construction. Article II (LinkML single source of truth) and the #206 Type Audit explicitly flag hand-typed cross-domain discriminators as candidates for schema promotion — shipping one the day after the audit would be weak.
- **Infer kind from existing fields** (e.g. presence of `tune` annotation; `generated_result_id`). Rejected: every such rule is a heuristic. FR-005 forbids tool-name matching as the kind-resolution signal; derivation from other record fields is equivalently fragile and cannot distinguish cases the schema was designed to express.
- **Replace `ToolCategory` entirely with `ActivityType`.** Rejected: they model different things. `ToolCategory` is the visual grouping (`import`, `style`, `calc`, `filter`, `snapshot`) driving icons / colours; `ActivityType` is the entry semantic (`snapshot`, `tool`, `tune`). Keeping both — with a clean boundary between *how it looks* and *what it is* — is the stable separation.

**Consequences.**

- **Correctness.** Export-tool rows no longer render as manual-checkpoint placeholders. A record explicitly flagged `activity_type: 'snapshot'` renders as a checkpoint regardless of its `toolName` — including the eventual `manual-checkpoint` tool.
- **Contract clarity.** The Pydantic model validates `activity_type` at ingest. Producers that want to emit a checkpoint entry set the field; no heuristic upgrades. Future entry types (manual snapshot button, tune marker, manual rationale) slot in by setting `activity_type`; the discriminator expands with a single, type-checked, compiler-enforced extension point.
- **Backward compat.** `activity_type` is optional. Pre-existing records without the field resolve to `kind: 'tool'` via the projection fallback. No migration needed.
- **Storybook rebaseline (intentional).** Two pre-existing snapshot-demo fixtures (`cat-snapshot`, `edge-snapshot` in `LogPanel.stories.tsx`) that were leaning on the ToolCategory conflation to render as checkpoints now set `kind: 'snapshot'` explicitly. Their rendered appearance is unchanged; the driving signal is correct. No other stories change.
- **Drift guard.** The two source-file-grep drift tests catch any future regression at compile/test time. Article II enforcement becomes a CI check, not a review-time reminder.
- **Supersedes feature 176 Decision 2A.** That decision documented the conflation as explicit tech debt with the expectation that a PROV-side signal would arrive. This ADR closes that loop.

**Originating issue:** Backlog item #208 (Tech Debt). Spec: `specs/208-timeline-entry-kind/`.

**Evidence:**
- `specs/208-timeline-entry-kind/evidence/visual-regression-evidence.md` — pre/post DOM narrative, contrasts with PR #508's misleading `visual-parity.md`.
- `specs/208-timeline-entry-kind/evidence/semantic-gate-grep.txt` — SC-001 transcript.
- `specs/208-timeline-entry-kind/evidence/projection-purity-check.txt` — SC-005 transcript.
- `specs/208-timeline-entry-kind/evidence/round-trip-evidence.md` — Python ↔ JSON schema adherence proof.
- `specs/208-timeline-entry-kind/evidence/test-summary.md` — full CI summary.


### ADR-024: Migrate shared `LLMClient` to `Promise<LiveOutcome>` without deprecation (#191, 2026-04-24)

**Context**: Feature #191 (NL search in VS Code) needed a second consumer of the NL→CQL2 live transport alongside the existing browser demo (#190). Two sharp observations from /speckit.review forced a choice:

1. The #188 `LLMClient` contract was `generate(prompt): Promise<string>` — every failure path flowed as a thrown `LiveTransportAbort` marker that `generateCql2` caught and wrapped. That pattern puts type-unsafe information flow in the critical path: "the error is in err.transportError.reason" is documented, not typed.
2. The second consumer (VS Code extension host) could not usefully re-use the old shape. Its natural output is a classified outcome object, not a string; throwing would cross the webview ↔ host postMessage boundary as a generic error, losing the classification.

**Decision**: Migrate the shared `LLMClient` contract to return a canonical `LiveOutcome` discriminated union. `generate()` NEVER throws on normal failure paths. `LiveTransportAbort` is removed. `apps/nl-demo` (#190) migrates in the same PR; Article XIV (pre-release freedom) permits the breaking change because v4.0.0 has not shipped.

**Alternatives considered**:
- **Keep the string-returning contract, add a sibling `LiveLLMClient` extension that returns outcomes.** Rejected — two contracts, two code paths to maintain, the VS Code side would still need to reshape.
- **Return `Result<string, LiveTransportError>`** (Rust-ish). Rejected — our codebase has no other Result-style surface; introducing one for a single API was inconsistency for inconsistency's sake.
- **Keep the throw but make `LiveTransportAbort` a structured class consumers introspect.** Rejected — throwing is still a non-typed signalling channel. The concrete bug this prevents: any caller who *forgets* to install the catch gets a crash, not a banner.

**Consequences**:
- (+) Single canonical outcome surface across the browser demo and VS Code. `createRecordedLLMClient`, `createPassthroughLLMClient`, `createLiveLLMClient`, `createPostMessageLLMClient`, and `createBadLLMClient` all share one contract.
- (+) `LiveConfig` becomes a clean discriminated union (`transport: "browser-proxy" | "vscode-host"`); the `hasApiKey` presence bool on the VS Code variant lets the webview decide whether to gate without ever seeing the key.
- (-) Outcome-renames touch user-facing `live-config.json` field names. Only impacts the #190 dev loop (gitignored file); documented in `specs/191-vscode-nl-search/evidence/migration-nl-demo-playwright.txt`.
- (-) The provider-call core now exists as parallel `.ts` and `.mjs` siblings (VS Code host is TypeScript-compiled; `apps/nl-demo/scripts/live-proxy.mjs` is pure Node). A future cleanup could unify via tsx/register, but two 220-line files that document their own sync-by-convention policy are less risky than the alternative build-step gymnastics.

**Evidence**:
- `specs/191-vscode-nl-search/evidence/test-summary.md` — migrated liveClient.test.ts, new providerCall.test.ts, new postMessageClient.test.ts, new FilterBar.nl.test.tsx.
- `specs/191-vscode-nl-search/evidence/migration-nl-demo-playwright.txt` — on-the-wire envelope regression tracking.
- `specs/191-vscode-nl-search/contracts/llm-client.ts` — canonical contract.

### ADR-025: Theme Variant Model — Flat Union with First-Class High Contrast (2026-04-25)

**Decision.** Replace the muddled `'light' | 'dark' | 'vscode' | 'system'` `ThemeVariant` union with a flat first-class enumeration:

```ts
type ThemeVariant =
  | 'light'
  | 'dark'
  | 'high-contrast-light'
  | 'high-contrast-dark'
  | 'system';
```

The legacy `'vscode'` value is **retired**. Inside a VS Code webview, the variant resolves to one of the four explicit values via `vsCodeBodyClassSource`, which reads the `vscode-light` / `vscode-dark` / `vscode-high-contrast` / `vscode-high-contrast-light` body class that VS Code applies to every webview.

**Rejected alternatives.**

- **Separate contrast axis.** Modelled as `{ palette: 'light' | 'dark', highContrast: boolean }`. Rejected: a single `data-theme` attribute is simpler than two sources of truth, and components that style themselves with `[data-theme='high-contrast-dark']` don't need to compose two CSS selectors. The `isHighContrast` derived flag is exposed on the `useTheme()` hook for components that genuinely need both axes.
- **CSS-only hook.** Rely on the user's OS preference for `prefers-contrast: more` and let CSS handle everything. Rejected: VS Code does not propagate the OS contrast preference to webviews — the host explicitly chooses a high-contrast theme based on its own settings, and the body-class signal is the only authoritative source for which one is active.
- **Keep `'vscode'` as a synonym for "use VS Code tokens".** Rejected: it carries no information that the four explicit values don't. It also forced a runtime `isVSCodeEnvironment()` check inside `ThemeProvider` whose `getComputedStyle()` fallback produced a false-positive when Storybook injected synthetic `--vscode-*` values; that bug bit twice during the #209 audit.

**Consequences.**

- **Single value, single attribute.** A variant maps 1:1 to a `[data-theme]` attribute and to a key in `VS_CODE_TOKEN_MAP`. Adding a new VS Code theme kind requires extending exactly one table (`bodyClassToVariant` in `vsCodeAdapter.ts`); the structural-parity test at `vsCodeTokenMap.test.ts` enforces every variant covers the same set of `--vscode-*` keys.
- **Contract clarity.** The `ThemeSource` interface (`contracts/theme-source.md`) makes the source of the variant explicit at the boundary: webviews subscribe to `vsCodeBodyClassSource()`, web-shell / Storybook to `mediaQuerySource()`, pinned tests to `staticSource(variant)`. No more scattered `prefers-color-scheme` listeners or computed-style probes.
- **Backward compat.** Pre-release freedom (Constitution Article XIV) permits retiring the `'vscode'` value without a deprecation shim. All call-sites under `shared/components/src/` and `apps/vscode/src/` migrated in a single commit.

**Originating issue:** Backlog item #220 (Tech Debt). Spec: `specs/220-fix-theme-responsiveness/`.

**Evidence:**
- `specs/220-fix-theme-responsiveness/evidence/test-summary.md` — full test transcript across the four variants.
- `specs/220-fix-theme-responsiveness/evidence/screenshots/all-panels-{light,dark,high-contrast-light,high-contrast-dark}.png` — visual consistency proof.
- `specs/220-fix-theme-responsiveness/evidence/screenshots/interaction.gif` — runtime-switch demo.

### ADR-026: Mermaid Diagrams in Shipped Blog Posts via CDN-Loaded Client-Side Renderer (2026-04-26)

**Decision.** Mermaid diagrams in shipped feature blog posts (`debrief.github.io/_posts/`) are rendered client-side by `mermaid@11` loaded from the jsDelivr CDN, wired into the `future-post` Jekyll layout via a Liquid-gated `<script type="module">` block that only fires when the post body contains a `language-mermaid` code class. Authors continue to write standard ` ```mermaid ` fences in `specs/NNN/media/shipped-post.md` — no new authoring syntax. The `/publish` pipeline is unchanged.

**Context.** Mermaid fences have been authored in shipped posts since at least #061 (Feb 2026), but the publishing pipeline took no action on them and the live site currently renders them as `<pre><code>` text (confirmed visually against the #210 post on 2026-04-26). Three viable paths existed: (A1) client-side Mermaid via CDN in the website layout; (A2) same but vendoring the script into the website repo for offline-safety; (B) pre-render to SVG inside `/publish` using `mmdc`. Stock GitHub Pages excludes `jekyll-mermaid` from its plugin allowlist, so a server-side Jekyll plugin was not an option.

**Rejected alternatives.**

- **A2 — vendor `mermaid.min.js` in the website repo.** Originally preferred to satisfy the constitution's offline-by-default principle. Owner clarified the public marketing site is explicitly an online-only surface (the principle applies to *core platform functionality* — services, schemas, file IO — not to the project's website). Vendoring would cost ~600 KB of git history per upgrade for no benefit.
- **B — pre-render to SVG in `/publish`.** Would add a Node + Puppeteer/Chromium dependency to the publish step and require backfill of already-published posts. Worth revisiting only if diagrams later need to appear in non-HTML contexts (RSS feed, PDF export) or the site moves to a custom Actions Jekyll build.
- **Custom Liquid tag (`{% mermaid %}…{% endmermaid %}`).** Rejected: would break GitHub's native preview of the source post and force the technical-specialist agent to learn a new syntax. The whole point of using Mermaid is that ` ```mermaid ` fences render everywhere they're seen.

**Consequences.**

- **Retroactive fix.** All three already-published posts that contain Mermaid fences (#061, #210, plus #217's evidence pages if linked) start rendering as soon as the website-repo PR merges. No backfill needed.
- **Per-page cost is gated.** The Liquid `{% if page.content contains "language-mermaid" %}` guard means non-diagram posts pay zero bytes for mermaid.js. Only diagram-bearing posts trigger the CDN fetch.
- **Authoring guideline updated.** `.claude/agents/media/technical.md` and `docs/CLAUDE-media-agents.md` now state that Mermaid renders both in GitHub previews and on the published site, removing the previous implicit "GitHub-preview-only" framing.
- **CDN is a soft external dependency.** If jsDelivr is blocked or down, diagrams degrade to the pre-existing raw-text fallback — non-fatal and consistent with current behaviour.

**Originating issue:** ad-hoc research spike (no backlog item). Spike: `docs/project_notes/mermaid-in-blog-posts.md`. Branch: `claude/research-mermaid-diagrams-0gl5e`.

**Evidence:**
- `docs/project_notes/mermaid-in-blog-posts.md` — full options analysis and decision rationale.
- `docs/project_notes/mermaid-website-patch/future-post-layout-snippet.html` — exact website-repo patch to apply to `_layouts/future-post.html`.
- `docs/project_notes/mermaid-website-patch/README.md` — application instructions for the website-repo PR.
- Screenshot supplied by owner (2026-04-26) — confirmed `sequenceDiagram` body of #210 post rendering as raw text on live site.
- Implementing PR: [debrief/debrief.github.io#90](https://github.com/debrief/debrief.github.io/pull/90) (submitted 2026-04-26; the patch landed in `_layouts/future-post.html` at end-of-file rather than before `</body>` because the post layout delegates to `_layouts/future-default.html` for the document shell — see implementation notes in the spike doc).
- End-to-end verification (2026-04-26): owner confirmed a freshly-published meta-post drafted from `specs/999-mermaid-blog-rendering/spec.md` renders its embedded `flowchart LR` Mermaid diagram as an SVG on `debrief.github.io`, closing the cycle from author-side fence → kramdown → layout shim → CDN runtime → rendered SVG.
