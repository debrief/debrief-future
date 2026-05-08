# Phase 0 Research: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Date**: 2026-05-08
**Inputs**: [spec.md](./spec.md), [docs/extraction-audit/spec-navigator/coupling-inventory.md](../../docs/extraction-audit/spec-navigator/coupling-inventory.md)

This document resolves all technical unknowns surfaced during planning. Every clarification from `/speckit.specify` was already answered (FR-015/016/017); this research records *how* we will execute on those decisions.

---

## R-001: History-preserving extraction mechanism

**Decision**: Use `git subtree split --prefix=apps/spec-navigator` against a fresh clone of debrief-future to produce an extraction-ready branch, then push that branch as the new repo's `main`.

**Rationale**:
- Preserves commit dates, authors, and per-file blame — all of which the spec artefacts in `specs/191-spec-navigator/` reference and which the team will want when reading historical PRs.
- Produces a clean linear history limited to commits that touched `apps/spec-navigator/`.
- Reversible: the source repo is untouched; the split branch can be re-generated if the migration aborts.
- The Phase 0 audit observed the app's history in this repo is essentially a single feature branch, so the split should be linear with no cross-cutting commits to triage.

**Alternatives considered**:
- `git filter-repo --path apps/spec-navigator/ --path-rename apps/spec-navigator/:` — equivalent end-state, but it requires a separate Python tool, mutates a clone destructively, and offers no advantage given the simple history shape.
- `git init` + copy — discards history. Rejected: the team values blame and PR linkage on this app.
- `git subtree push` to a fresh remote — same mechanism as `subtree split`, but coupled to remote bootstrap. The two-step (split locally, then push as `main`) is auditable and reproducible.

**Cross-cutting commit policy**: Any commit that touched both `apps/spec-navigator/` and unrelated paths is preserved by `subtree split` with the unrelated paths' diffs dropped. A pre-flight `git log --oneline apps/spec-navigator/ | wc -l` plus a `git log --diff-filter=AM --name-only` review of the largest commits identifies any commit whose intent is opaque without context; for those, the split commit body is annotated in the new repo via `git notes` (no rewrite). Audit observation: this app has effectively a single-commit lineage, so we expect zero such commits in practice.

---

## R-002: Configuration seam — design and resolution order

**Decision**: A single `Configuration` object loaded synchronously at app startup. Resolution order: **build-time environment variables (highest) → URL query-string parameters → bundled debrief default (lowest)**. Validated through a Zod schema; the validated object is the only way application code reads configuration values.

**Rationale**:
- Build-time env vars support the "fork and re-skin for our org" path some adopters will prefer (FR-008).
- Query-string parameters are the primary mode for the hosted GitHub Pages instance (FR-015): one deployment serves all consumers via `?repo=org/name&branch=feat/x`.
- A bundled default keeps the behaviour identical to today's debrief-future experience when neither env nor query string is present.
- Zod at the boundary satisfies Article XV.5 (typed boundaries) — the configuration type used in application code is the inferred Zod output, not `unknown` or `any`.

**Alternatives considered**:
- Runtime UI config switcher (mid-session repo change). Rejected as out of scope (Assumptions in spec); over-engineers FR-015.
- A separate `config.json` fetched at runtime from a known URL. Rejected: adds a network round-trip on every load and a deployment artefact to manage; provides no benefit over query-string for the hosted-instance case.
- Reading `<meta>` tags injected by the host. Rejected: requires server-side templating, defeats GitHub Pages' static-only model.

**URL query-string design** (full contract in `contracts/hosted-url.md`):
- `?repo=<org>/<name>` — required for non-default consumers
- `?branch=<branch-name>` — optional, defaults to the consumer repo's default branch
- `?pat=...` — **never** accepted via URL (PAT envelope stays in `localStorage` only)

---

## R-003: GitHub Pages deployment from a Vite SPA

**Decision**: Single GitHub Pages site at `https://debrief.github.io/spec-navigator/`. Deploy via the standard `actions/deploy-pages` GitHub Action on merge to `main`. Vite `base` set to `/spec-navigator/` to keep asset paths correct.

**Rationale**:
- Free, zero infrastructure to manage, fits the static-SPA character.
- `actions/deploy-pages` is the official path; widely documented.
- The `base` path is the only Vite-specific gotcha; setting it via env var (`VITE_BASE`) lets adopters re-host under different paths without rebuilding from a fork.

**Single-deployment, multi-consumer model**: A single Pages deployment renders any consumer via the URL contract from R-002. Per-PR previews on the *navigator* itself are not needed — the navigator is a static viewer, not a tested interactive surface; navigator PRs are previewed via local `vite preview` and the live-mode CI run. Per-PR previews of *consumer specs* are achieved through the `?branch=...` query parameter.

