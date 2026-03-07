/**
 * ColourDimensionSelector — dropdown for choosing the active colour dimension.
 */

import React from 'react';
import type { ColourDimensionSelectorProps } from './types';
import './ColourDimensionSelector.css';

export const ColourDimensionSelector: React.FC<ColourDimensionSelectorProps> = ({
  dimensions,
  activeDimensionId,
  onDimensionChange,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onDimensionChange(value === '' ? null : value);
  };

  return (
    <div
      className={`debrief-colour-selector${className ? ` ${className}` : ''}`}
      data-testid="colour-dimension-selector"
    >
      <label
        className="debrief-colour-selector__label"
        htmlFor="colour-dimension-select"
      >
        Colour by
      </label>
      <select
        id="colour-dimension-select"
        className="debrief-colour-selector__select"
        value={activeDimensionId ?? ''}
        onChange={handleChange}
        data-testid="colour-dimension-select"
      >
        <option value="">None</option>
        {dimensions.map((dim) => (
          <option key={dim.id} value={dim.id}>
            {dim.label}
          </option>
        ))}
      </select>
    </div>
  );
};
