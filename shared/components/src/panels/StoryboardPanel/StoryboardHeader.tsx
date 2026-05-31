/**
 * Storyboard header (Feature 217, T402).
 *
 * Renders a native `<select>` dropdown populated from `storyboards[]`, plus an
 * overflow `<button>` that toggles a menu with Create / Rename items. Each menu
 * item fires the corresponding prop callback, or is hidden if the callback is
 * undefined (or in the case of Rename, when no Storyboard is active).
 *
 * Delete is intentionally NOT in this menu — the StoryboardPanel header carries
 * a dedicated "Delete storyboard" button with an inline two-step confirm.
 *
 * Presentational — no VS Code imports; consumers wire the callbacks to
 * `postMessage` in the webview entry.
 *
 * Design-fix 3: when `storyboards` is empty, the component renders nothing —
 * the parent `StoryboardPanel` keeps the #216 static header as the fallback.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from 'vscrui';
import type { StoryboardOptionViewModel } from './types';

export interface StoryboardHeaderProps {
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly activeStoryboardId: string | null;
  onActiveStoryboardChange(storyboardId: string): void;
  onCreateStoryboard?(): void;
  onRenameStoryboard?(): void;
}

export function StoryboardHeader({
  storyboards,
  activeStoryboardId,
  onActiveStoryboardChange,
  onCreateStoryboard,
  onRenameStoryboard,
}: StoryboardHeaderProps): React.ReactElement | null {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close the menu when the user clicks outside.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent): void => {
      if (!rootRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!rootRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close the menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuOpen]);

  if (storyboards.length === 0) return null;

  const hasRename = typeof onRenameStoryboard === 'function' && activeStoryboardId !== null;
  const hasCreate = typeof onCreateStoryboard === 'function';
  const showOverflow = hasCreate || hasRename;

  return (
    <div
      ref={rootRef}
      data-testid="storyboard-header"
      className="storyboard-panel__header-dropdown"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderBottom: '1px solid var(--vscode-panel-border, #3c3c3c)',
        position: 'relative',
      }}
    >
      <select
        data-testid="storyboard-header-select"
        aria-label="Active Storyboard"
        value={activeStoryboardId ?? ''}
        onChange={(e) => onActiveStoryboardChange(e.target.value)}
        style={{
          flex: 1,
          padding: '2px 4px',
          background: 'var(--vscode-dropdown-background, #3c3c3c)',
          color: 'var(--vscode-dropdown-foreground, #cccccc)',
          border: '1px solid var(--vscode-dropdown-border, #3c3c3c)',
        }}
      >
        {storyboards.map((sb) => (
          <option key={sb.storyboardId} value={sb.storyboardId}>
            {sb.name}
          </option>
        ))}
      </select>
      {showOverflow && (
        <button
          type="button"
          data-testid="storyboard-header-overflow"
          aria-label="Storyboard actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen ? 'true' : 'false'}
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            padding: '2px 6px',
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <Icon name="ellipsis" />
        </button>
      )}
      {menuOpen && showOverflow && (
        <div
          role="menu"
          data-testid="storyboard-header-menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 6,
            background: 'var(--vscode-menu-background, #252526)',
            color: 'var(--vscode-menu-foreground, #cccccc)',
            border: '1px solid var(--vscode-menu-border, #3c3c3c)',
            minWidth: 160,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {hasCreate && (
            <button
              type="button"
              role="menuitem"
              data-testid="storyboard-header-menu-create"
              onClick={() => {
                setMenuOpen(false);
                onCreateStoryboard?.();
              }}
              style={menuItemStyle}
            >
              Create new Storyboard…
            </button>
          )}
          {hasRename && (
            <button
              type="button"
              role="menuitem"
              data-testid="storyboard-header-menu-rename"
              onClick={() => {
                setMenuOpen(false);
                onRenameStoryboard?.();
              }}
              style={menuItemStyle}
            >
              Rename Storyboard…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  textAlign: 'left',
  padding: '4px 10px',
  cursor: 'pointer',
  font: 'inherit',
};
