# Key Facts

Project configuration, constants, and frequently-needed **non-sensitive** information.

## ⚠️ Security Warning

**NEVER store passwords, API keys, or credentials in this file.** This file is committed to version control.

---

### Project Information

**Repository:**
- Name: debrief-future
- Purpose: Ground-up rebuild of Debrief maritime tactical analysis platform (v4.x)
- Status: Pre-implementation planning phase

**Demo Environment:**
- Mechanism: Heroku Review Apps (per-PR, not a single persistent URL)
- Config: `heroku.yml` + `app.json` + `Dockerfile.preview` at repo root
- URL pattern: `https://<app>-pr-<num>.herokuapp.com` — posted to each PR by
  the github-actions bot as a "🚀 Preview Deployments" comment linking to
  Code Server, Web Shell, and Storybook apps
- Playwright harness: `.github/workflows/heroku-e2e.yml` (manual dispatch,
  takes a review-app URL as input)
- History: a single persistent Fly.io demo at `https://debrief-demo.fly.dev`
  was retired 2026-04-17 in favour of per-PR previews — see ADR-018 in
  `decisions.md` for the reversal recipe.

### Technology Stack

**Languages:**
- Python 3.11+ (services, domain logic)
- TypeScript 5.x (frontends, generated types)

**Key Libraries:**
- LinkML (master schemas)
- Pydantic v2 (Python validation)
- AJV (JSON Schema validation in JS)
- React 18+ (UI components)
- Electron 28+ (desktop app)

**Packaging:**
- Python: uv workspaces
- TypeScript: pnpm workspaces

### Build Sequence (Tracer Bullet)

0. Schemas (LinkML models, generators)
1. debrief-stac (local STAC catalog)
2. debrief-io (REP file parsing)
3. debrief-config (user state)
4. Loader (Electron mini-app)
5. debrief-calc (analysis tools)
6. VS Code Extension

### Local Development

**Demo Container (Heroku-style local build):**
```bash
# Build the preview image used by Heroku Review Apps
docker build -f Dockerfile.preview -t debrief-preview .
docker run -p 8080:8080 -e PORT=8080 debrief-preview
# Access at http://localhost:8080
```

### Important URLs

**Documentation:**
- Constitution: `CONSTITUTION.md`
- Architecture: `ARCHITECTURE.md`
- Vision: `VISION.md`
- Roadmap: `docs/tracer-delivery-plan.md`

**External:**
- Demo: per-PR Heroku Review Apps (see "Demo Environment" above for URL
  pattern + how to reach them)

### CI Secrets

**WEBSITE_PUSH_TOKEN** (required for the schema-docs auto-sync in
`.github/workflows/schema-docs.yml`):
- **Purpose:** lets the `deploy-main` job push into
  `debrief/debrief.github.io` under `future/schemas/` on every merge to
  `main`.
- **Type:** fine-grained PAT OR GitHub App installation token.
- **Scope:** `contents: write` on `debrief/debrief.github.io` only.
- **Where:** repository secret at
  `debrief/debrief-future` → Settings → Secrets and variables → Actions.
- **If missing:** the sync step fails loudly on the next push to main;
  schema-docs on our own gh-pages still deploy fine (they run earlier in
  the same job).
- **Rotation:** if using a PAT, set a calendar reminder to rotate before
  its expiry; expired tokens surface as a `401 Unauthorized` at the
  `Checkout debrief.github.io` step.

### Dynamic Tool Selection (Calc Service)

**How tool matching works:**
- Python calc tools declare `context_type` (SINGLE/MULTI/REGION/NONE) and `input_kinds`
- `fetchToolsFromMcp()` in `calcService.ts` converts these to `SelectionRequirement[]` (kind + min/max)
- `ToolMatchAdapter` converts session selection (feature IDs) → kind counts via `mapPanel.getFeatureKind()`
- `checkRequirements()` in `tool.ts` uses **closed-world matching** (ADR-005): tool active only if all selected kinds are in its requirements, and counts are within bounds

**Feature kinds recognized:** `TRACK`, `POINT`, `RESULT`, `REGION`

**Key files:**
- Tool requirements generation: `calcService.ts` → `fetchToolsFromMcp()`
- Feature kind resolution: `mapPanel.ts` → `getFeatureKind()`
- Match logic: `tool.ts` → `checkRequirements()`
- Adapter bridging session↔matching: `toolMatchAdapter.ts`
- Feature resolution for execution: `calcService.ts` → `resolveFeatures()`

### Claude Code Session: Browser Testing

**Playwright/Puppeteer Installation:**
- Standard browser downloads blocked (403 from cdn.playwright.dev)
- Workaround: Use `@sparticuz/chromium` npm package (bundles Chromium)
- External network from browser blocked (`ERR_TUNNEL_CONNECTION_FAILED`)
- Local HTML/JavaScript tests work via `page.setContent()`
- Research document: `docs/project_notes/playwright-installation-research.md`

**Working Setup:**
```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test playwright-chromium
npm install @sparticuz/chromium
```
- Config requires `executablePath: '/tmp/chromium'` and sandbox-disable flags

### E2E Testing Infrastructure

**Two test suites:**
- **Storybook E2E**: `shared/components/e2e/` — isolated React component tests against Storybook
- **VS Code Webview E2E**: `tests/e2e/` — full extension workflow tests against code-server

**Key files:**
- Patch script: `tests/e2e/scripts/patch-webview.sh`
- Webview injector: `tests/e2e/helpers/webview-injector.ts`
- Page objects: `tests/e2e/models/code-server-page.ts`, `tests/e2e/models/debrief-webview.ts`
- Playwright configs: `tests/e2e/playwright.config.ts` (webview), `shared/components/playwright.config.ts` (Storybook)

**Running webview E2E tests:**
```bash
bash tests/e2e/scripts/patch-webview.sh
xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts
```

**Running Storybook E2E tests:**
```bash
pnpm --filter @debrief/components test:e2e
```

**Environment variables:**
- `CODE_SERVER_URL` — default `http://localhost:8080`
- `E2E_HEADED=1` — enables headed Chromium (required for webview tests)
- `CLAUDE_CODE=1` — uses `@sparticuz/chromium` bundled binary

**Developer guide:** `docs/e2e-testing-guide.md`
**Research notes:** `docs/project_notes/webview-e2e-research.md`
**Architecture decision:** ADR-007 in `docs/project_notes/decisions.md`
