/**
 * Web-shell live-preview launcher (#273, US1).
 *
 * Scopes the active storyboard from the in-memory FeatureCollection (via the
 * shared `scopeStoryboard` core — FR-017/C-E1), serialises it to a `Blob`,
 * creates a same-origin object URL, and opens the briefing-renderer in a new
 * tab at `<rendererBase>?features=<blobUrl>` (C-C1/C-C2). The web-shell tab
 * stays alive so the blob remains fetchable by the renderer. If the browser
 * blocks the new tab, a `PreviewBlockedError` is thrown so the caller can
 * surface the reason (FR-009/C-C4).
 *
 * The function is host-injected (object-URL + window APIs) so it is unit
 * testable without a real DOM.
 */

import { scopeStoryboard } from '@debrief/briefing-export';
import type { StoryboardPlot } from '@debrief/components';

export class PreviewBlockedError extends Error {
  constructor() {
    super(
      'The preview tab was blocked by the browser. Allow pop-ups for this site, then click Preview again.',
    );
    this.name = 'PreviewBlockedError';
  }
}

export interface PreviewWebDeps {
  /** Wraps `URL.createObjectURL`. */
  createObjectUrl(blob: Blob): string;
  /** Wraps `URL.revokeObjectURL` (best-effort cleanup on failure). */
  revokeObjectUrl?(url: string): void;
  /** Wraps `window.open`; returns null when the browser blocks the tab. */
  openWindow(url: string): { closed: boolean } | null;
  /** Renderer base, e.g. `${import.meta.env.BASE_URL}briefing-renderer/`. */
  rendererBaseUrl: string;
}

/** Build the renderer launch URL for a given features blob URL. */
export function buildPreviewUrl(rendererBaseUrl: string, featuresUrl: string): string {
  const base = rendererBaseUrl.endsWith('/') ? rendererBaseUrl : `${rendererBaseUrl}/`;
  return `${base}?features=${encodeURIComponent(featuresUrl)}`;
}

export interface PreviewWebResult {
  /** The launch URL opened in the new tab. */
  url: string;
  /** The object URL backing the features blob. */
  blobUrl: string;
}

export function previewStoryboardWeb(
  plot: StoryboardPlot,
  storyboardId: string,
  deps: PreviewWebDeps,
): PreviewWebResult {
  // Reuse the shared scoping core so preview and export target identical data.
  const scoped = scopeStoryboard(plot, storyboardId);
  const blob = new Blob([JSON.stringify(scoped.fc)], { type: 'application/geo+json' });
  const blobUrl = deps.createObjectUrl(blob);
  const url = buildPreviewUrl(deps.rendererBaseUrl, blobUrl);
  const win = deps.openWindow(url);
  if (win === null) {
    deps.revokeObjectUrl?.(blobUrl);
    throw new PreviewBlockedError();
  }
  return { url, blobUrl };
}
