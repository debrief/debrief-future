import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './CascadingMenu.css';

export interface CascadingMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly swatch?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly submenu?: readonly CascadingMenuItem[];
  readonly current?: boolean;
}

export interface CascadingMenuProps {
  readonly items: readonly CascadingMenuItem[];
  readonly anchorPosition: { x: number; y: number };
  readonly header?: string;
  /** When true, branch nodes (items with submenu) are clickable/selectable too */
  readonly selectableBranches?: boolean;
  readonly onSelect: (itemId: string) => void;
  readonly onDismiss: () => void;
}

interface SubmenuState {
  readonly itemId: string;
  readonly items: readonly CascadingMenuItem[];
  readonly anchorRect: DOMRect;
}

export const CascadingMenu: React.FC<CascadingMenuProps> = ({
  items,
  anchorPosition,
  header,
  selectableBranches,
  onSelect,
  onDismiss,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: anchorPosition.x, top: anchorPosition.y });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [submenu, setSubmenu] = useState<SubmenuState | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Reposition menu if it extends beyond viewport
  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newLeft = anchorPosition.x;
    let newTop = anchorPosition.y;

    if (rect.right > viewportWidth) {
      newLeft = viewportWidth - rect.width - 8;
    }
    if (rect.bottom > viewportHeight) {
      newTop = viewportHeight - rect.height - 8;
    }
    if (newLeft < 0) newLeft = 8;
    if (newTop < 0) newTop = 8;

    setPosition({ left: newLeft, top: newTop });
  }, [anchorPosition]);

  // Click outside handler — must also ignore clicks on sibling submenus
  // which are rendered outside menuRef via React Fragment.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore clicks inside any part of the cascading menu system
      // (submenus are siblings of menuRef, not children)
      if (target.closest && target.closest('.debrief-cascading-menu')) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        onDismiss();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDismiss]);

  // Get enabled items for keyboard navigation
  const enabledItems = items.filter((item) => !item.disabled);
  const getEnabledIndex = (itemIndex: number): number => {
    return enabledItems.findIndex((ei) => items[itemIndex] === ei);
  };
  const getItemIndex = (enabledIndex: number): number => {
    const item = enabledItems[enabledIndex];
    return item ? items.indexOf(item) : 0;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (enabledItems.length === 0) return;

      const currentEnabledIndex = getEnabledIndex(highlightedIndex);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextEnabledIndex = (currentEnabledIndex + 1) % enabledItems.length;
          setHighlightedIndex(getItemIndex(nextEnabledIndex));
          setSubmenu(null);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevEnabledIndex =
            (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
          setHighlightedIndex(getItemIndex(prevEnabledIndex));
          setSubmenu(null);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const item = items[highlightedIndex];
          if (item && item.submenu && !item.disabled) {
            const itemElement = menuRef.current?.querySelector(
              `[data-item-index="${highlightedIndex}"]`
            ) as HTMLElement;
            if (itemElement) {
              const rect = itemElement.getBoundingClientRect();
              setSubmenu({
                itemId: item.id,
                items: item.submenu,
                anchorRect: rect,
              });
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          setSubmenu(null);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const item = items[highlightedIndex];
          if (item && !item.disabled) {
            if (item.submenu && !selectableBranches) {
              const itemElement = menuRef.current?.querySelector(
                `[data-item-index="${highlightedIndex}"]`
              ) as HTMLElement;
              if (itemElement) {
                const rect = itemElement.getBoundingClientRect();
                setSubmenu({
                  itemId: item.id,
                  items: item.submenu,
                  anchorRect: rect,
                });
              }
            } else {
              onSelect(item.id);
            }
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onDismiss();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [highlightedIndex, items, enabledItems, onSelect, onDismiss, selectableBranches]);

  const handleMouseEnter = useCallback((index: number, item: CascadingMenuItem) => {
    if (item.disabled) return;

    setHighlightedIndex(index);

    // Clear any pending hover timeout
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (item.submenu) {
      hoverTimeoutRef.current = window.setTimeout(() => {
        const itemElement = menuRef.current?.querySelector(
          `[data-item-index="${index}"]`
        ) as HTMLElement;
        if (itemElement && item.submenu) {
          const rect = itemElement.getBoundingClientRect();
          setSubmenu({
            itemId: item.id,
            items: item.submenu,
            anchorRect: rect,
          });
        }
      }, 150);
    } else {
      setSubmenu(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (item: CascadingMenuItem) => {
      if (item.disabled) return;

      if (item.submenu && !selectableBranches) {
        // Submenu handled by hover
        return;
      }

      onSelect(item.id);
    },
    [onSelect, selectableBranches]
  );

  const handleSubmenuSelect = useCallback(
    (itemId: string) => {
      onSelect(itemId);
    },
    [onSelect]
  );

  return (
    <>
      <div
        ref={menuRef}
        className="debrief-cascading-menu"
        style={{ left: position.left, top: position.top }}
        role="menu"
        data-testid="cascading-menu"
      >
        {header && <div className="debrief-cascading-menu__header">{header}</div>}
        <div className="debrief-cascading-menu__items">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`debrief-cascading-menu__item ${
                index === highlightedIndex ? 'debrief-cascading-menu__item--highlighted' : ''
              } ${item.disabled ? 'debrief-cascading-menu__item--disabled' : ''} ${
                item.current ? 'debrief-cascading-menu__item--current' : ''
              }`}
              role="menuitem"
              aria-haspopup={item.submenu ? 'menu' : undefined}
              aria-expanded={item.submenu && submenu?.itemId === item.id ? 'true' : undefined}
              aria-disabled={item.disabled ? 'true' : 'false'}
              data-item-index={index}
              data-testid={`menu-item-${item.id}`}
              title={item.disabled && item.disabledReason ? item.disabledReason : undefined}
              onMouseEnter={() => handleMouseEnter(index, item)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(item)}
            >
              {item.swatch && (
                <span
                  className="debrief-cascading-menu__swatch"
                  style={{ background: item.swatch }}
                />
              )}
              <span className="debrief-cascading-menu__label">{item.label}</span>
              {item.current && <span className="debrief-cascading-menu__check">✓</span>}
              {item.submenu && <span className="debrief-cascading-menu__arrow">›</span>}
            </div>
          ))}
        </div>
      </div>

      {submenu && (
        <SubmenuPanel
          items={submenu.items}
          anchorRect={submenu.anchorRect}
          selectableBranches={selectableBranches}
          onSelect={handleSubmenuSelect}
          onDismiss={() => setSubmenu(null)}
        />
      )}
    </>
  );
};

interface SubmenuPanelProps {
  readonly items: readonly CascadingMenuItem[];
  readonly anchorRect: DOMRect;
  readonly selectableBranches?: boolean;
  readonly onSelect: (itemId: string) => void;
  readonly onDismiss: () => void;
}

const SubmenuPanel: React.FC<SubmenuPanelProps> = ({ items, anchorRect, selectableBranches, onSelect, onDismiss }) => {
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [nestedSubmenu, setNestedSubmenu] = useState<SubmenuState | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Position submenu to the right or left of anchor
  useLayoutEffect(() => {
    if (!submenuRef.current) return;

    const rect = submenuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Try right side first
    let left = anchorRect.right + 2;
    let top = anchorRect.top;

    // If would go off-screen right, flip to left
    if (left + rect.width > viewportWidth) {
      left = anchorRect.left - rect.width - 2;
    }

    // Ensure doesn't go off bottom
    if (top + rect.height > viewportHeight) {
      top = viewportHeight - rect.height - 8;
    }
    if (top < 0) top = 8;

    setPosition({ left, top });
  }, [anchorRect]);

  // Get enabled items for keyboard navigation
  const enabledItems = items.filter((item) => !item.disabled);
  const getEnabledIndex = (itemIndex: number): number => {
    return enabledItems.findIndex((ei) => items[itemIndex] === ei);
  };
  const getItemIndex = (enabledIndex: number): number => {
    const item = enabledItems[enabledIndex];
    return item ? items.indexOf(item) : 0;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (enabledItems.length === 0) return;

      const currentEnabledIndex = getEnabledIndex(highlightedIndex);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextEnabledIndex = (currentEnabledIndex + 1) % enabledItems.length;
          setHighlightedIndex(getItemIndex(nextEnabledIndex));
          setNestedSubmenu(null);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevEnabledIndex =
            (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
          setHighlightedIndex(getItemIndex(prevEnabledIndex));
          setNestedSubmenu(null);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const item = items[highlightedIndex];
          if (item && item.submenu && !item.disabled) {
            const itemElement = submenuRef.current?.querySelector(
              `[data-item-index="${highlightedIndex}"]`
            ) as HTMLElement;
            if (itemElement) {
              const rect = itemElement.getBoundingClientRect();
              setNestedSubmenu({
                itemId: item.id,
                items: item.submenu,
                anchorRect: rect,
              });
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          onDismiss();
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const item = items[highlightedIndex];
          if (item && !item.disabled) {
            if (item.submenu && !selectableBranches) {
              const itemElement = submenuRef.current?.querySelector(
                `[data-item-index="${highlightedIndex}"]`
              ) as HTMLElement;
              if (itemElement) {
                const rect = itemElement.getBoundingClientRect();
                setNestedSubmenu({
                  itemId: item.id,
                  items: item.submenu,
                  anchorRect: rect,
                });
              }
            } else {
              onSelect(item.id);
            }
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onDismiss();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [highlightedIndex, items, enabledItems, onSelect, onDismiss, selectableBranches]);

  const handleMouseEnter = useCallback((index: number, item: CascadingMenuItem) => {
    if (item.disabled) return;

    setHighlightedIndex(index);

    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (item.submenu) {
      hoverTimeoutRef.current = window.setTimeout(() => {
        const itemElement = submenuRef.current?.querySelector(
          `[data-item-index="${index}"]`
        ) as HTMLElement;
        if (itemElement && item.submenu) {
          const rect = itemElement.getBoundingClientRect();
          setNestedSubmenu({
            itemId: item.id,
            items: item.submenu,
            anchorRect: rect,
          });
        }
      }, 150);
    } else {
      setNestedSubmenu(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (item: CascadingMenuItem) => {
      if (item.disabled) return;

      if (item.submenu && !selectableBranches) {
        return;
      }

      onSelect(item.id);
    },
    [onSelect, selectableBranches]
  );

  return (
    <>
      <div
        ref={submenuRef}
        className="debrief-cascading-menu debrief-cascading-menu--submenu"
        style={{ left: position.left, top: position.top }}
        role="menu"
        data-testid="cascading-submenu"
      >
        <div className="debrief-cascading-menu__items">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`debrief-cascading-menu__item ${
                index === highlightedIndex ? 'debrief-cascading-menu__item--highlighted' : ''
              } ${item.disabled ? 'debrief-cascading-menu__item--disabled' : ''} ${
                item.current ? 'debrief-cascading-menu__item--current' : ''
              }`}
              role="menuitem"
              aria-haspopup={item.submenu ? 'menu' : undefined}
              aria-expanded={item.submenu && nestedSubmenu?.itemId === item.id ? 'true' : undefined}
              aria-disabled={item.disabled ? 'true' : 'false'}
              data-item-index={index}
              data-testid={`submenu-item-${item.id}`}
              title={item.disabled && item.disabledReason ? item.disabledReason : undefined}
              onMouseEnter={() => handleMouseEnter(index, item)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(item)}
            >
              {item.swatch && (
                <span
                  className="debrief-cascading-menu__swatch"
                  style={{ background: item.swatch }}
                />
              )}
              <span className="debrief-cascading-menu__label">{item.label}</span>
              {item.current && <span className="debrief-cascading-menu__check">✓</span>}
              {item.submenu && <span className="debrief-cascading-menu__arrow">›</span>}
            </div>
          ))}
        </div>
      </div>

      {nestedSubmenu && (
        <SubmenuPanel
          items={nestedSubmenu.items}
          anchorRect={nestedSubmenu.anchorRect}
          selectableBranches={selectableBranches}
          onSelect={onSelect}
          onDismiss={() => setNestedSubmenu(null)}
        />
      )}
    </>
  );
};
