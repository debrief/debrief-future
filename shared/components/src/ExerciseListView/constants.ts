import type { ThumbnailSize, ThumbnailSizeConfig } from './types';

/** Thumbnail size configurations keyed by preset. */
export const THUMBNAIL_SIZE_CONFIGS: Record<ThumbnailSize, ThumbnailSizeConfig> = {
  small:  { rasterWidth: 60,  rasterHeight: 45,  spatialWidth: 56,  spatialHeight: 56,  rowHeight: 80 },
  medium: { rasterWidth: 120, rasterHeight: 90,  spatialWidth: 112, spatialHeight: 112, rowHeight: 135 },
  large:  { rasterWidth: 180, rasterHeight: 135, spatialWidth: 168, spatialHeight: 168, rowHeight: 190 },
};
