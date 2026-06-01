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
- End-to-end verification (2026-04-26): owner confirmed a freshly-published meta-post drafted from `specs/239-mermaid-blog-rendering/spec.md` (originally numbered `999`; renumbered 2026-05-01) renders its embedded `flowchart LR` Mermaid diagram as an SVG on `debrief.github.io`, closing the cycle from author-side fence → kramdown → layout shim → CDN runtime → rendered SVG.

### ADR-027: Storyboard edit-suite test seam — callback adapter, not PortContext (#234, 2026-04-27)

**Decision.** Feature 234's "interactive Storybook + shared mock layer" goal is met with a **callback-adapter helper** (`useStoryOnlyMockHandlers(seed, knobs)` returning `{state, dispatch, handlers}`) that the harness + four edit-suite stories spread onto `<StoryboardPanel {...handlers} />`. The previously-planned `PortContext` + `OutboundMessage` discriminated union + production webview rewrite (#234 plan v1) is **not** adopted.

**Context.** Feature 234 plan v1 introduced `PortContext` so `<StoryboardPanel>` would emit typed `OutboundMessage` values via a context-supplied port; production wrapped with `<PortContext.Provider value={acquireVsCodeApi()}>`, harness/stories with `<PortContext.Provider value={mockPort.port}>`. The stated rationale (research R10) was idiomatic-context, prop-drilling avoidance, and a throwing default for "no provider" misuse.

Re-examination of the current code (`apps/vscode/src/webview/web/storyboardPanel.tsx:170-260`) found the panel is **already cleanly presentational**: it declares ~20 callback props; the webview entry translates each callback to `vscode.postMessage(...)`, and the harness translates each callback to `useStoryboardEditReducer().dispatch(...)`. The translation layer is the only repetition; the panel itself emits no postMessage and is reusable in any host.

The `PortContext` proposal would have:

1. Defined a new `OutboundMessage` discriminated union (~20 variants).
2. Pushed `usePanelPort()` into every panel sub-component that today fires a callback (SceneRow, SceneOverflowMenu, StoryboardHeader, the edit form, the toast, …).
3. Rewritten the production webview entry (`apps/vscode/src/webview/web/storyboardPanel.tsx`) to drop ~50 lines of postMessage glue in favour of one provider.
4. Required a smoke E2E pass (T022) as the only regression gate against a wrong port wiring deep in event handlers.

**Decision rationale.**

- **The "prop drilling" objection in research R10 is a strawman.** The current callback props are already prop-drilled — that's the existing idiom. Replacing N callback props with N message variants threaded through `usePanelPort()` is not less drilling; it just relocates the surface.
- **The panel becomes less reusable, not more.** Today it is presentational and composable into any host (Storybook + harness + production). Adding `usePanelPort()` couples it to the existence of a port provider — a non-VS Code consumer would have to fake one.
- **The "shared behavioural layer" goal (FR-003) is independent of the port abstraction.** Whether the helper exposes `port: { postMessage }` or `handlers: {...}` is a representation choice; both produce one source of truth that harness + four stories share.
- **The throwing-default-port argument (Article I.3 — no silent failures) is moot in the callback model.** Missing a callback today produces an immediate React `prop.fn is not a function` at the call site — the same actionable error the throwing default was meant to provide.
- **Risk profile is meaningfully lower.** Callback adapter touches: 1 new helper file (`__testing__/storyOnlyMockHandlers.ts` ≈ 80 LOC), 1 harness refactor, 4 story upgrades. PortContext touched: that plus a new `PortContext.tsx`, panel rewires, every emitter rewires, the production webview entry — gated by a single E2E run. The smaller blast radius is itself a quality.

**Alternatives considered.**

- **`PortContext` + typed `OutboundMessage` (plan v1).** Rejected as above. The architectural abstraction is defensible on its own merits but does not earn its cost as a side-effect of "make four stories interactive." Worth revisiting as a standalone refactor with its own spec if the production webview entry's postMessage glue grows past current scale.
- **Patch `acquireVsCodeApi` at module scope for tests.** Rejected — couples the test seam to a global; not strict-type-safe.
- **Callback adapter inline in each story.** Rejected — duplicates ~80 LOC across four stories; drifts the moment one story adds a knob (the FR-003 violation `PortContext` was meant to prevent, also prevented by a single shared helper).

**Consequences.**

- ✅ Phase 3 estimate drops from "multi-hour, cross-cutting, E2E-gated" to "30–60 min, additive, helper-gated".
- ✅ `<StoryboardPanel>` stays presentational — no architectural debt added.
- ✅ Production code path (`apps/vscode/src/webview/web/storyboardPanel.tsx`) is untouched; existing 2,400+ test baseline from #230 is unchanged.
- ✅ FR-001/-002/-003/-044/-045/-046 all still met. FR-044's ESLint rule still applies — `__testing__/` is still the test-only export surface.
- ⚠️ **Constitution Article XV (Strict Type Safety).** Plan v1 cited Article XV as supporting `PortContext` ("explicit context > module-scope global"). The callback adapter is also strict-typed: each callback prop has an explicit signature, and `useStoryOnlyMockHandlers` returns the same `Pick<StoryboardPanelProps, ...>` surface. Article XV row remains Pass; the supporting note shifts from "explicit context for IO" to "explicit callback-prop surface for IO". Flagged for transparency; no Constitution Check breach.
- ❌ The `PortContext`-shaped audit trail (research R10) is preserved with a "Superseded by R10b" header. Reviewers asking "did you consider a typed message port?" find a written answer rather than silent absence.

**Originating issue:** Feature 234, Phase 3 plan-pivot triggered by review comment 2026-04-27. Spec artefacts revised in the same commit that records this ADR.

**Evidence:**
- `specs/234-storyboard-edit-polish-followup/research.md` R10 (Superseded) + R10b (Adopted).
- `specs/234-storyboard-edit-polish-followup/contracts/harness-knobs.md` §2 (callback-adapter API; §3 PortContext deleted).
- `specs/234-storyboard-edit-polish-followup/data-model.md` §1 (`MockPortKnobs` retained); §4 (`PanelPort`) deleted.
- Code touchpoints baseline: `apps/vscode/src/webview/web/storyboardPanel.tsx:170-260` (read 2026-04-27 to verify current callback architecture); `apps/web-shell/src/StoryboardEditHarness.tsx:117` (existing reducer wiring).

---

### ADR-028: STAC Conformance Profile — adopted standards, retained `debrief:` namespace, target version (#241, 2026-05-02)

**Decision.** Debrief STAC catalogs target **STAC 1.1.0** and adopt the following standard extensions alongside the bespoke `debrief:` namespace:

