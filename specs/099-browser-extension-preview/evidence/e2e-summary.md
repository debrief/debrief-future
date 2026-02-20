# E2E Smoke Test Summary — Feature 099

**Date**: 2026-02-20
**Test File**: `tests/e2e/test-preview-smoke.spec.ts`
**Status**: Test created, awaiting Docker container for execution

## Test Coverage

| Test | Description | Status |
|------|-------------|--------|
| VS Code workbench loads | Verifies `.monaco-workbench` is visible | Created |
| Debrief activity bar icon present | Checks for `[id*="debrief"]` in activity bar | Created |
| Log activity panel accessible | Checks for `[id*="log"]` in activity bar | Created |
| File explorer shows sample workspace | Opens explorer and verifies file tree | Created |
| Capture full workspace screenshot | Full-page screenshot for evidence | Created |

## Test Infrastructure

The smoke test uses the existing E2E infrastructure:

- **Fixture**: `tests/e2e/fixtures/base.ts` (`codeServerPage`)
- **Page Object**: `tests/e2e/models/code-server-page.ts` (`CodeServerPage`)
- **Config**: `tests/e2e/playwright.config.ts` (reads `CODE_SERVER_URL`)
- **Screenshots**: Saved to `specs/099-browser-extension-preview/evidence/screenshots/`

## Running the Test

Against a local preview container:
```bash
CODE_SERVER_URL=http://localhost:8080 pnpm exec playwright test \
  --config=tests/e2e/playwright.config.ts test-preview-smoke
```

Against a Heroku review app:
```bash
CODE_SERVER_URL=https://<app>.herokuapp.com pnpm exec playwright test \
  --config=tests/e2e/playwright.config.ts test-preview-smoke
```

## Notes

- Docker daemon was not available in the cloud session, so the test could not be executed
- The test is ready to run once the preview container is built locally or deployed to Heroku
- The test follows the same patterns as existing E2E tests in the project
