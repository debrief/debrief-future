/**
 * Image downscale utility — resizes a data URL PNG using an offscreen canvas.
 * Feature: 174-thumbnail-capture
 */

/** Default small thumbnail dimensions (200x150). */
const DEFAULT_TARGET_WIDTH = 200;
const DEFAULT_TARGET_HEIGHT = 150;

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
export async function downscaleDataUrl(
  dataUrl: string,
  options: DownscaleOptions = {},
): Promise<string> {
  const { width = DEFAULT_TARGET_WIDTH, height = DEFAULT_TARGET_HEIGHT } = options;

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for downscaling'));
    img.src = dataUrl;
  });
}
