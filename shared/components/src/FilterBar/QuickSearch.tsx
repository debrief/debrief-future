/**
 * QuickSearch — inline search input for fast title filtering.
 *
 * Always visible in the FilterBar. Typing filters items by title in real-time
 * (debounced 200ms). Pressing Enter "graduates" the search text into a title
 * lozenge. Pressing Escape clears the input without creating a lozenge.
 *
 * Keyboard shortcuts: Ctrl+F or "/" focuses the input from anywhere in the
 * FilterBar's parent container.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface QuickSearchProps {
  /** Called on every debounced keystroke with the current search text (empty string = cleared). */
  readonly onSearchChange: (text: string) => void;
  /** Called when user commits the search (Enter). Parent should create a title lozenge. */
  readonly onCommit: (text: string) => void;
  /** Placeholder text */
  readonly placeholder?: string;
}

const DEBOUNCE_MS = 200;

export const QuickSearch: React.FC<QuickSearchProps> = ({
  onSearchChange,
  onCommit,
  placeholder = 'Quick search\u2026',
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search callback
  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, DEBOUNCE_MS);
    },
    [onSearchChange],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setText(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && text.trim()) {
        e.preventDefault();
        // Flush any pending debounce — the commit takes precedence
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onSearchChange(''); // Clear live filter — lozenge takes over
        onCommit(text.trim());
        setText('');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setText('');
        onSearchChange('');
        inputRef.current?.blur();
      }
    },
    [text, onCommit, onSearchChange],
  );

  // Global keyboard shortcut: Ctrl+F or "/" focuses the input
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // "/" when no input/textarea is focused
      if (
        e.key === '/' &&
        !isEditableTarget(e.target)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      // Ctrl+F (or Cmd+F on Mac)
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div className="debrief-quick-search" data-testid="quick-search">
      <span className="debrief-quick-search__icon" aria-hidden="true">&#x1F50D;</span>
      <input
        ref={inputRef}
        className="debrief-quick-search__input"
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Quick search by title"
        data-testid="quick-search-input"
      />
      {text && (
        <button
          className="debrief-quick-search__clear"
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            setText('');
            onSearchChange('');
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          data-testid="quick-search-clear"
          title="Clear (Esc)"
          type="button"
        >
          &times;
        </button>
      )}
    </div>
  );
};

/** Returns true if the event target is an editable element (input, textarea, contenteditable). */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!el || !('tagName' in el)) return false;
  const tag = (el as HTMLElement).tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}
