import React, { useMemo, useCallback } from 'react';
import { CascadingMenu } from '../CascadingMenu/CascadingMenu';
import { buildFormatMenuItems, parseMenuItemId, resolvePresetValue } from './formatMenuItems';
import type { StylePropertyDescriptor } from './formatMenuItems';
import { resolvePropertiesForKinds } from './stylePropertyMap';
import './FormatMenu.css';

export interface FormatMenuProps {
  readonly featureIds: readonly string[];
  readonly featureKinds: readonly string[];
  /** Style property descriptors. If omitted, resolved automatically from featureKinds. */
  readonly properties?: readonly StylePropertyDescriptor[];
  readonly currentValues?: Record<string, unknown>;
  readonly disabledProperties?: Map<string, string>;
  readonly anchorPosition: { x: number; y: number };
  readonly onFormatChange: (featureIds: readonly string[], property: string, value: string | number) => void;
  readonly onDismiss: () => void;
}

/**
 * FormatMenu — context menu for applying style presets to selected features.
 *
 * Thin wrapper around CascadingMenu that:
 * 1. Builds menu items from style property descriptors
 * 2. Resolves preset selections to actual values
 * 3. Calls onFormatChange with the resolved property and value
 */
export function FormatMenu(props: FormatMenuProps): React.ReactElement {
  const {
    featureIds,
    featureKinds,
    properties: externalProperties,
    currentValues,
    disabledProperties,
    anchorPosition,
    onFormatChange,
    onDismiss,
  } = props;

  // Resolve properties from featureKinds when not explicitly provided
  const properties = useMemo(() => {
    if (externalProperties && externalProperties.length > 0) return externalProperties;
    return resolvePropertiesForKinds(featureKinds);
  }, [externalProperties, featureKinds]);

  // Build menu items from property descriptors
  const menuItems = useMemo(() => {
    return buildFormatMenuItems(properties, currentValues, disabledProperties);
  }, [properties, currentValues, disabledProperties]);

  // Handle menu item selection
  const handleSelect = useCallback(
    (itemId: string) => {
      // Parse the item ID to get property + preset
      const parsed = parseMenuItemId(itemId);
      if (!parsed) {
        console.warn('FormatMenu: Unable to parse item ID:', itemId);
        onDismiss();
        return;
      }

      // Find the property descriptor to get valueType
      const property = properties.find(p => p.id === parsed.property);
      if (!property) {
        console.warn('FormatMenu: Unknown property:', parsed.property);
        onDismiss();
        return;
      }

      // Resolve the preset value
      const value = resolvePresetValue(parsed.presetId, property.valueType);
      if (value === undefined) {
        console.warn('FormatMenu: Unable to resolve preset value:', parsed.presetId);
        onDismiss();
        return;
      }

      // Apply the format change
      onFormatChange(featureIds, parsed.property, value);

      // Dismiss the menu
      onDismiss();
    },
    [featureIds, properties, onFormatChange, onDismiss]
  );

  return (
    <div className="format-menu">
      <CascadingMenu
        items={menuItems}
        anchorPosition={anchorPosition}
        onSelect={handleSelect}
        onDismiss={onDismiss}
      />
    </div>
  );
}
