<!--
  Sync Impact Report
  ====================
  Version change: 1.2.0 → 1.3.0 (MINOR — new clause, no breaking change)

  Modified principles: IV. Architectural Boundaries
    - Added IV.4 "Persistence-host abstraction" — formalises that the
      writer abstraction (not the host process) is the persistence
      boundary, allowing browser-native stores (IndexedDB, OPFS, File
      System Access API) to qualify as a persistence backend when
      accessed through the unified writer interface. Machine-enforced
      via ESLint (no-direct-persistence-in-frontend).

  Earlier history: 0.0.0 (template) → 1.1.0 — initial population from
  CONSTITUTION.md (Articles I–XIV + Governance).

  Templates requiring updates: None (IV.4 restricts implementation
  patterns; existing templates do not reference IV by clause).

  Follow-up TODOs: None
-->

# Future Debrief Constitution

> *Getting analysis done, since 1995.*

This constitution establishes the immutable principles governing all development on Debrief v4.x.
AI agents and human contributors MUST adhere to these articles. The constitution supersedes all
other guidance.

---

## Core Principles

### I. Defence-Grade Reliability

**Debrief operates in environments where failure is not an option.**

1. **Offline by default** — all core functionality MUST work without network access. Online features are additive, never required.
2. **No cloud dependencies in core** — cloud and server features are optional extensions, not part of the critical path.
3. **No silent failures** — operations MUST succeed fully or fail explicitly. Users MUST always know the state of their data.
4. **Reproducibility** — given the same inputs and tool versions, analysis MUST produce identical results.

### II. Schema Integrity

**The schema is the contract. All components MUST conform.**

1. **Single source of truth** — LinkML master schemas define all data structures. Pydantic, JSON Schema, and TypeScript representations are derived, never hand-written.
2. **Schema tests are mandatory** — all derived schemas MUST pass adherence tests (golden fixtures, round-trip, structural comparison) before merge.
3. **Schema versioning** — breaking changes to the data model require a version bump and documented migration path.

### III. Data Sovereignty

**User data belongs to the user. We are custodians, not owners.**

1. **Provenance always** — every transformation MUST record lineage: source file → method/version → output. No exceptions.
2. **Source preservation** — original files are always retained as STAC assets. Source data is never modified.
3. **Audit trail immutable** — provenance records cannot be modified after creation.
4. **Data stays local by default** — no telemetry, no external calls without explicit user consent.
5. **Export-friendly** — outputs MUST be in standard formats (GeoJSON, CSV, PDF) suitable for inclusion in reports.

### IV. Architectural Boundaries

**Thick services, thin frontends. Clear separation, no exceptions.**

1. **Services never touch UI** — Python services return data only. All display and interaction decisions belong to frontends.
2. **Frontends never persist** — frontends orchestrate calls to services. All data writes go through services.
3. **Services have zero MCP dependency** — domain logic lives in pure Python libraries. MCP wrappers are thin, replaceable layers.
4. **Persistence-host abstraction.** Frontends may persist data only via the unified writer abstraction. Browser-native stores (IndexedDB, OPFS, File System Access API) qualify as a persistence backend **only** when accessed through this abstraction — frontends never own a divergent write code path. The writer abstraction is the persistence boundary; both Node-side hosts and browser-side hosts route their writes through it. Each host implements the abstraction once, against its native backend; the rest of the system depends only on the interface. Machine-enforced via ESLint (`no-direct-persistence-in-frontend`).

### V. Extensibility

**The platform MUST outlive any single contributor or organisation.**

1. **Fail-safe loading** — a broken extension cannot crash core functionality. Extensions load in isolation.
2. **Schema compliance** — extensions MUST consume and produce data conforming to the master schema.
3. **No vendor lock-in** — avoid dependencies that tie the project to a single platform, vendor, or contractor.

*Note: Extension discovery mechanism (registry vs convention vs manifest) is deferred until implementation.*

### VI. Testing

**Untested code is broken code waiting to happen.**

1. **Schema tests gate all merges** — derived schema adherence tests MUST pass.
2. **Services require unit tests** — no service code merged without corresponding tests.
3. **Integration tests for workflows** — end-to-end paths (load → transform → store) MUST be tested.
4. **CI MUST pass** — schema tests, unit tests, and linting all green before merge.

### VII. Test-Driven AI Collaboration

**Tests define "done" for AI-assisted work — in code and beyond.**

When working with LLMs, clear acceptance criteria keep AI contributions on track and verifiable.

**For Code:**
1. **Tests before implementation** — define expected behaviour as executable tests before asking AI to implement.
2. **Tests are the spec** — AI should be able to verify its own work against provided tests.
3. **Failing tests guide iteration** — when tests fail, AI has concrete feedback to improve.

