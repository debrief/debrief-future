# Data Model: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Date**: 2026-05-08 (revised post-`/speckit.review`)

This feature is a cross-repository migration. There is no domain data, in the LinkML/Pydantic sense, to model. After `/speckit.review` decisions 2A and 3A, what *is* worth modelling is reduced to:

1. The defaults that flow through the existing `ApiOptions` typed seam (no new entity — values, not a structure).
2. The vendor strings parameterised in `strings.ts` (a flat record, not an entity).
3. The hosted-instance URL contract (a parameter contract, not an in-memory entity).

The earlier `Configuration` entity (with `repo`, `branch`, `specsPath`, `featureDirPattern`, `artefactFilenames`, `artefactDirectories`, `labels`, `branding.*`, `links.releaseNotes` fields plus a JSON Schema and Zod boundary) was **withdrawn by decision 2A** — it duplicated the existing `ApiOptions` seam. The earlier `SpecFormatVersion` entity was **deferred by decision 3A** — re-spiked when a second consumer materialises (backlog #255).

---

## Defaults consumed via `ApiOptions` (R-002)

The existing `ApiOptions` type in `src/api/useFeature.ts` is unchanged in shape. What changes is *how* its defaults are produced. The three values that today are inlined as literals become defaults supplied by the same module:

| Value | Source today (Phase 0) | Source after Phase 1 |
|---|---|---|
| Default repo (`<org>/<name>`) | inline literal `"debrief/debrief-future"` | `import.meta.env.VITE_DEFAULT_REPO ?? "debrief/debrief-future"` |
| Default branch | inline (resolved from active branch) | unchanged — already query-string-driven via the existing PR-resolution flow |
| Vendor strings (app title, repo display name, releases-link host) | inlined in components | three exported `const`s in `src/strings.ts`, overridable via `VITE_APP_TITLE` / `VITE_REPO_LABEL` / `VITE_RELEASES_HOST` |

### Resolution order (R-002)

1. **Build-time environment variables** (`VITE_*`) — highest priority. Adopters who fork the source bake their values into the build.
2. **URL query-string parameters** — primary mode for the hosted instance. Only `repo`, `branch`, and the legacy `pr` are accepted from the URL (see R-003 + `contracts/hosted-url.md`); vendor strings are intentionally *not* URL-overridable.
3. **Bundled debrief default** — lowest. Reproduces today's user experience.

Resolution is enacted inside `useFeature.ts`'s default-supplier function. There is **no** `src/config/` directory, **no** `Configuration` entity, **no** standalone JSON Schema, and **no** Zod schema for this surface. The existing typed `ApiOptions` and the existing GitHub REST Zod boundary are sufficient.

### Validation rules

Validation lives in two existing places:

- **URL parser** (`src/api/parseUrlParams.ts` or equivalent — same module pattern as today): `repo` MUST match `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`; `pr` MUST match `^[0-9]+$`; `branch` is taken as-is (URL-decoded). Bad values fall back to defaults with a non-blocking warning banner. Malformed input never crashes the app.
- **GitHub REST boundary** (existing Zod schema): unchanged. No new fields cross this boundary.

---

## Hosted-instance URL contract (parameter-level)

Not an in-memory entity, but a contract worth modelling. Full details in `contracts/hosted-url.md`.

| Parameter | Type | Required | Default | Constraint | Notes |
|---|---|---|---|---|---|
| `repo` | `string` | No | bundled default | `<org>/<name>` shape | New form (decision 1A) |
| `branch` | `string` | No | consumer default | Plain branch name; URL-encoded values supported | New form |
| `pr` | `string` (digits) | No | — | `^[0-9]+$` | **Legacy form** — emitted by today's `spec-navigator-comment.yml`. Resolved against `debrief/debrief-future` via the existing PR-to-branch flow, then handled as if `?repo=debrief/debrief-future&branch=<resolved>` had been supplied. (Decision 1A — permanent backward compatibility.) |

URLs of the form `https://debrief.github.io/spec-navigator/?repo=acme/foo&branch=feat/x` (new) and `https://debrief.github.io/spec-navigator/?pr=512` (legacy) are both canonical consumer-facing surfaces. No other query-string parameters are accepted; unknown parameters are silently ignored to keep links forward-compatible.

---

## Out of scope

- **`SpecFormatVersion`** — deferred (decision 3A). Re-spiked when a second consumer ships a divergent format (backlog #255).
- **`Configuration` entity / `src/config/` module / configuration JSON Schema / Zod-vs-JSON-Schema drift test** — withdrawn (decision 2A). The existing `ApiOptions` seam plus three named constants in `strings.ts` cover the same need without duplicating boundary infrastructure.
- Schema for the per-spec frontmatter that individual `spec.md` files might use — that is a property of the spec file and orthogonal to the navigator.
- The shape of `tasks.md` task records — the navigator renders markdown, it does not parse task structure.
- Authentication tokens — the PAT envelope is an existing pattern in `localStorage` and is unchanged by this feature.

---

## Migration data

For the migration itself (Phase 1 → 2 → 3) there is no domain data to migrate. The "data" being moved is **source code**:

- ~3–4k LOC of TypeScript under `apps/spec-navigator/src/`
- Existing tests under `apps/spec-navigator/e2e/` and inline `*.test.ts` files
- Public assets under `apps/spec-navigator/public/`

`git subtree split` (R-001) preserves these byte-for-byte with original commit history; nothing in this section requires transformation.
