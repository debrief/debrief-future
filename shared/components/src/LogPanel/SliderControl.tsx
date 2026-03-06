/**
 * SliderControl — bounded numeric slider with numeric readout.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import { LOG_PANEL_STRINGS } from './strings';

export interface SliderControlProps {
  readonly name: string;
  readonly value: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly step: number | null;
  readonly tunable: boolean;
  readonly onChange: (value: number) => void;
}

export function SliderControl({
  name,
  value,
  minimum,
  maximum,
  step,
  tunable,
  onChange,
}: SliderControlProps): React.ReactElement {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="log-panel__slider-control" data-testid={`slider-${name}`}>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step ?? 'any'}
        value={value}
        onChange={handleChange}
        disabled={!tunable}
        className="log-panel__slider-input"
        aria-label={name}
        data-testid={`slider-input-${name}`}
      />
      <span
        className="log-panel__slider-readout"
        data-testid={`slider-readout-${name}`}
      >
        {LOG_PANEL_STRINGS.sliderValueLabel(value)}
      </span>
    </div>
  );
}
