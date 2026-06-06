# Usage Example: Backlog Navigator E2E Fixture

The refactor replaces ~40 LoC of duplicated mock-fetch boilerplate per
spec file with a one-line import. This document shows the before / after
shape of a typical spec, plus the SC-005 grep proof.

---

## Before — every spec duplicated the helper

```typescript
// apps/backlog-navigator/e2e/browse.spec.ts (excerpt)

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKLOG_PATH = join(__dirname, '..', '..', '..', 'BACKLOG.md'); // ← live file

function encodeUtf8ToBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

async function mockGithubBacklogFetch(page: Page): Promise<void> {
  const text = readFileSync(BACKLOG_PATH, 'utf8');
  const body = JSON.stringify({
    type: 'file',
    encoding: 'base64',
    content: encodeUtf8ToBase64(text),
    sha: '0123456789abcdef0123456789abcdef01234567',
    path: 'BACKLOG.md',
  });
  await page.route('https://api.github.com/**/contents/BACKLOG.md*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });
}

test('captures push-dialog screenshot', async ({ page }) => {
  await mockGithubBacklogFetch(page);
  // ... rest of test
});
```

This pattern appeared verbatim (modulo a `readFileSync.../BACKLOG.md`
path with one extra `..` for mobile specs) in **all 14** spec files —
once per spec.

The brittle bit: when `BACKLOG.md` was patched on `main` such that the
first row was already `approved`, this fragment …

```typescript
const row = page.locator('table.items tbody tr').first();
await row.locator('.cell-editor select[aria-label="Status"]').selectOption('approved');
// → no-op: before === after, Push button stays disabled, click times out
```

… silently broke CI. That's the regression this ticket fixes.

---

## After — one-line import, fixture-backed

```typescript
// apps/backlog-navigator/e2e/browse.spec.ts (post-refactor)

import { expect, test } from '@playwright/test';
import { mockGithubBacklogFetch } from './helpers/mock-github.js'; // ← shared helper

test('captures push-dialog screenshot', async ({ page }) => {
  await mockGithubBacklogFetch(page);
  // Fixture row 001 is `proposed`; flipping to `tasked` is a guaranteed change.
  await page
    .locator('table.items tbody tr').first()
    .locator('.cell-editor select[aria-label="Status"]')
    .selectOption('tasked');
  // ... rest of test
});
```

The helper itself is the only file that reads from disk, and it reads
the **fixture** (not the live BACKLOG.md):

```typescript
// apps/backlog-navigator/e2e/helpers/mock-github.ts

const DEFAULT_FIXTURE_PATH = join(__dirname, '..', 'fixtures', 'backlog-fixture.md');

export async function mockGithubBacklogFetch(
  page: Page,
  fixturePath: string = DEFAULT_FIXTURE_PATH,
): Promise<void> {
  const text = readFileSync(fixturePath, 'utf8');
  // ... base64 + page.route() ...
}
```

Mobile specs in `e2e/mobile/` use the same import path
(`from '../helpers/mock-github.js'`) and rely on the default — the fixture
path is computed from the helper's own `__dirname`, not the caller's, so
no override is needed.

---

## SC-005 verification

```sh
$ cd apps/backlog-navigator
$ grep -rn "readFileSync.*BACKLOG" e2e/
$ echo "exit code: $?"
exit code: 1   # grep exits 1 when there are zero matches
```

Zero E2E spec file reads the live `BACKLOG.md`. The matches that remain
when grepping for the literal string `BACKLOG.md` are the GitHub API URL
pattern (intercepted by `page.route()`), the response-body `path` field,
comments, and the helper module itself — see
`evidence/validation-output.txt` for the full sweep.

---

## Defensive conditional removal

Two mobile specs had a "guess the new status from the current text"
fallback that hid the live-coupling bug:

```typescript
// BEFORE (interaction.mobile.spec.ts, push.mobile.spec.ts):
const beforeStatus = (await firstCard.getByTestId('status-chip').textContent()) ?? '';
const newStatus = beforeStatus.toLowerCase().includes('approved') ? 'specified' : 'approved';
await select.selectOption(newStatus);

// AFTER:
// Fixture row 001 is `proposed` → `approved` is a guaranteed change.
await select.selectOption('approved');
```

Same intent (a guaranteed status change), but with deterministic targets
backed by the hand-curated fixture's known starting state.
