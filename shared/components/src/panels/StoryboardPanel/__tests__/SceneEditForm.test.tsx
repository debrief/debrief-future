/**
 * Unit tests for SceneEditForm (Feature 218 — T062).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneEditForm, type SceneEditFormProps, type SceneMissingData } from '../SceneEditForm';

function makeProps(overrides: Partial<SceneEditFormProps> = {}): SceneEditFormProps {
  return {
    sceneId: 'scene-1',
    title: 'Opening',
    description: null,
    timestamp: '2026-04-24T12:00:00Z',
    missingData: { kind: 'ok' },
    onTitleRenameCommit: vi.fn(),
    onDescriptionSubmit: vi.fn(),
    onUpdateToCurrent: vi.fn(),
    onDuplicate: vi.fn(),
    onCopyToOther: vi.fn(),
    onDelete: vi.fn(),
    onRefreshThumbnail: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('SceneEditForm — title inline rename', () => {
  it('Enter commits the trimmed new title', () => {
    const onTitleRenameCommit = vi.fn();
    const props = makeProps({ onTitleRenameCommit });
    render(<SceneEditForm {...props} />);
    const input = screen.getByTestId('scene-edit-form-title-input');
    fireEvent.change(input, { target: { value: '  New Title  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onTitleRenameCommit).toHaveBeenCalledWith('New Title');
  });

  it('Escape reverts the buffer and does NOT fire the callback', () => {
    const onTitleRenameCommit = vi.fn();
    const props = makeProps({ title: 'Original', onTitleRenameCommit });
    render(<SceneEditForm {...props} />);
    const input = screen.getByTestId('scene-edit-form-title-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Not saved' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('Original');
    expect(onTitleRenameCommit).not.toHaveBeenCalled();
  });

  it('blur commits the trimmed new title', () => {
    const onTitleRenameCommit = vi.fn();
    const props = makeProps({ onTitleRenameCommit });
    render(<SceneEditForm {...props} />);
    const input = screen.getByTestId('scene-edit-form-title-input');
    fireEvent.change(input, { target: { value: 'Blurred' } });
    fireEvent.blur(input);
    expect(onTitleRenameCommit).toHaveBeenCalledWith('Blurred');
  });

  it('blur does NOT fire when value is unchanged', () => {
    const onTitleRenameCommit = vi.fn();
    const props = makeProps({ title: 'Same', onTitleRenameCommit });
    render(<SceneEditForm {...props} />);
    const input = screen.getByTestId('scene-edit-form-title-input');
    fireEvent.blur(input);
    expect(onTitleRenameCommit).not.toHaveBeenCalled();
  });
});

describe('SceneEditForm — description editor', () => {
  it('Save button is disabled when buffer equals saved value', () => {
    const props = makeProps({ description: 'Saved' });
    render(<SceneEditForm {...props} />);
    const btn = screen.getByTestId('scene-edit-form-save-description') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('Save button enables once the buffer differs', () => {
    const props = makeProps({ description: 'Saved' });
    render(<SceneEditForm {...props} />);
    const textarea = screen.getByTestId('scene-edit-form-description-textarea');
    fireEvent.change(textarea, { target: { value: 'Edited' } });
    const btn = screen.getByTestId('scene-edit-form-save-description') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('Save fires onDescriptionSubmit with the buffer (null for empty)', () => {
    const onDescriptionSubmit = vi.fn();
    const props = makeProps({ description: 'Saved', onDescriptionSubmit });
    render(<SceneEditForm {...props} />);
    const textarea = screen.getByTestId('scene-edit-form-description-textarea');
    fireEvent.change(textarea, { target: { value: 'Edited' } });
    fireEvent.click(screen.getByTestId('scene-edit-form-save-description'));
    expect(onDescriptionSubmit).toHaveBeenCalledWith('Edited');
  });

  it('empty buffer submits as null (clear description)', () => {
    const onDescriptionSubmit = vi.fn();
    const props = makeProps({ description: 'Saved', onDescriptionSubmit });
    render(<SceneEditForm {...props} />);
    const textarea = screen.getByTestId('scene-edit-form-description-textarea');
    fireEvent.change(textarea, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('scene-edit-form-save-description'));
    expect(onDescriptionSubmit).toHaveBeenCalledWith(null);
  });

  it('Cancel reverts the buffer and fires onCancel', () => {
    const onCancel = vi.fn();
    const props = makeProps({ description: 'Saved', onCancel });
    render(<SceneEditForm {...props} />);
    const textarea = screen.getByTestId(
      'scene-edit-form-description-textarea',
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'temp' } });
    fireEvent.click(screen.getByTestId('scene-edit-form-cancel'));
    expect(textarea.value).toBe('Saved');
    expect(onCancel).toHaveBeenCalled();
  });

  it('renderMarkdown prop is consulted for the preview', () => {
    const renderMarkdown = vi.fn((md: string) => <span data-testid="custom-md">{`[${md}]`}</span>);
    const props = makeProps({ description: 'hello', renderMarkdown });
    render(<SceneEditForm {...props} />);
    expect(screen.getByTestId('custom-md').textContent).toBe('[hello]');
    expect(renderMarkdown).toHaveBeenCalledWith('hello');
  });
});

describe('SceneEditForm — missing-data remediation', () => {
  it('does not render the panel when missingData.kind === "ok"', () => {
    render(<SceneEditForm {...makeProps()} />);
    expect(screen.queryByTestId('scene-edit-form-missing-data')).toBeNull();
  });

  it('renders unresolved IDs for missing-features', () => {
    const missing: SceneMissingData = { kind: 'missing-features', ids: ['a', 'b'] };
    render(<SceneEditForm {...makeProps({ missingData: missing })} />);
    const panel = screen.getByTestId('scene-edit-form-missing-data');
    expect(panel).toBeDefined();
    const ids = screen.getByTestId('scene-edit-form-missing-ids');
    expect(ids.textContent).toContain('a');
    expect(ids.textContent).toContain('b');
  });

  it('fires onUpdateToCurrent from the remediation Update button', () => {
    const onUpdateToCurrent = vi.fn();
    const missing: SceneMissingData = { kind: 'missing-features', ids: ['x'] };
    render(
      <SceneEditForm {...makeProps({ missingData: missing, onUpdateToCurrent })} />,
    );
    fireEvent.click(screen.getByTestId('scene-edit-form-missing-update-to-current'));
    expect(onUpdateToCurrent).toHaveBeenCalledTimes(1);
  });

  it('fires onDelete from the remediation Delete button', () => {
    const onDelete = vi.fn();
    const missing: SceneMissingData = { kind: 'missing-features', ids: ['x'] };
    render(<SceneEditForm {...makeProps({ missingData: missing, onDelete })} />);
    fireEvent.click(screen.getByTestId('scene-edit-form-missing-delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders the out-of-range message', () => {
    const missing: SceneMissingData = { kind: 'out-of-range', scenario: 'after-end' };
    render(<SceneEditForm {...makeProps({ missingData: missing })} />);
    const panel = screen.getByTestId('scene-edit-form-missing-data');
    expect(panel.textContent).toContain('after the current plot time-range');
  });
});

describe('SceneEditForm — row actions', () => {
  it.each([
    ['scene-edit-form-action-update', 'onUpdateToCurrent'],
    ['scene-edit-form-action-duplicate', 'onDuplicate'],
    ['scene-edit-form-action-copy', 'onCopyToOther'],
    ['scene-edit-form-action-delete', 'onDelete'],
    ['scene-edit-form-action-refresh', 'onRefreshThumbnail'],
  ] as const)('%s fires the matching prop', (testid, propName) => {
    const handler = vi.fn();
    const props = makeProps({ [propName]: handler });
    render(<SceneEditForm {...props} />);
    fireEvent.click(screen.getByTestId(testid));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('SceneEditForm — accessibility', () => {
  it('has role="form" with aria-labelledby pointing at the title input id', () => {
    render(<SceneEditForm {...makeProps()} />);
    const form = screen.getByTestId('scene-edit-form');
    expect(form.getAttribute('role')).toBe('form');
    const titleInput = screen.getByTestId('scene-edit-form-title-input');
    expect(form.getAttribute('aria-labelledby')).toBe(titleInput.id);
  });

  it('textarea has aria-label="Scene description" and aria-describedby points to visually-hidden hint', () => {
    render(<SceneEditForm {...makeProps()} />);
    const textarea = screen.getByTestId('scene-edit-form-description-textarea');
    expect(textarea.getAttribute('aria-label')).toBe('Scene description');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy!);
    expect(hint?.textContent).toContain('CommonMark');
  });
});
