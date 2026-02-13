/**
 * ContextMenu component - reusable inline context menu for parameter selection.
 *
 * Renders an absolutely-positioned menu anchored near a trigger element.
 * Supports keyboard navigation, viewport repositioning, custom input mode,
 * and accessibility attributes (role="menu" / role="menuitem").
 *
 * Feature: 091-tool-parameter-context-menus
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  id: string;
  label: string;
  description?: string;
}

export interface ContextMenuProps {
  /** Menu items to display */
  items: ContextMenuItem[];
  /** Position anchor point (x, y) relative to viewport */
  anchorPosition: { x: number; y: number };
  /** Optional header text (e.g., parameter name) */
  header?: string;
  /** Callback when an item is selected */
  onSelect: (itemId: string) => void;
  /** Callback when menu is dismissed (Escape or click outside) */
  onDismiss: () => void;
  /** Whether to show "Custom..." item at end */
  showCustomOption?: boolean;
  /** Callback when custom value is submitted */
  onCustomValue?: (value: string) => void;
  /** Custom input validation function */
  validateCustom?: (value: string) => string | null;
}

export function ContextMenu({
  items,
  anchorPosition,
  header,
  onSelect,
  onDismiss,
  showCustomOption = false,
  onCustomValue,
  validateCustom,
}: ContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: anchorPosition.y,
    left: anchorPosition.x,
  });

  /** Total selectable count including the optional Custom... item */
  const totalCount = items.length + (showCustomOption ? 1 : 0);

  // -------------------------------------------------------------------------
  // Viewport repositioning
  // -------------------------------------------------------------------------
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = anchorPosition.y;
    let left = anchorPosition.x;

    // Prevent overflow right
    if (left + rect.width > viewportWidth) {
      left = Math.max(0, viewportWidth - rect.width - 4);
    }

    // Prevent overflow bottom
    if (top + rect.height > viewportHeight) {
      top = Math.max(0, viewportHeight - rect.height - 4);
    }

    setPosition({ top, left });
  }, [anchorPosition.x, anchorPosition.y, isCustomMode]);

  // -------------------------------------------------------------------------
  // Focus the menu on mount; focus input when entering custom mode
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    } else if (menuRef.current) {
      menuRef.current.focus();
    }
  }, [isCustomMode]);

  // -------------------------------------------------------------------------
  // Click-outside detection
  // -------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }

    // Bind on next tick so the triggering click doesn't immediately dismiss
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss]);

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isCustomMode) {
        // In custom mode, only handle Escape and Enter
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsCustomMode(false);
          setCustomValue('');
          setCustomError(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleCustomSubmit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % totalCount);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + totalCount) % totalCount);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (showCustomOption && highlightedIndex === items.length) {
            // "Custom..." option selected
            setIsCustomMode(true);
          } else if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            const item = items[highlightedIndex];
            if (item) onSelect(item.id);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onDismiss();
          break;
        }
        case 'Home': {
          e.preventDefault();
          setHighlightedIndex(0);
          break;
        }
        case 'End': {
          e.preventDefault();
          setHighlightedIndex(totalCount - 1);
          break;
        }
      }
    },
    [isCustomMode, highlightedIndex, totalCount, items, showCustomOption, onSelect, onDismiss, handleCustomSubmit]
  );

  // -------------------------------------------------------------------------
  // Custom input handling
  // -------------------------------------------------------------------------
  const handleCustomSubmit = useCallback(() => {
    const trimmed = customValue.trim();
    if (!trimmed) {
      setCustomError('Value cannot be empty.');
      return;
    }

    if (validateCustom) {
      const error = validateCustom(trimmed);
      if (error) {
        setCustomError(error);
        return;
      }
    }

    setCustomError(null);
    onCustomValue?.(trimmed);
  }, [customValue, validateCustom, onCustomValue]);

  const handleCustomInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomValue(e.target.value);
      if (customError) {
        setCustomError(null);
      }
    },
    [customError]
  );

  // -------------------------------------------------------------------------
  // Item click handler
  // -------------------------------------------------------------------------
  const handleItemClick = useCallback(
    (index: number) => {
      if (showCustomOption && index === items.length) {
        setIsCustomMode(true);
      } else if (index >= 0 && index < items.length) {
        const item = items[index];
        if (item) onSelect(item.id);
      }
    },
    [items, showCustomOption, onSelect]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={menuRef}
      className="debrief-context-menu"
      style={{ top: position.top, left: position.left }}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      data-testid="context-menu"
    >
      {/* Header */}
      {header && (
        <div className="debrief-context-menu__header" data-testid="context-menu-header">
          {header}
        </div>
      )}

      {/* Custom input mode */}
      {isCustomMode ? (
        <div className="debrief-context-menu__custom">
          <input
            ref={inputRef}
            type="text"
            className={`debrief-context-menu__custom-input${customError ? ' debrief-context-menu__custom-input--error' : ''}`}
            value={customValue}
            onChange={handleCustomInputChange}
            placeholder="Enter value..."
            data-testid="context-menu-custom-input"
          />
          {customError && (
            <div
              className="debrief-context-menu__custom-error"
              role="alert"
              data-testid="context-menu-custom-error"
            >
              {customError}
            </div>
          )}
          <div className="debrief-context-menu__custom-actions">
            <button
              className="debrief-context-menu__custom-btn debrief-context-menu__custom-btn--submit"
              onClick={handleCustomSubmit}
              type="button"
            >
              OK
            </button>
            <button
              className="debrief-context-menu__custom-btn debrief-context-menu__custom-btn--cancel"
              onClick={() => {
                setIsCustomMode(false);
                setCustomValue('');
                setCustomError(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Menu items */}
          <div className="debrief-context-menu__items">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`debrief-context-menu__item${highlightedIndex === index ? ' debrief-context-menu__item--highlighted' : ''}`}
                role="menuitem"
                tabIndex={-1}
                data-testid={`context-menu-item-${item.id}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleItemClick(index)}
              >
                <span className="debrief-context-menu__item-label">{item.label}</span>
                {item.description && (
                  <span className="debrief-context-menu__item-description">{item.description}</span>
                )}
              </div>
            ))}

            {/* Custom... option */}
            {showCustomOption && (
              <div
                className={`debrief-context-menu__item debrief-context-menu__item--custom${highlightedIndex === items.length ? ' debrief-context-menu__item--highlighted' : ''}`}
                role="menuitem"
                tabIndex={-1}
                data-testid="context-menu-custom-option"
                onMouseEnter={() => setHighlightedIndex(items.length)}
                onClick={() => handleItemClick(items.length)}
              >
                <span className="debrief-context-menu__item-label">Custom...</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
