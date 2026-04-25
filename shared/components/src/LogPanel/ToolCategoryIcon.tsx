/**
 * ToolCategoryIcon — 18x18px coloured square with tool category glyph.
 *
 * Feature: 176-log-panel-ux
 */

import React from 'react';
import type { ToolCategoryIconProps } from './types';
import { resolveToolCategory } from './toolCategories';

export function ToolCategoryIcon({
  toolName,
  toolCategories,
  size = 18,
  className,
}: ToolCategoryIconProps): React.ReactElement {
  const config = resolveToolCategory(toolName, toolCategories);

  return (
    <span
      className={`log-panel__category-icon ${className ?? ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 3,
        backgroundColor: config.background,
        fontSize: size * 0.6,
        lineHeight: 1,
        flexShrink: 0,
      }}
      title={config.label}
      aria-label={config.label}
      data-testid={`tool-category-icon-${config.category ?? 'unknown'}`}
    >
      {config.glyph}
    </span>
  );
}
