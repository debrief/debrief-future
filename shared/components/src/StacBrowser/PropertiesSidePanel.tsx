/**
 * PropertiesSidePanel — StacBrowser-surface host for the Properties form.
 *
 * Consumes `useBrowserSelection()` to know which catalog item is currently
 * selected; posts `properties:commit` messages on edit; receives pre-hydrated
 * fields from the host (computed from item.json + JSON Schema) as props.
 */

import React from 'react';
import { PropertiesForm } from '../PropertiesPanel';
import type {
  FieldKey,
  FieldValue,
  PropertiesFormField,
} from '../PropertiesPanel';
import { useBrowserSelection } from './BrowserSelectionContext';

export interface PropertiesSidePanelProps {
  /** Absolute path to the STAC store root. Required for commit routing. */
  storePath: string;
  /**
   * Hydrated per-selection fields, keyed by itemPath. Host computes from
   * item.properties + JSON Schema. Missing key → loading state.
   */
  fieldsByItemPath: Record<string, PropertiesFormField[]>;
  /** Loading state keyed by itemPath. */
  loadingByItemPath?: Record<string, boolean>;
  /** Read-only state keyed by itemPath. */
  readOnlyByItemPath?: Record<string, boolean>;
  /** Write-error banner text keyed by itemPath. */
  writeErrorByItemPath?: Record<string, string | null>;
  /** Emits commit messages to the extension host. */
  onMessage: (message: {
    type: 'properties:commit';
    storePath: string;
    itemPath: string;
    patch: Record<FieldKey, FieldValue>;
  }) => void;
  className?: string;
}

export function PropertiesSidePanel({
  storePath,
  fieldsByItemPath,
  loadingByItemPath = {},
  readOnlyByItemPath = {},
  writeErrorByItemPath = {},
  onMessage,
  className,
}: PropertiesSidePanelProps): React.ReactElement {
  const { selectedItemPath } = useBrowserSelection();

  const handleCommit = React.useCallback(
    (key: FieldKey, value: FieldValue) => {
      if (!selectedItemPath) return;
      onMessage({
        type: 'properties:commit',
        storePath,
        itemPath: selectedItemPath,
        patch: { [key]: value },
      });
    },
    [onMessage, selectedItemPath, storePath],
  );

  if (!selectedItemPath) {
    return (
      <div
        className={className}
        data-testid="properties-side-panel-empty"
        style={{
          padding: 12,
          color: 'var(--vscode-descriptionForeground, #888)',
          fontStyle: 'italic',
        }}
      >
        Select an item to view its properties.
      </div>
    );
  }

  const fields = fieldsByItemPath[selectedItemPath] ?? [];
  const loading = loadingByItemPath[selectedItemPath] ?? false;
  const readOnly = readOnlyByItemPath[selectedItemPath] ?? false;
  const writeError = writeErrorByItemPath[selectedItemPath] ?? null;

  return (
    <div
      className={className}
      data-testid="properties-side-panel"
      style={{ padding: 8 }}
    >
      <PropertiesForm
        fields={fields}
        onCommitField={handleCommit}
        loading={loading}
        readOnly={readOnly}
        writeError={writeError}
      />
    </div>
  );
}
