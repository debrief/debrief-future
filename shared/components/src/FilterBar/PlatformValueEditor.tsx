/**
 * PlatformValueEditor — compound-attribute popover for the platform chip (#186).
 *
 * Renders one picker per supported PlatformField and a Confirm/Cancel pair.
 * Confirm stays disabled until at least one attribute has a non-empty value.
 * Closes on Escape or click-outside via onCancel.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlatformAttributes } from './types';
import type { PlatformField, VesselTaxonomyNode } from '../filter-engine';
import { SearchableCascadingMenu } from '../CascadingMenu';
import { taxonomyToCascadingItems } from './taxonomyAdapter';
import {
  PLATFORM_ATTRIBUTE_LABELS,
  PLATFORM_ATTRIBUTE_PLACEHOLDER,
  PLATFORM_CANCEL_LABEL,
  PLATFORM_CONFIRM_LABEL,
  PLATFORM_EMPTY_HINT,
} from './constants';
import './PlatformValueEditor.css';

export interface PlatformValueEditorProps {
  readonly initialAttributes: PlatformAttributes;
  readonly availableValues: Readonly<{
    readonly nationality: readonly string[];
    readonly domain: readonly string[];
    readonly vessel_role: readonly string[];
    readonly vessel_type: readonly string[];
  }>;
  readonly taxonomy: readonly VesselTaxonomyNode[];
  readonly taxonomyCounts?: ReadonlyMap<string, number>;
  readonly onConfirm: (attributes: PlatformAttributes) => void;
  readonly onCancel: () => void;
}

const FLAT_FIELDS: readonly Exclude<PlatformField, 'id' | 'name' | 'vessel_class'>[] = [
  'nationality',
  'domain',
  'vessel_role',
  'vessel_type',
];

function countNonEmpty(attrs: PlatformAttributes): number {
  let n = 0;
  for (const key in attrs) {
    const v = attrs[key as PlatformField];
    if (typeof v === 'string' && v.trim() !== '') n++;
  }
  return n;
}

function stripEmpty(attrs: PlatformAttributes): PlatformAttributes {
  const out: PlatformAttributes = {};
  for (const key in attrs) {
    const v = attrs[key as PlatformField];
    if (typeof v === 'string' && v.trim() !== '') {
      out[key as PlatformField] = v.trim();
    }
  }
  return out;
}

export const PlatformValueEditor: React.FC<PlatformValueEditorProps> = ({
  initialAttributes,
  availableValues,
  taxonomy,
  taxonomyCounts,
  onConfirm,
  onCancel,
}) => {
  const [draft, setDraft] = useState<PlatformAttributes>(() => ({ ...initialAttributes }));
  const [vesselClassOpen, setVesselClassOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onCancel]);

  const setField = useCallback((field: PlatformField, value: string | undefined) => {
    setDraft((prev) => {
      const next: PlatformAttributes = { ...prev };
      if (value === undefined || value === '') {
        delete next[field];
      } else {
        next[field] = value;
      }
      return next;
    });
  }, []);

  const canConfirm = useMemo(() => countNonEmpty(draft) > 0, [draft]);

  const handleConfirm = useCallback(() => {
    const cleaned = stripEmpty(draft);
    if (countNonEmpty(cleaned) === 0) return;
    onConfirm(cleaned);
  }, [draft, onConfirm]);

  const allEmpty =
    availableValues.nationality.length === 0 &&
    availableValues.domain.length === 0 &&
    availableValues.vessel_role.length === 0 &&
    availableValues.vessel_type.length === 0 &&
    taxonomy.length === 0;

  return (
    <div
      ref={containerRef}
      className="debrief-platform-editor"
      data-testid="platform-value-editor"
      role="dialog"
      aria-label="Platform filter"
    >
      {allEmpty && (
        <div className="debrief-platform-editor__empty" data-testid="platform-editor-empty">
          {PLATFORM_EMPTY_HINT}
        </div>
      )}

      {FLAT_FIELDS.map((field) => {
        const values = availableValues[field];
        const current = draft[field] ?? '';
        return (
          <div
            key={field}
            className="debrief-platform-editor__row"
            data-testid={`platform-editor-row-${field}`}
          >
            <label className="debrief-platform-editor__label" htmlFor={`platform-${field}`}>
              {PLATFORM_ATTRIBUTE_LABELS[field]}
            </label>
            <select
              id={`platform-${field}`}
              className="debrief-platform-editor__select"
              data-testid={`platform-editor-select-${field}`}
              value={current}
              onChange={(e) => setField(field, e.target.value === '' ? undefined : e.target.value)}
            >
              <option value="">{PLATFORM_ATTRIBUTE_PLACEHOLDER}</option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <div
        className="debrief-platform-editor__row"
        data-testid="platform-editor-row-vessel_class"
      >
        <label className="debrief-platform-editor__label">
          {PLATFORM_ATTRIBUTE_LABELS.vessel_class}
        </label>
        <button
          type="button"
          className="debrief-platform-editor__select debrief-platform-editor__vessel-class"
          data-testid="platform-editor-vessel-class-trigger"
          onClick={() => setVesselClassOpen((v) => !v)}
        >
          {draft.vessel_class ?? PLATFORM_ATTRIBUTE_PLACEHOLDER}
        </button>
        {vesselClassOpen && (
          <div
            className="debrief-platform-editor__vessel-class-menu"
            data-testid="platform-editor-vessel-class-menu"
          >
            <SearchableCascadingMenu
              items={taxonomyToCascadingItems(taxonomy, {
                currentValue: draft.vessel_class,
                counts: taxonomyCounts,
                disableEmpty: !!taxonomyCounts,
              })}
              anchorPosition={{ x: 0, y: 0 }}
              header="Vessel Class"
              selectableBranches
              searchable
              searchPlaceholder="Search vessel types..."
              onSelect={(id) => {
                setField('vessel_class', id);
                setVesselClassOpen(false);
              }}
              onDismiss={() => setVesselClassOpen(false)}
            />
          </div>
        )}
        {draft.vessel_class !== undefined && (
          <button
            type="button"
            className="debrief-platform-editor__clear"
            data-testid="platform-editor-clear-vessel_class"
            onClick={() => setField('vessel_class', undefined)}
            aria-label="Clear vessel class"
          >
            ×
          </button>
        )}
      </div>

      <div className="debrief-platform-editor__actions">
        <button
          type="button"
          className="debrief-platform-editor__cancel"
          data-testid="platform-editor-cancel"
          onClick={onCancel}
        >
          {PLATFORM_CANCEL_LABEL}
        </button>
        <button
          type="button"
          className="debrief-platform-editor__confirm"
          data-testid="platform-editor-confirm"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {PLATFORM_CONFIRM_LABEL}
        </button>
      </div>
    </div>
  );
};
