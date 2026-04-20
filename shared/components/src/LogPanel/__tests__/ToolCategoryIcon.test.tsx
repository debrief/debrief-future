/**
 * Component tests for ToolCategoryIcon.
 *
 * Feature: 176-log-panel-ux (T011)
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolCategoryIcon } from '../ToolCategoryIcon';
import { TOOL_CATEGORY_CONFIGS, UNKNOWN_CATEGORY_CONFIG } from '../toolCategories';

function hexToRgb(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const h = m[1]!;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

describe('ToolCategoryIcon', () => {
  const known: Array<[string, keyof typeof TOOL_CATEGORY_CONFIGS]> = [
    ['import-rep', 'import'],
    ['change-color', 'style'],
    ['bearing-between-tracks', 'calc'],
    ['time-filter', 'filter'],
    ['export-png', 'snapshot'],
  ];

  it.each(known)(
    'renders %s with the correct background + glyph + aria-label',
    (toolName, category) => {
      const { unmount } = render(<ToolCategoryIcon toolName={toolName} />);
      const icon = screen.getByTestId(`tool-category-icon-${category}`);
      const cfg = TOOL_CATEGORY_CONFIGS[category];
      expect(icon.textContent).toContain(cfg.glyph);
      expect(icon.getAttribute('aria-label')).toBe(cfg.label);
      expect(icon.getAttribute('style') ?? '').toContain(hexToRgb(cfg.background));
      unmount();
    }
  );

  it('falls back to neutral grey for unknown tools', () => {
    render(<ToolCategoryIcon toolName="not-a-real-tool" />);
    const icon = screen.getByTestId('tool-category-icon-unknown');
    expect(icon.getAttribute('aria-label')).toBe(UNKNOWN_CATEGORY_CONFIG.label);
    expect(icon.textContent).toBe('');
    expect(icon.getAttribute('style') ?? '').toContain(
      hexToRgb(UNKNOWN_CATEGORY_CONFIG.background)
    );
  });

  it('respects the size prop', () => {
    render(<ToolCategoryIcon toolName="import-rep" size={24} />);
    const icon = screen.getByTestId('tool-category-icon-import');
    const style = icon.getAttribute('style') ?? '';
    expect(style).toMatch(/width:\s*24px/);
    expect(style).toMatch(/height:\s*24px/);
  });
});
