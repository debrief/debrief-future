/**
 * ValueEditor — polymorphic popover for selecting filter values (#127).
 *
 * Dispatches to correct input control based on filter type:
 * - hierarchical: CascadingMenu (vessel class)
 * - flat-dropdown: simple dropdown list
 * - bucket: fixed duration options
 * - free-text: text input with 150ms debounce
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { FilterType, VesselTaxonomyNode } from '../filter-engine';
import { CascadingMenu } from '../CascadingMenu';
import { taxonomyToCascadingItems } from './taxonomyAdapter';
import { FILTER_TYPE_OPTIONS, DURATION_BUCKETS, DURATION_BUCKET_LABELS, FREE_TEXT_DEBOUNCE_MS } from './constants';

export interface ValueEditorProps {
  readonly filterType: FilterType;
  readonly value: string;
  readonly onSelect: (value: string) => void;
  readonly onClose: () => void;
  readonly availableValues: readonly string[];
  readonly taxonomy?: readonly VesselTaxonomyNode[];
}

export const ValueEditor: React.FC<ValueEditorProps> = ({
  filterType,
  value,
  onSelect,
  onClose,
  availableValues,
  taxonomy,
}) => {
  const option = FILTER_TYPE_OPTIONS.find((o) => o.type === filterType);
  const inputMethod = option?.inputMethod ?? 'flat-dropdown';

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  switch (inputMethod) {
    case 'hierarchical':
      return (
        <div ref={containerRef} data-testid="value-editor-hierarchical">
          <CascadingMenu
            items={taxonomy ? taxonomyToCascadingItems(taxonomy) : []}
            anchorPosition={{ x: 0, y: 0 }}
            header="Vessel Class"
            onSelect={(id) => onSelect(id)}
            onDismiss={onClose}
          />
        </div>
      );

    case 'bucket':
      return (
        <div ref={containerRef} className="debrief-value-editor__dropdown" data-testid="value-editor-bucket">
          {DURATION_BUCKETS.map((bucket) => (
            <button
              key={bucket}
              className={`debrief-value-editor__option ${bucket === value ? 'debrief-value-editor__option--selected' : ''}`}
              data-testid={`value-option-${bucket}`}
              onClick={() => onSelect(bucket)}
            >
              {DURATION_BUCKET_LABELS[bucket]}
            </button>
          ))}
        </div>
      );

    case 'free-text':
      return <FreeTextInput value={value} onSelect={onSelect} onClose={onClose} />;

    case 'flat-dropdown':
    default:
      return (
        <div ref={containerRef} className="debrief-value-editor__dropdown" data-testid="value-editor-dropdown">
          {availableValues.map((v) => (
            <button
              key={v}
              className={`debrief-value-editor__option ${v === value ? 'debrief-value-editor__option--selected' : ''}`}
              data-testid={`value-option-${v}`}
              onClick={() => onSelect(v)}
            >
              {v}
            </button>
          ))}
          {availableValues.length === 0 && (
            <div className="debrief-value-editor__empty">No values available</div>
          )}
        </div>
      );
  }
};

interface FreeTextInputProps {
  readonly value: string;
  readonly onSelect: (value: string) => void;
  readonly onClose: () => void;
}

const FreeTextInput: React.FC<FreeTextInputProps> = ({ value, onSelect, onClose }) => {
  const [text, setText] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setText(newValue);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (newValue.trim()) {
        onSelect(newValue.trim());
      }
    }, FREE_TEXT_DEBOUNCE_MS);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSelect(text.trim());
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [text, onSelect, onClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="debrief-value-editor__free-text" data-testid="value-editor-free-text">
      <input
        ref={inputRef}
        type="text"
        className="debrief-value-editor__input"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type to search..."
        data-testid="value-editor-text-input"
      />
    </div>
  );
};
