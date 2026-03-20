/**
 * @file formatService.ts
 * @description Format service for applying style changes to features.
 * Part of Feature 097 (Feature Format Menu).
 */

import type { StylePropertyDescriptor } from './stylePropertyMap.js';
import { getEditableProperties } from './stylePropertyMap.js';

export interface FormatChangeRequest {
  readonly featureIds: readonly string[];
  readonly property: string;
  readonly value: string | number | boolean;
  readonly isPointOverride?: boolean;
  readonly positionIndex?: number;
}

export interface FormatChangeResult {
  readonly activityId: string;
  readonly featuresUpdated: number;
  readonly previousValues: Record<string, unknown>;
}

export interface FormatMenuItem {
  readonly property: string;
  readonly label: string;
  readonly inputType: string;
  readonly disabled: boolean;
  readonly disabledReason?: string;
}

export interface FormatServiceDeps {
  /** Load GeoJSON feature collection from STAC store */
  loadGeoJson: (storePath: string, featureCollection: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  /** Write updated feature collection */
  writeGeoJson: (storePath: string, featureCollection: Record<string, unknown>) => Promise<void>;
  /** Append a provenance entry */
  appendProvenance: (storePath: string, entry: Record<string, unknown>) => Promise<number>;
  /** Mark the plot as dirty */
  markDirty: (plotId: string) => void;
  /** Get the current STAC store path */
  getStorePath: () => string | null;
}

export interface FormatService {
  applyStyleChange(plotId: string, request: FormatChangeRequest): Promise<FormatChangeResult>;
  getEditableProperties(featureKind: string): readonly FormatMenuItem[];
  buildMenuItems(featureKinds: readonly string[]): readonly FormatMenuItem[];
  getCurrentValue(plotId: string, featureId: string, property: string): Promise<unknown>;
}

/**
 * Sets a value at a dot-separated path in an object, creating intermediate objects as needed.
 */
function setNestedValue(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]!] = value;
}

/**
 * Gets a value at a dot-separated path in an object.
 */
function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  const parts = dotPath.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Convert a StylePropertyDescriptor to a FormatMenuItem.
 */
function toMenuItem(descriptor: StylePropertyDescriptor, disabled = false, disabledReason?: string): FormatMenuItem {
  return {
    property: descriptor.id,
    label: descriptor.label,
    inputType: descriptor.valueType,
    disabled,
    disabledReason,
  };
}

export function createFormatService(deps: FormatServiceDeps): FormatService {
  return {
    async applyStyleChange(plotId: string, request: FormatChangeRequest): Promise<FormatChangeResult> {
      const storePath = deps.getStorePath();

      if (!storePath) {
        throw new Error('No active plot: storePath is null');
      }

      const featureCollection = await deps.loadGeoJson(storePath, {} as Record<string, unknown>);
      if (!featureCollection) {
        throw new Error('Failed to load GeoJSON feature collection');
      }

      const features = (featureCollection.features as Array<Record<string, unknown>>) || [];
      const previousValues: Record<string, unknown> = {};
      let featuresUpdated = 0;

      for (const featureId of request.featureIds) {
        const feature = features.find((f: Record<string, unknown>) => f.id === featureId);
        if (!feature) {
          continue;
        }

        const properties = feature.properties as Record<string, unknown>;

        // Ensure style object exists
        if (!properties.style || typeof properties.style !== 'object') {
          properties.style = {};
        }

        let targetStyle: Record<string, unknown>;

        if (request.isPointOverride && request.positionIndex !== undefined) {
          // Handle position style override using map keyed by string index
          if (!properties.position_style_overrides || typeof properties.position_style_overrides !== 'object') {
            properties.position_style_overrides = {};
          }

          const overrides = properties.position_style_overrides as Record<string, Record<string, unknown>>;
          const key = String(request.positionIndex);

          if (!overrides[key] || typeof overrides[key] !== 'object') {
            overrides[key] = {};
          }

          targetStyle = overrides[key];
        } else {
          // Handle feature-level style
          targetStyle = properties.style as Record<string, unknown>;
        }

        // Read current value
        const currentValue = getNestedValue(targetStyle, request.property);
        previousValues[featureId] = currentValue;

        // Set new value
        setNestedValue(targetStyle, request.property, request.value);

        featuresUpdated++;
      }

      // Write updated GeoJSON
      await deps.writeGeoJson(storePath, featureCollection);

      // Record provenance
      const provenanceEntry = {
        activity_type: 'FORMAT_CHANGE',
        parameters: {
          featureIds: [...request.featureIds],
          property: request.property,
          value: request.value,
          isPointOverride: request.isPointOverride,
          positionIndex: request.positionIndex,
        },
        previousValues,
        timestamp: new Date().toISOString(),
      };

      await deps.appendProvenance(storePath, provenanceEntry);

      // Mark dirty
      deps.markDirty(plotId);

      const activityId = crypto.randomUUID();

      return {
        activityId,
        featuresUpdated,
        previousValues,
      };
    },

    getEditableProperties(featureKind: string): readonly FormatMenuItem[] {
      const descriptors = getEditableProperties(featureKind);
      return descriptors.map(d => toMenuItem(d));
    },

    buildMenuItems(featureKinds: readonly string[]): readonly FormatMenuItem[] {
      if (featureKinds.length === 0) return [];

      // Collect all properties across all kinds
      const allProperties = new Map<string, { descriptor: StylePropertyDescriptor; supportedBy: Set<string> }>();

      for (const kind of featureKinds) {
        const properties = getEditableProperties(kind);
        for (const prop of properties) {
          if (!allProperties.has(prop.id)) {
            allProperties.set(prop.id, { descriptor: prop, supportedBy: new Set() });
          }
          allProperties.get(prop.id)!.supportedBy.add(kind);
        }
      }

      // Build menu items
      const items: FormatMenuItem[] = [];
      for (const [, { descriptor, supportedBy }] of allProperties) {
        const allSupport = featureKinds.every(k => supportedBy.has(k));
        const unsupported = featureKinds.filter(k => !supportedBy.has(k));

        items.push(toMenuItem(
          descriptor,
          !allSupport,
          allSupport ? undefined : `Not applicable to: ${unsupported.join(', ')}`,
        ));
      }

      return items;
    },

    async getCurrentValue(plotId: string, featureId: string, property: string): Promise<unknown> {
      const storePath = deps.getStorePath();

      if (!storePath) {
        return undefined;
      }

      const featureCollection = await deps.loadGeoJson(storePath, {} as Record<string, unknown>);
      if (!featureCollection) {
        return undefined;
      }

      const features = (featureCollection.features as Array<Record<string, unknown>>) || [];
      const feature = features.find((f: Record<string, unknown>) => f.id === featureId);
      if (!feature) {
        return undefined;
      }

      const properties = feature.properties as Record<string, unknown> | undefined;
      const style = properties?.style as Record<string, unknown> | undefined;

      if (!style) {
        return undefined;
      }

      return getNestedValue(style, property);
    },
  };
}
