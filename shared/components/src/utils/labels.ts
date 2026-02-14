import type { DebriefFeature } from './types';
import { isTrackFeature, isReferenceLocation, isMultiPointFeature, isMultiPolygonFeature } from './types';

/**
 * Get a human-readable label for a feature.
 * Uses platform_name for tracks, name for reference locations.
 * Falls back to ID if no name is available.
 *
 * @param feature - The feature to get a label for
 * @returns A display label string
 */
export function getFeatureLabel(feature: DebriefFeature): string {
  // Access properties with type assertion to handle legacy data formats
  const props = feature.properties as unknown as Record<string, unknown>;

  if (isTrackFeature(feature)) {
    // Schema: platform_name, platform_id; Legacy: name
    return (
      feature.properties.platform_name ||
      feature.properties.platform_id ||
      (props.name as string) ||
      feature.id ||
      'Unnamed Track'
    );
  } else if (isMultiPointFeature(feature) || isMultiPolygonFeature(feature)) {
    return feature.properties.label || feature.id || 'Unnamed Feature';
  } else {
    // ReferenceLocation: name; Legacy: label
    return (
      feature.properties.name ||
      (props.label as string) ||
      feature.id ||
      'Unnamed Feature'
    );
  }
}

/**
 * Get an icon identifier for a feature based on its type.
 * Returns a string that can be used to look up an icon in a sprite sheet
 * or icon library.
 *
 * @param feature - The feature to get an icon for
 * @returns An icon identifier string
 */
export function getFeatureIcon(feature: DebriefFeature): string {
  if (isTrackFeature(feature)) {
    // Use track_type to determine icon
    switch (feature.properties.track_type) {
      case 'OWNSHIP':
        return 'vessel-ownship';
      case 'CONTACT':
        return 'vessel-contact';
      case 'REFERENCE':
        return 'vessel-reference';
      case 'SOLUTION':
        return 'vessel-solution';
      default:
        return 'vessel-unknown';
    }
  } else if (isMultiPointFeature(feature)) {
    return 'multi-point';
  } else if (isMultiPolygonFeature(feature)) {
    return 'multi-polygon';
  } else {
    // ReferenceLocation: use location_type to determine icon
    switch (feature.properties.location_type) {
      case 'WAYPOINT':
        return 'location-waypoint';
      case 'EXERCISE_AREA':
        return 'location-area';
      case 'DANGER_AREA':
        return 'location-danger';
      case 'ANCHORAGE':
        return 'location-anchor';
      case 'PORT':
        return 'location-port';
      case 'REFERENCE':
        return 'location-reference';
      default:
        return 'location-unknown';
    }
  }
}

/**
 * Get a color for a feature, using its explicit color property
 * or falling back to type-based defaults.
 *
 * @param feature - The feature to get a color for
 * @returns A CSS color string
 */
export function getFeatureColor(feature: DebriefFeature): string {
  // Check for explicit color in style (tracks have style.line.color)
  if (isTrackFeature(feature) && feature.properties.style?.line?.color) {
    return feature.properties.style.line.color;
  }

  // Check for explicit color in properties.style.color (annotations, multi-geometry)
  const props = feature.properties as unknown as Record<string, unknown>;
  const style = props.style as Record<string, unknown> | undefined;
  if (style?.color && typeof style.color === 'string') {
    return style.color;
  }
  // Check for top-level color property (legacy data)
  if (props.color && typeof props.color === 'string') {
    return props.color;
  }

  // Fall back to type-based defaults
  if (isTrackFeature(feature)) {
    switch (feature.properties.track_type) {
      case 'OWNSHIP':
        return '#0066cc'; // Blue for ownship
      case 'CONTACT':
        return '#cc0000'; // Red for contacts
      case 'REFERENCE':
        return '#666666'; // Gray for reference
      case 'SOLUTION':
        return '#00cc66'; // Green for solutions
      default:
        return '#999999';
    }
  } else if (isReferenceLocation(feature)) {
    switch (feature.properties.location_type) {
      case 'DANGER_AREA':
        return '#cc0000'; // Red for danger
      case 'EXERCISE_AREA':
        return '#ff9900'; // Orange for exercise
      default:
        return '#0066cc'; // Blue for other locations
    }
  } else {
    return '#0066cc'; // Default for multi-point/multi-polygon
  }
}

/**
 * Get a description or subtitle for a feature.
 * Returns additional contextual information about the feature.
 *
 * @param feature - The feature to describe
 * @returns A description string
 */
export function getFeatureDescription(feature: DebriefFeature): string {
  if (isTrackFeature(feature)) {
    const trackType = feature.properties.track_type.toLowerCase().replace('_', ' ');
    return `${trackType} track`;
  } else if (isMultiPointFeature(feature)) {
    return feature.properties.description || 'multi-point';
  } else if (isMultiPolygonFeature(feature)) {
    return feature.properties.description || 'multi-polygon';
  } else {
    const locType = feature.properties.location_type.toLowerCase().replace('_', ' ');
    return feature.properties.description || locType;
  }
}
