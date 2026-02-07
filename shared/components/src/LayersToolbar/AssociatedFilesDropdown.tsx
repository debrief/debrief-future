import { useState } from 'react';
import { Button } from 'vscrui';
import type { AssociatedFilesDropdownProps, AssociatedFile, FileAction } from './types';
import { DEFAULT_LABELS } from './types';
import './AssociatedFilesDropdown.css';

/**
 * AssociatedFilesDropdown displays Sources and Results file trees
 * with context menus for file operations.
 */
export function AssociatedFilesDropdown({
  sourceFiles,
  resultFiles,
  onFileAction,
  labels: labelOverrides,
}: AssociatedFilesDropdownProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [contextFile, setContextFile] = useState<AssociatedFile | null>(null);
  const [showProvenanceWarning, setShowProvenanceWarning] = useState(false);

  const handleFileClick = (file: AssociatedFile) => {
    setContextFile(contextFile?.path === file.path ? null : file);
    setShowProvenanceWarning(false);
  };

  const handleAction = (file: AssociatedFile, action: FileAction) => {
    if (action === 'delete' && file.category === 'source') {
      if (!showProvenanceWarning) {
        setShowProvenanceWarning(true);
        return;
      }
    }
    onFileAction(file, action);
    setContextFile(null);
    setShowProvenanceWarning(false);
  };

  const renderFileList = (files: AssociatedFile[], sectionLabel: string) => (
    <div className="debrief-associated-files__section">
      <div className="debrief-associated-files__section-header">{sectionLabel}</div>
      {files.length === 0 ? (
        <div className="debrief-associated-files__empty">{labels.noFiles}</div>
      ) : (
        files.map((file) => (
          <div key={file.path}>
            <Button
              appearance="icon"
              className={`debrief-associated-files__file${
                contextFile?.path === file.path ? ' debrief-associated-files__file--active' : ''
              }`}
              onClick={() => handleFileClick(file)}
            >
              {file.viewerType && (
                <span className="debrief-associated-files__viewer-badge">
                  {file.viewerType}
                </span>
              )}
              <span className="debrief-associated-files__file-name">{file.name}</span>
            </Button>
            {contextFile?.path === file.path && (
              <div className="debrief-associated-files__context-menu">
                {showProvenanceWarning && (
                  <div className="debrief-associated-files__provenance-warning">
                    {labels.provenanceWarning}
                  </div>
                )}
                <Button
                  appearance="secondary"
                  className="debrief-associated-files__action"
                  onClick={() => handleAction(file, 'open')}
                >
                  {labels.open}
                </Button>
                <Button
                  appearance="secondary"
                  className="debrief-associated-files__action"
                  onClick={() => handleAction(file, 'openWith')}
                >
                  {labels.openWith}
                </Button>
                <Button
                  appearance="secondary"
                  className="debrief-associated-files__action"
                  onClick={() => handleAction(file, 'reveal')}
                >
                  {labels.revealInExplorer}
                </Button>
                <div className="debrief-associated-files__separator" />
                <Button
                  appearance="secondary"
                  className="debrief-associated-files__action debrief-associated-files__action--danger"
                  onClick={() => handleAction(file, 'delete')}
                >
                  {showProvenanceWarning ? `${labels.deleteFile} (confirm)` : labels.deleteFile}
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="debrief-associated-files">
      {renderFileList(sourceFiles, labels.sources)}
      <div className="debrief-associated-files__divider" />
      {renderFileList(resultFiles, labels.results)}
    </div>
  );
}
