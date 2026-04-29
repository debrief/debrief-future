/**
 * Map capture utility — wraps modern-screenshot's domToPng for Leaflet map capture.
 * Feature: 174-thumbnail-capture
 */
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
export declare function captureMapAsDataUrl(container: HTMLElement, options?: CaptureMapOptions): Promise<string>;
//# sourceMappingURL=captureMap.d.ts.map