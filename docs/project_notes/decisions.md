# Architectural Decisions

Architectural Decision Records (ADRs) with context and trade-offs. Number decisions sequentially.

## Format

Each decision should include:
- Date and ADR number
- Context (why the decision was needed)
- Decision (what was chosen)
- Alternatives considered
- Consequences (trade-offs, implications)

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
