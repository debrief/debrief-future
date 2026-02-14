/**
 * ImageViewer — inline image display from data URI, scaled to fit.
 *
 * Feature: 095-results-bottom-panel
 */

import React from 'react';
import type { ImageViewerProps } from './types';

export function ImageViewer({ dataUri }: ImageViewerProps): React.ReactElement {
  return (
    <div
      data-testid="results-tab-image"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '8px',
        overflow: 'auto',
      }}
    >
      <img
        src={dataUri}
        alt="Result artifact"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
