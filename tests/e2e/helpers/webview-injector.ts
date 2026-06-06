/**
 * Webview Content Injector (Hybrid A+D)
 *
 * Intercepts the MessagePort handshake between VS Code's webview iframe
 * (pre/index.html) and the host, then injects extension content directly
 * through the captured port. This bypasses the broken content delivery
 * pipeline where VS Code's host never sends the 'content' message.
 *
 * Used together with the CDN interceptor (cdn-interceptor.ts):
 * - CDN interceptor: loads pre/index.html so the webview boots
 * - This injector: sends 'content' via the MessagePort so #active-frame renders
 *
 * Prerequisites (applied by scripts/patch-webview.sh):
 * - index.html: CSP commented out, origin hash bypassed
 * - workbench.js: Origin hash guard removed, visibility gate removed
 *
 * @see docs/project_notes/webview-e2e-research.md — Hybrid A+D
 */
import type { Page, Frame } from '@playwright/test';

export interface WebviewContentOptions {
  /** HTML content to inject into the webview's inner iframe */
  html: string;
  /** Allow scripts in the injected content (default: true) */
  allowScripts?: boolean;
}

/**
 * Install a webview-ready interceptor that sends content for ALL webviews.
 * Must be called BEFORE the webview iframe loads (i.e., before clicking sidebar).
 *
 * Each webview-ready event receives the same HTML content. For tests that
 * need different content per webview, call this multiple times with updated HTML.
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
      (window as any).__webviewContentCount = 0;

      window.addEventListener(
        'message',
        (e: MessageEvent) => {
          if (e.data?.channel === 'webview-ready' && e.ports?.length > 0) {
            const port = e.ports[0];
            port.postMessage({
              channel: 'content',
              args: {
                contents: args.html,
                title: 'E2E Webview Content',
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
            // Block subsequent 'content' messages on this port to prevent the
            // VS Code workbench from overwriting our injected content.
            const origPostMessage = port.postMessage.bind(port);
            port.postMessage = function (msg: any, ...rest: any[]) {
              if (msg?.channel === 'content') {
                return;
              }
              return origPostMessage(msg, ...rest);
            };
            (window as any).__webviewContentSent = true;
            (window as any).__webviewContentCount++;
          }
        },
        true
      );
    },
    { html, allowScripts }
  );
}

/**
 * Install an interceptor that responds with different content per webview.
 * Content is consumed in order: first webview-ready gets contentQueue[0], etc.
 */
export async function installMultiWebviewInterceptor(
  page: Page,
  contentQueue: WebviewContentOptions[]
): Promise<void> {
  const queue = contentQueue.map((opt) => ({
    html: opt.html,
    allowScripts: opt.allowScripts ?? true,
  }));

  await page.evaluate(
    (args: { queue: Array<{ html: string; allowScripts: boolean }> }) => {
      (window as any).__webviewInterceptorInstalled = true;
      (window as any).__webviewContentSent = false;
      (window as any).__webviewContentCount = 0;
      // Map of webview iframe id (the `id` query param baked into
      // `pre/index.html`'s URL) → captured port.  Stored so test
      // helpers can re-post a fresh `content` message for a specific
      // iframe when its initial queue slot was the wrong bundle —
      // the queue's index-based dispatch is intrinsically racy when
      // openvscode-server re-mounts iframes mid-session.
      (window as any).__webviewPortsById = (window as any).__webviewPortsById ?? {};
      let queueIndex = 0;

      const buildContentMessage = (content: { html: string; allowScripts: boolean }) => ({
        channel: 'content' as const,
        args: {
          contents: content.html,
          title: 'E2E Webview Content',
          options: {
            allowScripts: content.allowScripts,
            allowForms: content.allowScripts,
            allowMultipleAPIAcquire: false,
          },
          state: undefined,
          cspSource: '',
          confirmBeforeClose: 'keyboardOnly',
        },
      });

      // Expose the message-builder so helpers can re-post fresh
      // content via a stored port.
      (window as any).__buildWebviewContentMessage = buildContentMessage;

      window.addEventListener(
        'message',
        (e: MessageEvent) => {
          if (e.data?.channel === 'webview-ready' && e.ports?.length > 0) {
            const content = args.queue[queueIndex] ?? args.queue[args.queue.length - 1];
            if (queueIndex < args.queue.length) queueIndex++;

            const port = e.ports[0];
            const origPostMessage = port.postMessage.bind(port);

            // Stash the un-wrapped port indexed by the source iframe's
            // id query param so helpers can later re-deliver content
            // bypass-the-block.  We grab the id from the source
            // iframe's URL, which we look up via the message event's
            // source window.
            try {
              const iframes = document.querySelectorAll('iframe.webview');
              for (const f of Array.from(iframes)) {
                if ((f as HTMLIFrameElement).contentWindow === e.source) {
                  const url = new URL((f as HTMLIFrameElement).src);
                  const id = url.searchParams.get('id');
                  if (id) {
                    (window as any).__webviewPortsById[id] = origPostMessage;
                  }
                  break;
                }
              }
            } catch {
              // best-effort
            }

            origPostMessage(buildContentMessage(content));
            // Block any subsequent `content` messages pushed by the
            // workbench (which would overwrite our bundle), but allow
            // helpers to call the stashed `origPostMessage` directly.
            port.postMessage = function (msg: any, ...rest: any[]) {
              if (msg?.channel === 'content') return;
              return origPostMessage(msg, ...rest);
            };
            (window as any).__webviewContentSent = true;
            (window as any).__webviewContentCount++;
          }
        },
        true
      );
    },
    { queue }
  );
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
    const hostFrame = getWebviewHostFrame(page);
    if (hostFrame) {
      const hasActive = await hostFrame.evaluate(
        () => !!document.getElementById('active-frame')
      ).catch(() => false);

      if (hasActive) {
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
 * Unregister any service worker registered by code-server.
 *
 * code-server registers a service worker that can interfere with webview
 * content delivery. In openvscode-server this is a harmless no-op.
 */
export async function removeCodeServerServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  }).catch(() => {
    // Non-critical — may fail in restricted contexts
  });
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

  const icon = page.locator(sidebarSelector);
  await icon.first().click();

  return waitForActiveFrame(page, 20_000);
}
