import type { DebriefFeature } from './types';
import { isTrackFeature } from './types';

/**
 * Get a human-readable label for a feature.
 * Uses platform_name for tracks, name for reference locations.
 * Falls back to ID if no name is available.
 *
 * @param feature - The feature to get a label for
 * @returns A display label string
 */
export function getFeatureLabel(feature: DebriefFeature): string {
  if (isTrackFeature(feature)) {
    return feature.properties.platform_name || feature.properties.platform_id || feature.id;
  } else {
    return feature.properties.name || feature.id;
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
  } else {
    // Use location_type to determine icon
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
  // Check for explicit color in properties
  if (feature.properties.color) {
    return feature.properties.color;
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
  } else {
    switch (feature.properties.location_type) {
      case 'DANGER_AREA':
        return '#cc0000'; // Red for danger
      case 'EXERCISE_AREA':
        return '#ff9900'; // Orange for exercise
      default:
        return '#0066cc'; // Blue for other locations
    }
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
  } else {
    const locType = feature.properties.location_type.toLowerCase().replace('_', ' ');
    return feature.properties.description || locType;
  }
}
