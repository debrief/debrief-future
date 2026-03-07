/**
 * OrContainer — OR group wrapper with child lozenges (#127).
 *
 * Uses @dnd-kit useDroppable to accept lozenge drops (but not OR containers).
 * Contains a mini (+) button for adding child filters.
 */

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { LozengeItem } from './types';
import type { FilterType, VesselTaxonomyNode } from '../filter-engine';
import { Lozenge } from './Lozenge';
import { FILTER_TYPE_OPTIONS } from './constants';
import './OrContainer.css';

export interface OrContainerProps {
  readonly item: { readonly kind: 'or-container'; readonly id: string; readonly children: readonly LozengeItem[] };
  readonly editingId: string | null;
  readonly onAddChildType: (containerId: string, type: string) => void;
  readonly onRemove: (containerId: string) => void;
  readonly onEditLozenge: (id: string) => void;
  readonly onRemoveLozenge: (id: string) => void;
  readonly onValueChange: (id: string, newValue: string) => void;
  readonly onEditClose: () => void;
  readonly onToggleNegate: (id: string) => void;
  readonly availableValues: Readonly<Record<FilterType, readonly string[]>>;
  readonly taxonomy: readonly VesselTaxonomyNode[];
}

export const OrContainer: React.FC<OrContainerProps> = ({
  item,
  editingId,
  onAddChildType,
  onRemove,
  onEditLozenge,
  onRemoveLozenge,
  onValueChange,
  onEditClose,
  onToggleNegate,
  availableValues,
  taxonomy,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: item.id,
    data: { kind: 'or-container', item },
  });

  const [showMiniMenu, setShowMiniMenu] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`debrief-or-container ${isOver ? 'debrief-or-container--drag-over' : ''}`}
      data-testid={`or-container-${item.id}`}
    >
      <span className="debrief-or-container__label">OR</span>

      <div className="debrief-or-container__children">
        {item.children.map((child, index) => (
          <React.Fragment key={child.id}>
            {index > 0 && <span className="debrief-or-container__or-divider">or</span>}
            <Lozenge
              item={child}
              isEditing={editingId === child.id}
              onEdit={onEditLozenge}
              onRemove={onRemoveLozenge}
              onValueChange={onValueChange}
              onEditClose={onEditClose}
              onToggleNegate={onToggleNegate}
              availableValues={availableValues}
              taxonomy={taxonomy}
            />
          </React.Fragment>
        ))}
      </div>

      <div className="debrief-or-container__actions">
        <div className="debrief-or-container__mini-menu-wrapper">
          <button
            className="debrief-or-container__add"
            onClick={() => setShowMiniMenu((v) => !v)}
            data-testid={`or-container-add-${item.id}`}
            aria-label="Add filter to OR group"
            title="Add filter to OR group"
          >
            +
          </button>
          {showMiniMenu && (
            <div className="debrief-or-container__mini-dropdown" data-testid={`or-container-menu-${item.id}`}>
              {FILTER_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  className="debrief-or-container__mini-option"
                  data-testid={`or-child-type-${option.type}`}
                  onClick={() => { onAddChildType(item.id, option.type); setShowMiniMenu(false); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="debrief-or-container__remove"
          onClick={() => onRemove(item.id)}
          data-testid={`or-container-remove-${item.id}`}
          aria-label="Remove OR group"
          title="Remove OR group"
        >
          ×
        </button>
      </div>
    </div>
  );
};
