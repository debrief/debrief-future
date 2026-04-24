/**
 * User-facing strings for the Storyboard edit suite (Feature 218).
 *
 * All error toasts + confirmation prompts routed through this module
 * so (a) tests can assert against single string sources and (b) Article
 * XI (i18n) externalisation stays tractable.
 *
 * Contract: specs/218-storyboarding-edit/contracts/vscode-commands.md
 * §Error-toast message registry.
 */

const stringifyError = (err: unknown): string => {
  if (err instanceof Error) {return err.message;}
  return String(err);
};

export const storyboardEdit = {
  unexpectedError: (err: unknown): string =>
    `Storyboard edit failed: ${stringifyError(err)}`,
  updateToCurrentThumbnailFailed: (): string =>
    `Update failed — could not produce thumbnail. Scene not changed.`,
  refreshThumbnailFailed: (): string =>
    `Refresh failed — could not produce thumbnail. Existing thumbnail kept.`,
  deepCopyFailed: (): string =>
    `Could not copy thumbnail. Scene not copied.`,
  duplicateTimestampConflict: (existingSceneTitle: string): string =>
    `A scene already exists at this timestamp: "${existingSceneTitle}". Replace / Offset / Cancel.`,
  storyboardNameConflict: (existingName: string): string =>
    `A storyboard named "${existingName}" already exists. Pick a different name.`,
  // Review 10H — undo must fail loudly if the Storyboard was externally
  // removed between the delete and the undo click.
  undoStoryboardGone: (): string =>
    `Cannot restore — storyboard was deleted.`,
  undoBufferEvicted: (): string =>
    `Cannot restore — the undo window has expired.`,
  // FR-EDIT-025 — bulk refresh rollup toasts.
  refreshAllStaleNone: (): string =>
    `No stale scenes to refresh.`,
  refreshAllStaleSuccess: (count: number): string =>
    `Refreshed ${count} scene${count === 1 ? '' : 's'}.`,
  refreshAllStalePartial: (succeeded: number, failed: number): string =>
    `Refreshed ${succeeded} scene${succeeded === 1 ? '' : 's'}. ${failed} failed — see Log Panel.`,
  // #230 FR-003 / FR-005 — scene overflow menu labels (six items).
  overflowMenuEditDescription: (): string => `Edit description`,
  overflowMenuUpdateToCurrent: (): string => `Update to current`,
  overflowMenuDuplicate: (): string => `Duplicate`,
  overflowMenuCopyToOther: (): string => `Copy to other storyboard`,
  overflowMenuDelete: (): string => `Delete`,
  overflowMenuRefreshThumbnail: (): string => `Refresh thumbnail`,
  overflowMenuTriggerAriaLabel: (sceneTitle: string): string =>
    `Scene actions menu for ${sceneTitle}`,
  overflowMenuAriaLabel: (sceneTitle: string): string =>
    `Actions for scene ${sceneTitle}`,
  // #230 FR-001 — chevron ARIA labels.
  chevronExpandLabel: (sceneTitle: string): string =>
    `Expand edit form for ${sceneTitle}`,
  chevronCollapseLabel: (sceneTitle: string): string =>
    `Collapse edit form for ${sceneTitle}`,
  // #230 FR-012 — Refresh all stale button label.
  refreshAllStaleButton: (staleCount: number): string =>
    staleCount === 0
      ? `Refresh all stale`
      : `Refresh all stale (${staleCount})`,
  // #230 — UndoToast dismiss label.
  undoToastDismissLabel: (): string => `Dismiss undo toast`,
} as const;
