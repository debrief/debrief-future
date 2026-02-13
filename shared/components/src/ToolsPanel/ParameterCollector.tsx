/**
 * ParameterCollector component - orchestrates sequential parameter collection.
 *
 * Takes a tool's parameters array and an anchor position, then shows a
 * ContextMenu for each parameter in sequence. When all values are collected,
 * calls onComplete with the collected values. Cancellation at any stage
 * calls onCancel (no execution).
 *
 * Feature: 091-tool-parameter-context-menus
 */

import { useState, useCallback } from 'react';
import { ContextMenu } from '../ContextMenu';
import type { ContextMenuItem } from '../ContextMenu';
import type { ToolParameter } from '../ToolMatch/types';
import { resolveParamType, isPresetType } from '../ToolMatch/paramTypeResolver';

export interface ParameterCollectorProps {
  /** Tool parameters to collect (in order) */
  parameters: ToolParameter[];
  /** Position to anchor the context menu */
  anchorPosition: { x: number; y: number };
  /** Called when all parameters are collected */
  onComplete: (params: Record<string, unknown>) => void;
  /** Called when collection is cancelled */
  onCancel: () => void;
}

/**
 * Resolve context menu items for a given tool parameter.
 *
 * Priority: paramType resolution > explicit choices > boolean fallback.
 */
function getItemsForParameter(param: ToolParameter): ContextMenuItem[] {
  // Try to resolve from param_type first
  if (param.paramType) {
    const resolved = resolveParamType(param.paramType);
    if (resolved) return resolved;
  }

  // Fall back to explicit choices
  if (param.choices) {
    return param.choices.map((choice) => ({
      id: String(choice),
      label: String(choice),
    }));
  }

  // For boolean types
  if (param.valueType === 'boolean') {
    return [
      { id: 'true', label: `Enable ${param.name}` },
      { id: 'false', label: `Disable ${param.name}` },
    ];
  }

  return [];
}

export function ParameterCollector({
  parameters,
  anchorPosition,
  onComplete,
  onCancel,
}: ParameterCollectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [collectedValues, setCollectedValues] = useState<Record<string, unknown>>({});

  const handleSelect = useCallback(
    (itemId: string) => {
      const param = parameters[currentIndex];
      if (!param) return;
      const newValues = { ...collectedValues, [param.name]: itemId };

      if (currentIndex + 1 < parameters.length) {
        setCollectedValues(newValues);
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete(newValues);
      }
    },
    [collectedValues, currentIndex, parameters, onComplete],
  );

  const handleCustomValue = useCallback(
    (value: string) => {
      const param = parameters[currentIndex];
      if (!param) return;
      const newValues = { ...collectedValues, [param.name]: value };

      if (currentIndex + 1 < parameters.length) {
        setCollectedValues(newValues);
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete(newValues);
      }
    },
    [collectedValues, currentIndex, parameters, onComplete],
  );

  const currentParam = parameters[currentIndex];
  if (!currentParam) return null;

  const items = getItemsForParameter(currentParam);
  const showCustom = currentParam.paramType ? isPresetType(currentParam.paramType) : false;

  return (
    <ContextMenu
      items={items}
      anchorPosition={anchorPosition}
      header={currentParam.description || currentParam.name}
      onSelect={handleSelect}
      onDismiss={onCancel}
      showCustomOption={showCustom}
      onCustomValue={handleCustomValue}
    />
  );
}