**Alternatives considered**:
- Cloudflare Pages — better preview-per-PR for navigator changes, but adds a vendor account and DNS config; not worth it for an internal SPA whose own development cadence is slow. The `?branch=...` story handles consumer-PR previews regardless of host.
- Vercel/Netlify — same trade-offs as Cloudflare; no advantage over GitHub Pages for this workload.
- Heroku review apps — explicitly rejected in the spec (it's the legacy this work is leaving behind).

---

## R-004: Bundled-fixture E2E vs live mode

**Decision**: Playwright tests run against bundled HTTP fixtures by default, switched to live GitHub by setting `LIVE_GITHUB=1` and supplying `GITHUB_TOKEN`. Fixtures are recorded from real GitHub responses using Playwright's built-in route interception (`page.route(...)`) backed by JSON files under `e2e/fixtures/`.

**Rationale**:
- Playwright's native `page.route` + a small fixture-loader helper is enough; no MSW or Polly dependency needed (Article IX — minimal deps).
- Bundled fixtures are deterministic and offline-capable (Article I).
- Live mode is what catches real GitHub-API drift; running it on the new repo's `main` branch (and nightly) gives signal without slowing PR CI.
- A fixture re-record script (`pnpm fixtures:record`) regenerates fixtures by toggling `LIVE_GITHUB=1` and recording responses, so fixtures don't go stale.

**Alternatives considered**:
- MSW (Mock Service Worker) — common pattern, but it's an extra runtime dep and Playwright's `page.route` is already in the project. Rejected on dependency-minimalism grounds.
- Polly.js — heavier; HAR-based recording is overkill for a thin GitHub-REST surface.
- Live-only — rejected by FR-013 (contributors without org access must produce green builds).
- Fully mocked TypeScript adapters (no HTTP at all) — fastest tests, but we lose realism on GitHub response shapes; fixtures balance speed and realism.

**CI matrix**:
| Job | Trigger | Mode | Secret? |
|---|---|---|---|
| `ci.yml` | every PR | bundled fixtures (default) | no |
| `live.yml` | nightly + push to `main` | `LIVE_GITHUB=1` | `GITHUB_TOKEN` (read-only public scopes) |
| `deploy.yml` | push to `main` (after `live.yml` green) | n/a (build only) | none beyond Pages permissions |

---

## R-005: `specFormatVersion` declaration and discovery

**Decision**: Consumers declare their format version in `.speckit/spec-format-version.json` at the repository root, with the shape `{ "version": "1.0.0" }`. The navigator fetches this file via the GitHub Contents API at startup; if absent, it defaults to `"1.0.0"`. The navigator publishes a supported range (e.g., `>=1.0.0 <2.0.0`) baked into its bundle and rendered in the footer.

**Rationale**:
- A single well-known path is discoverable without configuration.
- JSON keeps it simple and avoids YAML dependencies.
- The "absent → 1.0.0" default lets debrief-future adopt the navigator post-extraction with no upfront commit.
- Baking the supported range into the bundle (rather than fetching it remotely) means a deployed navigator always knows what it can handle, even offline.

**Compatibility behaviour**:
- Consumer version *within* navigator's supported range → render normally.
- Consumer version *above* the supported range → display the "Upgrade your navigator" error (with both versions and a link to release notes).
- Consumer version *below* the supported range → display the "Format too old" error (same components, different copy).
- Malformed or fetch-failed → fail open with default `"1.0.0"` and a non-blocking warning banner; this prevents a transient GitHub blip from killing the page.

**Alternatives considered**:
- Embed the version in `package.json` at the consumer's `specs/` root. Rejected: not all consumers are JS projects, and `package.json` parsing is implementation-y for a contract.
- Use a header comment in `spec.md` files. Rejected: per-spec scope is wrong; the format is a repository-wide contract.
- Calendar versioning (`2026.05`) — clearer cadence, but mismatched with the "breaking change → major bump" semantics this domain wants.
- "Latest only" with no version field — punted by spec; rejected because it offloads the burden onto the navigator team forever.

---

## R-006: Cutover strategy in debrief-future (Phase 3)

**Decision**: A single atomic cutover PR that simultaneously deletes `apps/spec-navigator/`, removes its CI jobs, updates docs, swaps the review-app comment template to link the hosted URL, and lands the ADR-031 (extraction). Before merge, the hosted instance is verified live and a smoke-test PR confirms the review-app comment renders correctly.

**Rationale**:
- A single PR avoids a "half-extracted" intermediate state where both the in-repo and hosted instances exist (violates SC-007).
- Atomic delete + doc-swap in one commit guarantees `git bisect` will never land on a broken state.
- Pre-merge smoke test ensures the hosted instance is healthy before the in-repo fallback is destroyed.

**In-flight PR handling**: PRs open at the moment of merge will see a one-time merge conflict against `apps/spec-navigator/` paths. The cutover PR description includes a one-line rebase instruction; for any PR that *modifies* `apps/spec-navigator/`, the author redirects their change to the new repo. The audit's single-commit history observation suggests few such PRs in flight at any time.

**Rollback path**: A `revert` of the cutover PR restores `apps/spec-navigator/`, the CI jobs, and the doc state in one commit. The hosted instance can remain live during a rollback (it does not depend on the in-repo path).

**Alternatives considered**:
- Staged cutover (delete source first, swap docs in a follow-up). Rejected: produces a window where docs reference the deleted path.
- Tombstone with a redirect (keep `apps/spec-navigator/index.html` as a meta-refresh). Rejected: needs build pipeline kept alive; defeats the point.

---

## R-007: PAT scopes for the live-mode CI secret

**Decision**: A fine-grained personal access token scoped read-only to the public `debrief/debrief-future` repository, registered as `GITHUB_TOKEN` in the new repo's Actions secrets (or a fork-specific equivalent). The token is owned by a service identity, not a human contributor.

**Rationale**:
- Public-read is the minimum scope that exercises real GitHub responses against the canonical consumer.
- Fine-grained tokens are scoped per-repository, so leakage from this secret cannot affect any other debrief property.
- Service-identity ownership means contributor turnover doesn't silently break CI.

**Adopter guidance** (in new-repo README): adopters using private repositories must supply their own PAT with `metadata:read` and `contents:read` on their private repo, set as `GITHUB_TOKEN` in their Actions secrets. The navigator's CI layout ships the workflow as a template with this requirement documented.

**Alternatives considered**:
- A fully public-only mode (no PAT anywhere). Rejected: anonymous GitHub rate limits (60 req/hr) are too tight for a CI job that fetches multiple files per spec.
- A bot account's classic PAT with `repo` scope. Rejected: way over-scoped; modern fine-grained tokens are the right tool.

---

## R-008: Configuration validation strategy

**Decision**: Author a JSON Schema (`contracts/configuration.schema.json`) that is the source of truth for the configuration shape. Generate the runtime Zod schema directly in code (hand-authored to mirror the JSON Schema) and add a Vitest test that validates the JSON Schema and the Zod inference produce the same accepted/rejected fixture sets.

**Rationale**:
- JSON Schema is the publishable contract for adopters' tooling (editor autocomplete, validation in their CI).
- Zod is the runtime validator at the application boundary (Article XV.5).
- A round-trip test catches drift between the two without requiring a generator dependency. Article II's "single source of truth" applies to *domain* schemas (LinkML); application config is allowed to be hand-mirrored with a drift-detection test.

**Alternatives considered**:
- LinkML for the configuration schema. Rejected: heavy for a flat object; LinkML's value is in domain modelling and code generation, neither relevant here.
- `zod-to-json-schema` package to derive JSON Schema from Zod. Rejected: introduces a runtime/build dep and a less-mature emitter for some Zod features. Round-trip test is simpler.
- TypeScript types only, no runtime validation. Rejected: the configuration crosses an untrusted boundary (URL query string), so a runtime check is mandatory under Article XV.5.

---

## Summary table

| ID | Topic | Decision (one line) |
|---|---|---|
| R-001 | History extraction | `git subtree split --prefix=apps/spec-navigator/` from a fresh clone |
| R-002 | Configuration seam | Single object; build-env > query-string > bundled default; Zod-validated |
| R-003 | Hosting | GitHub Pages, single deploy at `/spec-navigator/`, multi-consumer via query string |
| R-004 | E2E mode | Bundled Playwright route fixtures by default; opt-in `LIVE_GITHUB=1` mode in CI |
| R-005 | Format version | `.speckit/spec-format-version.json` at consumer repo root; SemVer; absent ⇒ `1.0.0` |
| R-006 | Cutover | Single atomic PR in debrief-future; pre-merge hosted-instance smoke test |
| R-007 | PAT scopes | Fine-grained service-identity PAT, public-read on debrief-future, `GITHUB_TOKEN` secret |
| R-008 | Config validation | JSON Schema (publishable) mirrored by hand-authored Zod (runtime); drift test |

All NEEDS CLARIFICATION items are resolved. Ready for Phase 1.
