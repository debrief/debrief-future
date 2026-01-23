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