**For Planning and Design:**
1. **Acceptance criteria for documents** — define what "good" looks like before asking AI to draft.
2. **Checklists as tests** — provide verification checklists that AI can self-assess against.
3. **Examples as fixtures** — show examples of successful outputs to establish the standard.

**For All AI Tasks:**
1. **Definition of done first** — before any AI task, define how completion will be verified.
2. **Verifiable outputs** — prefer outputs that can be checked (tested, validated, compared) over those requiring subjective judgment.
3. **Iterate on failures** — when output doesn't meet criteria, provide specific feedback for AI to retry.

### VIII. Documentation

**If it's not documented, it doesn't exist.**

1. **Specs before code** — no significant implementation without a written specification.
2. **User-facing docs required** — any feature exposed to users MUST have documentation.
3. **Architecture decisions recorded** — significant technical choices documented with rationale in ARCHITECTURE.md or ADRs.
4. **Changelog maintained** — all notable changes documented in CHANGELOG.md.

### IX. Dependencies

**Every dependency is a liability. Choose wisely.**

1. **Minimal, vetted dependencies** — prefer standard library. External dependencies MUST be justified.
2. **Pinned versions** — all dependencies version-locked for reproducibility.
3. **No vendor lock-in** — dependencies MUST NOT tie us to a single platform or proprietary ecosystem.

### X. Security

**Defence context demands defence-grade discipline.**

1. **No secrets in code** — credentials, API keys, paths to classified data MUST NEVER be committed to the repository.
2. **Classification awareness** — system MUST NEVER assume network access or cloud storage availability.

### XI. Internationalisation

**NATO interoperability requires multilingual support.**

1. **I18N from the start** — user-facing strings MUST be externalisable for translation.
2. **Locale-aware formatting** — dates, numbers, and coordinates MUST respect user locale settings.

### XII. Community Engagement

**Build in the open. Invite feedback early and often.**

1. **Public by default** — development progress, roadmaps, and challenges are visible to stakeholders.
2. **Beta previews** — user-facing features are deployed for feedback before finalisation.
3. **Deliberate feedback pauses** — development includes structured periods to gather and incorporate community input.
4. **Accessible discussion** — each feature preview has a dedicated space for stakeholder feedback.
5. **Responsive engagement** — feedback is acknowledged, summarised, and visibly influences development.

### XIII. Contribution Standards

**Quality is non-negotiable.**

1. **Atomic commits** — one logical change per commit with a clear message.
2. **PR review required** — no direct commits to main branch.
3. **CI MUST pass** — all automated checks green before merge.

**Organisation Contributions (`/contrib/`):**
1. **Schema compliance gate** — contrib extensions MUST pass schema adherence tests.
2. **Isolated failure** — contrib code tested in isolation; cannot break core functionality.

### XIV. Pre-Release Freedom

**Until v4.0.0, we move fast.**

This constitution recognises that Debrief v4.x is a ground-up rewrite. Until the first formal
release to the user community (v4.0.0):

1. **Breaking changes permitted** — no backwards compatibility obligations to pre-release versions.
2. **Schema evolution expected** — the data model will change as we learn.
3. **Deprecation rules suspended** — features may be added and removed without deprecation periods.

**Trigger point:** Upon release of v4.0.0, Articles II (schema versioning), VIII (changelog), and
XIII (contribution standards) become strictly enforced for all subsequent releases.

### XV. Strict Type Safety

**Every value has a concrete type. `Any` is not a type — it is the absence of one.**

1. **Explicit types everywhere** — all function parameters, return types, and variable declarations MUST have explicit type annotations in both Python and TypeScript.
2. **`Any`/`any` prohibited** — the use of `Any` (Python) and `any` (TypeScript) is forbidden in production code. When external libraries return untyped data, narrow to a concrete type at the boundary immediately.
3. **Strict mode mandatory** — all TypeScript projects MUST enable `strict: true`. All Python projects MUST pass strict static type checking.
4. **Schema types are canonical** — types generated from LinkML schemas MUST be fully typed with no `Any`/`any` in the output.
5. **Type boundaries are explicit** — every point where untyped data enters the system MUST validate through a typed model before the data is used in application code.
6. **CI enforces compliance** — type checking for all languages MUST run as a required CI step. PRs with type violations cannot be merged.

---

## Governance

- This constitution supersedes all other project documentation in case of conflict.
- Amendments require documented rationale and explicit approval.
- All PRs and code reviews MUST verify compliance with these principles.
- Deviations require explicit documentation and justification.

**Version**: 1.2.0 | **Ratified**: 2026-01-01 | **Last Amended**: 2026-02-17
