# Phase 0 Extraction Audit: `apps/backlog-navigator/`

**Date**: 2026-05-08  
**Scope**: Read-only inventory of all couplings preventing standalone extraction into a separate repository.

---

## 1. Workspace `@debrief/*` Package Imports

### Summary
**2 package dependencies; 1 symbol imported; transitive deps lightweight.**

- **Dependency count**: 1 active (`@debrief/components`)
- **Symbol count**: 1 (`useIsMobile`)
- **Transitive workspace deps from `@debrief/components`**: 2 (`@debrief/schemas`, `@debrief/utils`)

### Detailed Inventory

#### `@debrief/components` — 1 symbol, 2 files

| File | Import Statement | Symbol(s) | Source Location | Transitive Workspace Deps |
|------|------------------|-----------|-----------------|--------------------------|
| `src/App.tsx:2` | `import { useIsMobile } from '@debrief/components/hooks/useIsMobile';` | `useIsMobile` | `/shared/components/src/hooks/useIsMobile.ts` | None (isolated hook) |
| `src/editors/EditorOverlayProvider.tsx:2` | `import { useIsMobile } from '@debrief/components/hooks/useIsMobile';` | `useIsMobile` | `/shared/components/src/hooks/useIsMobile.ts` | None (isolated hook) |

#### `useIsMobile` Hook Analysis

**Location**: `/shared/components/src/hooks/useIsMobile.ts` (lines 1–23)

**Implementation**:
```typescript
import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 767): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
```

