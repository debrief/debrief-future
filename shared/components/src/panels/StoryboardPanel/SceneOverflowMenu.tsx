/**
 * SceneOverflowMenu — right-click / Shift+F10 popover menu for Scene rows
 * (Feature 230 US2).
 *
 * Native `<menu role="menu">` + six `<li role="menuitem">` children.
 * Keyboard nav: ArrowDown / ArrowUp cycles focus; Enter activates;
 * Escape closes; Tab moves focus out (and closes). Positioned via the
 * anchor rect the caller supplies. Zero third-party dependencies —
 * meets Article IX + research.md R5.
 */

import React, { useEffect, useMemo, useRef } from 'react';

export type SceneOverflowAction =
  | 'edit-description'
  | 'update-to-current'
  | 'duplicate'
  | 'copy-to-other'
  | 'delete'
  | 'refresh-thumbnail';

export interface SceneOverflowMenuItem {
  readonly id: SceneOverflowAction;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SceneOverflowMenuProps {
  /** Scene row the menu was opened against. */
  readonly sceneId: string;
  /** Anchor rect of the row trigger — popover placed below-right. */
  readonly anchorRect: DOMRect;
  /** Menu items in display order. */
  readonly items: readonly SceneOverflowMenuItem[];
  /** Accessible label for the menu (mentions the Scene title). */
  readonly ariaLabel: string;
  /** Fires when a menu item is activated. */
  onAction(action: SceneOverflowAction, sceneId: string): void;
  /** Fires when the menu should close (Escape / click outside / tab). */
  onClose(): void;
}

const MENU_WIDTH = 220;
const MENU_PADDING = 4;

export function SceneOverflowMenu({
  sceneId,
  anchorRect,
  items,
  ariaLabel,
  onAction,
  onClose,
}: SceneOverflowMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLUListElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Focus first item on open.
  useEffect(() => {
    firstItemRef.current?.focus();
  }, []);

  // Click outside + Escape → close.
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (
        menuRef.current &&
        e.target instanceof Node &&
        !menuRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Defer click-outside registration so the triggering right-click
    // doesn't immediately close the menu.
    const t = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 0);
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Keyboard navigation within the menu.
  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]',
    );
    if (!buttons || buttons.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % buttons.length;
      buttons[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + buttons.length) % buttons.length;
      buttons[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      buttons[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      buttons[buttons.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      // Leave the menu on tab-out.
      onClose();
    }
  };

  const style: React.CSSProperties = useMemo(() => {
    const viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 768;
    let left = anchorRect.right + MENU_PADDING;
    if (left + MENU_WIDTH > viewportWidth) {
      left = Math.max(MENU_PADDING, anchorRect.left - MENU_WIDTH);
    }
    let top = anchorRect.bottom + MENU_PADDING;
    const approxMenuHeight = items.length * 28 + 8;
    if (top + approxMenuHeight > viewportHeight) {
      top = Math.max(MENU_PADDING, anchorRect.top - approxMenuHeight);
    }
    return {
      position: 'fixed',
      top,
      left,
      width: MENU_WIDTH,
      background: 'var(--vscode-menu-background, #252526)',
      color: 'var(--vscode-menu-foreground, #cccccc)',
      border: '1px solid var(--vscode-menu-border, #3c3c3c)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
      padding: 4,
      margin: 0,
      listStyle: 'none',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    };
  }, [anchorRect, items.length]);

  return (
    <ul
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      data-testid="scene-overflow-menu"
      data-scene-id={sceneId}
      style={style}
    >
      {items.map((item, i) => (
        <li key={item.id} role="none" style={{ margin: 0 }}>
          <button
            ref={i === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            data-testid={`scene-overflow-menuitem-${item.id}`}
            aria-disabled={item.disabled ? 'true' : undefined}
            tabIndex={item.disabled ? -1 : 0}
            onClick={(): void => {
              if (item.disabled) return;
              onAction(item.id, sceneId);
              onClose();
            }}
            onKeyDown={(e): void => handleItemKeyDown(e, i)}
            style={{
              width: '100%',
              padding: '6px 10px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: item.disabled ? 'default' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              font: 'inherit',
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
