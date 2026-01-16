/**
 * Export - Map export functionality using leaflet-image
 */

import * as L from 'leaflet';

/**
 * Export the map as a PNG image
 * Note: This requires leaflet-image library to be loaded
 */
export async function exportMapAsPng(map: L.Map): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if leaflet-image is available
    const leafletImage = (window as unknown as { leafletImage?: unknown }).leafletImage;

    if (typeof leafletImage !== 'function') {
      // Fallback: use canvas capture if available
      const canvas = document.querySelector('#map canvas') as HTMLCanvasElement | null;
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png');
        return;
      }

      reject(
        new Error(
          'leaflet-image not available and canvas capture failed'
        )
      );
      return;
    }

    // Use leaflet-image
    (leafletImage as (map: L.Map, callback: (err: Error | null, canvas: HTMLCanvasElement) => void) => void)(
      map,
      (err: Error | null, canvas: HTMLCanvasElement) => {
        if (err) {
          reject(err);
          return;
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png');
      }
    );
  });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
