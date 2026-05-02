/**
 * Image downscale utility — resizes a data URL PNG using an offscreen canvas.
 * Feature: 174-thumbnail-capture
 */
export interface DownscaleOptions {
    /** Target width in pixels (default: 200) */
    width?: number;
    /** Target height in pixels (default: 150) */
    height?: number;
}
/**
 * Downscale a PNG data URL to a smaller size using an offscreen canvas.
 *
 * @param dataUrl - Source PNG as a data URL (data:image/png;base64,...)
 * @param options - Target dimensions
 * @returns Downscaled PNG as a data URL string
 */
export declare function downscaleDataUrl(dataUrl: string, options?: DownscaleOptions): Promise<string>;
//# sourceMappingURL=resizeImage.d.ts.map