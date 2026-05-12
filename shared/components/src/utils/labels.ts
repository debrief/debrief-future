import type { DebriefFeature } from './types';
import { isTrackFeature, isReferenceLocation, isMultiPointFeature, isMultiPolygonFeature, isAnnotationFeature } from './types';

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
    return feature.properties.platform_name || feature.properties.platform_id || feature.id || 'Unnamed Track';
  } else if (isMultiPointFeature(feature) || isMultiPolygonFeature(feature)) {
    return feature.properties.label || feature.id || 'Unnamed Feature';
  } else if (isReferenceLocation(feature)) {
    return feature.properties.name || feature.id || 'Unnamed Feature';
  } else {
    // Storyboards (Spec #258) and Scenes carry their label on `name`/`title`.
    // No dedicated `isStoryboardFeature` import here — keep `labels.ts` free
    // of the storyboard subgraph (Article IV.1).
    // eslint-disable-next-line no-restricted-syntax -- Annotation-union properties type does not include storyboard slots; structural read at this boundary.
    const props = feature.properties as unknown as {
      kind?: string;
      name?: string;
      title?: string;
      label?: string;
      text?: string;
    };
    if (props.kind === 'STORYBOARD' && typeof props.name === 'string' && props.name) {
      return props.name;
    }
    if (props.kind === 'STORYBOARD_SCENE' && typeof props.title === 'string' && props.title) {
      return props.title;
    }
    // Annotation union: label is optional on most types, absent on NarrativeEntry/TextAnnotation
    if (typeof props.label === 'string' && props.label) {
      return props.label;
    }
    if (typeof props.text === 'string' && props.text) {
      return props.text;
    }
    return props.kind || feature.id || 'Unnamed Feature';
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
  } else if (isReferenceLocation(feature)) {
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
  } else {
    return 'shape-annotation';
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
  // Extract color from typed style properties
  if (isTrackFeature(feature) && feature.properties.style?.line?.color) {
    return feature.properties.style.line.color;
  }

  // Annotation/location/multi-geometry: style.color is typed on each variant
  if (isAnnotationFeature(feature) || isReferenceLocation(feature) ||
      isMultiPointFeature(feature) || isMultiPolygonFeature(feature)) {
    const style = feature.properties.style;
    if (style && 'color' in style && typeof style.color === 'string') {
      return style.color;
    }
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
  } else if (isReferenceLocation(feature)) {
    const locType = feature.properties.location_type.toLowerCase().replace('_', ' ');
    return feature.properties.description || locType;
  } else {
    return (feature.properties.kind ?? '').toLowerCase().replace('_', ' ') || 'annotation';
  }
}
