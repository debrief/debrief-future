/**
 * Map capture utility — wraps modern-screenshot's domToPng for Leaflet map capture.
 * Feature: 174-thumbnail-capture
 */

import { domToPng, waitUntilLoad } from 'modern-screenshot';

/** Default capture dimensions matching the large thumbnail spec (800x600). */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export interface CaptureMapOptions {
  /** Target width in pixels (default: 800) */
  width?: number;
  /** Target height in pixels (default: 600) */
  height?: number;
}

/**
 * Capture the Leaflet map container as a PNG data URL.
 *
 * Uses modern-screenshot's domToPng which handles cross-origin tiles
 * (requires crossOrigin="anonymous" on TileLayer + a `connect-src` CSP
 * permissive enough to fetch each tile, since modern-screenshot inlines
 * them as base64 data URLs).
 *
 * `waitUntilLoad` is called first so any tiles still streaming after a
 * recent pan/zoom finish before the snapshot — without this, the PNG
 * captures only the SVG/marker layer because tile <img>s aren't yet
 * decodable.
 *
 * @param container - The DOM element containing the Leaflet map (.leaflet-container)
 * @param options - Optional capture dimensions
 * @returns PNG as a data URL string (data:image/png;base64,...)
 */
export async function captureMapAsDataUrl(
  container: HTMLElement,
  options: CaptureMapOptions = {},
): Promise<string> {
  const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT } = options;

  await waitUntilLoad(container);

  const dataUrl = await domToPng(container, {
    width,
    height,
    quality: 1,
    scale: 1,
  });

  return dataUrl;
}
