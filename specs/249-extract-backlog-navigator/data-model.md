# Data Model: Extract backlog-navigator into a Standalone Repository

**Feature**: 249-extract-backlog-navigator
**Date**: 2026-05-11

This feature is a cross-repository migration. There is no domain data, in the
LinkML/Pydantic sense, to model. After research (R-002 ↔ #248 decision 2A), what
*is* worth modelling is reduced to:

1. The build-time defaults that flow through `apps/backlog-navigator/src/defaults.ts`
   and `apps/backlog-navigator/src/github/api.ts` (values, not a new entity).
2. The vendor strings parameterised in `apps/backlog-navigator/src/strings.ts`
   (a flat record extension; existing module).
3. The hosted-instance URL contract (a parameter contract, not an in-memory
   entity).
4. The PWA manifest fields (values consumed at vite build time).
5. The kit's `--destination` configuration (a one-shot CLI input, not a
   runtime entity).

No new `Configuration` entity, no new JSON Schema, no Zod boundary — same
shape as #248 decision 2A.

---

## Build-time defaults (R-002)

Two surfaces consume defaults:

### A. Runtime defaults (`src/defaults.ts` and `src/github/api.ts`)

| Value | Today (Phase 0) | After Phase 1 |
|---|---|---|
| Default owner (GitHub org slug) | inline `'debrief'` const in `src/github/api.ts:25` | `import.meta.env.VITE_DEFAULT_OWNER ?? 'debrief'` |
| Default repo (GitHub repo slug) | inline `'debrief-future'` const in `src/github/api.ts:26` | `import.meta.env.VITE_DEFAULT_REPO ?? 'debrief-future'` |
| Production host string | inlined in components / workflows | exported from `src/strings.ts`: `host = import.meta.env.VITE_PROD_HOST ?? 'debrief.github.io'` |
| App title (user-facing) | already in `src/strings.ts` (`app.title = 'Backlog Navigator'`) | env-overridable: `'Backlog Navigator'` ← `VITE_APP_TITLE` |
| Label/column conventions (if audit finds couplings) | inline in any module the audit identifies | moved to `src/defaults.ts` (a single module) |

### B. Build-time defaults consumed by `vite.config.ts` (PWA manifest)

`vite.config.ts` evaluates **before** `import.meta.env` is available — it
sees only `process.env`. So PWA manifest fields use `process.env.VITE_*`
reads (the same convention as `VITE_BASE_URL` already in use at
`vite.config.ts:34`):

| Manifest field | Today | After Phase 1 |
|---|---|---|
| `name` | `'Debrief Backlog Navigator'` | `process.env.VITE_APP_NAME ?? 'Debrief Backlog Navigator'` |
| `short_name` | `'Backlog'` | `process.env.VITE_APP_SHORT_NAME ?? 'Backlog'` |
| `description` | `'Edit the Debrief project backlog from any device.'` | `process.env.VITE_APP_DESCRIPTION ?? 'Edit the Debrief project backlog from any device.'` |
| `theme_color` | `'#1f1f1f'` | `process.env.VITE_THEME_COLOR ?? '#1f1f1f'` |
| `background_color` | `'#ffffff'` | `process.env.VITE_BG_COLOR ?? '#ffffff'` |
| `icons[].src` (`icon-192.png`, `icon-512.png`) | bundled assets in `public/` | unchanged in Phase 1; icon swap is an adopter follow-up not gated by extraction |
| Vite `base` | `process.env.VITE_BASE_URL ?? '/debrief-future/backlog-navigator/'` | `process.env.VITE_BASE_URL ?? '/{{REPO}}/'` (sed-substituted by `extract.sh` per R-009) |

### Resolution order

1. **Build-time environment variables** (`VITE_*` in `process.env` at vite-
   config time; `import.meta.env.VITE_*` at runtime) — highest priority.
2. **URL query-string parameters** — primary mode for the hosted instance.
   Only `repo`, `branch`, `pr`, `dryRun` are accepted from the URL (see
   §Hosted-instance URL contract); vendor strings and PWA manifest fields
   are intentionally **not** URL-overridable.
3. **Bundled debrief default** — lowest. Reproduces today's user experience.

### Validation rules

Validation lives in two existing places:

- **URL parser** (existing in `src/state/`): `repo` MUST match
  `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`; `pr` MUST match `^[0-9]+$`; `branch`
  is taken as-is (URL-decoded); `dryRun` is parsed as a boolean. Bad values
  fall back to defaults with a non-blocking warning. Malformed input never
  crashes the app.
- **PWA manifest** (existing Zod-validated by `src/pwa/manifestSchema.ts`
  per ADR-030, Article XV). The Zod schema is unchanged in Phase 1 — only
  the *input* to `validateManifest()` changes from literals to
  `process.env` reads with fallbacks.
- **GitHub REST boundary** (existing Zod schema in `src/github/schemas.ts`):
  unchanged. No new fields cross this boundary.

---

## Vendor strings (`src/strings.ts`)

`src/strings.ts` already exists and is the centralised string table. Phase 1
adds **one** exported const:

```ts
// NEW (Phase 1)
export const host = import.meta.env.VITE_PROD_HOST ?? 'debrief.github.io';
```

…and updates any inline `'debrief.github.io'` references the audit (FR-001)
surfaces to read from `host`.

All other strings (app.title, filters, columns, group, description, …)
remain unchanged. They are i18n-ready (the existing comment marks them as
such) but English-default; no change in Phase 1 — externalisation surface
is preserved.

---

## Hosted-instance URL contract (parameter-level)

