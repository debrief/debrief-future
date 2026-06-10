/**
 * Page object for radiantearth/stac-browser v3.3.4 (vendored prebuilt dist
 * under apps/web-shell/test-fixtures/stac-browser-v3.3.4/).
 *
 * Spec 241 — encapsulates navigation through the stac-browser SPA so the
 * E2E spec stays focused on the assertions. Selectors target stable text
 * content + role attributes rather than CSS class names (which may shift
 * between minor versions).
 */

import { expect, type Page } from '@playwright/test';

export class StacBrowserPage {
  constructor(public readonly page: Page) {}

  /**
   * Open stac-browser and load the catalog by typing the URL into the
   * landing-page input. v3.x's hash-based routing didn't reliably auto-load
   * a `#/external/<url>` link in our headless run; the input form is the
   * UI's canonical entry point and works deterministically.
   */
  async gotoCatalog(stacBrowserBaseUrl: string, catalogUrl: string): Promise<void> {
    await this.page.goto(stacBrowserBaseUrl, { waitUntil: 'networkidle' });
    // The landing page renders an input + "Load" button asking for a STAC URL.
    const input = this.page.locator('input[placeholder*="https"], input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.fill(catalogUrl);
    await this.page.getByRole('button', { name: /^load$/i }).click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('main', { timeout: 15000 });
  }

  async waitForCollectionLanding(): Promise<void> {
    // The Collection landing page renders its title in an h1.
    await this.page.waitForSelector('h1', { timeout: 15000 });
  }

  async clickFirstItem(): Promise<void> {
    // stac-browser v3.x renders item titles as clickable anchors inside the
    // Items panel. The catalog page header is `Items` followed by a list
    // of card-style links — first link with a `Saxon Warrior` title (or
    // any item-detail link) reliably navigates.
    const itemLink = this.page.locator('a').filter({ hasText: /Saxon Warrior/i }).first();
    await itemLink.waitFor({ state: 'visible', timeout: 15000 });
    await itemLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Expand the Assets disclosure if present (stac-browser collapses it on
   * narrow viewports). No-op if already expanded or absent.
   */
  async expandAssets(): Promise<void> {
    const assetsHeader = this.page.getByRole('button', { name: /assets/i }).first();
    if (await assetsHeader.isVisible().catch(() => false)) {
      await assetsHeader.click().catch(() => undefined);
    }
  }

  async expectVisibleText(text: string | RegExp, timeoutMs = 15000): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: timeoutMs });
  }

  async expectThumbnailRendered(): Promise<void> {
    // stac-browser surfaces asset thumbnails as <img> elements; assert at
    // least one has loaded successfully.
    const img = this.page.locator('img').first();
    await img.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Return a locator for a named header link (`.web-shell__header-link`).
   * Pass no `name` to get all header links as a locator.
   */
  headerLink(name?: string | RegExp): ReturnType<typeof this.page.locator> {
    const base = this.page.locator('.web-shell__header-link');
    return name !== undefined ? base.filter({ hasText: name }) : base;
  }

  /**
   * Switch the active theme by mutating the VS Code body class that the
   * ThemeProvider's `vsCodeBodyClassSource` watches. The provider sets
   * `document.documentElement[data-theme]` within ~1s of the class change.
   *
   * Valid values:
   *   'light'                → vscode-light
   *   'dark'                 → vscode-dark
   *   'high-contrast-dark'   → vscode-high-contrast
   *   'high-contrast-light'  → vscode-high-contrast-light
   */
  async setTheme(
    theme: 'light' | 'dark' | 'high-contrast-dark' | 'high-contrast-light',
  ): Promise<void> {
    const BODY_CLASS_MAP = {
      light: 'vscode-light',
      dark: 'vscode-dark',
      'high-contrast-dark': 'vscode-high-contrast',
      'high-contrast-light': 'vscode-high-contrast-light',
    } as const;

    const wanted = [
      'vscode-light',
      'vscode-dark',
      'vscode-high-contrast',
      'vscode-high-contrast-light',
    ];

    const bodyClass = BODY_CLASS_MAP[theme];
    await this.page.evaluate(
      ({ wanted: w, bodyClass: cls }) => {
        for (const c of w) document.body.classList.remove(c);
        document.body.classList.add(cls);
      },
      { wanted, bodyClass },
    );

    // Wait for the ThemeProvider MutationObserver to flush `data-theme`.
    const DATA_THEME_MAP = {
      light: 'light',
      dark: 'dark',
      'high-contrast-dark': 'high-contrast-dark',
      'high-contrast-light': 'high-contrast-light',
    } as const;

    const expectedDataTheme = DATA_THEME_MAP[theme];
    await this.page.waitForFunction(
      (dt: string) => document.documentElement.getAttribute('data-theme') === dt,
      expectedDataTheme,
      { timeout: 2_000 },
    );
  }
}
