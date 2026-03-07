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
import { FILTER_TYPE_OPTIONS, DURATION_BUCKETS, DURATION_BUCKET_LABELS, MODIFIED_BUCKETS, MODIFIED_BUCKET_LABELS } from './constants';

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
            selectableBranches
            onSelect={(id) => onSelect(id)}
            onDismiss={onClose}
          />
        </div>
      );

    case 'bucket': {
      const buckets = filterType === 'modified' ? MODIFIED_BUCKETS : DURATION_BUCKETS;
      const labels = filterType === 'modified' ? MODIFIED_BUCKET_LABELS : DURATION_BUCKET_LABELS;
      return (
        <div ref={containerRef} className="debrief-value-editor__dropdown" data-testid="value-editor-bucket">
          {buckets.map((bucket) => (
            <button
              key={bucket}
              className={`debrief-value-editor__option ${bucket === value ? 'debrief-value-editor__option--selected' : ''}`}
              data-testid={`value-option-${bucket}`}
              onClick={() => onSelect(bucket)}
            >
              {labels[bucket as keyof typeof labels]}
            </button>
          ))}
        </div>
      );
    }

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleApply = useCallback(() => {
    if (text.trim()) {
      onSelect(text.trim());
    }
  }, [text, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [handleApply, onClose]);

  return (
    <div className="debrief-value-editor__free-text" data-testid="value-editor-free-text">
      <input
        ref={inputRef}
        type="text"
        className="debrief-value-editor__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type to search..."
        data-testid="value-editor-text-input"
      />
      <button
        className="debrief-value-editor__apply"
        data-testid="value-editor-apply"
        disabled={!text.trim()}
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
};
