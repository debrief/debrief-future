import type { PointProperties, PolygonProperties, LineProperties } from '@debrief/schemas';

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

/** Default styling for drawn polygon features — orange, distinct from blue rectangles */
export const DEFAULT_DRAWN_POLYGON_STYLE: PolygonProperties = {
  fill: true,
  fill_color: '#FF9800',
  fill_opacity: 0.15,
  stroke: true,
  color: '#E65100',
  weight: 2,
  opacity: 0.8,
};

/** Default styling for drawn polyline features — teal, clearly a line not an area */
export const DEFAULT_DRAWN_POLYLINE_STYLE: LineProperties = {
  stroke: true,
  color: '#00BCD4',
  weight: 3,
  opacity: 0.9,
};
