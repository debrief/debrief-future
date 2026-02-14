/**
 * ResultTabContent — content router dispatching to ChartRenderer,
 * ImageViewer, or FallbackViewer based on artifact type.
 *
 * Feature: 095-results-bottom-panel
 */

import React from 'react';
import type { TopLevelSpec } from 'vega-lite';
import { ChartRenderer } from '../ChartRenderer';
import { ImageViewer } from './ImageViewer';
import { FallbackViewer } from './FallbackViewer';
import type { ResultTabContentProps } from './types';

export function ResultTabContent({
  content,
  onOpenExternal,
}: ResultTabContentProps): React.ReactElement {
  switch (content.artifactType) {
    case 'dataset': {
      if (content.error && !content.spec) {
        return (
          <div
            data-testid="results-tab-error"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '16px',
              color: 'var(--vscode-errorForeground, #f44)',
            }}
          >
            {content.error}
          </div>
        );
      }
      return (
        <div
          data-testid="results-tab-chart"
          style={{ width: '100%', height: '100%', minHeight: '200px' }}
        >
          <ChartRenderer spec={content.spec as TopLevelSpec | null} />
        </div>
      );
    }

    case 'image':
      return <ImageViewer dataUri={content.dataUri} />;

    case 'other':
      return (
        <FallbackViewer
          filename={content.filename}
          mimeType={content.mimeType}
          sizeBytes={content.sizeBytes}
          onOpenExternal={onOpenExternal}
        />
      );
  }
}
