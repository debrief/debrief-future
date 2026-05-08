# Data Model: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Date**: 2026-05-08

This feature is a cross-repository migration. The "data" in question is the *configuration* surface that parameterises spec-navigator for any consumer, and the *format-version contract* that declares which iteration of the speckit artefact shape the consumer follows.

No domain entities (in the LinkML/Pydantic sense) are introduced. Spec-navigator remains a viewer of GitHub-hosted markdown.

---

## Entity 1 — `Configuration`

The single object that parameterises a spec-navigator instance for a specific consumer.

| Field | Type | Required | Default (debrief) | Notes |
|---|---|---|---|---|
| `repo` | `string` (`<org>/<name>` shape) | Yes | `"debrief/debrief-future"` | The GitHub repository whose specs are being rendered. |
| `branch` | `string \| null` | No | `null` (use the consumer's default branch) | Optional branch override; primarily used by the per-PR review-app comment. |
| `specsPath` | `string` (POSIX-style relative path) | No | `"specs"` | Path under `repo` where speckit feature directories live. |
| `featureDirPattern` | `string` (regex source) | No | `"^[0-9]{3}-[a-z0-9-]+$"` | Pattern that matches a single feature directory name (e.g., `248-extract-spec-navigator`). |
| `artefactFilenames` | `string[]` | No | `["spec.md", "plan.md", "tasks.md", "research.md", "data-model.md", "quickstart.md"]` | Recognised top-level artefact filenames within a feature directory. |
| `artefactDirectories` | `string[]` | No | `["evidence", "contracts", "checklists"]` | Recognised sub-directories within a feature directory; each renders as a section. |
| `labels` | `LabelMap` | No | (see below) | Mapping of consumer label names to navigator's internal status taxonomy. |
| `branding.title` | `string` | No | `"spec-navigator"` | Application title shown in `<title>` and headers. |
| `branding.repoLabel` | `string` | No | `"debrief-future"` | Human-readable repo name for breadcrumbs and headers. |
| `links.releaseNotes` | `string` (URL) | No | `"https://github.com/debrief/spec-navigator/releases"` | Linked from the format-version error UI (R-005). |

### `LabelMap` shape

```json
{
  "draft":        ["status:draft"],
  "in-progress":  ["status:in-progress", "implementing"],
  "complete":     ["status:complete", "done"]
}
```

The keys are spec-navigator's *internal* taxonomy (`draft | in-progress | complete`); the values are the consumer's *actual* GitHub label names that map to each. An empty array means "this status is not visualised for this consumer."

### Validation rules

- `repo` MUST match `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`. Reject otherwise.
- `featureDirPattern` MUST be a valid JavaScript regular-expression source (validated by attempting `new RegExp(value)` inside the boundary check).
- `specsPath` MUST NOT start with `/` and MUST NOT contain `..` segments.
- `artefactFilenames` and `artefactDirectories` MUST be non-empty arrays of POSIX-safe basenames (no slashes).
- All keys in `labels` MUST be drawn from the closed set `{"draft", "in-progress", "complete"}`. Unknown keys are rejected.

### Resolution order (R-002)

1. **Build-time environment variables** (`VITE_NAVIGATOR_CONFIG_*`) — highest priority. Adopters who fork the source bake their config in.
2. **URL query-string parameters** — primary mode for the hosted instance. Only `repo` and `branch` are accepted from the URL; everything else falls through to step 3.
3. **Bundled debrief default** — lowest. Reproduces today's user experience.

The validated `Configuration` is the *only* type application code consumes. There is no `Partial<Configuration>` in production code paths; defaults are merged inside `src/config/load.ts` and the result is what flows downstream.

---

## Entity 2 — `SpecFormatVersion`

A SemVer string declared by the consumer in `.speckit/spec-format-version.json` at their repository root.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `version` | `string` (SemVer 2.0.0) | Yes | `"1.0.0"` if file absent | Consumer's declared format version. |

### Compatibility decision (state transitions)

The navigator bakes a `SUPPORTED_FORMAT_RANGE` constant into its bundle (e.g., `>=1.0.0 <2.0.0`). For a consumer-declared `version`:

```
        ┌─────────────────────┐
        │ Fetch attempt       │
        └──────────┬──────────┘
                   │
       ┌───────────┴────────────┐
       │                        │
       ▼                        ▼
  Success                  Network/parse error
       │                        │
       ▼                        ▼
   Compare to             Fail open: assume 1.0.0,
   SUPPORTED_FORMAT_RANGE display non-blocking warning banner
       │
   ┌───┴────┬────────┐
   ▼        ▼        ▼
within   above    below
range    range    range
   │        │        │
   ▼        ▼        ▼
Render  "Upgrade  "Format
normally navigator" too old"
         error    error
         (with    (with
         versions versions
         + link)  + link)
```

### File format (consumer side)

```json
{
  "version": "1.0.0"
}
```

Located at `<consumer-repo-root>/.speckit/spec-format-version.json`. Absent file is a recognised state, not an error.

---

## Entity 3 — `HostedInstanceUrl` (URL parameter contract)

Not an in-memory entity, but a contract worth modelling. Full details in `contracts/hosted-url.md`.

| Parameter | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `repo` | `string` | No | bundled default | `<org>/<name>` shape (same as `Configuration.repo`) |
| `branch` | `string` | No | consumer default | Plain branch name; URL-encoded values supported |

URLs of the form `https://debrief.github.io/spec-navigator/?repo=acme/foo&branch=feat/x` are the canonical consumer-facing surface. No other query-string parameters are accepted; unknown parameters are silently ignored to keep links forward-compatible.

---

## Entity relationships

```
        ┌──────────────────────┐
        │  Configuration       │
        │  (in-memory, runtime)│
        └─┬────────┬──────────┘
          │        │
   reads  │        │ uses
          ▼        ▼
  HostedInstanceUrl   SpecFormatVersion
  (URL params)        (consumer-declared file)
          │
          └──→ feeds back into Configuration
               via build-env > query-string > default merge
```

There is no persistence relationship; `Configuration` is constructed fresh on every page load.

---

## Migration data

For the migration itself (Phase 1 → 2 → 3) there is no domain data to migrate. The "data" being moved is **source code**:

- ~3–4k LOC of TypeScript under `apps/spec-navigator/src/`
- Existing tests under `apps/spec-navigator/e2e/` and inline `*.test.ts` files
- Public assets under `apps/spec-navigator/public/`

`git subtree split` (R-001) preserves these byte-for-byte with original commit history; nothing in this section requires transformation.

---

## Out of scope

- Schema for the per-spec frontmatter that individual `spec.md` files might use — that is a property of the spec file and orthogonal to the navigator's configuration.
- The shape of `tasks.md` task records — the navigator renders markdown, it does not parse task structure.
- Authentication tokens — the PAT envelope is an existing pattern in `localStorage` and is unchanged by this feature.
