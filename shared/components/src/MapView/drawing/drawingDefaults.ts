import type { PointProperties, PolygonProperties } from '@debrief/schemas';

/** Default styling for drawn point features — green, distinct from track colours */
export const DEFAULT_DRAWN_POINT_STYLE: PointProperties = {
  shape: 'circle',
  radius: 6,
  fill: true,
  fill_color: '#4CAF50',
  fill_opacity: 0.7,
  stroke: true,
  color: '#388E3C',
  weight: 2,
  opacity: 1.0,
};

/** Default styling for drawn rectangle features — blue, matching area conventions */
export const DEFAULT_DRAWN_RECTANGLE_STYLE: PolygonProperties = {
  fill: true,
  fill_color: '#2196F3',
  fill_opacity: 0.15,
  stroke: true,
  color: '#1976D2',
  weight: 2,
  opacity: 0.8,
};
