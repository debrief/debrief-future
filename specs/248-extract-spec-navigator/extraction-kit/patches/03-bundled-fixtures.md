# Patch 03 — Bundled Playwright fixtures + live-mode toggle

## What

Add HTTP fixtures under `e2e/fixtures/` plus a Playwright route handler that intercepts GitHub API calls during test runs. By default the tests run offline against the fixtures; setting `LIVE_GITHUB=1` switches to the real network.

## Why

Decision **R-004** in research: contributors with no debrief-issued credentials must produce a green local build (FR-013). MSW / Polly are heavier than necessary — Playwright's built-in `page.route()` plus a small fixture-loader is sufficient.

## How

### Step 1 — Create the fixture directory

```sh
mkdir -p e2e/fixtures
```

### Step 2 — Define the fixture file format

Each fixture is a JSON file matching a GitHub REST URL pattern. Suggested layout:

```
e2e/fixtures/
├── pull-request-512.json          # GET /repos/:owner/:repo/pulls/512
├── pull-request-512-files.json    # GET /repos/:owner/:repo/pulls/512/files
├── contents-specs-191.json        # GET /repos/:owner/:repo/contents/specs/191-spec-navigator
├── raw-spec.md                    # GET /:owner/:repo/raw/<sha>/specs/.../spec.md
└── manifest.json                  # path → fixture filename mapping
```

`manifest.json`:

```json
{
  "/repos/debrief/debrief-future/pulls/512": "pull-request-512.json",
  "/repos/debrief/debrief-future/pulls/512/files": "pull-request-512-files.json",
  "/repos/debrief/debrief-future/contents/specs/191-spec-navigator": "contents-specs-191.json",
  "/debrief/debrief-future/<sha>/specs/191-spec-navigator/spec.md": "raw-spec.md"
}
```

### Step 3 — Add a fixture loader helper

Create `e2e/fixtures-loader.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, Route } from '@playwright/test';

const FIXTURES_DIR = join(__dirname, 'fixtures');
const manifest = JSON.parse(
  readFileSync(join(FIXTURES_DIR, 'manifest.json'), 'utf8'),
) as Record<string, string>;

/**
 * Mounts route interception that serves bundled fixtures for every GitHub
 * API call. Toggled OFF when LIVE_GITHUB=1 is set — the network is then
 * exercised end-to-end against real GitHub.
 */
export async function mountGithubFixtures(page: Page): Promise<void> {
  if (process.env.LIVE_GITHUB === '1') return;

  const handler = async (route: Route): Promise<void> => {
    const url = new URL(route.request().url());
    const lookupKey =
      url.pathname.startsWith('/raw') || url.host === 'raw.githubusercontent.com'
        ? url.pathname
        : url.pathname;
    const fixtureFile = manifest[lookupKey];
    if (!fixtureFile) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: `No fixture for ${lookupKey}` }),
      });
      return;
    }
    const body = readFileSync(join(FIXTURES_DIR, fixtureFile), 'utf8');
    const isJson = fixtureFile.endsWith('.json');
    await route.fulfill({
      status: 200,
      contentType: isJson ? 'application/vnd.github+json' : 'text/plain',
      body,
    });
  };

  await page.route('https://api.github.com/**', handler);
  await page.route('https://raw.githubusercontent.com/**', handler);
}
```

### Step 4 — Wire it into existing tests

Each spec file under `e2e/` adds a `beforeEach`:

```ts
import { test } from '@playwright/test';
import { mountGithubFixtures } from './fixtures-loader';

test.beforeEach(async ({ page }) => {
  await mountGithubFixtures(page);
});
```

### Step 5 — Add the recorder script

Create `scripts/record-fixtures.ts` (or `.mjs`):

```ts
/**
 * Re-records bundled fixtures by running Playwright in LIVE_GITHUB=1 mode and
 * serializing each intercepted request/response to e2e/fixtures/.
 *
 * Usage: GITHUB_TOKEN=<pat> pnpm fixtures:record
 *
 * Maintainer-only command — requires a fine-grained PAT.
 */
// (Implementation omitted in this kit recipe — see Playwright docs:
//  https://playwright.dev/docs/api/class-route#route-fulfill,
//  https://playwright.dev/docs/api/class-page#page-route)
```

Wire it into `package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:live": "LIVE_GITHUB=1 playwright test",
    "fixtures:record": "tsx scripts/record-fixtures.ts"
  }
}
```

### Step 6 — Document fixture freshness

Add to `README.md` Contributors section:

> Bundled fixtures may drift from real GitHub responses over time. Maintainers can re-record them with `GITHUB_TOKEN=<pat> pnpm fixtures:record`. The nightly `live.yml` workflow catches drift; on failure, refresh fixtures and commit.

## Verify

```sh
pnpm test:e2e               # default: bundled fixtures
LIVE_GITHUB=1 GITHUB_TOKEN=<pat> pnpm test:e2e:live  # opt-in live mode
```

Both should pass.

## Commit message

```
test(e2e): bundled fixtures by default; LIVE_GITHUB=1 for live mode

Allows contributors with no debrief-org credentials to produce a green
build. Live mode runs nightly + on push-to-main per /speckit.review R-004.
```
