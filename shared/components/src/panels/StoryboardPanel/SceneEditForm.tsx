/**
 * SceneEditForm — per-Scene edit surface rendered inline inside an
 * expanded Scene row (Feature 218).
 *
 * Phase 1: typed skeleton returning an empty `<form role="form">`.
 * Real implementation lands in Phase 3 T058 (markdown editor,
 * timestamp display, missing-data remediation panel, row actions).
 *
 * Contract: specs/218-storyboarding-edit/contracts/scene-edit-form.md
 */

import React, { type ReactNode } from 'react';

export type SceneMissingData =
  | { readonly kind: 'ok' }
  | { readonly kind: 'missing-features'; readonly ids: readonly string[] }
  | { readonly kind: 'out-of-range'; readonly scenario: 'before-start' | 'after-end' };

export interface SceneEditFormProps {
  readonly sceneId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timestamp: string;
  readonly missingData: SceneMissingData;
  readonly onTitleRenameCommit: (newTitle: string) => void;
  readonly onDescriptionSubmit: (description: string | null) => void;
  readonly onUpdateToCurrent: () => void;
  readonly onDuplicate: () => void;
  readonly onCopyToOther: () => void;
  readonly onDelete: () => void;
  readonly onRefreshThumbnail: () => void;
  readonly onCancel: () => void;
  readonly renderMarkdown?: (markdown: string) => ReactNode;
}

export const SceneEditForm: React.FC<SceneEditFormProps> = ({ sceneId }) => {
  return (
    <form
      role="form"
      aria-label="Scene edit form"
      data-testid="scene-edit-form"
      data-scene-id={sceneId}
    />
  );
};