| Extension | URI | What we use it for | Why standard, not bespoke |
|---|---|---|---|
| **Processing** v1.2.0 | `https://stac-extensions.github.io/processing/v1.2.0/schema.json` | `processing:software`, `processing:datetime` mirroring asset-level `debrief:provenance.tool_version` and `.load_timestamp`. Optional `processing:level`, `processing:facility`, `processing:lineage`. | The canonical lineage extension. STAC Browser / `stac-fields` pretty-print these; bespoke `debrief:provenance.*` is invisible to third-party tooling. |
| **File Info** v2.1.0 | `https://stac-extensions.github.io/file/v2.1.0/schema.json` | `file:size` + `file:checksum` (multihash SHA-256) on every disk-backed asset. | Closes the "no content-hash lineage" gap previously tracked as #219 / informally elsewhere. Stable extension, broad tooling support. |
| **Debrief** v1.0.0 | `https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json` | `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, `debrief:overrides`, `debrief:provenance_log` (item-level audit), `debrief:provenance` (asset-level). | Genuinely Debrief-specific. No standard equivalent for vessel taxonomy, properties-panel edit log, or overrides. |

`debrief:provenance` and `debrief:provenance_log` are **retained** under our namespace. The `processing:*` fields are co-published — same data, two namespaces — to be legible to the STAC ecosystem without losing our richer audit shape. There is no standard provenance extension; the W3C-PROV-aligned STACD proposal (PROPL 2025) is research, not registry-stable.

**Item-level common metadata.** Every Item emits the recommended common-metadata fields:
- `properties.created` (RFC 3339 UTC; preserved across edits)
- `properties.updated` (RFC 3339 UTC; refreshed on every write)
- `properties.license` — SPDX expression or `"other"`. **Never `"proprietary"` or `"various"`** (deprecated in 1.1.0). `"other"` requires a `links[]` entry with `rel: "license"`.
- `properties.providers[]` — at least one entry, `roles` from the standard enum (`licensor`/`producer`/`processor`/`host`).

**Thumbnail/preview convention.** Two visual assets per Item:
- `assets.thumbnail` — 200×150 PNG, `roles: ["thumbnail"]`, `proj:shape: [150, 200]`. STAC Browser keys off this for list/card views.
- `assets.overview` — 800×600 PNG, `roles: ["overview"]`, `proj:shape: [600, 800]`. STAC Browser keys off this for detail-page rendering.

The previous convention (both PNGs at `assets.thumbnail` / `assets.thumbnail-sm`, both with `roles: ["thumbnail"]`) is superseded. Capture pipeline (#174's modern-screenshot + sharp) is unchanged; only the asset key + role labelling moves.

**Collection-level convention.** Every Collection (including the promoted `catalog.json`) emits:
- `stac_version: "1.1.0"`.
- `item_assets` block (new in 1.1 core spec) declaring the asset shape every Item exposes — `features` / `thumbnail` / `overview` / `source`. Self-documents the catalog contract; `stac-browser` renders this in the Collection landing page.
- `license` (SPDX or `"other"`), `providers[]`, plus the existing `summaries` block.
- `summaries` semantics unchanged from #136.

**Self-link href: relative.** STAC 1.1.0 relaxed the "self-link MUST be absolute" guidance from 1.0. Our existing relative `./item.json` and `./catalog.json` self-links are spec-blessed under 1.1 and are retained because they keep catalogs portable across `vscode://`, `file://`, and `http://` mounts without rewriting.

**Custom-namespace policy.** A field belongs under `debrief:` only if (a) no standard STAC extension covers it, AND (b) the field is genuinely Debrief-specific rather than a generic geospatial concept. New requirements that fit a standard extension MUST adopt the standard extension; the `debrief:` namespace is for what the ecosystem doesn't already model.

