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
