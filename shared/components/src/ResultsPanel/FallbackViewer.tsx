/**
 * FallbackViewer — file summary (name, type, size) with "Open in VS Code" button.
 *
 * Feature: 095-results-bottom-panel
 */

import React from 'react';
import type { FallbackViewerProps } from './types';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function FallbackViewer({
  filename,
  mimeType,
  sizeBytes,
  onOpenExternal,
}: FallbackViewerProps): React.ReactElement {
  return (
    <div
      data-testid="results-tab-fallback"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        padding: '16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '32px',
          opacity: 0.4,
        }}
      >
        📄
      </div>
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{filename}</div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--debrief-text-secondary, var(--vscode-descriptionForeground, #888))',
          }}
        >
          {mimeType} · {formatFileSize(sizeBytes)}
        </div>
      </div>
      {onOpenExternal && (
        <button
          data-testid="results-tab-fallback-open"
          onClick={onOpenExternal}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            background: 'var(--vscode-button-background, #0e639c)',
            color: 'var(--vscode-button-foreground, #fff)',
            border: 'none',
            borderRadius: '2px',
          }}
        >
          Open in VS Code
        </button>
      )}
    </div>
  );
}
