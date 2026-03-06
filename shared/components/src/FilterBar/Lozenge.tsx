/**
 * Lozenge — pill-shaped filter component (#127).
 *
 * Displays filter type label + value, supports click-to-edit,
 * remove button, and is draggable via @dnd-kit.
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { LozengeItem } from './types';
import type { FilterType, VesselTaxonomyNode } from '../filter-engine';
import { getFilterTypeLabel } from './constants';
import { ValueEditor } from './ValueEditor';
import './Lozenge.css';

export interface LozengeProps {
  readonly item: LozengeItem;
  readonly isEditing: boolean;
  readonly onEdit: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onValueChange: (id: string, newValue: string) => void;
  readonly onEditClose: () => void;
  readonly availableValues: Readonly<Record<FilterType, readonly string[]>>;
  readonly taxonomy: readonly VesselTaxonomyNode[];
}

export const Lozenge: React.FC<LozengeProps> = ({
  item,
  isEditing,
  onEdit,
  onRemove,
  onValueChange,
  onEditClose,
  availableValues,
  taxonomy,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { kind: 'lozenge', item },
  });

  const typeLabel = getFilterTypeLabel(item.filterType);
  const valuesForType = availableValues[item.filterType] ?? [];

  return (
    <div
      ref={setNodeRef}
      className={`debrief-lozenge ${isDragging ? 'debrief-lozenge--dragging' : ''}`}
      data-testid={`lozenge-${item.id}`}
      {...attributes}
      {...listeners}
    >
      <span
        className="debrief-lozenge__body"
        onClick={() => onEdit(item.id)}
        data-testid={`lozenge-body-${item.id}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onEdit(item.id); }}
      >
        <span className="debrief-lozenge__type">{typeLabel}</span>
        <span className="debrief-lozenge__separator">:</span>
        <span className="debrief-lozenge__value">{item.value}</span>
      </span>
      <button
        className="debrief-lozenge__remove"
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        data-testid={`lozenge-remove-${item.id}`}
        aria-label={`Remove ${typeLabel}: ${item.value}`}
        title="Remove filter"
      >
        ×
      </button>
      {isEditing && (
        <div className="debrief-lozenge__editor">
          <ValueEditor
            filterType={item.filterType}
            value={item.value}
            onSelect={(value) => { onValueChange(item.id, value); onEditClose(); }}
            onClose={onEditClose}
            availableValues={valuesForType}
            taxonomy={taxonomy}
          />
        </div>
      )}
    </div>
  );
};
