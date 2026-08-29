# Playbook: Constitution Conformance (`CC-*`)

<!-- constitution-version: 1.5 -->

Audits the codebase against the root `CONSTITUTION.md` (document version 1.5, May 2026 —
the authority per CLAUDE.md; the `.specify/memory` copy is derived). Each heuristic is a
**falsifiable check** — a reviewer can look at a file and say "this holds" or "this is
violated here". Every candidate a reviewer emits under this dimension MUST cite the `CC-NN`
id below.

> **Authoring note**: this playbook was written against constitution document version 1.5.
> When the constitution is amended, regenerate these checks from the article text and bump
> the `constitution-version` anchor above — `tests/repo_review/test_playbook_structure.py`
> fails on drift. A finding against a since-deleted article auto-resolves as
> `fixed (article removed)` at reconciliation.

Severity guidance: violations of Articles I–IV, VI, and XV are load-bearing → **High** or
above (see `severity-rubric.md`). Advisory-clause drift may be **Medium**.

## Article I — Defence-Grade Reliability

- **CC-01** — *Offline by default.* A core-path module MUST NOT require network access. Check:
  does any service/domain module import an HTTP client or reach a URL on a non-optional path?
  Optional online features behind an explicit opt-in are fine.
- **CC-02** — *No silent failures.* An operation MUST succeed fully or fail explicitly. Check:
  `except:`/`catch {}` blocks that swallow errors without surfacing state; write paths that
  can partially complete without signalling. Silent data loss is **Critical**.
- **CC-03** — *Reproducibility.* Given the same inputs and tool versions, output MUST be
  identical. Check: nondeterminism on a core path — unordered dict iteration into serialised
  output, `Date.now()`/`random` seeding a persisted artefact without record.

## Article II — Schema Integrity

- **CC-04** — *Single source of truth.* Pydantic / JSON-Schema / TypeScript types for platform
  data MUST be LinkML-derived, never hand-written. Check: hand-authored types duplicating a
  LinkML-modelled shape instead of importing from `@debrief/schemas` / `debrief_schemas`.
- **CC-05** — *Schema tests mandatory.* Derived-schema changes MUST be covered by adherence
  tests (golden fixtures, round-trip, structural). Check: a schema/generated-type change with
  no corresponding test movement.

## Article III — Data Sovereignty

- **CC-06** — *Provenance always.* Every transformation MUST record lineage (source → method/
  version → output). Check: a calc/io transformation that produces an output without writing
  provenance. **High.**
- **CC-07** — *Source preservation.* Original files MUST be retained as STAC assets, never
  mutated. Check: an import path that overwrites or discards the source.
- **CC-08** — *Data stays local.* No telemetry or external calls without explicit consent.
  Check: analytics/beacon calls; implicit uploads.

## Article IV — Architectural Boundaries

- **CC-09** — *Services never touch UI.* Python services MUST return data only. Check: a
  service module emitting presentation strings, colours, layout, or formatting decisions.
- **CC-10** — *Frontends never persist directly.* Check: a frontend writing to disk /
  IndexedDB / OPFS **not** through the `@debrief/stac-writer` abstraction (Article IV.4). This
  is what `no-direct-persistence-in-frontend` enforces — verify the rule is wired and unbypassed.
- **CC-11** — *Services have zero MCP dependency.* Domain logic MUST be pure libraries; MCP is
  a thin wrapper. Check: `import mcp` inside a domain module rather than its server shim.
- **CC-12** — *Boundary types are derived, not re-listed (Article IV.5 / ADR-033).* A DTO,
  message payload, snapshot, or persistence record mirroring a subset of an existing typed
  source MUST use `Pick`/`Omit`/`Partial`, never re-list fields. Check: hand-listed field sets
  duplicating a source type — the known silent-data-loss class. **High** (Critical if on a
  save path).

## Article VI / VII — Testing

- **CC-13** — *Services require unit tests.* Check: a service module or public function with no
  test exercising it.
- **CC-14** — *Integration tests for workflows.* Check: a load→transform→store path with only
  unit coverage of the parts and no end-to-end test.

## Article VIII — Documentation

- **CC-15** — *Specs before code.* Check: a substantial feature directory with code but no
  `specs/NNN/spec.md`. (Bug fixes are exempt per `/bugfix`.)
- **CC-16** — *ADRs for significant choices.* Check: a significant architectural change with no
  ADR in `docs/project_notes/decisions.md`.

## Article IX — Dependencies

- **CC-17** — *Minimal, pinned, justified.* Check: a new runtime dependency added without
  justification, or an unpinned/`*` version range.

## Article XV — Strict Type Safety

- **CC-18** — *No `Any`/`any` in production code.* Check: explicit `Any`/`any`, or untyped
  external data used without narrowing at the boundary (XV.5). **High** — this is the
  project's most-cited article and has its own CI gate.
- **CC-19** — *Strict mode on.* Check: a TS project without `strict: true`, or a Python package
  outside pyright's strict/standard include set that ships production code.

## Deliberately unchecked articles (do not "discover" these as gaps)

- **Article V (Extensibility)** — fail-safe extension loading has no meaningful audit surface
  yet: `/contrib/` is empty and the extension-discovery mechanism is explicitly deferred.
  Revisit when the first extension lands.
- **Article X (Security)** — secrets scanning is already machine-enforced in CI via gitleaks
  (`gitleaks.toml`); duplicating it as review heuristics adds noise, not coverage. The
  classification-awareness clause is covered by CC-01 (offline) in practice.
- **Article XI (Internationalisation)** — i18n enforcement is premature pre-v4.0.0 while
  user-facing strings churn; adding it now would flood the report with Low findings. Revisit
  as v4.0.0 approaches.
- **Articles XII–XIII (Community, Contribution standards)** — process articles enforced by
  repo settings and workflow (PR review, CI gates), not auditable from source.

## What NOT to flag

- Pre-release freedom (Article XIV): missing changelog entries, breaking changes, and absent
  deprecation periods are **not** violations before v4.0.0. Do not raise them.
- Generated files under `src/generated/`: attribute any issue to the generator or LinkML
  source (FR-014), not the generated file.
