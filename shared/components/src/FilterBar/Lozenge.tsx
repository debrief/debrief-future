/**
 * Lozenge — pill-shaped filter component (#127).
 *
 * Displays filter type label + value, supports click-to-edit,
 * remove button, and is draggable via @dnd-kit.
 *
 * Extended in #186 to render a compound platform chip variant with a
 * multi-attribute label and a distinguishing icon/tint.
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { LozengeItem, PlatformAttributes } from './types';
import type { FilterType, PlatformField, VesselTaxonomyNode } from '../filter-engine';
import { resolveTaxonomyLabel } from '../filter-engine';
import { getFilterTypeLabel, PLATFORM_ATTRIBUTE_ORDER } from './constants';
import { ValueEditor } from './ValueEditor';
import { PlatformValueEditor } from './PlatformValueEditor';
import './Lozenge.css';

export interface LozengeProps {
  readonly item: LozengeItem;
  readonly isEditing: boolean;
  readonly onEdit: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onValueChange: (id: string, newValue: string) => void;
  readonly onPlatformAttributesChange?: (id: string, attributes: PlatformAttributes) => void;
  readonly onEditClose: () => void;
  readonly onToggleNegate: (id: string) => void;
  readonly availableValues: Readonly<Record<Exclude<FilterType, 'platform'>, readonly string[]>>;
  readonly platformAvailableValues?: Readonly<{
    readonly nationality: readonly string[];
    readonly domain: readonly string[];
    readonly vessel_role: readonly string[];
    readonly vessel_type: readonly string[];
  }>;
  readonly taxonomy: readonly VesselTaxonomyNode[];
  readonly labelMap?: ReadonlyMap<string, string>;
  readonly taxonomyCounts?: ReadonlyMap<string, number>;
}

/** Format a domain value (lowercase snake) for display */
function humaniseDomain(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Construct the human-readable label for a platform chip (#186 Decision 5) */
export function formatPlatformLabel(
  attributes: PlatformAttributes,
  labelMap?: ReadonlyMap<string, string>,
): string {
  const parts: string[] = [];
  for (const field of PLATFORM_ATTRIBUTE_ORDER) {
    const raw = attributes[field as PlatformField];
    if (typeof raw !== 'string' || raw === '') continue;
    let display: string;
    switch (field) {
      case 'nationality':
        display = raw.toUpperCase();
        break;
      case 'domain':
        display = humaniseDomain(raw);
        break;
      case 'vessel_class':
        display = labelMap ? resolveTaxonomyLabel(raw, labelMap) : raw;
        break;
      case 'vessel_role':
      case 'vessel_type':
        display = labelMap ? resolveTaxonomyLabel(raw, labelMap) : raw;
        break;
      default:
        display = raw;
    }
    parts.push(display);
  }
  return parts.join(' · ');
}

export const Lozenge: React.FC<LozengeProps> = ({
  item,
  isEditing,
  onEdit,
  onRemove,
  onValueChange,
  onPlatformAttributesChange,
  onEditClose,
  onToggleNegate,
  availableValues,
  platformAvailableValues,
  taxonomy,
  labelMap,
  taxonomyCounts,
}) => {
  const { attributes: dragAttributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { kind: 'lozenge', item },
  });

  const isPlatform = item.shape === 'platform';
  const typeLabel = getFilterTypeLabel(item.filterType);

  const displayValue = isPlatform
    ? formatPlatformLabel(item.attributes, labelMap)
    : item.filterType === 'vessel-class' && labelMap
      ? resolveTaxonomyLabel(item.value, labelMap)
      : item.value;

  const className = [
    'debrief-lozenge',
    isDragging ? 'debrief-lozenge--dragging' : '',
    item.negated ? 'debrief-lozenge--negated' : '',
    isPlatform ? 'debrief-lozenge--platform' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      className={className}
      data-testid={`lozenge-${item.id}`}
      data-shape={item.shape}
      {...dragAttributes}
      {...listeners}
    >
      <span
        className="debrief-lozenge__body"
        onClick={() => onEdit(item.id)}
        data-testid={`lozenge-body-${item.id}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEdit(item.id);
        }}
      >
        {item.negated && <span className="debrief-lozenge__not">NOT</span>}
        {isPlatform && (
          <span
            className="debrief-lozenge__icon"
            data-testid={`lozenge-icon-${item.id}`}
            aria-hidden="true"
          >
            ⚓
          </span>
        )}
        <span className="debrief-lozenge__type">{typeLabel}</span>
        <span className="debrief-lozenge__separator">:</span>
        <span className="debrief-lozenge__value">{displayValue}</span>
      </span>
      <button
        className="debrief-lozenge__negate"
        onClick={(e) => {
          e.stopPropagation();
          onToggleNegate(item.id);
        }}
        data-testid={`lozenge-negate-${item.id}`}
        aria-label={
          item.negated
            ? `Include ${typeLabel}: ${displayValue}`
            : `Exclude ${typeLabel}: ${displayValue}`
        }
        title={item.negated ? 'Include (remove NOT)' : 'Exclude (add NOT)'}
      >
        {item.negated ? '≠' : '='}
      </button>
      <button
        className="debrief-lozenge__remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        data-testid={`lozenge-remove-${item.id}`}
        aria-label={`Remove ${typeLabel}: ${displayValue}`}
        title="Remove filter"
      >
        ×
      </button>
      {isEditing && item.shape === 'simple' && (
        <div className="debrief-lozenge__editor">
          <ValueEditor
            filterType={item.filterType}
            value={item.value}
            onSelect={(value) => {
              onValueChange(item.id, value);
              onEditClose();
            }}
            onClose={onEditClose}
            availableValues={availableValues[item.filterType] ?? []}
            taxonomy={taxonomy}
            taxonomyCounts={taxonomyCounts}
          />
        </div>
      )}
      {isEditing && item.shape === 'platform' && onPlatformAttributesChange && (
        <div className="debrief-lozenge__editor" data-testid={`lozenge-editor-${item.id}`}>
          <PlatformValueEditor
            initialAttributes={item.attributes}
            availableValues={
              platformAvailableValues ?? {
                nationality: [],
                domain: [],
                vessel_role: [],
                vessel_type: [],
              }
            }
            taxonomy={taxonomy}
            taxonomyCounts={taxonomyCounts}
            onConfirm={(attrs) => {
              onPlatformAttributesChange(item.id, attrs);
              onEditClose();
            }}
            onCancel={onEditClose}
          />
        </div>
      )}
    </div>
  );
};
