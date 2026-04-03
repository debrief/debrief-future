/**
 * ParameterChip — type-aware parameter display chip with icon prefix.
 *
 * Feature: 176-log-panel-ux
 */

import React from 'react';
import type { ParameterChipProps } from './types';

/** Icon prefix per ParamType. */
const PARAM_ICONS: Record<string, string> = {
  colour: '\u2588',  // full block swatch
  number: '#',
  enum: '\u2261',    // ≡
  range: '\u2194',   // ↔
};

function booleanIcon(value: unknown): string {
  const v = typeof value === 'boolean' ? value : String(value) === 'true';
  return v ? '\u22A4' : '\u22A5'; // ⊤ / ⊥
}

function formatChipValue(chip: { value: unknown; paramType: string | null; unit?: string | null }): string {
  const v = chip.value;
  if (chip.paramType === 'boolean') {
    const bv = typeof v === 'boolean' ? v : String(v) === 'true';
    return bv ? 'yes' : 'no';
  }
  const str = String(v ?? '');
  if (chip.unit) return `${str} ${chip.unit}`;
  return str;
}

export function ParameterChip({ chip, className }: ParameterChipProps): React.ReactElement {
  const icon = chip.paramType === 'boolean'
    ? booleanIcon(chip.value)
    : chip.paramType
      ? PARAM_ICONS[chip.paramType] ?? ''
      : '';

  const colourStyle = chip.paramType === 'colour' && typeof chip.value === 'string'
    ? { color: chip.value }
    : undefined;

  return (
    <span
      className={`log-panel__chip ${className ?? ''}`}
      data-testid={`param-chip-${chip.name}`}
      data-param-type={chip.paramType ?? 'unknown'}
      title={`${chip.name}: ${String(chip.value ?? '')}`}
    >
      {icon && (
        <span className="log-panel__chip-icon" style={colourStyle} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="log-panel__chip-name">{chip.name}</span>
      <span className="log-panel__chip-value" data-testid={`tune-param-${chip.name}`}>{formatChipValue(chip)}</span>
      {!chip.isDefault && (
        <span className="log-panel__chip-marker" aria-label="non-default value" title="Non-default value">
          {'\u25CF'}
        </span>
      )}
    </span>
  );
}
