# Phase 0 Extraction Audit: spec-navigator

## 1. Workspace `@debrief/*` package imports

**Finding**: Zero monorepo workspace imports. Spec-navigator is completely decoupled from `@debrief/*` packages.

- **File scanned**: All source files under `apps/spec-navigator/src/`
- **Result**: No `import from '@debrief/...'` statements found anywhere in the app
- All external dependencies are npm-published modules (React, Zod, highlight.js, etc.)

**ESLint shared rules**: The app's `.eslintrc.cjs` references shared ESLint rules from the monorepo (lines 1–5), but these are build-time only and include:
  - `../../shared/eslint-rules/no-redeclare-utils-exports.cjs`
  - `../../shared/eslint-rules/no-redeclare-schemas-exports.cjs`
  - `../../shared/eslint-rules/no-redeclare-components-exports.cjs`
  - `../../shared/eslint-rules/no-redeclare-session-state-exports.cjs`
  - `../../shared/eslint-rules/no-redeclare-data-exports.cjs`

**Extraction implication**: These rules enforce zero-drift across monorepo packages—they would need to be evaluated or removed for standalone use.

## 2. Hardcoded debrief-isms

### Repository slug defaults
- `src/github/api.ts:26–27`: 
  ```typescript
  const DEFAULT_OWNER = 'debrief';
  const DEFAULT_REPO = 'debrief-future';
  ```
  All GitHub API calls use these defaults if no `ApiOptions` are passed.

### Copy text and brand strings
- `src/strings.ts:70`: 
  ```typescript
  'Generate a fine-grained personal access token scoped to debrief/debrief-future with permissions: "Contents: Read" and "Pull requests: Read and Write".'
  ```
  
- `src/strings.ts:103`: 
  ```typescript
  empty: 'No open pull requests on debrief/debrief-future.',
  ```
  
- `src/strings.ts:108`: 
  ```typescript
  modalTitle: 'Open pull requests on debrief/debrief-future',
  ```

### Test fixture data
- `e2e/mock-github.ts:17–18`: 
  ```typescript
  export const MOCK_FEATURE = '191-spec-navigator';
  export const MOCK_FEATURE_FOLDER = `specs/${MOCK_FEATURE}`;
  ```
  
