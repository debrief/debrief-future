/**
 * SaveFilterButton — save current filter bar state as a named configuration (#128).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SAVE_BUTTON_LABEL,
  SAVE_BUTTON_TOOLTIP,
  SAVE_PROMPT_PLACEHOLDER,
  SAVE_PROMPT_CONFIRM,
  SAVE_PROMPT_CANCEL,
  SAVE_PROMPT_OVERWRITE,
  SAVED_FILTERS_NAME_MAX_LENGTH,
} from './constants';
import type { FilterBarState, SavedFilterConfiguration } from './types';

export interface SaveFilterButtonProps {
  readonly currentFilterBarState: FilterBarState;
  readonly currentCql2Json: Record<string, unknown>;
  readonly hasActiveFilters: boolean;
  readonly nameExists: (name: string) => boolean;
  readonly onSave: (
    filterBarState: FilterBarState,
    cql2Json: Record<string, unknown>,
    name?: string,
  ) => void;
  readonly onOverwrite?: (name: string) => SavedFilterConfiguration | undefined;
  readonly onSaved?: (config: SavedFilterConfiguration) => void;
}

export const SaveFilterButton: React.FC<SaveFilterButtonProps> = ({
  currentFilterBarState,
  currentCql2Json,
  hasActiveFilters,
  nameExists,
  onSave,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [showOverwrite, setShowOverwrite] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setName('');
        setShowOverwrite(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && nameExists(trimmed)) {
      setShowOverwrite(true);
      return;
    }
    onSave(currentFilterBarState, currentCql2Json, trimmed || undefined);
    setIsOpen(false);
    setName('');
    setShowOverwrite(false);
  }, [name, nameExists, onSave, currentFilterBarState, currentCql2Json]);

  const handleOverwriteConfirm = useCallback(() => {
    onSave(currentFilterBarState, currentCql2Json, name.trim());
    setIsOpen(false);
    setName('');
    setShowOverwrite(false);
  }, [name, onSave, currentFilterBarState, currentCql2Json]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setName('');
    setShowOverwrite(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  return (
    <div className="debrief-save-filter" data-testid="save-filter-button">
      <button
        className="debrief-save-filter__button"
        disabled={!hasActiveFilters}
        title={SAVE_BUTTON_TOOLTIP}
        onClick={() => setIsOpen(true)}
        data-testid="save-filter-trigger"
      >
        {SAVE_BUTTON_LABEL}
      </button>

      {isOpen && (
        <div
          className="debrief-save-filter__popover"
          ref={popoverRef}
          data-testid="save-filter-popover"
        >
          <input
            ref={inputRef}
            className="debrief-save-filter__input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowOverwrite(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={SAVE_PROMPT_PLACEHOLDER}
            maxLength={SAVED_FILTERS_NAME_MAX_LENGTH}
            data-testid="save-filter-name-input"
          />

          {showOverwrite && (
            <div className="debrief-save-filter__overwrite" data-testid="save-filter-overwrite">
              <span>{SAVE_PROMPT_OVERWRITE}</span>
              <button
                className="debrief-save-filter__overwrite-confirm"
                onClick={handleOverwriteConfirm}
                data-testid="save-filter-overwrite-confirm"
              >
                Overwrite
              </button>
            </div>
          )}

          <div className="debrief-save-filter__actions">
            <button
              className="debrief-save-filter__save"
              onClick={handleSave}
              data-testid="save-filter-confirm"
            >
              {SAVE_PROMPT_CONFIRM}
            </button>
            <button
              className="debrief-save-filter__cancel"
              onClick={handleCancel}
              data-testid="save-filter-cancel"
            >
              {SAVE_PROMPT_CANCEL}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
