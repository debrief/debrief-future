/**
 * Resolve the live-preview features URL (#273).
 *
 * Prefers the launch query `?features=<url>` (VS Code loopback + web-shell
 * blob both set it). Falls back to `window.__BRIEFING_PREVIEW_FEATURES__`,
 * which the VS Code preview server injects into the served `index.html`
 * because code-server's `asExternalUri` rewrite to `/proxy/<port>/` drops the
 * launch query — without the fallback the renderer would see no `?features`
 * and boot its dev fixture (the wrong storyboard).
 *
 * Returns `null` when neither is present, so the synchronous inline / dev
 * fixture boot path runs unchanged.
 */

interface PreviewWindow {
  readonly location: { readonly search: string };
  readonly __BRIEFING_PREVIEW_FEATURES__?: unknown;
}

export function resolveFeaturesUrl(win: PreviewWindow): string | null {
  const fromQuery = new URLSearchParams(win.location.search).get('features');
  if (fromQuery) return fromQuery;
  const injected = win.__BRIEFING_PREVIEW_FEATURES__;
  return typeof injected === 'string' && injected.length > 0 ? injected : null;
}