- `e2e/mock-github.ts:117–118, 124`: Hardcoded URL for debrief/debrief-future in download_url responses:
  ```typescript
  download_url: `https://raw.githubusercontent.com/debrief/debrief-future/${MOCK_ORIGINAL_SHA}/${MOCK_FEATURE_FOLDER}/spec.md`
  ```
  
- `e2e/mock-github.ts:138`: Hardcoded PR comment URL:
  ```typescript
  html_url: `https://github.com/debrief/debrief-future/pull/${MOCK_PR_NUMBER}#issuecomment-999`,
  ```

**Count**: 7 explicit "debrief" or "debrief-future" string literals across source and tests.

## 3. Path / filesystem conventions baked into source

### Feature folder structure assumption
- `src/state/useFeature.ts:20`: 
  ```typescript
  const FEATURE_FOLDER_RE = /^(specs\/\d{3,}-[a-z0-9-]+)\//;
  ```
  Hardcoded regex assumes feature folders live at `specs/NNN-*` where NNN is 3+ digits.

- `src/state/useFeature.ts:35`: 
  ```typescript
  if (/(contracts|evidence|checklists|screenshots|media)$/.test(entry.path)) {
  ```
  Assumes specific subdirectory names within feature folders for artifacts.

- `src/components/SubmitButton.tsx:23`: 
  ```typescript
  const m = c.path.match(/^specs\/(\d{3,}-[a-z0-9-]+)\//);
  ```
  Same `specs/NNN-*` assumption replicated for feature base extraction.

### Artifact filename conventions
- `src/format/classifyArtefact.ts:15–20`: Assumes exact filenames:
  ```typescript
  if (base === 'spec.md') return 'spec';
  if (base === 'plan.md') return 'plan';
  if (base === 'tasks.md') return 'tasks';
  if (base === 'research.md') return 'research';
  if (base === 'data-model.md') return 'data-model';
  if (base === 'quickstart.md') return 'quickstart';
  ```

- `src/state/useFeature.ts:30–49`: Artefact listing code assumes:
  - Top-level files in feature folder are artifacts
  - `contracts/`, `evidence/`, `checklists/`, `screenshots/`, `media/` subdirs contain nested artifacts to list recursively

**All path assumptions are expressed as regexes and hardcoded strings**—changing the feature folder structure, artifact naming, or subdirectory layout would require code edits, not configuration.

## 4. GitHub-specific assumptions

### API endpoint structure
- `src/github/api.ts:113–254`: Assumes GitHub REST API shape for:
  - `GET /repos/:owner/:repo/pulls/:number`
  - `GET /repos/:owner/:repo/pulls/:number/files`
  - `GET /repos/:owner/:repo/contents/:path?ref=:sha`
  - `POST /repos/:owner/:repo/issues/:number/comments`
  - `GET /repos/:owner/:repo/pulls?state=open&per_page=100&sort=updated&direction=desc`
  - Raw content from `https://raw.githubusercontent.com/:owner/:repo/:sha/:path`

All endpoints are hard to adapt without refactoring the `ApiOptions` pattern.

### Pull request number as URL parameter
- `src/App.tsx:19–26`: Expects `?pr=<number>` URL parameter:
  ```typescript
  function parsePrNumber(): number | null {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('pr');
    ...
  ```
  The entire app flow hinges on this parameter and a numeric PR number existing in a single GitHub repo.

### Branch naming / scope assumptions
- No explicit branch-naming pattern enforced in code, but `e2e/mock-github.ts:83` shows `'feat/test'` as a test head ref—only surface-level.

### Hardcoded trigger phrase for submissions
- `src/format/renderFeedbackComment.ts:15`: 
  ```typescript
  const TRIGGER = '@claude spec-review feedback submitted via spec-navigator.';
  ```
  This exact string appears in submitted PR comments and is parsed by external systems (likely speckit skills).

## 5. Monorepo-only build/test infra

### TypeScript base config
- `apps/spec-navigator/tsconfig.json:2`: 
  ```json
  "extends": "../../tsconfig.base.json",
  ```
  Inherits strict compiler options from monorepo root. The app **could stand alone** by inlining or replacing this, but currently depends on the shared base config.

### ESLint config and shared rules
- `apps/spec-navigator/.eslintrc.cjs:1–5`: Requires local filesystem paths to shared rule files in `../../shared/eslint-rules/`. The rules enforce zero-drift against monorepo types, but the app would need to either:
  - Inline the rules from `shared/eslint-rules/*.cjs`
  - Remove the drift-checking rules entirely
  - Replace with a minimal ESLint config

### Vite config
- `apps/spec-navigator/vite.config.ts:5`: 
  ```typescript
  base: process.env.VITE_BASE_URL || '/debrief-future/spec-navigator/',
  ```
  Assumes the app lives at a subpath under `debrief-future` domain. Configurable via env var but currently assumes GitHub Pages deployment structure.

### Playwright setup
- `apps/spec-navigator/playwright.config.ts:50`: 
  ```typescript
  baseURL: 'http://localhost:5174',
  ```
  Assumes a preview server at this URL; hardcoded in config.

### CI script: `run-playwright.mjs`
- `apps/spec-navigator/run-playwright.mjs:1–39`: A custom Playwright runner that extracts @sparticuz/chromium to a `.chromium-path` file. **Does not depend on monorepo infra** but mirrors `apps/web-shell/run-playwright.mjs` (per line 3 comment). This file could be extracted cleanly.

### `pnpm-workspace.yaml` dependency
- `pnpm-workspace.yaml:1–4`: Root workspace config. The app is one of many under `apps/*`. A standalone repo would need its own `pnpm-workspace.yaml` (minimal) or just a `package.json`.

## 6. CI / hosting touchpoints

### `.github/workflows/spec-navigator-comment.yml`
- Lines 8, 56, 69: References hardcoded domain `https://debrief.github.io/debrief-future/spec-navigator/` and repo context (`context.repo.owner`, `context.repo.repo`).
- Lines 38–40: Detects spec directories using `specs/` prefix regex in PR changed files.
- **Extraction implication**: Workflow is tightly coupled to the debrief-future repo. A standalone repo would need its own workflow or heavy parametrization.

### `.github/workflows/spec-navigator-preview.yml`
- Lines 4, 45, 56, 75: References hardcoded paths `/debrief-future/spec-navigator-preview/` and destination dir `spec-navigator-preview/`.
- Lines 39–44: Derives preview URL slug from branch name.
- Line 68: Filters the build to `@debrief/spec-navigator` package via pnpm.
- **Extraction implication**: Preview deployment is baked into this monorepo's structure. Standalone repo would need a new workflow.

### `.github/workflows/spec-navigator-publish.yml`
- Lines 40, 74: Deploy to `spec-navigator` destination dir under GitHub Pages.
- Line 33: Filters the build to `@debrief/spec-navigator` package.
- **Extraction implication**: Similar tight coupling to monorepo package name and GitHub Pages structure.

### `.github/workflows/ci.yml`
- Lines 141–142: 
  ```bash
  run_step spec-nav-build pnpm --filter @debrief/spec-navigator build || EXIT=$?
  run_step spec-nav-pw bash -c 'cd apps/spec-navigator && node run-playwright.mjs' || EXIT=$?
  ```
  Filters to `@debrief/spec-navigator` and runs Playwright from the app dir. These lines would need to be removed or adapted for a standalone repo.

**Summary**: 4 workflows reference spec-navigator; all assume monorepo layout and the `@debrief/spec-navigator` package name. Extraction would require rewriting or removing these workflows entirely.

## 7. Shared dev dependencies that would need to come along

### Root `package.json` devDependencies (shared across monorepo)
- `@playwright/test@^1.58.0` (pinned at root, also listed in app)
- `@sparticuz/chromium@^143.0.4` (pinned at root, also listed in app)
- `typescript@^5.3.0` (pinned at root, also listed in app)

### App-specific `package.json` devDependencies
- `@axe-core/playwright@^4.8.5`
- `@testing-library/dom@^10.4.1`
- `@testing-library/react@^14.0.0`
- `@types/react@^18.2.0`
- `@types/react-dom@^18.2.0`
- `@typescript-eslint/eslint-plugin@^6.21.0`
- `@typescript-eslint/parser@^6.21.0`
- `@vitejs/plugin-react@^4.2.0`
- `eslint@^8.57.1`
- `eslint-plugin-react@^7.37.5`
- `eslint-plugin-react-hooks@^4.6.2`
- `jsdom@^28.0.0`
- `vite@^5.0.0`
- `vitest@^1.0.0`

**Extraction implication**: The app's dev dependencies are already specified in its `package.json` and would move as-is. Root-pinned deps (`@playwright/test`, `@sparticuz/chromium`, `typescript`) would need to be copied to the standalone repo's `package.json` or `pnpm` lock.

## 8. Test data / fixtures coupled to debrief content

### E2E mock scenario data
- `e2e/mock-github.ts:14–21`: 
  - `MOCK_PR_NUMBER = 42` (generic)
  - `MOCK_FEATURE = '191-spec-navigator'` (debrief-specific feature ID)
  - `MOCK_FEATURE_FOLDER = 'specs/191-spec-navigator'` (hardcoded path)
  - `SPEC_MD_BODY` and `PLAN_MD_BODY` are generic markdown.

### E2E test assertions
- `e2e/submit.spec.ts:36`: 
  ```typescript
  expect(wire.body).toContain('@claude spec-review feedback submitted via spec-navigator.');
  ```
  Asserts the hardcoded trigger phrase.

- `e2e/submit.spec.ts:47`: 
  ```typescript
  expect(payload.schemaVersion).toBe('spec-review-feedback-v1');
  ```
  Asserts the schema version (also hardcoded in `renderFeedbackComment.ts`).

- `e2e/submit.spec.ts:56–118`: Tests reference `MOCK_FEATURE` in file paths but the feature ID itself is decoupled from debrief—just needs to match the regex `/specs/\d{3,}-[a-z0-9-]+/`.

**Extraction implication**: Test fixtures would need to replace `'191-spec-navigator'` with a generic feature ID (e.g., `'001-test-feature'`), but the structure is already generic. The trigger phrase is the only debrief-specific assertion that couples tests to external parsing logic.

## 9. Cross-cutting commits in git history

```
$ git log --oneline -- apps/spec-navigator/
44a76d2 Merge pull request #547 from debrief/claude/speckit-plan-142-7nDrD
```

Only one commit appears in the app's history—a merge commit from a speckit-generated branch. This is very clean: **the entire app was introduced in a single feature branch without interleaving monorepo changes**. The app is essentially a self-contained feature with no scattered history.

**Extraction implication**: No untangling of cross-cutting commits needed. The app can be extracted cleanly from git history.

## 10. Documentation references

### CLAUDE.md
- Line referencing spec-navigator tech stack:
  ```
  TypeScript 5.x (strict), React 18.x (static SPA at `apps/spec-navigator/`) + Vite 5.x, 
  `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + 
  `rehype-highlight` + `highlight.js` (artefact rendering), `zod ^3.22.0` 
  (GitHub REST boundary + payload validation), `@playwright/test` + `@axe-core/playwright` 
  (E2E + a11y); no backend, no new Python modules (191-spec-navigator)
  ```

- Line describing Playwright step:
  ```
  pnpm --filter @debrief/spec-navigator build && cd apps/spec-navigator && 
  node run-playwright.mjs && cd ../..
  ```

**Extraction implication**: CLAUDE.md documents the tech stack and build/test flow for the monorepo. These references would need to be updated or removed after extraction.

### README.md
No explicit mention of spec-navigator found in the main README.

---

## Extraction Effort Estimate

### By category:

| Category | Effort | Notes |
|----------|--------|-------|
| 1. Workspace imports | **0 hours** | Zero coupling; no work required. |
| 2. Hardcoded debrief-isms | **1–2 hours** | Parameterize `DEFAULT_OWNER` / `DEFAULT_REPO`; update 7 string literals in source and test fixtures. |
| 3. Path conventions | **0.5–1 hour** | Document regex assumptions; no code changes needed unless feature folder structure differs. |
| 4. GitHub API assumptions | **2–3 hours** | Refactor API layer to accept repo owner/name as config; already partially done via `ApiOptions` but incomplete. |
| 5. Monorepo build/test infra | **2–4 hours** | Inline `tsconfig.base.json` into local config; inline or remove ESLint drift rules; update Vite `base` URL; parameterize Playwright `baseURL`. |
| 6. CI / hosting | **4–8 hours** | Rewrite 4 GitHub Actions workflows for standalone repo; remove `@debrief/spec-navigator` package filter; adapt GitHub Pages deployment. |
| 7. Shared dev dependencies | **0.5 hours** | Copy root devDeps into standalone `package.json`. |
| 8. Test data / fixtures | **0.5–1 hour** | Replace `'191-spec-navigator'` with generic feature ID; consider extracting trigger phrase to config. |
| 9. Git history | **0 hours** | No cross-cutting commits; clean extraction. |
| 10. Documentation | **1 hour** | Update/remove CLAUDE.md references; write new README for standalone repo. |

**Total: 11–21 hours** (best case ~2.5 days, worst case ~3 days with testing).

---

## Top 3 Highest-Friction Items

1. **GitHub Actions workflow rewrite (6 CI / hosting)**
   - **Why high-friction**: 4 separate workflows deeply baked into monorepo assumptions (branch paths, package name filters, GitHub Pages structure). Requires understanding the CI/CD intent and rewriting from scratch.
   - **Effort**: 4–8 hours
   - **Blocker risk**: HIGH — workflows are how the app gets deployed; incorrect config breaks CD.

2. **GitHub API layer refactoring (4 GitHub-specific assumptions)**
   - **Why high-friction**: `ApiOptions` pattern is already in place but not universally applied. Many callers still use `DEFAULT_OWNER` / `DEFAULT_REPO` implicitly. Needs to thread repo context through the entire request layer and test mocks.
   - **Effort**: 2–3 hours
   - **Blocker risk**: MEDIUM — incomplete refactoring could leave hard-coded repo refs hiding in unexpected places.

3. **Build configuration untangling (5 Monorepo-only build/test infra)**
   - **Why high-friction**: Vite base URL, ESLint drift rules, TypeScript extends, and Playwright baseURL are all interdependent. Changing one requires understanding and adjusting the others; monorepo-specific tooling (`pnpm --filter`) is baked into CI and local scripts.
   - **Effort**: 2–4 hours
   - **Blocker risk**: MEDIUM — misconfigurations fail silently (wrong asset paths, stale lint rules) until runtime or CI.

---

## Summary Table

| Category | Coupling Type | Count | Severity |
|----------|---------------|-------|----------|
| Workspace imports | `@debrief/*` | 0 | None |
| Debrief-isms | Hardcoded strings | 7 | Medium |
| Path conventions | Regex patterns | 3 | Low (doc-only if unchanged) |
| GitHub API | REST endpoint assumptions | Implicit in API layer | Medium |
| Build infra | Config file deps | 5 | High |
| CI workflows | YAML workflows | 4 | High |
| Dev dependencies | npm modules | ~13 app-specific, 3 root-shared | Low |
| Test fixtures | Debrief feature IDs | 2 | Low |
| Git history | Cross-cutting commits | 0 | None |
| Docs | References in CLAUDE.md | 2 | Low |

**Cleanest to extract**: Zero workspace imports, clean git history, and all dev dependencies already self-contained.

**Messiest to extract**: CI workflows, build configuration interdependencies, and GitHub API assumptions scattered across multiple files.
