# Playwright Installation in Claude Code Sessions

> **2026-04-26 note.** "NPM Package Installation works ✅" depends on the
> cloud environment's **Network access** mode in Claude Code on the web. If
> the env is on `None` or a narrow custom allowlist, `npm install` 403s on
> `registry.npmjs.org`. Set it to **Trusted** or **Full** at `claude.ai/code`
> → environment settings to restore registry access. Local desktop CLI is
> unaffected. The browser-side findings in this doc (sandbox flags,
> `@sparticuz/chromium` extraction, `ERR_TUNNEL_CONNECTION_FAILED`,
> local-content-only testing) remain accurate regardless of the mode. See
> `docs/project_notes/key_facts.md` → "Claude Code on the Web: Network
> Access" for the full table.

## Research Date: 2026-02-05

## Executive Summary

**Playwright CAN be installed and run in Claude Code sessions** with the following caveats:
- Standard browser downloads are blocked (403 "Host not allowed")
- Workaround: Use `@sparticuz/chromium` package which bundles Chromium in npm
- Network access from browsers is blocked (`net::ERR_TUNNEL_CONNECTION_FAILED`)
- Local HTML/JavaScript tests work fully

## Local vs Cloud Development

| Environment | Browser Source | How to Run |
|-------------|----------------|------------|
| **Local macOS/Windows** | `pnpm exec playwright install chromium` | `pnpm test` |
| **Cloud (Claude Code, CI, Lambda)** | `@sparticuz/chromium` (bundled Linux binary) | `node run-playwright.mjs` |

**Important**: `@sparticuz/chromium` bundles a **Linux x86-64** binary. It will fail on local macOS/Windows with `ENOEXEC` (error -8).

For local development:
```bash
cd apps/web-shell
pnpm exec playwright install chromium  # Downloads native browser
pnpm test                               # Uses native browser
```

For cloud/CI:
```bash
cd apps/web-shell
node run-playwright.mjs                 # Extracts bundled Linux chromium
```

## Environment Details

| Property | Value |
|----------|-------|
| OS | Ubuntu 24.04.3 LTS |
| Kernel | Linux 4.4.0 |
| Node.js | v22.22.0 |
| npm | 10.9.4 |
| Python | 3.11.14 |
| User | root |
| Disk Space | 30GB available |

## What Works

### 1. NPM Package Installation
Standard npm packages install without issues:
- `@playwright/test` ✅
- `playwright-chromium` ✅
- `playwright-core` ✅
- `puppeteer-core` ✅
- `@sparticuz/chromium` ✅

### 2. Browser via @sparticuz/chromium
```bash
npm install @sparticuz/chromium puppeteer-core
```
This package bundles a Chromium binary that extracts to `/tmp/chromium` and works in the sandbox.

### 3. Local Tests
Playwright Test framework runs successfully for:
- `page.setContent()` - Setting HTML directly
- `page.locator()` - DOM queries
- `page.fill()` - Form interactions
- `page.click()` - Click events
- `page.evaluate()` - JavaScript execution
- `page.screenshot()` - Screenshot capture
- Full CSS/JavaScript rendering

## What Doesn't Work

### 1. Standard Browser Downloads
All these CDNs are blocked:
- `cdn.playwright.dev` ❌
- `dl.google.com` ❌
- Puppeteer Chrome downloads ❌

Error: `403 Forbidden - host_not_allowed`

### 2. Snap-based Browsers
Ubuntu's chromium-browser package requires snapd, which fails:
```
Failed to set capabilities on file '/usr/lib/snapd/snap-confine': Operation not supported
```

### 3. External Network from Browser
Chromium cannot access external URLs:
```
Error: page.goto: net::ERR_TUNNEL_CONNECTION_FAILED
```

## Working Configuration

### package.json
```json
{
  "devDependencies": {
    "@playwright/test": "^1.58.0",
    "@sparticuz/chromium": "^latest",
    "playwright-chromium": "^1.58.0"
  }
}
```

### playwright.config.js
```javascript
module.exports = {
  testDir: './',
  workers: 1,
  timeout: 30000,
  use: {
    launchOptions: {
      executablePath: '/tmp/chromium',
      args: [
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--no-zygote',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    },
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};
```

### Installation Steps
```bash
# Skip default browser downloads
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test playwright-chromium

# Install sparticuz chromium (bundled in npm)
npm install @sparticuz/chromium

# Run tests
npx playwright test
```

## Important Caveats

### 1. No Network Tests
Cannot test against real URLs. Use `page.setContent()` or mock servers:
```javascript
test('example', async ({ page }) => {
  // This works:
  await page.setContent('<h1>Test</h1>');

  // This fails:
  // await page.goto('https://example.com');
});
```

### 2. Avoid `--single-process` Flag
The `--single-process` flag (default in sparticuz args) causes browser crashes between tests. Use minimal args instead.

### 3. Chromium Only
Only Chromium is available. Firefox and WebKit cannot be installed.

## Use Cases

### Suitable For
- Component testing with mock HTML
- JavaScript behavior testing
- Screenshot/visual regression testing (local content)
- DOM manipulation testing
- Accessibility testing (local content)

### Not Suitable For
- E2E testing against real websites
- API integration tests requiring browser
- Performance testing against real URLs
- Cross-browser testing (Firefox/WebKit)

## Alternative: Puppeteer-core
If not using Playwright Test framework, puppeteer-core also works:

```javascript
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: chromium.args,
  headless: 'shell',
});
```

## Sources

- [Playwright Installation Docs](https://playwright.dev/docs/intro)
- [Playwright Browsers Docs](https://playwright.dev/docs/browsers)
- [@sparticuz/chromium npm](https://www.npmjs.com/package/@sparticuz/chromium)
- [BrowserStack Playwright Install Guide](https://www.browserstack.com/guide/playwright-install)
