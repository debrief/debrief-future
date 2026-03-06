/**
 * Webview Content Injector
 *
 * Works around a code-server bug where `resolveWebviewView` is never called
 * for sidebar webview views, preventing VS Code from sending the `content`
 * message that creates `#active-frame`.
 *
 * Strategy:
 * 1. Install a message interceptor on the main window (capture phase)
 * 2. When `webview-ready` arrives from the webview iframe, capture the MessagePort
 * 3. Send a `content` message via the port with the desired HTML
 * 4. The webview host page's content handler processes it, creating `#active-frame`
 *
 * Prerequisites (applied by scripts/patch-webview.sh):
 * - index.html: `disableServiceWorker = true` (bypasses SW requirement)
 * - index.html: CSP meta tag commented out (allows modified script)
 * - workbench.js: Origin hash guard removed (lets webview-ready be processed)
 *
 * @see docs/project_notes/webview-e2e-research.md
 */
import type { Page, Frame } from '@playwright/test';

export interface WebviewContentOptions {
  /** HTML content to inject into the webview's inner iframe */
  html: string;
  /** Allow scripts in the injected content (default: true) */
  allowScripts?: boolean;
}

/**
 * Install the webview-ready interceptor on the page.
 * Must be called BEFORE the webview iframe loads (i.e., before clicking sidebar).
 */
export async function installWebviewInterceptor(
  page: Page,
  options: WebviewContentOptions
): Promise<void> {
  const html = options.html;
  const allowScripts = options.allowScripts ?? true;

  await page.evaluate(
    (args: { html: string; allowScripts: boolean }) => {
      (window as any).__webviewInterceptorInstalled = true;
      (window as any).__webviewContentSent = false;

      window.addEventListener(
        'message',
        (e: MessageEvent) => {
          if (e.data?.channel === 'webview-ready' && e.ports?.length > 0) {
            const port = e.ports[0];
            port.postMessage({
              channel: 'content',
              args: {
                contents: args.html,
                title: 'E2E Test Content',
                options: {
                  allowScripts: args.allowScripts,
                  allowForms: args.allowScripts,
                  allowMultipleAPIAcquire: false,
                },
                state: undefined,
                cspSource: '',
                confirmBeforeClose: 'keyboardOnly',
              },
            });
            (window as any).__webviewContentSent = true;
          }
        },
        true
      );
    },
    { html, allowScripts }
  );
}

/**
 * Remove the code-server service worker that interferes with webview loading.
 */
export async function removeCodeServerServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      if (r.active?.scriptURL?.includes('_static')) {
        await r.unregister();
      }
    }
  });
}

/**
 * Get the webview host frame (pre/index.html).
 */
export function getWebviewHostFrame(page: Page): Frame | undefined {
  return page.frames().find((f) =>
    f.url().includes('workbench/contrib/webview/browser/pre')
  );
}

/**
 * Wait for the webview's #active-frame to be created.
 * Polls for both the host frame and #active-frame within it.
 */
export async function waitForActiveFrame(
  page: Page,
  timeoutMs = 20_000
): Promise<Frame | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Re-find the host frame each iteration (it may not exist yet)
    const hostFrame = getWebviewHostFrame(page);
    if (hostFrame) {
      const hasActive = await hostFrame.evaluate(
        () => !!document.getElementById('active-frame')
      ).catch(() => false);

      if (hasActive) {
        // Return the first child frame (the active-frame iframe)
        const children = hostFrame.childFrames();
        if (children.length > 0) {
          return children[0];
        }
      }
    }
    await page.waitForTimeout(500);
  }
  return null;
}

/**
 * High-level helper: activate a sidebar webview and return the inner frame.
 */
export async function activateWebviewWithContent(
  page: Page,
  html: string,
  sidebarSelector = '.action-item a[aria-label*="Debrief"], .action-item a[aria-label*="debrief"]'
): Promise<Frame | null> {
  await installWebviewInterceptor(page, { html });
  await removeCodeServerServiceWorker(page);

  const icon = page.locator(sidebarSelector);
  await icon.first().click();

  return waitForActiveFrame(page, 20_000);
}
