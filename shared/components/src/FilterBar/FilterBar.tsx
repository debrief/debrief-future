/**
 * FilterBar — main container component (#127).
 *
 * Persistent filter bar with DnD context, lozenges, OR containers,
 * (+) add button, empty state hint, and error banner.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { createFilterEngine, buildTaxonomyLabelMap, resolveTaxonomyLabel } from '../filter-engine';
import type { FilterType, FilterExpression, StacBrowserItem } from '../filter-engine';
import { useFilterBar } from './useFilterBar';
import { useDistinctValues } from './useDistinctValues';
import { useTaxonomyMatchCounts } from './useTaxonomyMatchCounts';
import { Lozenge } from './Lozenge';
import { OrContainer } from './OrContainer';
import { FilterTypeMenu } from './FilterTypeMenu';
import { ValueEditor } from './ValueEditor';
import { SaveFilterButton } from './SaveFilterButton';
import { HistoricFiltersDropdown } from './HistoricFiltersDropdown';
import { useSavedFilters } from './useSavedFilters';
import { InMemoryStorage } from './savedFiltersStorage';
import { EMPTY_STATE_HINT, FILTER_ERROR_MESSAGE } from './constants';
import type { FilterBarProps, LozengeItem, SavedFilterConfiguration } from './types';
import './FilterBar.css';

const fallbackStorage = new InMemoryStorage();

export const FilterBar: React.FC<FilterBarProps> = ({
  items,
  taxonomy,
  onFilteredItems,
  onExpressionChange,
  initialFilterState,
  savedFiltersStorage,
}) => {
  const {
    state,
    expression,
    addLozenge,
    removeLozenge,
    editLozenge,
    addOrContainer,
    removeOrContainer,
    addChildLozenge,
    toggleNegate,
    moveToContainer,
    moveToTopLevel,
    setState: setFilterBarState,
  } = useFilterBar(initialFilterState);

  const savedFilters = useSavedFilters(savedFiltersStorage ?? fallbackStorage);

  const handleRestore = useCallback(
    (config: SavedFilterConfiguration) => {
      setFilterBarState(config.filterBarState);
    },
    [setFilterBarState],
  );

  const distinctValues = useDistinctValues(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<FilterType | null>(null);
  const [addingForContainer, setAddingForContainer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [filteredItems, setFilteredItems] = useState<readonly StacBrowserItem[]>(items);

  const engine = useMemo(
    () => createFilterEngine({ taxonomy }),
    [taxonomy],
  );

  const labelMap = useMemo(
    () => buildTaxonomyLabelMap(taxonomy),
    [taxonomy],
  );

  const taxonomyCounts = useTaxonomyMatchCounts(filteredItems, taxonomy);

  const cql2Json = useMemo(
    () => engine.toCql2Json(expression),
    [engine, expression],
  );


  // Filter items whenever expression changes
  const prevExpressionRef = useRef<FilterExpression | null>(null);
  useEffect(() => {
    // Skip if expression hasn't changed
    if (prevExpressionRef.current === expression) return;
    prevExpressionRef.current = expression;

    try {
      const filtered = engine.filter(items, expression);
      setFilteredItems(filtered);
      onFilteredItems(filtered);
      onExpressionChange?.(expression);
      setError(null);
    } catch {
      setError(FILTER_ERROR_MESSAGE);
    }
  }, [expression, items, engine, onFilteredItems, onExpressionChange]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Only allow lozenges to be dragged (not OR containers)
    if (activeData?.kind !== 'lozenge') return;

    const lozengeId = String(active.id);

    // Dropped on an OR container
    if (overData?.kind === 'or-container') {
      const containerId = String(over.id);
      moveToContainer(lozengeId, containerId);
      return;
    }

    // Dropped on the filter bar (top level) — check if it came from a container
    if (overData?.kind === 'filter-bar' && activeData?.fromContainerId) {
      moveToTopLevel(lozengeId, activeData.fromContainerId);
    }
  }, [moveToContainer, moveToTopLevel]);

  // Handle filter type selection from (+) menu
  const handleSelectType = useCallback((type: string) => {
    setAddingType(type as FilterType);
    setAddingForContainer(null);
  }, []);

  const handleSelectOrGroup = useCallback(() => {
    addOrContainer();
  }, [addOrContainer]);

  const handleAddChildType = useCallback((containerId: string, type: string) => {
    setAddingType(type as FilterType);
    setAddingForContainer(containerId);
  }, []);

  // Handle value selection from ValueEditor
  const handleValueSelect = useCallback((value: string) => {
    if (addingType) {
      if (addingForContainer) {
        addChildLozenge(addingForContainer, addingType, value);
      } else {
        addLozenge(addingType, value);
      }
      setAddingType(null);
      setAddingForContainer(null);
    }
  }, [addingType, addingForContainer, addLozenge, addChildLozenge]);

  const handleValueClose = useCallback(() => {
    setAddingType(null);
    setAddingForContainer(null);
  }, []);

  // Find active drag item for overlay
  const activeDragItem = useMemo((): LozengeItem | undefined => {
    if (!activeDragId) return undefined;
    for (const item of state.items) {
      if (item.kind === 'lozenge' && item.id === activeDragId) return item;
      if (item.kind === 'or-container') {
        const child = item.children.find((c) => c.id === activeDragId);
        if (child) return child;
      }
    }
    return undefined;
  }, [activeDragId, state.items]);

  const isEmpty = state.items.length === 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="debrief-filter-bar" data-testid="filter-bar">
        {savedFiltersStorage && (
          <div className="debrief-filter-bar__toolbar" data-testid="filter-bar-toolbar">
            <SaveFilterButton
              currentFilterBarState={state}
              currentCql2Json={cql2Json}
              hasActiveFilters={!isEmpty}
              nameExists={savedFilters.nameExists}
              onSave={savedFilters.saveConfiguration}
            />
            <HistoricFiltersDropdown
              configurations={savedFilters.configurations}
              onRestore={handleRestore}
              onDelete={savedFilters.deleteConfiguration}
            />
          </div>
        )}

        {error && (
          <div className="debrief-filter-bar__error" data-testid="filter-bar-error" role="alert">
            {error}
          </div>
        )}

        <div className="debrief-filter-bar__items" data-testid="filter-bar-items">
          {state.items.map((item) => {
            if (item.kind === 'lozenge') {
              return (
                <Lozenge
                  key={item.id}
                  item={item}
                  isEditing={editingId === item.id}
                  onEdit={setEditingId}
                  onRemove={removeLozenge}
                  onValueChange={editLozenge}
                  onEditClose={() => setEditingId(null)}
                  onToggleNegate={toggleNegate}
                  availableValues={distinctValues}
                  taxonomy={taxonomy}
                  labelMap={labelMap}
                  taxonomyCounts={taxonomyCounts}
                />
              );
            }
            if (item.kind === 'or-container') {
              return (
                <OrContainer
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  onAddChildType={handleAddChildType}
                  onRemove={removeOrContainer}
                  onEditLozenge={setEditingId}
                  onRemoveLozenge={removeLozenge}
                  onValueChange={editLozenge}
                  onEditClose={() => setEditingId(null)}
                  onToggleNegate={toggleNegate}
                  availableValues={distinctValues}
                  taxonomy={taxonomy}
                  labelMap={labelMap}
                  taxonomyCounts={taxonomyCounts}
                />
              );
            }
            return null;
          })}

          {isEmpty && (
            <span className="debrief-filter-bar__hint" data-testid="filter-bar-hint">
              {EMPTY_STATE_HINT}
            </span>
          )}

          <FilterTypeMenu
            onSelectType={handleSelectType}
            onSelectOrGroup={handleSelectOrGroup}
          />
        </div>

        {/* Value editor popover for adding new filter */}
        {addingType && !addingForContainer && (
          <div className="debrief-filter-bar__adding" data-testid="filter-bar-adding">
            <ValueEditor
              filterType={addingType}
              value=""
              onSelect={handleValueSelect}
              onClose={handleValueClose}
              availableValues={distinctValues[addingType] ?? []}
              taxonomy={taxonomy}
              taxonomyCounts={taxonomyCounts}
            />
          </div>
        )}

        {/* Value editor for adding inside an OR container */}
        {addingType && addingForContainer && (
          <div className="debrief-filter-bar__adding" data-testid="filter-bar-container-adding">
            <ValueEditor
              filterType={addingType}
              value=""
              onSelect={handleValueSelect}
              onClose={handleValueClose}
              availableValues={distinctValues[addingType] ?? []}
              taxonomy={taxonomy}
              taxonomyCounts={taxonomyCounts}
            />
          </div>
        )}
      </div>

      <DragOverlay>
        {activeDragItem && (
          <div className="debrief-lozenge debrief-lozenge--overlay">
            <span className="debrief-lozenge__body">
              <span className="debrief-lozenge__type">{activeDragItem.filterType}</span>
              <span className="debrief-lozenge__separator">:</span>
              <span className="debrief-lozenge__value">
                {activeDragItem.filterType === 'vessel-class'
                  ? resolveTaxonomyLabel(activeDragItem.value, labelMap)
                  : activeDragItem.value}
              </span>
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