**Verification.** Conformance is verified two ways:
1. STAC 1.1.0 JSON Schema validation in the schema-adherence test suite — every Item and the Collection MUST pass.
2. Playwright-driven E2E test (delivered by #241) that opens our catalog in `radiantearth/stac-browser` and asserts standard-extension fields render correctly. The test captures three screenshots (`evidence/stac-browser-collection.png`, `.../stac-browser-item.png`, `.../stac-browser-assets.png`) that serve double-duty as blog post artefacts.

**Context.** A 2026-05-02 review (originating in branch `claude/review-stac-architecture-ON3N1`) cross-checked the implementation against the STAC 1.0/1.1 spec, the [STAC Best Practices guide](https://github.com/radiantearth/stac-spec/blob/master/best-practices.md), the official extensions registry, and the `radiantearth/stac-browser` rendering behaviour. The review confirmed the implementation is structurally correct and 1.0-compliant, but identified that ecosystem-standard extensions exist for things we already track (lineage via `processing`, asset integrity via `file`) — and that adopting them was strictly additive to our existing `debrief:` content. ADR-003 chose STAC for plot storage; this ADR refines the conformance profile we target.

**Alternatives considered.**

- **Stay on STAC 1.0.0 indefinitely.** Rejected. 1.1.0 is stable, strictly additive for our use, and unlocks `item_assets` in core (which `radiantearth/stac-browser` renders) plus the formal `"other"` license value. The migration cost is one factory bump + one catalog regeneration.
- **Replace `debrief:provenance` with `processing:*` rather than co-publish.** Rejected. `debrief:provenance` carries `source_path` and is an unambiguous Debrief-internal record; `processing:*` is the ecosystem-legible mirror. Co-publication preserves both audiences without the schema migration cost of removing fields.
- **Adopt the W3C-PROV-aligned STACD extension proposal.** Rejected. STACD is research-stage (PROPL 2025), not in the official extensions registry. Our retained `debrief:provenance_log` already provides W3C-PROV-shaped activity records (activity_id ULIDs, was_generated_by, used) with stronger audit guarantees (immutability, archive rotation) than STACD currently specifies. Re-evaluate if STACD reaches Stable maturity.
- **Make `self`-link absolute (per pre-1.1 guidance).** Rejected. STAC 1.1 relaxes this; our offline-first portable-catalog use case is exactly what the relaxation was meant to allow.
- **Add a STAC API (search/transactions extension).** Out of scope for this ADR. Static catalog conformance is the immediate need; an API is a separate architectural decision.

**Consequences.**

- ✅ Catalog interoperates with `radiantearth/stac-browser`, `pystac`, `stac-fields`, and any other STAC 1.1-compliant client without bespoke adapters.
- ✅ Asset integrity (`file:checksum`) closes a long-noted gap and enables bit-identical-source verification.
- ✅ Lineage (`processing:software`, `processing:datetime`) is now legible to third-party tooling.
- ✅ `created`/`updated`/`license`/`providers` give STAC Browser the metadata it needs to render proper Item cards.
- ✅ `item_assets` self-documents the catalog contract — new contributors see the expected asset shape from the catalog, not from a README.
- ⚠️ `debrief:provenance` and `processing:*` carry duplicated data on every source asset. Tolerable (one extra small object per asset; total <100 bytes), and the duplication is deliberate.
- ⚠️ Adds two new ext URIs to every Item's `stac_extensions[]`. Validation cost is one extra schema fetch per Item at validation time (cached after first fetch).
- ⚠️ Sample-catalog regeneration produces a 73-file diff. Reviewers are warned upfront; the diff is structural, not semantic.
- ❌ Asset-key change (`assets.thumbnail` → `assets.overview` for the 800×600 PNG) is a breaking read-side change for any consumer that hard-codes `thumbnail` for the large variant. Audited consumers updated as part of #241; downstream `contrib/` consumers may need patching.

**Originating issue:** STAC architecture review, 2026-05-02. Implemented by spec #241.

**Evidence:**
- `specs/241-stac-best-practices-upgrade/spec.md` (this ADR's implementation spec).
- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-collection.png`, `.../stac-browser-item.png`, `.../stac-browser-assets.png` (captured by the Playwright test in FR-022 → FR-027).
- Original review session and audit data: branch `claude/review-stac-architecture-ON3N1` (review conversation logs, gap-table baseline of 0/73 conformance on `processing:*`, `file:*`, `created`, `updated`, `providers`).

---

### ADR-029: Persistence-host abstraction — IndexedDB adaptor + Article IV.4 amendment (#236, 2026-05-01)

**Status:** Accepted. Implemented in feature `236-web-shell-stac-writes`.

**Context.**

Pre-ADR-029, the constitution's Article IV.2 ("Frontends never persist") was
read absolutely: every write went through a Node-side service. That reading
was sound when both hosts had a Node process — but the web-shell ships as a
pure static site to GitHub Pages. There is no Node runtime in production.
The pre-existing scene-thumbnail capture path silently lost data on reload
(FR-WEB-029a "Session-only" badge in #215/#235 was the user-visible warning),
and the user's mental model was "I captured a scene, refreshing should not
delete it".

The naive fix — add a Vite middleware POST/PUT/PATCH/DELETE under
`/stac-store/` — works in dev and per-PR Heroku review apps but evaporates
in production GitHub Pages. The original spec for #236 chose that path and
was pivoted at Phase 0 review.

**Decision.**

Introduce a single host-agnostic TypeScript writer interface — `StacWriter`,
in `@debrief/stac-writer` — and have each host implement it against its
native backend:

  - VS Code → `apps/vscode/src/services/stacWriterFs.ts` (Node fs; wraps
    existing `sceneThumbnailService.writeSceneThumbnail` and
    `stacService.updateItemMetadataSync` to preserve the 1700+ LOC test
    corpus by construction).
  - Web-shell → `apps/web-shell/src/services/stacWriterIdb.ts` (IndexedDB,
    `idb`-backed). Bundled catalog items are read-only demo content; user
    writes layer on top as IndexedDB overlays via `mergeOverlay`. New
    items live entirely in IndexedDB.

Article IV is amended with clause **IV.4 Persistence-host abstraction**: the
*interface* is the persistence boundary, not the host process. Browser-native
stores qualify as a persistence backend only when accessed through the
unified writer abstraction. Machine-enforced via the new ESLint rule
`no-direct-persistence-in-frontend` (`shared/eslint-rules/`):

  - `node:fs`/`fs` imports forbidden under `apps/web-shell/**` (test files
    excepted — vitest runs in Node and reads golden fixtures).
  - `indexedDB`, `localStorage`, `sessionStorage`, `caches` globals
    forbidden outside the two host-adaptor files (`stacWriterIdb.ts` and
    `stacWriterCapability.ts`).

**Constitution version bump:** 1.2.0 → 1.3.0 (MINOR — new clause, no breaking
change to existing semantics).

**Consequences.**

- ✅ Web-shell remains a pure static site. Captures persist across reload
  in production (GitHub Pages), not just dev.
- ✅ Both hosts share one operation surface. Future hosts (mobile native,
  OPFS, server-backed) plug in as new adaptors with no other changes.
- ✅ Cross-adaptor parametrised tests (vitest + `fake-indexeddb`) catch
  divergence between the two backends as it lands, rather than at the
  next integration test.
- ⚠️ Two new dependencies added: `idb@^8.0.0` (Promise wrapper around
  IndexedDB, ≈ 5 KB minified gzipped, by Jake Archibald; eight years of
  maintenance, MIT, zero transitive deps) and `fake-indexeddb@^6.0.0`
  (test-only). Both meet Article IX's "minimal, vetted" bar.
- ⚠️ Breaking change is permitted under Article XIV (pre-release). Keys
  carry the database version in their name (`debrief-stac-writer-v1`)
  so the next breaking change is a fresh database, not a migration.

**Alternatives considered.**

- **Vite middleware writes.** Rejected — works in dev only, breaks under
  static deployment. The original Phase 1 plan; pivoted at Phase 0 review.
- **Service worker intercepting `PUT /stac-store/`.** Rejected — service
  worker registration timing and lifecycle complications add ceremony
  for a problem IndexedDB solves directly.
- **OPFS / File System Access API for Phase 1.** Rejected — newer browser
  API, less universal support (Safari). Worth revisiting in Phase 2 if
  IndexedDB blob-storage performance is a bottleneck.
- **Strike Article IV.2 entirely.** Rejected — the principle that frontends
  don't own a divergent write path is sound; only the absolute reading was
  wrong. IV.4 re-anchors IV.2 around interface design, not process boundary.
- **Per-feature exception in Complexity Tracking.** Rejected — three features
  now lean on the host-adaptor pattern (#174, #215/#235, this one); the
  next will too. Constitution is the right home.

**Originating issue:** Feature 236 (`specs/236-web-shell-stac-writes/`).

**Evidence:**
- `specs/236-web-shell-stac-writes/research.md` R-001 (pivot rationale),
  R-002 (interface location), R-009 (ESLint enforcement), R-006 (amendment
  text).
- `specs/236-web-shell-stac-writes/contracts/stac-writer.ts` (normative
  contract for the writer interface).
- `specs/236-web-shell-stac-writes/contracts/indexeddb-schema.md` (schema
  for the four object stores).
- `shared/stac-writer/` workspace package (interface + types + errors +
  overlay merge + path guard).
- `apps/vscode/src/services/stacWriterFs.ts` (Node-fs adaptor).
- `apps/web-shell/src/services/stacWriterIdb.ts` (IndexedDB adaptor).
- `shared/eslint-rules/no-direct-persistence-in-frontend.cjs` (machine
  enforcement; sandbox-violation output captured at
  `specs/236-web-shell-stac-writes/evidence/eslint-enforcement-output.txt`).

### ADR-030: vite-plugin-pwa adoption for Backlog Navigator (#244, 2026-05-03)

**Status:** Accepted (open — to be closed at #244 merge with final wording + linked evidence path).

**Context.** Spec #244 (Backlog Navigator — Full Mobile Parity) requires
the existing Vite-built React app at `apps/backlog-navigator/` to be
installable as a PWA on iOS and Android, with an offline app shell and an
"update available" reload affordance. This is the project's first PWA
surface; the choice of PWA tooling is therefore an architectural precedent.

**Decision.** Adopt `vite-plugin-pwa@^0.20` (which wraps Google Workbox)
as the PWA generator for `apps/backlog-navigator/`. The plugin handles:

1. PWA manifest emission (typed config, validated by a Zod schema at
   `apps/backlog-navigator/src/pwa/manifestSchema.ts` per Article XV).
2. Service-worker generation via Workbox (precaching + runtime caching).
3. The `virtual:pwa-register` module which exposes the update lifecycle
   (`needRefresh`, `offlineReady`) for the in-app `<UpdatePrompt>`.

**Consequences.**

- ✅ Standard solution used by Vue, SvelteKit, and Astro communities;
  Workbox is Google-maintained.
- ✅ Replaces ~200 LoC of hand-rolled Workbox glue + manifest emitter +
  version-detection wiring.
- ✅ Subpath-importing `useIsMobile` from `@debrief/components/hooks/useIsMobile`
  proves the workspace dep can be tree-shaken so the navigator doesn't pick
  up MapView / Leaflet / Vega.
- ⚠️ One new dev-dep: `vite-plugin-pwa@^0.20` (peer-deps `workbox-window`).
  `@lhci/cli` added as a repo-root dev-dep for the Lighthouse PWA gate.
  Both meet Article IX's "minimal, vetted" bar.
- ⚠️ Workbox is pulled into the runtime bundle; budget impact is measured
  in Phase 2 of the implementation per the Issue 4A protocol (see
  `scripts/bundle-baseline-244.json`).

**Alternatives considered.**

- **Hand-rolled SW + manifest.** Rejected — the surface area (precaching,
  runtime caching for GitHub responses, update-detection lifecycle) is
  exactly what Workbox solves. Article IX prefers vetted deps over
  hand-rolling well-understood infrastructure.
- **`@vite-pwa/sveltekit` style alternative for React.** Rejected —
  `vite-plugin-pwa` is the canonical Vite plugin; framework-specific
  wrappers add no value here.

**Originating issue:** Feature 244 (`specs/244-navigator-mobile-pwa/`).

**Evidence (to be filled at merge):**
- `specs/244-navigator-mobile-pwa/contracts/pwa-manifest.md` (manifest contract).
- `specs/244-navigator-mobile-pwa/contracts/service-worker.md` (cache + update protocol).
- `apps/backlog-navigator/vite.config.ts` (VitePWA wiring).
- `apps/backlog-navigator/src/pwa/registerSW.ts` + `UpdatePrompt.tsx`.
- `specs/244-navigator-mobile-pwa/evidence/lighthouse-pwa.html` (Lighthouse PWA score ≥ 90).
- `specs/244-navigator-mobile-pwa/evidence/bundle-baseline-244.json` (final budget + delta).

### Phase-3 deferred ADRs (placeholder, #249)

The cutover PR for spec #249 (Extract `apps/backlog-navigator/` into a
standalone repository) will land two ADR updates that are intentionally
NOT in this Phase 0/1/2 PR:

- **ADR-032 (new)** — Backlog Navigator extraction. Records the
  three-phase shape, the gh-pages + JamesIves/github-pages-deploy-action
  hosting decision (R-003 / FR-011), the destination slug as operator
  input (R-009), the cutover gate (≥7 days green CI), and the
  cross-reference to ADR-030 + ADR-031 (#248 extraction).
- **ADR-030 amendment** — Owner-moved annotation. Appends a closing
  note: "Owner moved to standalone repo `<org>/<repo>` as of #249. PWA
  tooling decision unchanged, executes there now." Status stays unchanged
  (decision is unchanged; only the executing repo moves).

Both ADR updates land in the same cutover PR that deletes
`apps/backlog-navigator/`, removes the three dedicated workflows, and
removes `@lhci/cli` from the root `devDependencies`. This placeholder
exists so a future-me grepping `decisions.md` for `#249` finds the
hand-off path documented even before the cutover PR opens.

Reference: `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`.

---

### ADR-033: Boundary types must be derived, not rewritten — Article IV.5 amendment (#623, 2026-05-13)

> **Numbering note (merge-resolution, 2026-05-14).** Originally drafted as ADR-031, but on `main` ADR-031 is reserved for the #248 spec-navigator extraction and ADR-032 is reserved for the #249 backlog-navigator extraction (both placeholder-referenced from extraction-kit runbooks before this branch merged). Bumped to ADR-033 to avoid the collision; `CLAUDE.md` reference updated to match.

**Status:** Accepted. Constitution amended; CLAUDE.md updated. ESLint rule deferred to a follow-up.

**Context.**

PR #623 fixed a Spec #258 regression where storyboard scene rectangles, captured at the user's current zoom, rendered as ~50px squares instead of filling the captured viewport. Root cause: the host→webview message DTO `SceneRectangleSnapshot` (`apps/vscode/src/webview/messages.ts:198-204`) hand-picked four fields from `SceneProperties` and silently dropped a fifth — `_polygon_source`. When PR #620 added that field to `SceneProperties` (LinkML-generated), the snapshot DTO did not gain it. The webview then synthesised a `SceneFeature` whose `_polygon_source` was always `undefined`, so `pickPolygonForRender` never took the trust-captured-bounds branch and instead recomputed from `(scene.center, current map size)` — which produced tiny polygons mid-layout.

TypeScript could not catch this because the failure mode was **under-declaration**: the boundary type didn't *claim* the field, so the compiler had nothing to enforce. Article XV (Strict Type Safety) addresses missing annotations and `any` leaks, not subset-DTO drift. This was the third instance of the same class of bug in the project — `/speckit.review` had caught earlier cases but the user wants the rule applied at write time, not at review time.

**Decision.**

Amend Constitution Article IV (Architectural Boundaries) with a new clause **IV.5 Boundary types are derived, not rewritten**: any cross-boundary type representing a subset of an existing typed source MUST be expressed structurally (`Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, a generated-schema export, or a schema-derived runtime validator). Hand-rewriting fields by name is forbidden. Where structural derivation is genuinely impossible, the boundary type must carry a compile-time exhaustiveness guard against the source. Mirror the principle in `CLAUDE.md` so every AI session applies it at write time.

The matching ESLint rule is deferred to a follow-up. Two implementation paths considered:

1. **Cheap:** flag interfaces named `*Snapshot`, `*Message`, `*Payload`, `*Dto`, `*Envelope`, `*Response`, `*Request` that lack a `Pick<` / `Omit<` / `extends` reference. Catches the smell with ~30 LoC.
2. **Strict:** custom TS-ESLint rule that resolves the declared type and verifies every field originates from `keyof T` of an imported source type. Higher fidelity, higher build cost.

Sequencing this work behind the constitutional rule lets the rule guide behaviour immediately while the rule's exact scope (which suffixes, which directories) settles through real-world use.

**Constitution version bump:** 1.4 → 1.5 (MINOR — new clause, no breaking change to existing semantics).

**Consequences.**

- ✅ Future under-declared DTO bugs are caught at write time: the author cannot list fields without first stating *which type the fields come from*, so the compiler does the enumeration.
- ✅ Source-type growth (e.g., adding a slot to a LinkML class that backs `SceneProperties`) produces a compile error at every boundary that uses `Pick<...>` of that source — surfacing pick/omit decisions for review rather than dropping the field on the wire.
- ✅ Builds on Article II.1 ("Single source of truth — LinkML schemas") and Article IV.4 (persistence-host abstraction): the schema is canonical, boundary types must reference it.
- ⚠️ No machine enforcement yet — the rule is a written discipline + AI-session-level check until the ESLint rule lands. Mitigated by `CLAUDE.md` integration (every session applies it) and the worked example in this ADR.
- ⚠️ Some boundary types legitimately cannot derive from a single source (e.g., a message that joins data from two unrelated types). For those, the exhaustiveness guard against each source type is the substitute. Ergonomics worth revisiting if many such cases emerge.

**Alternatives considered.**

- **Strengthen Article XV (Strict Type Safety) with the rule.** Rejected — Article XV is about *whether* types are present and concrete. Article IV is about *contracts between components*. The rule belongs with the boundary articles, where it sits next to IV.4 (persistence-host abstraction) which has the same structural-fidelity flavour.
- **Document only in `CLAUDE.md` (not the constitution).** Rejected — the bug recurs in human-authored code as well as AI-authored. Constitutional placement makes it a project-wide standard, not a Claude-specific heuristic.
- **Block on the ESLint rule.** Rejected — the rule's scope is uncertain enough that designing it first slows ship velocity. The written discipline plus Claude integration captures most of the value immediately.

**Worked example (from PR #623):**

```ts
// ❌ Hand-rewritten subset — silent drop when SceneProperties grows
export interface SceneRectangleSnapshot {
  readonly sceneId: string;
  readonly viewport: Viewport;
  readonly timestamp: string;
  readonly polygon: readonly (readonly (readonly [number, number])[])[];
}

// ✅ Structurally derived — Pick forces an explicit pick/omit choice
//    when SceneProperties gains a new field
type ScenePropertyPicks = Pick<
  SceneProperties,
  'id' | 'viewport' | 'timestamp' | '_polygon_source'
>;
export interface SceneRectangleSnapshot extends ScenePropertyPicks {
  readonly polygon: readonly (readonly (readonly [number, number])[])[];
}
```

**Originating issue:** PR #623 (`claude/fix-scene-rectangle-bounds-ZiCot`). Bug fix commit `f719d8f`. Related to Spec #258 (`specs/258-scene-playback-fidelity/`) which introduced the `_polygon_source` slot the DTO dropped.

**Evidence:**
- `CONSTITUTION.md` Article IV clause 5 (the rule).
- `CLAUDE.md` "Governing Principles" → "Boundary types are derived, not rewritten" bullet (AI-session integration).
- PR #623 (worked example + fix).

---

## ADR-NEW (2026-05-19): Time-range Scene schema is additive, no version bump (Spec #263)

**Context.** Spec #263 introduces a second Scene flavour ("time-range") to
the Storyboarding cluster. The new shape adds one sub-record (`TimeRange`)
and one optional slot (`viewport_end`) to `SceneProperties`. The existing
`time_range` slot — a string-typed reserved-null placeholder from #215 —
becomes a real `Optional[TimeRange]`.

**Decision.** The schema evolution lands **additive** under Article XIV
(pre-4.0 freedom): no `schema_version` bump, no migration shim, no reader
gymnastics. Both new slots are optional at the schema layer. Legacy plots
(instant Scenes with `time_range = null` and no `viewport_end`) parse
unchanged. Mixed-presence Scenes are rejected by a layered enforcement
strategy: LinkML rules → JSON Schema `if/then` constraints on the
boundary, plus a `flavourCheck()` function in `validate.ts` at the
application layer.

**Why no version bump.**

- The two new slots are optional. A v1 reader (pre-#263) reading a v3
  schema's instant Scene sees no new keys.
- The XOR cross-field rule means a v1 reader receiving a time-range
  Scene from a newer writer would see an unfamiliar `time_range`
  object — but the schema-version field already exists (`schema_version
  >= 2` since #259), and any v1 reader would be running pre-#259 code,
  which the existing `UnsupportedSchemaVersionError` already rejects.
- Article XIV explicitly authorises additive evolution without ceremony
  pre-4.0.

**Alternative considered.** Two distinct classes (`InstantScene` +
`TimeRangeScene`) with a discriminator field, rather than a single
`SceneProperties` class with the cross-field XOR. Rejected because the
renaming cost across every consumer (CRUD, validate, ordering, playback,
panel, briefing-renderer-to-be) was disproportionate to a two-line XOR
rule. Tracked as a future v3 schema cycle item (#269 in BACKLOG.md) for
when a third Scene flavour arrives.

**Layered cross-field enforcement (related decision).** LinkML 1.7's
`rules:` block lowers cleanly to JSON Schema `if/then` constraints, but
does **not** generate Pydantic `model_validator` functions. The XOR and
range-validity rules therefore live in:

1. The LinkML source (one place — declarative).
2. The generated JSON Schema (mechanical, enforced on serialisation
   boundaries).
3. A hand-written `flavourCheck()` in `shared/components/src/storyboard/
   validate.ts` (enforced at the application boundary; called from
   `validatePlot` and from `createScene`).

Pydantic adherence tests pin this division explicitly: the Pydantic layer
is structural-only for these slots; the application layer carries the
cross-field semantics. A future LinkML upgrade that DOES generate
validators would surface as a test diff.

**RAF lock-step interpolation primitive.** As part of the same feature we
also adopt a "single RAF loop drives both axes" rule for time-range
playback. The `TimeRangeTween` primitive in
`shared/components/src/storyboardPlayback/` computes a single normalised
progress `p ∈ [0, 1]` from elapsed wall-clock time, then on every frame
applies `setCurrentTime(lerp(t_start, t_end, p))` **before**
`flyToViewport(blendedViewport, 0)`. The per-frame `flyToViewport` is
called with `durationMs = 0` (the documented snap path) so Leaflet's own
pan/zoom tween — which has its own clock — does not run alongside ours
and drift the two axes apart. Reverse playback reuses the same primitive
with the schedule reversed; abort sets a cancelled flag the next tick
honours; the `done` Promise resolves with the last-written `(epoch,
viewport)` pair so the engine can emit a coherent snapshot whether the
tween completed naturally or was cancelled.

**Provenance.** Spec `specs/263-time-range-scenes/` (data-model.md §3 and
§5 — review note 2A; research.md R8). Evidence:
`specs/263-time-range-scenes/evidence/round-trip-evidence.md` and the
`TimeRangeTween` test suite at
`shared/components/src/storyboardPlayback/__tests__/timeRangeTween.test.ts`.

---

## ADR-NEW (2026-05-20): Air-gapped briefing ships as a standalone file://-loadable SPA (Spec #264)

**Context.** The Storyboarding feature line (#215–#218, #258, #263)
produces in-application Storyboards. Recipients downstream of an analyst
— customers, training audiences, after-action reviewers — often lack
Debrief installs and may be working on disconnected networks. They need
to *watch* a Storyboard, not author one. The question for #264 was the
artefact format.

**Decision.** Ship the briefing as a self-contained zip whose root
`index.html` boots a bundled React + Leaflet SPA from a `file://`
origin in current Chrome or Edge on desktop. The zip carries the SPA,
a scoped `features.geojson` (one Storyboard's Scenes + the features
they reference), an `item.json` subset, pre-fetched basemap tiles, and
Scene thumbnails. All paths inside the zip are relative; no runtime
network requests are issued.

**Alternatives considered.**

1. **Printable PDF.** Captures the Scene grid at export time. Rejected:
   loses every motion-bearing dimension (per-Scene viewport tweens, the
   simultaneous viewport + time-slider scrub from #263), and any
   time-driven layer movement. The whole *briefing* value is the
   playback, not the still frames.

2. **MP4 / GIF screen recording.** Captures playback as video. Rejected
   here for #264 — there's no scrub, no Scene-by-Scene step, no Present
   ↔ Minimal toggle, and the recipient can't pause on a moment of
   interest to talk through it. (Video export is tracked as #265 — a
   research spike — not a substitute.)

3. **Hosted briefing on a server (with auth).** Easy delivery via URL
   share. Rejected: violates Article I (offline by default) and
   Article III.4 (data stays local), and assumes the recipient has
   network access at briefing time — the most common reason to need a
   briefing artefact is precisely that they *don't*.

**Consequences.**

- ✅ Recipients can play the briefing on a memory-stick handoff, on an
  air-gapped machine, with no install. SC-001 verifies this end-to-end.
- ✅ The SPA reuses the host-agnostic playback primitive from #263
  (`runTimeRangeTween`) verbatim — the briefing's lock-step scrub
  matches the authoring environment frame-for-frame (SC-003).
- ✅ The zip is a deliverable artefact, not application state — the
  CSV-export precedent from #178 applies; Article IV.4 (writer
  abstraction) does not cover one-shot artefact exports.
- ❌ The SPA is restricted to current Chrome and Edge on desktop. The
  `file://` origin doesn't permit the same fetch-from-relative-path
  behaviour in Firefox / Safari / mobile browsers. A boot-time browser
  probe surfaces a banner for unsupported browsers (no silent failure —
  Article I.3).
- ❌ Zip size grows with tile coverage. Typical 5–20 MB; outliers cap
  around 50 MB given the integer-zoom-only policy (research.md R2).
  PMTiles is the natural follow-up if size becomes a transport problem
  (tracked as #272).
- ❌ The bundled SPA pins React + Leaflet + Zustand versions at zip
  creation time. Recipients receive a forever-snapshot of the renderer;
  bug fixes require a re-export. Acceptable because the renderer is
  the deliverable, not application state.

**Why "file:// in current Chrome / Edge" specifically.** Decision 3C
during `/speckit.review` narrowed an earlier four-browser matrix
(Chrome, Edge, Firefox, Safari) to two. The narrowing trades platform
breadth for a single, testable loading contract — every supported
browser uses the same inline-`<script type="application/json">` boot
path. Firefox's stricter `file://`-origin sibling-loading rules and
Safari's preference for served HTML would have required two additional
loader paths and three Playwright matrices. Out of scope for v1; an
unsupported-browser banner directs those users to the supported set.

**Why a SPA-local playback driver instead of hoisting `StoryboardPlaybackService`.**
The plan's T-HOIST step (relocate the 983-line `StoryboardPlaybackService`
from `apps/vscode/` to `shared/components/`) would clean up an
inheritance the briefing renderer should share with the authoring
environment. But the existing service is tightly coupled to
`vscode.Event` and `vscode.workspace.fs` — the hoist is a careful
refactor in its own right and was at high risk of breaking the
authoring extension if rushed.

For #264 we wrote a SPA-local driver
(`apps/briefing-renderer/src/playback/playbackDriver.ts`) that:

- Composes the host-agnostic `runTimeRangeTween` primitive from #263
  directly (the bit the briefing actually needs).
- Wires four small browser port adapters
  (`BrowserMapAdapter`, `LocalSessionStoreAdapter`,
  `BrowserPanelViewAdapter`, `BrowserTimeRangeViewAdapter`).
- Surfaces a "playback halted" state on any adapter throw or tween
  rejection (Article I.3 — no silent failures).

This driver is ~150 lines, deliberately narrower than the authoring
service (no CRUD, no missing-data flow, no panel snapshots). When
T-HOIST lands as a follow-up, the briefing renderer can swap in the
shared service and delete the local driver.

**Provenance.** Spec `specs/264-briefing-zip-renderer/`. Plan + contract:
`specs/264-briefing-zip-renderer/plan.md`,
`specs/264-briefing-zip-renderer/contracts/{export-command,spa-loading,tile-coverage}.md`.
Evidence: `specs/264-briefing-zip-renderer/evidence/`.

---

### ADR-034: Retire the `.debrief-session` sidecar — all plot state lives in `features.geojson` (#249 / spec 261, 2026-05-28)

**Context.** A plot was materialised on disk as three files: `item.json` (STAC
metadata), `features.geojson` (the portable FeatureCollection), and
`item.debrief-session` (a sidecar written by `services/session-state` carrying
the Zustand store's temporal / spatial / selection / visibility slices). The
sidecar violated Constitution Article II.1 (single source of truth): a plot's
state was split across two files, only one of which travelled with the plot.
Open a colleague's plot without its sidecar — email, STAC catalog, git, USB —
and you landed on default view/time/selection.

**Decision.** Delete the sidecar. Every field it carried is reclassified into
one of three homes:

- **Plot state** → a `SystemState` Feature inside `features.geojson`
  (`state.spatial` / `state.temporal` / `state.selection` /
  `state.activestoryboard`), the #237 pattern generalised to all four variants.
- **Per-feature state** → `properties.visible` on the individual feature
  (absent/`true` ⇒ visible; `false` ⇒ hidden) — replacing the sidecar's
  `hiddenFeatureIds` denylist.
- **Ephemeral runtime** → not persisted; defaulted on load (`playbackState`,
  `drawingMode`, `viewportLocked`, `styleVersion`, `selection.timestamp`,
  `featureCollectionUri`).

A plot is now **exactly two files** (`item.json` + `features.geojson`, plus
thumbnail assets), and the entire interactive state is reconstructable from
`features.geojson` alone. A single pure helper in `@debrief/session-state`
(`system-state/`) is the sole producer/consumer of SystemState read/write for
both hosts; a host-agnostic store-bridge translates store↔FeatureCollection.
The package-level sidecar I/O (`saveSession`/`loadSession`/`extractPersistentState`/
`serializeState`/`parseSessionJson` + the `SessionFile` version machinery) is
deleted with no legacy read shim (Article XIV — pre-release breaking change).

**Trade-offs.** Provenance growth from frequent hide/reveal toggles is accepted
(bounded to *saved* states; compaction is a follow-up). Strict-on-import:
malformed / duplicate-`state_type` / cross-field-invariant SystemState features
fail load loudly with the offending feature id, rather than a tolerant fallback
(Article XIV.4; the out-of-window `current_time` policy is revisitable as #267).

**Provenance.** Spec `specs/261-session-state-systemstate/`. Evidence:
`specs/261-session-state-systemstate/evidence/` (round-trip screenshots, the
self-describing `features-after.json`, the two-file dir listings).

---

### ADR-035: Per-feature visibility as a `visible` flag on `BaseFeatureProperties` (#249 / spec 261, 2026-05-28)

**Context.** The sidecar stored hidden features as a `hiddenFeatureIds`
denylist on the session store — a parallel structure that did not travel with
the plot and could go stale against a renamed/deleted feature.

**Decision.** Add an optional `visible: boolean` to the shared
`BaseFeatureProperties` LinkML class, so every concrete feature-properties type
inherits it. Absent or `true` means visible; `false` means hidden. Visibility
now travels *with the feature* inside `features.geojson` and round-trips for
free. Visibility transitions append a `LogEntry` to the affected feature's own
provenance via the existing `LogService` (Article III.1) — the pure helper never
writes provenance for the `state.*` view-state features themselves (they are
current-state markers, FR-013). The web-shell already modelled visibility this
way (`properties.visible`); this decision makes it the schema-blessed, cross-host
home and removes the sidecar denylist.

**Provenance.** Spec `specs/261-session-state-systemstate/`,
`contracts/linkml-delta.md` §1.

---

### ADR-036: Consolidate shared value types into `common.yaml`; active_storyboard stays tolerant via `@debrief/components` (#249 / spec 261, 2026-05-28)

**Context (a) — value-type duplication.** `ViewportPolygon`, the `Coordinate`
lng/lat class, `TimeStep`/`TimeUnitEnum`, `DisplayModeEnum`, `PlaybackStateEnum`,
and the `TimeInstant`/`TimeRange`/`TimeFilter` types lived in `session-state.yaml`
(with `DisplayModeEnum` also duplicated in `storyboard.yaml` and a scalar
`Coordinate` *type* shadowed in `common.yaml`). `geojson.yaml`'s
`SystemStateProperties` could not reference them as authored, and the JSON Schema
build (`debrief-jsonschema.yaml`) deliberately excluded `session-state.yaml`.

**Decision (a).** Move these value types into `common.yaml` as their single
definition (it is imported by every cluster, including the JSON Schema build),
delete the duplicates, and remove the dead scalar `Coordinate` type. Generated
symbol names are unchanged (the master `debrief.yaml` already imports every
cluster), so this pays down an Article II.1 duplication with no consumer churn.
The long-feared `gen-json-schema` multivalued-`Coordinate`-range bug did **not**
resurface — `SystemState.schema.json` is correct and no post-processor was
needed (FR-006a closed).

**Context (b) — active_storyboard.** FR-015 asked for one shared helper to own
all four SystemState variants, folding #237's host-private web-shell writer in.
But `@debrief/components` (which owns the tolerant `get/setActiveStoryboardSelection`
used by storyboard playback) depends on `@debrief/session-state`, so the helper
cannot import it (cycle); and the strict helper reader throws on
duplicate/malformed features, whereas the web-shell reads active_storyboard on
*every* edit and must stay tolerant.

**Decision (b).** The `@debrief/session-state` helper owns the three migrated
variants (spatial/temporal/selection) + per-feature visibility + the unified
*load-time* read of all four variants, and implements `active_storyboard` with
the identical #237 wire shape (NG-002) for that read and for VS Code parity. The
web-shell's *interactive* active_storyboard read/write deliberately keeps
delegating to the shared `@debrief/components` helpers (R-011) — those are shared
logic, not a host-private re-implementation of the SystemState shape. No host
re-implements the wire shape; the single-source goal holds for every variant
that 261 migrates.

**Provenance.** Spec `specs/261-session-state-systemstate/`,
`contracts/linkml-delta.md` §2, research-notes/active-storyboard-call-sites.md.

---

### ADR-037: Live storyboard preview — renderer dual-boot path + VS Code loopback server (#273, 2026-05-27)

**Status:** Accepted.

**Context.** The briefing renderer (#264) booted exactly one way: from JSON
inlined into its `index.html` at zip-export time, read synchronously before
first paint. That path is deliberately air-gapped — a distributed briefing zip
plays back offline with zero network requests. Spec #273 adds a **live
Preview** button (both VS Code and web-shell) that opens the renderer in a new
browser tab, loaded from the *current* plot's storyboard with no zip-packing
step. An external browser tab cannot read `vscode-webview-resource:` URIs, so a
reachable URL is required, and the air-gapped offline guarantee must not
regress.

**Decision.**

1. **Renderer gains a second, additive boot path.** When the launch URL carries
   `?features=<url>`, the renderer enters an async `loading → ready/error`
   lifecycle: `fetch` the URL, validate with the **existing** boundary
   validators (one storyboard, scene ordering), seed the **unchanged** store.
   When `?features` is absent, the synchronous inline path runs exactly as
   before. The two paths share validators + `store.seed()` but never each
   other's I/O — the inline path imports no `fetch`, so the offline zip path
   provably issues zero network requests for storyboard data (test-guarded). An
   optional renderer-local `BriefingConfig.tileLayerUrl` selects an online
   basemap for preview; the inline/zip path leaves it unset and keeps its
   bundled local tiles (byte-identical to pre-#273). This is a renderer-local
   TS field, **not** a LinkML/schema change.

2. **VS Code serves preview via an ephemeral loopback HTTP server.**
   `BriefingPreviewServer` (pure Node, no `vscode` import) binds `127.0.0.1` on
   an OS-assigned port, serves the bundled renderer at `/` and the active
   storyboard's scoped features at `/features.geojson`. The extension opens the
   system browser via `openExternal(await asExternalUri(...))` so the URL is
   correct under Remote/Codespaces tunnels and works fully offline. One shared
   lazily-started instance, disposed on deactivation; read-only serving only.

   **Security — DNS-rebinding defence (C-B7).** Binding loopback blocks remote
   network access but *not* DNS rebinding, where a malicious page resolves an
   attacker-controlled domain to `127.0.0.1` and reaches the server from its own
   origin — arriving as an ordinary local request carrying a *foreign* `Host`
   header. The server enforces a **`Host` allowlist**: loopback names
   (`127.0.0.1`/`localhost`/`[::1]`) are served; foreign hosts get `403`. With
   the ephemeral lifetime, OS-assigned port, and read-only scope, this closes
   the loopback attack surface (Article X).

   **Tunnel exception (amended 2026-06-01).** Under a Remote/Codespaces/
   code-server tunnel, `asExternalUri` rewrites the loopback to a *public* host
   (e.g. `<app>.herokuapp.com/proxy/<port>/`) and the proxy forwards that
   foreign `Host` to the server — which the strict allowlist `403`ed, so the
   Preview tab showed a bare **"Forbidden"** under Heroku code-server. The
   command now registers the `asExternalUri` host via `trustExternalHost`, and
   the server additionally accepts it. This does not weaken the defence: in a
   tunnel the server is bound to the *remote* host's loopback, reachable only
   through the authenticated tunnel, so a browser cannot reach it by rebinding
   (rebinding hits the *browser machine's* loopback, not the container's). The
   non-tunneled local case registers nothing and keeps the strict allowlist.

   Two related proxy-path issues were fixed in the same pass: (a) the launch
   URL's `features` value is now **relative** (`?features=features.geojson`)
   so it resolves under the proxy path-prefix (`/proxy/<port>/`) instead of
   escaping to the proxy root; and (b) code-server's `asExternalUri` rewrite
   **drops the query string** entirely, so the preview server now also injects
   the features location into the served `index.html` as a global
   (`window.__BRIEFING_PREVIEW_FEATURES__`), which the renderer reads (via
   `resolveFeaturesUrl`) when `?features` is absent. Without (b) the renderer
   loaded but played its dev fixture instead of the active storyboard. See
   `bugs.md` 2026-06-01.

3. **Web-shell hands off via a same-origin blob URL.** Web-shell scopes the
   active storyboard, builds a `Blob`, and opens the renderer (served
   same-origin under `/briefing-renderer/`) at `?features=<blobUrl>` in a reused
   named tab. No server needed — one code path across dev, `vite preview`, and
   the static Pages build.

4. **Packing core extracted to `@debrief/briefing-export`.** The pure
   briefing-zip core moved out of `apps/vscode` into a shared package so both
   hosts share one implementation and cannot drift (FR-016). VS Code keeps its
   filesystem/save-dialog host adapter; the package is browser-safe (JSZip is
   the only zip lib, already present — no new dependency).

**Alternatives rejected.** Merging the two boot paths into one loader (pollutes
the proven sync path, risks the air-gap); a webview instead of an external tab
(the user chose a new tab; a webview also can't host the renderer offline
without similar plumbing); a `file://` temp page with inlined data (that *is*
the zip path in disguise — a packing step, contradicting "live URL, no zip").

**Consequences.** One novel pattern (a local HTTP server in the extension),
scoped tightly: loopback-only, ephemeral, read-only, `Host`-allowlisted. The
offline distribution path is unchanged and test-guarded.

**Provenance.** Spec `specs/273-storyboard-preview-button/`. Plan + contracts:
`specs/273-storyboard-preview-button/plan.md`,
`specs/273-storyboard-preview-button/contracts/{preview-boot,host-integration}.md`.
Evidence: `specs/273-storyboard-preview-button/evidence/`.

---

### ADR-038: Canonical feature identity is the top-level GeoJSON `id`; unchecked inline-object casts are banned (#273, 2026-05-28)

**Status:** Accepted.

**Context.** While capturing live-preview evidence for #273 the preview map
came up *empty* — no vessel tracks. Root cause: the storyboard capture/edit
pipeline (#216/#217) recorded each scene's `visible_feature_ids` by reading
`feature.properties.id`. But the LinkML schema places `id` as `required: true`
at the **top level** of every feature class (TrackFeature, ReferenceLocation,
MultiPoint/MultiPolygon, SystemState, Scene, Storyboard); `properties.id`
exists *only* on `SceneProperties`/`StoryboardProperties`. Data-feature
properties derive from `BaseFeatureProperties`, which has **no `id`**. REP
import (`services/io/.../rep.py`), feature selection, `hiddenFeatureIds`,
`scopeStoryboard`, and the briefing renderer all key on the top-level `id`.
So for real tracks `properties.id` was `undefined`, scenes recorded an empty
visibility set, and `scopeStoryboard` dropped every track from the
exported/previewed briefing. The shipped VS Code zip export had the same latent
hole.

**Why strong typing didn't catch it.** The capture sites iterated the
deliberately-loose `PlotFeature` boundary type, whose `properties` carries an
index signature (`{ kind?: string; [k: string]: unknown }`), then cast it
(`feature.properties as { id?: string | number | null }`). The index signature
makes `.id` type-check as `unknown`; the cast fabricates a field the schema
never defines. An unchecked assertion is precisely where the type checker stops
helping — a direct miss against Article IV.5 (derive boundary types) and
Article XV.7 (type assertions are expert overrides). The repo already ships the
correctly-derived `DebriefFeature` union + guards (`@debrief/schemas/unions.ts`,
#173) that would have made `track.properties.id` a compile error.

**Decision.**

1. **Canonical feature identity is the top-level GeoJSON `id`.** Not
   `properties.id`. Scene/Storyboard features keep their `properties.id` (a
   ULID that mirrors the top-level id and is a FK target for
   `storyboard_id`), but identity for cross-references (visibility, selection,
   scoping) is always the top-level id.

2. **One typed accessor, no casts.** `getPlotFeatureId(feature)` (exported from
   `@debrief/components`) reads the top-level id; all five collection/resolution
   sites — VS Code + web-shell capture, web-shell update-to-current, the
   extension host-deps collector, and the missing-data resolver
   (`collectResolvableFeatureIds`) — route through it. The `feature.properties
   as { id }` casts are removed.

3. **Lint closes the hole.** A `no-restricted-syntax` selector
   (`TSAsExpression > TSTypeLiteral`) bans casts to an inline object type
   (`x as { … }`) — the exact form that fabricated `properties.id`. Landed at
   `warn` in `shared/components` (the package where `PlotFeature` and the
   generalisation live); a backlog item clears the existing warning backlog
   across the other packages and promotes the rule to `error` repo-wide. The
   companion wording widening of Constitution XV.7 keeps the principle and the
   lint rule in lock-step.

**Alternatives rejected.** (a) Add `id` to `BaseFeatureProperties` so every
feature carries `properties.id`: larger blast radius, duplicates the
already-required top-level id, and diverges from GeoJSON's top-level-id
convention; selection/scoping/render/import would all need reworking.
(b) Make capture fall back to `properties.id ?? feature.id` without fixing the
loose type: leaves the unchecked-cast anti-pattern (and the index signature)
in place to bite again.

**Consequences.** Captures now reference data features by their real id, so the
preview *and* the existing export carry the tracks. The fix is additive
(behaviour only changes for features lacking `properties.id` — previously
dropped, now included), so fixtures that set `properties.id` are unaffected.
`PlotFeature` stays loose for now (it is used in 36 files / ~100 cast sites);
tightening it / deriving from `DebriefFeature` is folded into the cast-cleanup
backlog item.

**Provenance.** Spec `specs/273-storyboard-preview-button/`. Regression test:
`shared/components/src/storyboard/__tests__/featureId.test.ts`; E2E guard:
`apps/web-shell/playwright/tests/storyboard-preview.spec.ts` (asserts every
captured scene references both tracks and the renderer draws them). Related:
ADR-011 (cast governance), ADR-033 (Article IV.5 — derived boundary types).