**Dependencies**: Only `react` (peer dep, already in backlog-navigator's `package.json`)  
**Transitive workspace deps**: None  
**Surface area**: Pure React hook, no side effects on debrief content or conventions.

**Vendor/publish/copy recommendation**: **COPY** — The hook is 23 lines of self-contained logic with zero external debrief logic. Copying inline avoids a workspace dependency and reduces extraction friction. No integration changes needed.

#### No `@debrief/hooks` imports

The app does **not** import from `@debrief/hooks`. The only workspace dependency is `@debrief/components/hooks/useIsMobile`.

---

## 2. Hardcoded Debrief-isms

### Summary
**15 hardcoded debrief-specific strings and identifiers.**

| File:Line | Identifier | Type | Context | Value |
|-----------|-----------|------|---------|-------|
| `src/github/api.ts:25` | `DEFAULT_OWNER` | Export constant | GitHub API default | `'debrief'` |
| `src/github/api.ts:26` | `DEFAULT_REPO` | Export constant | GitHub API default | `'debrief-future'` |
| `src/github/api.ts:68` | Config init | Object literal | Client config | `{ owner: DEFAULT_OWNER, repo: DEFAULT_REPO }` |
| `vite.config.ts:8` | PWA manifest name | String literal | App branding | `'Debrief Backlog Navigator'` |
| `vite.config.ts:10` | PWA short_name | String literal | App branding | `'Backlog'` |
| `vite.config.ts:11` | PWA description | String literal | App branding | `'Edit the Debrief project backlog from any device.'` |
| `vite.config.ts:34` | Base URL path | String interpolation | vite base config | `'/debrief-future/backlog-navigator/'` |
| `e2e/prMode.spec.ts:21` | GitHub PR URL mock | String literal | Test fixture | `'https://github.com/debrief/debrief-future/pull/123'` |
| `e2e/realWrite.spec.ts:19` | GitHub PR URL mock | String literal | Test fixture | `'https://github.com/debrief/debrief-future/pull/42'` |
| `.lighthouserc.json:4` | Lighthouse test URL | String literal | LHCI config | `'http://localhost:5175/'` (relative; no absolute debrief URL) |

### Copy text with debrief conventions

| File:Line | Text | Purpose | Mutability |
|-----------|------|---------|-----------|
| `src/strings.ts:10` | `'Failed to load BACKLOG.md'` | Error message | Generic; OK to reuse |
| `src/strings.ts:76` | `'BACKLOG.md has moved since you loaded it...'` | Stale-base error | Generic; OK to reuse |
| `src/strings.ts:101` | `'PR #${n} doesn't currently touch BACKLOG.md.'` | PR mode message | Generic; OK to reuse |
| `src/strings.ts:114` | `'Backlog edits via Backlog Navigator.\n\n'` | PR body prefix | Generic; OK to reuse |

### Debrief references in comments (informational, not hardcoded)

| File:Line | Content |
|-----------|---------|
| `src/test-setup.ts:3` | Comment: `useIsMobile (from @debrief/components)` — informational only |
| `src/components/lazy/MobileSkeleton.tsx:11` | Comment: `@debrief/components's LogPanel/SkeletonLoader` — reference to source technique, not runtime coupling |

**No og-image paths, doc site URLs, or debrief.github.io URLs in source code.** (GitHub Actions workflows contain `https://debrief.github.io/debrief-future/backlog-navigator/` — see Category 6.)

---

## 3. Backlog-Convention Assumptions Baked into Source

### Summary
**Format assumptions hardcoded in parser/serializer; status/epic/scoring taxonomy baked in.**

### Status taxonomy

| File:Line | Definition | Values |
|-----------|-----------|--------|
| `src/types.ts:20–33` | `STATUS_VALUES` const export | `['needs-interview', 'proposed', 'approved', 'specified', 'clarified', 'planned', 'tasked', 'implementing', 'complete', 'blocked', 'parked', 'rejected']` |
| `src/types.ts:36–40` | `EDITABLE_STATUS_VALUES` | All except `'parked'` and `'rejected'` (terminal states) |

### Scoring (V·M·A) rubric

| File:Line | Definition | Values | Notes |
|-----------|-----------|--------|-------|
| `src/types.ts:42–43` | `COMPLEXITY_VALUES` | `['Low', 'Medium', 'High']` | Hardcoded enum |
| `src/types.ts:50–51` | `SCORE_VALUES` | `[1, 3, 5]` | Canonical 1/3/5 rubric (parser accepts any positive int) |
| `src/types.ts:53–54` | `ABSENT_SCORE` | `'-'` | Sentinel for missing score |

### Epic ID format

| File:Line | Rule | Implementation |
|-----------|------|-----------------|
| `src/types.ts:90` | Epic ID must match `E\d{2}` | Regex: `const EPIC_ID_RE = /^E\d{2}$/;` |
| `src/types.ts:91–96` | Validation helper `asEpicId()` | Throws if not `E00`–`E99` |
| `src/parser/parseBacklog.ts` | Parses `[[E01]]` tags in descriptions | Inline epic references; strikethrough tracking |

### BACKLOG.md format structure

| File:Line | Assumption | Implication |
|-----------|-----------|-----------|
| `src/types.ts:197–216` | `BacklogDocument` interface | Expects preamble, itemsHeader, itemsSeparator, items[], epicsSeparator, epics[], postamble; trailing newline |
| `src/parser/parseBacklog.ts` | Line-by-line table parser | Expects markdown tables with `\|` delimiters; strikethrough wrapping (`~~…~~`) for completed items |
| `src/parser/serializeBacklog.ts` | Byte-for-byte round-trip | Preserves unparsed rows verbatim via `RawRow[]` index tracking |
| `src/types.ts:74` | `SENTINEL_CREATED` | ISO date `'2025-01-01'` used when git history unavailable |

### Traceability tag format

| File:Line | Pattern | Use |
|-----------|---------|-----|
| `e2e/fixtures/backlog-fixture.md:2` | `[[E01]]`, `[[E02]]` | Epic reference syntax in description cells; parsed by `parseBacklog` |
| `src/parser/parseBacklog.ts` | `\[\[E\d{2}\]\]` extraction | Detects epic cross-references in item descriptions |

### Labels / category assumptions

**No hardcoded GitHub label taxonomy**, but the `category` column in items table is free-form:
- Fixture uses: `Feature`, `Tech Debt`, `Enhancement`, `Bug`, `Infrastructure`, `Documentation`, `Research Spike`
- Parser treats as arbitrary string; no validation

### Filter/status phase assumptions

| File:Line | Reference | Values |
|-----------|-----------|--------|
| `e2e/fixtures/README.md:32–34` | Workflow phases | `Triage` (`needs-interview`), `Active` (`proposed`–`implementing`), `Terminal` (`complete`, `blocked`, `parked`, `rejected`) |
| App UI filter bar | Status filter dropdown | Surfaces all `EDITABLE_STATUS_VALUES`; parked/rejected hidden by default |

---

## 4. GitHub-Specific Assumptions

### Summary
**Single default repo hardcoded; configurable via API; REST endpoints and PAT scopes are GitHub-specific.**

### Default repo slug

| File:Line | Config | Value | Overridable |
|-----------|--------|-------|------------|
| `src/github/api.ts:25–26` | `DEFAULT_OWNER`, `DEFAULT_REPO` | `'debrief'`, `'debrief-future'` | Yes, via `configureClient({ owner, repo })` |
| `src/github/api.ts:65–68` | Global config object | Initialised with defaults | Mutable after init |

### GitHub REST API endpoints called

| Method | Endpoint | Auth Required | Files:Lines |
|--------|----------|---------------|------------|
| `GET` | `/repos/{owner}/{repo}/contents/BACKLOG.md?ref={ref}` | No (public read) | `src/github/api.ts:138–153` |
| `GET` | `/repos/{owner}/{repo}/pulls/{number}` | No (public read) | `src/github/api.ts:155–158` |
| `GET` | `/repos/{owner}/{repo}/git/ref/heads/{branch}` | Yes (`repo` scope) | `src/github/api.ts:160–163` |
| `POST` | `/repos/{owner}/{repo}/git/refs` | Yes (`repo` scope) | `src/github/api.ts:167–179` (create branch) |
| `PUT` | `/repos/{owner}/{repo}/contents/BACKLOG.md` | Yes (`repo` scope) | `src/github/api.ts:181–203` (commit file) |
| `POST` | `/repos/{owner}/{repo}/pulls` | Yes (`repo` scope) | `src/github/api.ts:205–222` (open PR) |

### PAT scopes required

| Scope | Required | Usage | Mentioned |
|-------|----------|-------|-----------|
| `repo` | Yes, write operations only | Create branch, commit, open PR | `src/strings.ts:78`, `src/strings.ts:86` |

### PR URL assumptions

| File:Line | Reference | Implication |
|-----------|-----------|-----------|
| `src/App.tsx:92–94` | `prNumber` parameter | Expects GitHub PR number (int) from URL `?pr=NNN` |
| `src/App.tsx:95` | `pr.html_url` | Assumes GitHub HTML URL format (`https://github.com/{owner}/{repo}/pull/{n}`) |
| `.github/workflows/backlog-navigator-comment.yml:34` | `${navUrl}` construction | Hardcoded: `https://debrief.github.io/debrief-future/backlog-navigator/?pr=${prNumber}` |

### Branch naming convention

| File:Line | Convention | Purpose |
|-----------|-----------|---------|
| `src/state/push.ts:46` | `SLUG_PREFIX = 'backlog-navigator'` | Branch names: `backlog-navigator/{slug}-{YYYYMMDD}` |
| `src/state/push.ts:48–56` | `buildBranchName()` | Converts PR title to slug; hardcoded prefix |

### Service-Worker + GitHub API caching

| File:Line | Policy | Rationale |
|-----------|--------|-----------|
| `vite.config.ts:44–55` | `runtimeCaching` rules | Never cache GitHub API responses; always fetch live. Comments: `FR-019, R-2` |

---

## 5. Monorepo-Only Build/Test Infra

### Summary
**Root tsconfig inherited; app-level vitest/playwright configs self-contained; run-playwright.mjs imported from root context.**

### tsconfig inheritance

| File | Extends | Dependency | Scope |
|------|---------|-----------|-------|
| `apps/backlog-navigator/tsconfig.json:1` | `../../tsconfig.base.json` | ✓ Root config | Required; defines ES2022 target, strict mode, declaration maps |
| `apps/backlog-navigator/tsconfig.node.json` | Implicit (vite plugin config) | ✓ Root context | Build-only; vite config parsing |

**Stance**: `tsconfig.base.json` is monorepo-standard; backlog-navigator cannot build standalone without copying or inlining root config.

### Vitest config (self-contained)

| File | Location | Dependencies | Copyable |
|------|----------|--------------|----------|
| `vitest.config.ts` | App root | None (jsdom, `./src/test-setup.ts`) | ✓ Yes |
| `src/test-setup.ts` | App source | Polyfills `window.matchMedia` for jsdom | ✓ Yes |

**Stance**: Vitest setup is app-specific; no monorepo dependencies.

### Playwright config (self-contained)

| File | Location | Dependencies | Copyable |
|------|----------|--------------|----------|
| `playwright.config.ts` | App root | `@playwright/test`, `./e2e/helpers/viewports` | ✓ Yes |
| `run-playwright.mjs` | App root | `@sparticuz/chromium` (for CI), mirrors spec-navigator pattern | ✓ Yes |

**Stance**: Playwright setup is app-specific; no monorepo dependencies.

### Lighthouse CI config

| File | Location | Content | Monorepo Dep |
|------|----------|---------|------------|
| `.lighthouserc.json` | App root | Local URL `http://localhost:5175/`, gate on PWA + viewport + title | None (self-contained) |

**Stance**: Config is app-specific; can be copied as-is.

### ESLint config

**No `.eslintrc` in app root.** Assumed to inherit from monorepo root via `pnpm` workspace resolution.

**Implication**: Standalone build would need to supply ESLint config (can copy from root or create minimal version).

### Prettier config

**No `.prettierrc` in app or monorepo root.** Assumed implicit defaults or absent.

**Implication**: Standalone build would have no explicit prettier config; recommend adding if code-style consistency matters.

### Root Taskfile references

| File:Line | Reference | Purpose |
|-----------|-----------|---------|
| `/Taskfile.yml` | Task groups (not inspected in detail) | Likely includes build/test/lint tasks; check if app-specific tasks exist |

**Recommendation**: Review root Taskfile to see if app-specific task targets are defined (e.g., `task backlog-nav-build`). If yes, those must be extracted or rewritten.

---

## 6. CI / Hosting Touchpoints

### Summary
**3 GitHub Actions workflows dedicated to backlog-navigator; referenced in root CI.yml; deployed to debrief.github.io.**

### Dedicated workflows

#### `backlog-navigator-publish.yml` (Production)

| Line | Content | Dependency |
|------|---------|-----------|
| 1–10 | Trigger: `paths: ['apps/backlog-navigator/**', 'BACKLOG.md']` | Hardcoded path filters |
| 36 | `pnpm --filter @debrief/backlog-navigator build` | Hardcoded package name |
| 42 | Publish dir: `./apps/backlog-navigator/dist` | Hardcoded app path |
| 43 | Destination: `backlog-navigator` (on github-pages) | Hardcoded deployment slug |

**Deployment**: Publishes to `debrief.github.io/debrief-future/backlog-navigator/`

#### `backlog-navigator-preview.yml` (Branch previews)

| Line | Content | Dependency |
|------|---------|-----------|
| 16–21 | Trigger: `paths: ['apps/backlog-navigator/**', 'BACKLOG.md']` | Hardcoded path filters |
| 67 | `VITE_BACKLOG_NAV_DRY_RUN: 'true'` | Env var set to dry-run mode |
| 68 | `pnpm --filter @debrief/backlog-navigator build` | Hardcoded package name |
| 75 | Destination: `backlog-navigator-preview/${{ slug }}` | Hardcoded deployment slug prefix |

**Deployment**: Publishes to `debrief.github.io/debrief-future/backlog-navigator-preview/<branch-slug>/`

#### `backlog-navigator-comment.yml` (PR integration)

| Line | Content | Dependency |
|------|---------|-----------|
| 15 | Trigger: `paths: ['BACKLOG.md']` | Watches production file only |
| 34 | `https://debrief.github.io/debrief-future/backlog-navigator/?pr=${prNumber}` | Hardcoded production URL |
| 30–50 | GitHub Script: posts sticky PR comment with navigation link | Assumes debrief.github.io domain |

**Purpose**: Posts comment on PRs touching BACKLOG.md with link to PR-mode navigator.

### Root CI integration

| File:Line | Reference |
|-----------|-----------|
| `.github/workflows/ci.yml` | `run_step backlog-nav-build pnpm --filter @debrief/backlog-navigator build` |
| `.github/workflows/ci.yml` | `run_step backlog-nav-pw bash -c 'cd apps/backlog-navigator && node run-playwright.mjs'` |

**Implication**: Root CI polls backlog-navigator; extraction would require removing these steps or repointing them.

### PWA-specific CI gates

| File:Line | Reference | Rationale |
|-----------|-----------|-----------|
| `.lighthouserc.json:19–22` | Assertions: `installable-manifest`, `service-worker`, `viewport`, `document-title` | ADR-030 PWA requirements |
| `.github/workflows/backlog-navigator-publish.yml` | No explicit LHCI step (CI gate likely in root) | Verify if LHCI is run as separate job |

**Note**: Per ADR-030, PWA install + offline shell are required. Lighthouse CI gates on PWA basics.

---

## 7. Shared Dev Dependencies

### Summary
**All devDeps pinned at app level; no cross-app sharing detected. Root-level versions apply only via monorepo resolution.**

| Dependency | Version | Purpose | Pinned at |
|-----------|---------|---------|-----------|
| `@playwright/test` | `^1.58.0` | E2E testing | App root `package.json` |
| `@sparticuz/chromium` | `^143.0.4` | CI browser extraction | App root `package.json` |
| `@axe-core/playwright` | `^4.8.5` | A11y assertions (E2E) | App root `package.json` |
| `@testing-library/react` | `^14.0.0` | Unit test utilities | App root `package.json` |
| `vitest` | `^1.0.0` | Unit test runner | App root `package.json` |
| `typescript` | `^5.3.0` | Type checking | App root `package.json` |
| `eslint` | `^8.57.1` | Linting | App root `package.json` |
| `vite` | `^5.0.0` | Build tool | App root `package.json` |
| `vite-plugin-pwa` | `^0.20.5` | PWA manifest/SW generation | App root `package.json` |

**Stance**: All are app-specific; no dep version conflicts expected if extracted.

---

## 8. Test Data / Fixtures Coupled to Debrief Content

### Summary
**E2E fixture decoupled from live BACKLOG.md (by design). Unit tests generic. One PR-mode fixture hardcodes debrief repo.**

### E2E fixture: `e2e/fixtures/backlog-fixture.md`

| Aspect | Status | Details |
|--------|--------|---------|
| Live coupling | Decoupled (intentional) | Hand-curated fixture; never auto-regenerated. Spec 245 |
| Content | Generic test data | 12 rows; no debrief project references. Categories: Feature, Bug, Enhancement, etc. (generic) |
| Epics | Generic | `E01`, `E02` as test IDs; no debrief project epics |
| Status values | Uses debrief taxonomy | `proposed`, `approved`, `specified`, `clarified`, `implementing`, `complete`, `blocked`, `needs-interview`, `rejected` |

**Extractability**: Fixture is self-contained and portable. Can be copied to standalone repo as-is.

### PR-mode E2E fixtures

| File:Line | Hardcoded Content | Type |
|-----------|------------------|------|
| `e2e/prMode.spec.ts:21` | `html_url: 'https://github.com/debrief/debrief-future/pull/123'` | Mocked PR URL |
| `e2e/realWrite.spec.ts:19` | `html_url: 'https://github.com/debrief/debrief-future/pull/42'` | Mocked PR URL |

**Impact**: These are test fixtures (mocked API responses); changing to generic URLs (e.g., `https://github.com/example/example-repo/pull/123`) is trivial.

### Unit test snapshots

**No snapshots detected containing debrief-specific content.** Vitest tests in `src/**/__tests__/` are format/parsing focused, not content-focused.

---

## 9. Cross-Cutting Commits in Git History

### Summary
**App has 29+ dedicated commits since inception (#242 Phase 1 through Phase 8 + fixtures/polish). History is clean, app-specific.**

| Commit count | Range | Pattern |
|--------------|-------|---------|
| ~25 | `8730d88` – `8357d61` | App-only: phases 1–8, fixtures (245), lazy-loading (247), polish |
| ~4 | `1c48483` – `d853af2` | Cross-repo: Lighthouse gate (244), dark-theme fix, PWA asserts |
| ~29 total | Since `7c977ef` (initial MVP) | Clean separation; no interleaving with unrelated monorepo work |

**Historical assessment**: The backlog-navigator branch (and main commits touching only `apps/backlog-navigator/`) shows good isolation. No evidence of deep coupling to other app commits.

**Note**: Live BACKLOG.md changes will occasionally touch workflows/scripts, but the app logic itself is self-contained.

---

## 10. Documentation References

### Summary
**3 documentation files reference backlog-navigator; 1 ADR (030); 0 breaking migrations needed.**

### CHANGELOG.md

| Reference | Line(s) | Scope | Extractability |
|-----------|---------|-------|-----------------|
| Item #242 description | CHANGELOG entry | Feature summary: SPA, dry-run, PR mode, roundtrip gate | Informational only |

### ADR-030 (if exists)

**Expected**: PWA requirements (install, offline, update prompt).  
**Location**: `docs/project_notes/decisions.md` or `docs/decisions/ADR-030.md`  
**Extractability**: ADR design decisions are generic; no debrief-specific constraints detected in app code.

### specs/ directory

**Expected**: `specs/242-backlog-navigator/`, `specs/245-navigator-e2e-fixture/`, `specs/247-lazy-mobile-bundle/`  
**Extractability**: Spec documents are context-specific to debrief project; would need rewriting for standalone use.

### README.md (root)

**Check**: Does root README mention backlog-navigator?  
**Implication**: If yes, extraction PR should update root README to remove or archive reference.

---

## Extraction Effort Estimate

### By Category (rough sizing)

| Category | Effort | Complexity | Notes |
|----------|--------|-----------|-------|
| 1. Workspace deps removal | 1–2 hours | Low | Copy `useIsMobile` inline; remove `@debrief/components` from `package.json` |
| 2. Debrief-ism removal | 2–3 hours | Low | Replace hardcoded strings (`DEFAULT_OWNER`, `DEFAULT_REPO`, PWA name/desc). Test fixture URLs trivial. |
| 3. Backlog taxonomy decoupling | 8–12 hours | Medium | Evaluate: keep format as-is (easiest), or generalize? Status/Epic/Scoring enums are baked in; consider if other projects need different schema. |
| 4. GitHub decoupling | 4–6 hours | Medium | Repo slug is already configurable via `configureClient()`. Workflows must be rewritten (GitHub org assumptions). |
| 5. Config inheritance | 2–3 hours | Low | Copy/inline tsconfig.base.json, ESLint config. Playwright & Vitest configs are portable. |
| 6. CI/workflows | 3–4 hours | Low | Rewrite 3 workflows for new org; remove from root CI. Update deployment URLs. |
| 7. DevDep alignment | 1 hour | Low | No conflicts; pnpm versions should apply naturally. |
| 8. Test fixtures | 1 hour | Low | Update PR-mode fixture URLs (2 files). E2E fixture is generic. |
| 9. Git history | 0 hours | N/A | History is clean; no squashing/rebasing needed. |
| 10. Documentation | 1–2 hours | Low | Update/archive spec docs, README mentions. |

### Total Effort
**23–34 hours** (~3–4 days for one developer)

### Top 3 Highest-Friction Items

1. **Backlog-convention taxonomy coupling (Category 3)** — 8–12 hours  
   - Status values (`needs-interview`, `proposed`, etc.) are hardcoded in types.ts and assumed throughout parsing/UI.
   - Epic ID format (`E\d{2}`) is rigid.
   - Scoring rubric (1/3/5) is baked in.
   - **Decision**: If other projects need different backlog schemas, this becomes a design effort (generalize via config or accept format lock-in). Recommend: keep format as-is for MVP extraction; parameterize later if needed.

2. **Monorepo build inheritance (Category 5)** — 2–3 hours  
   - `tsconfig.base.json` inheritance breaks in standalone context.
   - **Mitigation**: Copy root config into app; ESLint config must be supplied (even if minimal).

3. **GitHub-to-{other platform} migration potential (Category 4)** — 4–6 hours  
   - Currently hardwired to GitHub REST API endpoints, branch naming, PR semantics.
   - `DEFAULT_OWNER` / `DEFAULT_REPO` are configurable, but workflows assume debrief GitHub org.
   - **Decision**: Extraction as-is keeps GitHub coupling. Generalizing to GitLab/Gitea would require significant refactor (not in scope for MVP). Recommend: extract to new GitHub org first; parameterize VCS later if needed.

---

## Key Findings

| Finding | Implication |
|---------|-----------|
| **1 workspace dep, 1 symbol** | Very low coupling. Copy `useIsMobile` inline; no transitive workspace deps. |
| **Backlog format is rigid** | Parser assumes debrief BACKLOG.md schema (epic tags, status enum, score columns). Portable to any GitHub repo, but not to other project mgmt tools without refactor. |
| **GitHub API is required** | App works only with GitHub (REST API, PAT, branch/PR model). Extractable to any GitHub org; not to other VCS without code changes. |
| **PWA + offline are first-class** | Service worker + update prompt are core; PWA install gate in CI. Portable; no debrief-specific PWA logic detected. |
| **CI footprint is clean** | 3 dedicated workflows; no cross-cutting CI dependencies. Rewritable for new org. |
| **E2E fixture is decoupled** | Hand-curated test data (spec 245); no live coupling. Portable as-is. |

---

## Vendor vs. Publish vs. Copy Recommendation

### `useIsMobile` Hook

| Option | Effort | Outcome | Recommended |
|--------|--------|---------|------------|
| **Copy** | 5 min | Inline 23-line hook; zero monorepo deps | ✓ **Yes** |
| **Publish to npm** | 1–2 hours | Extract to `@backlog-navigator/hooks`; maintain separately | No (over-engineered for MVP) |
| **Vendor from monorepo** | Ongoing cost | Keep `@debrief/components` dep; require monorepo access | No (defeats extraction goal) |

**Recommendation**: **COPY** — The hook is trivial, self-contained, and has no debrief logic. Copying it into the app saves extraction overhead and eliminates a workspace dependency. If the standalone app is later adopted by other projects, they can copy the hook too, or it can be published to npm in a separate step.

---

## Appendix: File Inventory

All files under `apps/backlog-navigator/src/` (63 source + test files):

**Entry point**: `src/main.tsx`, `src/App.tsx`  
**State**: `src/state/` (store, push, pendingEdits, persistence, deploymentMode)  
**GitHub**: `src/github/` (api, auth, schemas)  
**Parser**: `src/parser/` (parseBacklog, serializeBacklog)  
**UI Components**: `src/components/` (desktop + mobile, editors, dialogs)  
**Types**: `src/types.ts`  
**Strings**: `src/strings.ts`  
**E2E**: `e2e/` (12+ test specs, fixtures, helpers)  
**Playwright & Vitest configs**: App root

**Total source code**: ~2500 lines (excl. tests, markup, CSS)