Not an in-memory entity, but a contract worth modelling. Full details in
[`contracts/hosted-url.md`](./contracts/hosted-url.md).

| Parameter | Type | Required | Default | Constraint | Notes |
|---|---|---|---|---|---|
| `repo` | `string` | No | bundled default | `<org>/<name>` shape | New form |
| `branch` | `string` | No | consumer default | Plain branch name; URL-encoded values supported | New form |
| `pr` | `string` (digits) | No | — | `^[0-9]+$` | **Legacy form** — emitted by `backlog-navigator-comment.yml` since #242. Resolved against the bundled default OWNER/REPO via the existing PR-to-branch flow, then handled as if `?repo=<bundled-default>&branch=<resolved>` had been supplied. (R-014 — permanent backward compatibility.) |
| `dryRun` | `string` ("1"/"true"/false) | No | inherited from `VITE_BACKLOG_NAV_DRY_RUN` build flag | truthy → mode = "dry-run"; otherwise no-op | Existing parameter; carried forward unchanged. |

URLs of the form `https://{{HOST}}/{{REPO}}/?repo=acme/foo&branch=feat/x`
(new) and `https://{{HOST}}/{{REPO}}/?pr=512` (legacy) are both canonical
consumer-facing surfaces. No other query-string parameters are accepted;
unknown parameters are silently ignored to keep links forward-compatible.

---

## Inlined `useIsMobile` hook (R-007)

A small but real "data" surface for the migration: the hook
`useIsMobile` from `@debrief/components/hooks/useIsMobile` is copied into
the backlog-navigator source tree in Phase 1.

| Aspect | Value |
|---|---|
| Source today | `shared/components/src/hooks/useIsMobile.ts` (imported as `@debrief/components/hooks/useIsMobile`) |
| Destination | `apps/backlog-navigator/src/hooks/useIsMobile.ts` |
| Provenance comment | Top-of-file comment cites debrief-future #246-hooks-workspace-package |
| Public surface | `default export useIsMobile(): boolean` — unchanged |
| Test coverage | A copy of the upstream test (if simple) lives next to the file; otherwise covered via the integration tests that already exercise mobile-mode rendering |

**Why this is in the data model**: it is the one piece of code that
*physically moves* between workspace boundaries in Phase 1. The audit
(FR-003) is responsible for catching any *other* `@debrief/*` import that
would equally need handling. A pre-audit scan finds **only**
`useIsMobile`.

---

## Kit configuration input (`--destination`)

Not a runtime entity, but the kit's single source of truth for substitution
in `extract.sh`, `bootstrap-new-repo.sh`, and templates (R-009, R-012).

Schema (CLI flag form):

```
--destination <org>/<repo>   # e.g. deepbluecltd/backlog-navigator
--host <host>                # default: <org>.github.io
                              # e.g. deepbluecltd.github.io
```

Or, equivalently, a `kit-config.json` written once at start of bootstrap:

```json
{
  "destination": {
    "org": "deepbluecltd",
    "repo": "backlog-navigator"
  },
  "host": "deepbluecltd.github.io"
}
```

These three values feed every `{{ORG}}`, `{{REPO}}`, `{{HOST}}` placeholder
in `templates/*` and the `vite.config.ts` `base` default. No other kit
substitutions exist; if a fourth value is needed, add it explicitly.

---

## Out of scope

- **A `Configuration` entity / `src/config/` module / configuration JSON
  Schema / Zod-vs-JSON-Schema drift test** — same as #248 decision 2A
  (R-002). The existing seams cover the same need.
- **`specFormatVersion`** — irrelevant to backlog-navigator (it renders
  `BACKLOG.md` as a single document, not multi-format spec artefacts).
- **Spec-navigator's `?pr=` resolution flow's internals** — backlog-
  navigator's flow is independent (different artefacts loaded; same
  GitHub-API pattern).
- **The CQL filter engine, dnd-kit, virtualisation, or any of backlog-
  navigator's own components** — these travel with the subtree split
  unchanged; they are not a migration surface.
- **`@debrief/components`'s wider surface** — only `useIsMobile` is
  imported by backlog-navigator. The audit re-confirms.
- **Lighthouse budget thresholds** — `.lighthouserc.json` ships with the
  subtree split unchanged (R-008). Tuning thresholds is a separate concern.

---

## Migration data (the bytes that move)

For the migration itself there is no domain data to migrate. The "data"
being moved is **source code and configuration**:

- ~3–4k LOC of TypeScript under `apps/backlog-navigator/src/`
- Existing tests under `apps/backlog-navigator/e2e/` and inline
  `__tests__/` and `*.test.ts` files
- Public assets under `apps/backlog-navigator/public/` (PWA icons, etc.)
- `apps/backlog-navigator/.lighthouserc.json` (PWA Lighthouse budget)
- `apps/backlog-navigator/package.json`,
  `apps/backlog-navigator/tsconfig*.json`,
  `apps/backlog-navigator/vite.config.ts`,
  `apps/backlog-navigator/vitest.config.ts`,
  `apps/backlog-navigator/playwright.config.ts`
- The single inlined `useIsMobile.ts` (newly committed in Phase 1,
  therefore travels with the split)

`git subtree split` (R-001) preserves these byte-for-byte with original
commit history; the only transformation is the Phase 1 PR's edits to
`src/github/api.ts`, `src/strings.ts`, `vite.config.ts`,
`package.json`, plus the **new** `src/defaults.ts` and
`src/hooks/useIsMobile.ts` (which exist as committed files before the
split).
