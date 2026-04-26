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

  test('8-class failure matrix (T086-T088 + #198 T043)', async ({ page }) => {
    const classes: Array<{ phrase: string; reason: string }> = [
      { phrase: 'auth-failure test', reason: 'auth-failure' },
      { phrase: 'rate-limit test', reason: 'rate-limit' },
      { phrase: 'provider-error test', reason: 'provider-error' },
      { phrase: 'timeout test', reason: 'timeout' },
      { phrase: 'malformed test', reason: 'malformed-response' },
      { phrase: 'not-configured test', reason: 'not-configured' },
      { phrase: 'ceiling-reached test', reason: 'ceiling-reached' },
      // #198 T043 — extends the matrix from 7 to 8 classes.
      { phrase: 'keyring-unavailable test', reason: 'keyring-unavailable' },
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

// ---------------------------------------------------------------------------
// #198 T040–T042 — keyring-unavailable scenarios
//
// These extend the same harness-skipped suite. The harness must support a
// new test hook that monkey-patches the proxy's getter to control whether
// `secrets.get` rejects, resolves with a value, or resolves with undefined.
// (Documented in plan.md §VS Code Webview E2E Testing.)
// ---------------------------------------------------------------------------

const KEYRING_EVIDENCE_DIR = resolve(
  HERE,
  '..',
  '..',
  'specs',
  '198-nl-keyring-banner',
  'evidence',
  'screenshots',
);
mkdirSync(KEYRING_EVIDENCE_DIR, { recursive: true });

test.describe.skip('NL search — keyring-unavailable scenarios (#198 T040-T042)', () => {
  test('T040 — secrets.get throws → keyring-unavailable banner with distinct copy', async ({
    page,
  }) => {
    // Harness pre-condition: stub `context.secrets.get` to reject on EVERY
    // call. Then submit any phrase; the banner must surface.
    await page.goto(WEBVIEW_URL);
    await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

    const input = page.getByTestId('quick-search-input');
    await input.fill('UK submarines');
    await input.press('Enter');

    const banner = page.getByTestId('live-transport-banner');
    await banner.waitFor({ timeout: 10_000 });
    await expect(banner).toHaveAttribute(
      'data-transport-reason',
      'keyring-unavailable',
    );

    // Body copy MUST mention the keyring and MUST NOT instruct the user
    // to re-enter their key (FR-004).
    const text = (await banner.textContent()) ?? '';
    expect(text).toMatch(/keyring/i);
    expect(text).not.toMatch(/re-?enter/i);

    // Both action buttons rendered; secondary "Open settings" must NOT
    // be the primary call to action — the harness asserts via the
    // `--secondary` modifier class on its `data-testid`.
    await expect(page.getByTestId('live-transport-banner-help')).toBeVisible();
    await expect(
      page.getByTestId('live-transport-banner-open-settings'),
    ).toBeVisible();

    await page.screenshot({
      path: resolve(KEYRING_EVIDENCE_DIR, 'vscode-keyring-unavailable.png'),
      fullPage: false,
    });
  });

  test('T041 — regression: no key saved → not-configured banner unchanged', async ({
    page,
  }) => {
    // Harness pre-condition: stub `context.secrets.get` to RESOLVE with
    // `undefined` (no key ever saved). Behaviour must not regress.
    await page.goto(WEBVIEW_URL);
    await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

    const input = page.getByTestId('quick-search-input');
    await input.fill('UK submarines');
    await input.press('Enter');

    const banner = page.getByTestId('live-transport-banner');
    await banner.waitFor({ timeout: 10_000 });
    await expect(banner).toHaveAttribute(
      'data-transport-reason',
      'not-configured',
    );

    // Existing copy still mentions setting an API key.
    expect((await banner.textContent()) ?? '').toMatch(/api key/i);

    await page.screenshot({
      path: resolve(KEYRING_EVIDENCE_DIR, 'banner-not-configured-unchanged.png'),
      fullPage: false,
    });
  });

  test('T042 — recovery: throw once, resolve next; second submission succeeds', async ({
    page,
  }) => {
    // Harness pre-condition: stub `context.secrets.get` to REJECT on the
    // first call, then RESOLVE with a valid key on the second call. The
    // first submission shows the banner; the second succeeds (chip
    // applied) without any extension reload (FR-007).
    await page.goto(WEBVIEW_URL);
    await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

    // 1st submission — banner up.
    const input = page.getByTestId('quick-search-input');
    await input.fill('UK submarines');
    await input.press('Enter');
    const banner = page.getByTestId('live-transport-banner');
    await banner.waitFor({ timeout: 10_000 });
    await expect(banner).toHaveAttribute(
      'data-transport-reason',
      'keyring-unavailable',
    );

    // Trace the recovery animation for an evidence GIF; the harness
    // exposes `page.video()`-like trace via Playwright's standard
    // `recordVideo` config.
    await input.fill('French frigates');
    await input.press('Enter');

    // Second submission must produce a chip and clear the banner.
    await page
      .locator('[data-testid^="lozenge-"]')
      .first()
      .waitFor({ timeout: 10_000 });
    await expect(page.getByTestId('live-transport-banner')).toHaveCount(0);

    await page.screenshot({
      path: resolve(KEYRING_EVIDENCE_DIR, 'recovery-after-unlock-final.png'),
      fullPage: false,
    });
  });
});
