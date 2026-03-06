/**
 * ColorPickerControl — colour swatch grid for NamedColor parameters.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import { LOG_PANEL_STRINGS } from './strings';

export interface ColorPickerControlProps {
  readonly name: string;
  readonly value: string;
  readonly choices: ReadonlyArray<string>;
  readonly tunable: boolean;
  readonly onChange: (colorName: string) => void;
}

/** Basic CSS colour mapping for common named colours. */
const COLOR_CSS_MAP: Record<string, string> = {
  red: '#ff0000',
  blue: '#0000ff',
  green: '#008000',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#ffffff',
  black: '#000000',
  gray: '#808080',
  grey: '#808080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  navy: '#000080',
  teal: '#008080',
};

function getColorCss(name: string): string {
  return COLOR_CSS_MAP[name.toLowerCase()] ?? name;
}

export function ColorPickerControl({
  name,
  value,
  choices,
  tunable,
  onChange,
}: ColorPickerControlProps): React.ReactElement {
  return (
    <div
      className="log-panel__color-picker"
      data-testid={`color-picker-${name}`}
      role="radiogroup"
      aria-label={LOG_PANEL_STRINGS.colorPickerLabel}
    >
      {choices.map((color) => (
        <button
          key={color}
          className={`log-panel__color-swatch ${color === value ? 'log-panel__color-swatch--selected' : ''}`}
          style={{ backgroundColor: getColorCss(color) }}
          onClick={() => onChange(color)}
          disabled={!tunable}
          role="radio"
          aria-checked={color === value}
          aria-label={color}
          title={color}
          data-testid={`color-swatch-${color}`}
        />
      ))}
    </div>
  );
}
