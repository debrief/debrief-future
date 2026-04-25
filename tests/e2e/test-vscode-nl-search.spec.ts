/**
 * VS Code E2E — NL search inside the Catalog Overview (#191 T054, T068-T070,
 * T086-T089).
 *
 * This suite runs against a `code-server` host with a pre-populated workspace
 * configuration that supplies:
 *   - `debrief.nlSearch.enabled: true`
 *   - a stub API key via SecretStorage (injected by the Extension Test Host
 *     setup script)
 *   - the "Debrief: NL Search — Stub Mode" command flipped on (Phase 5
 *     T084-T085), which replaces the real `providerCall` with a
 *     phrase-keyed deterministic stub.
 *
 * Coverage checklist (also tracked in specs/191-vscode-nl-search/tasks.md):
 *   T054  US1 happy path — enabled + stub key → phrase → chips + indicator
 *   T068  US2 opt-out    — enabled=false → submit 10 phrases → 0 outbound
 *   T070  credential isolation — distinctive key → grep DOM/network/log
 *   T086  7-class failure matrix
 *   T087  per-class screenshots → specs/191-vscode-nl-search/evidence/…
 *   T089  cancellation-is-silent race
 *
 * NOTE — at the time of authoring, the code-server + @sparticuz/chromium
 * harness used by `apps/web-shell` is the preferred runner. A follow-up
 * task wires this spec to that harness (see
 * `docs/project_notes/playwright-installation-research.md`). Until then,
 * this file is the authoritative test plan — it lists the exact selectors
 * and expectations the runtime must satisfy.
 */

import { test, expect } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(
  HERE,
  '..',
  '..',
  'specs',
  '191-vscode-nl-search',
  'evidence',
  'screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

// The harness is responsible for opening the Catalog Overview panel and
// returning a Playwright `page` that already points at the webview iframe.
// For now this file documents the selectors + expectations; the Phase 6
// task wires a real harness.
const WEBVIEW_URL = process.env.CATALOG_OVERVIEW_URL ?? 'about:blank';

test.describe.skip('NL search in VS Code Catalog Overview — needs harness (T054, T086)', () => {
  test('happy path — submit "UK submarines" with stub, see chips + indicator', async ({ page }) => {
    await page.goto(WEBVIEW_URL);
    await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

    const input = page.getByTestId('quick-search-input');
    await input.fill('UK submarines');
    await input.press('Enter');

    // Chip appears.
    await page.locator('[data-testid^="lozenge-"]').first().waitFor({ timeout: 10_000 });
    await expect(page.getByTestId('nl-search-indicator')).toBeVisible();

    // Screenshot for evidence.
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'vscode-happy-path.png'),
      fullPage: false,
    });
  });

  test('opt-out — enabled=false, submit many phrases, zero nl-provider outbound (T068)', async ({ page, context }) => {
    const outbound: string[] = [];
    context.on('request', (req) => {
      const url = req.url();
      if (/anthropic\.com/.test(url) || /\/v1\/messages\b/.test(url)) {
        outbound.push(url);
      }
    });
    // TODO: harness sets enabled=false.
    await page.goto(WEBVIEW_URL);
    for (const phrase of [
      'UK submarines',
      'French frigates',
      'German destroyers',
      'Russian tankers',
      'NATO warships',
      'Polish corvettes',
      'Italian patrol',
      'Spanish trawlers',
      'Norwegian subs',
      'Exercise Joint Warrior',
    ]) {
      const input = page.getByTestId('quick-search-input');
      await input.fill(phrase);
      await input.press('Enter');
      await page.waitForTimeout(80);
    }
    expect(outbound).toEqual([]);

    writeFileSync(
      resolve(EVIDENCE_DIR, '..', 'sc-003-zero-outbound.json'),
      JSON.stringify(
        {
          feature: '191-vscode-nl-search',
          capturedAt: new Date().toISOString(),
          outbound,
        },
        null,
        2,
      ),
    );
  });

  test('credential isolation — key never leaks to webview / network (T070)', async ({ page }) => {
    // TODO: harness seeds a distinctive stub key like `sk-ISOLATION-PROBE-XYZ`.
    await page.goto(WEBVIEW_URL);
    const input = page.getByTestId('quick-search-input');
    await input.fill('UK submarines');
    await input.press('Enter');
    await page.waitForTimeout(500);
    const domHtml = await page.content();
    expect(domHtml).not.toContain('sk-ISOLATION-PROBE-XYZ');
  });

  test('7-class failure matrix (T086-T088)', async ({ page }) => {
    const classes: Array<{ phrase: string; reason: string }> = [
      { phrase: 'auth-failure test', reason: 'auth-failure' },
      { phrase: 'rate-limit test', reason: 'rate-limit' },
      { phrase: 'provider-error test', reason: 'provider-error' },
      { phrase: 'timeout test', reason: 'timeout' },
      { phrase: 'malformed test', reason: 'malformed-response' },
      { phrase: 'not-configured test', reason: 'not-configured' },
      { phrase: 'ceiling-reached test', reason: 'ceiling-reached' },
    ];
    for (const c of classes) {
      await page.goto(WEBVIEW_URL);
      const input = page.getByTestId('quick-search-input');
      await input.fill(c.phrase);
      await input.press('Enter');
      const banner = page.getByTestId('live-transport-banner');
      await banner.waitFor({ timeout: 10_000 });
      await expect(banner).toHaveAttribute('data-transport-reason', c.reason);
      await page.screenshot({
        path: resolve(EVIDENCE_DIR, `banner-${c.reason}.png`),
        fullPage: false,
      });
    }
  });

  test('cancellation is silent — A pending, B lands; no banner for A (T089)', async ({ page }) => {
    await page.goto(WEBVIEW_URL);
    const input = page.getByTestId('quick-search-input');
    await input.fill('slow-stub phrase'); // TODO: harness provides a slow stub
    await input.press('Enter');
    await input.fill('UK submarines');
    await input.press('Enter');
    await page.locator('[data-testid^="lozenge-"]').first().waitFor({ timeout: 10_000 });
    // Only B resolved; no banner.
    await expect(page.getByTestId('live-transport-banner')).toHaveCount(0);
  });
});
