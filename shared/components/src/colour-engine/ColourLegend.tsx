/**
 * ColourLegend — renders gradient bars for continuous dimensions
 * and discrete swatches for categorical ones (FR-003, FR-012).
 */

import React from 'react';
import type { ColourLegendProps } from './types';
import './ColourLegend.css';

export const ColourLegend: React.FC<ColourLegendProps> = ({
  legend,
  unclassifiedColour,
  className,
}) => {
  if (!legend) {
    return null;
  }

  const isGradient = legend.gradient !== null;

  return (
    <div
      className={`debrief-colour-legend${className ? ` ${className}` : ''}`}
      data-testid="colour-legend"
      role="region"
      aria-label={`Colour legend: ${legend.dimension.label}`}
    >
      <div className="debrief-colour-legend__title" data-testid="colour-legend-title">
        {legend.dimension.label}
      </div>

      {isGradient && legend.gradient && (
        <div className="debrief-colour-legend__gradient" data-testid="colour-legend-gradient">
          <div className="debrief-colour-legend__gradient-labels">
            <span>{legend.gradient.minLabel}</span>
            <span>{legend.gradient.maxLabel}</span>
          </div>
          <div
            className="debrief-colour-legend__gradient-bar"
            style={{
              background: `linear-gradient(to right, ${legend.gradient.minColour}, ${legend.gradient.maxColour})`,
            }}
          />
        </div>
      )}

      {!isGradient && legend.entries.length > 0 && (
        <div className="debrief-colour-legend__entries" data-testid="colour-legend-entries">
          {legend.entries.map((entry) => (
            <div key={entry.label} className="debrief-colour-legend__entry">
              <span
                className="debrief-colour-legend__swatch"
                style={{ backgroundColor: entry.colour }}
              />
              <span className="debrief-colour-legend__entry-label">
                {entry.label}
              </span>
              <span className="debrief-colour-legend__entry-count">
                ({entry.count})
              </span>
            </div>
          ))}
        </div>
      )}

      {legend.hasUnclassified && (
        <div className="debrief-colour-legend__entry debrief-colour-legend__entry--unclassified">
          <span
            className="debrief-colour-legend__swatch"
            style={{ backgroundColor: unclassifiedColour }}
          />
          <span className="debrief-colour-legend__entry-label">Unclassified</span>
        </div>
      )}
    </div>
  );
};
