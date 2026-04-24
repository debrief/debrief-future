/**
 * FilterBar — main container component (#127).
 *
 * Persistent filter bar with DnD context, lozenges, OR containers,
 * (+) add button, empty state hint, and error banner.
 *
 * Extended in #186 to support a compound 'platform' chip via a new
 * PlatformValueEditor branch in the add-filter flow.
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
import { generateCql2, type LiveOutcome, type LozengeSeed } from '../nl-cql2';
import { useFilterBar } from './useFilterBar';
import { useDistinctValues } from './useDistinctValues';
import { useTaxonomyMatchCounts } from './useTaxonomyMatchCounts';
import { Lozenge, formatPlatformLabel } from './Lozenge';
import { OrContainer } from './OrContainer';
import { FilterTypeMenu } from './FilterTypeMenu';
import { QuickSearch } from './QuickSearch';
import { ValueEditor } from './ValueEditor';
import { PlatformValueEditor } from './PlatformValueEditor';
import { SaveFilterButton } from './SaveFilterButton';
import { HistoricFiltersDropdown } from './HistoricFiltersDropdown';
import { useSavedFilters } from './useSavedFilters';
import { InMemoryStorage } from './savedFiltersStorage';
import { EMPTY_STATE_HINT, FILTER_ERROR_MESSAGE } from './constants';
import type {
  FilterBarProps,
  LozengeItem,
  PlatformAttributes,
  SavedFilterConfiguration,
} from './types';
import './FilterBar.css';

const fallbackStorage = new InMemoryStorage();

export const FilterBar: React.FC<FilterBarProps> = ({
  items,
  taxonomy,
  onFilteredItems,
  onExpressionChange,
  initialFilterState,
  savedFiltersStorage,
  // #191 Phase 3 — NL-search mode is opt-in. When `llmClient` + `nlEnums`
  // are both provided, the FilterBar routes Enter through the
  // `buildPrompt → client.generate → parseResponse → dispatch chips` pipeline
  // instead of graduating the literal text as a title lozenge. Without them,
  // today's behaviour is preserved (review Decision 12).
  llmClient,
  nlEnums,
  liveModeLabel,
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
    addPlatformLozenge,
    editPlatformLozenge,
    addChildPlatformLozenge,
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
  const [quickSearchText, setQuickSearchText] = useState('');

  const engine = useMemo(
    () => createFilterEngine({ taxonomy }),
    [taxonomy],
  );

  const labelMap = useMemo(
    () => buildTaxonomyLabelMap(taxonomy),
    [taxonomy],
  );

  const taxonomyCounts = useTaxonomyMatchCounts(filteredItems, taxonomy);

  // Merge quick-search text into lozenge-based expression as an extra title predicate
  const effectiveExpression: FilterExpression = useMemo(() => {
    if (!quickSearchText) return expression;
    return {
      ...expression,
      predicates: [
        ...expression.predicates,
        { type: 'title' as Exclude<FilterType, 'platform'>, value: quickSearchText },
      ],
    };
  }, [expression, quickSearchText]);

  const cql2Json = useMemo(
    () => engine.toCql2Json(effectiveExpression),
    [engine, effectiveExpression],
  );

  // ---------------------------------------------------------------------
  // #191 Phase 3 — NL-search routing
  //
  //   llmClient + nlEnums present? → NL pipeline
  //     (abort-prior → generate → parseResponse → dispatch chips / banner)
  //   otherwise → literal title graduation (today's behaviour)
  //
  // Invariants (review Decisions 7, 11, 12):
  //   - Lozenges and filter state SURVIVE every failure. Only success,
  //     remove-chip, clear-all, or manual-add clear them.
  //   - Supersession ALWAYS cancels the prior in-flight call before a new
  //     one starts (T042).
  //   - Cancellations drop silently — no banner (T047).
  // ---------------------------------------------------------------------
  const isNlMode = Boolean(llmClient && nlEnums);
  const [nlBusy, setNlBusy] = useState(false);
  const [nlBanner, setNlBanner] = useState<LiveOutcome | null>(null);
  const nlTokenRef = useRef(0);

  const handleNlSubmit = useCallback(
    async (phrase: string) => {
      if (!llmClient || !nlEnums) return;
      const trimmed = phrase.trim();
      if (trimmed.length === 0) return;

      // Supersede any prior in-flight submission BEFORE issuing the new one
      // so earlier chip sets cannot land after a newer phrase (T042).
      try {
        llmClient.abort();
      } catch {
        // Best-effort — an abort on a client with nothing in flight is a no-op.
      }

      const token = ++nlTokenRef.current;
      setNlBusy(true);
      setNlBanner(null);
      try {
        const result = await generateCql2(trimmed, {
          client: llmClient,
          enums: nlEnums,
        });
        if (nlTokenRef.current !== token) return; // superseded — drop silently
        setQuickSearchText('');

        if (result.error && result.error.kind === 'transport') {
          // Cancellations drop silently (Decision 11).
          if (
            result.error.outcome.kind === 'transport-error' &&
            result.error.outcome.reason === 'cancelled'
          ) {
            return;
          }
          setNlBanner(result.error.outcome);
          return;
        }

        if (result.error && result.error.kind === 'generation') {
          // Generation-level failure — surface via the malformed-response
          // banner variant (closest user-facing class).
          setNlBanner({
            kind: 'malformed-response',
            reason: 'non-json',
            durationMs: 0,
            responseBytes: 0,
          });
          return;
        }

        // Success — apply lozenges. Replace the existing state with the
        // generator's suggestions so "UK submarines" replaces prior chips
        // from a different phrase (matches nl-demo behaviour).
        const seeds: readonly LozengeSeed[] = result.lozenges;
        const nextItems = seeds.map((seed, idx) => {
          // Generate a deterministic-ish id per chip. We do not need
          // cryptographic uniqueness — only stable-within-this-batch.
          const id = `nl-${token}-${idx}-${seed.filterType}-${seed.value}`;
          if (seed.filterType === 'platform') {
            // The generator currently never emits platform chips (see
            // nl-cql2/types.ts LozengeSeed) but fall-through safely.
            return null;
          }
          return {
            kind: 'lozenge' as const,
            shape: 'simple' as const,
            id,
            filterType: seed.filterType,
            value: seed.value,
            ...(seed.negated !== undefined ? { negated: seed.negated } : {}),
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null);

        setFilterBarState({ items: nextItems });
      } catch {
        // Programmer errors (stub-client throws, network throws that escape
        // the client) — surface as provider-error so the user sees SOMETHING.
        if (nlTokenRef.current !== token) return;
        setNlBanner({
          kind: 'provider-error',
          providerStatus: 0,
          durationMs: 0,
        });
      } finally {
        if (nlTokenRef.current === token) setNlBusy(false);
      }
    },
    [llmClient, nlEnums, setFilterBarState],
  );

  // Graduate quick-search into a title lozenge on Enter — OR route through
  // the NL pipeline when live mode is active (#191 T040).
  const handleQuickSearchCommit = useCallback(
    (text: string) => {
      if (isNlMode) {
        void handleNlSubmit(text);
        return;
      }
      addLozenge('title', text);
      setQuickSearchText('');
    },
    [addLozenge, isNlMode, handleNlSubmit],
  );

  // Filter items whenever effective expression changes
  const prevExpressionRef = useRef<FilterExpression | null>(null);
  useEffect(() => {
    if (prevExpressionRef.current === effectiveExpression) return;
    prevExpressionRef.current = effectiveExpression;

    try {
      const filtered = engine.filter(items, effectiveExpression);
      setFilteredItems(filtered);
      onFilteredItems(filtered);
      onExpressionChange?.(effectiveExpression);
      setError(null);
    } catch {
      setError(FILTER_ERROR_MESSAGE);
    }
  }, [effectiveExpression, items, engine, onFilteredItems, onExpressionChange]);

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

    if (activeData?.kind !== 'lozenge') return;

    const lozengeId = String(active.id);

    if (overData?.kind === 'or-container') {
      const containerId = String(over.id);
      moveToContainer(lozengeId, containerId);
      return;
    }

    if (overData?.kind === 'filter-bar' && activeData?.fromContainerId) {
      moveToTopLevel(lozengeId, activeData.fromContainerId);
    }
  }, [moveToContainer, moveToTopLevel]);

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

  // Handle simple value selection from ValueEditor
  const handleValueSelect = useCallback((value: string) => {
    if (addingType && addingType !== 'platform') {
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

  // Handle compound platform confirm from PlatformValueEditor
  const handlePlatformConfirm = useCallback(
    (attributes: PlatformAttributes) => {
      if (addingForContainer) {
        addChildPlatformLozenge(addingForContainer, attributes);
      } else {
        addPlatformLozenge(attributes);
      }
      setAddingType(null);
      setAddingForContainer(null);
    },
    [addingForContainer, addChildPlatformLozenge, addPlatformLozenge],
  );

  // Handle in-place edit of a platform chip
  const handlePlatformAttributesChange = useCallback(
    (id: string, attributes: PlatformAttributes) => {
      editPlatformLozenge(id, attributes);
    },
    [editPlatformLozenge],
  );

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

  const platformDistinct = distinctValues.platform;

  const renderSimpleFlatValues = useMemo(() => {
    const { platform: _p, ...rest } = distinctValues;
    void _p;
    return rest as Record<Exclude<FilterType, 'platform'>, readonly string[]>;
  }, [distinctValues]);

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

        {/* #191 T043 — live-mode indicator (only when llmClient + nlEnums present) */}
        {isNlMode && liveModeLabel && (
          <div
            className="debrief-filter-bar__live-indicator"
            data-testid="nl-search-indicator"
          >
            <span aria-hidden="true" style={{ marginRight: '0.3em' }}>●</span>
            {liveModeLabel}
            {nlBusy && (
              <span
                data-testid="nl-search-busy"
                style={{ marginLeft: '0.5em', opacity: 0.7 }}
              >
                searching…
              </span>
            )}
          </div>
        )}

        {/* #191 T044 — NL failure banner. Keyed by `data-transport-reason`
            for E2E selectors; distinct copy + recovery affordances land in
            Phase 5 (T082). */}
        {nlBanner && (
          <div
            className="debrief-filter-bar__live-banner"
            data-testid="live-transport-banner"
            data-transport-reason={nlBanner.kind}
            role="alert"
          >
            <span className="debrief-filter-bar__live-banner-message">
              {nlBannerMessage(nlBanner)}
            </span>
            <button
              type="button"
              className="debrief-filter-bar__live-banner-dismiss"
              onClick={() => setNlBanner(null)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="debrief-filter-bar__error" data-testid="filter-bar-error" role="alert">
            {error}
          </div>
        )}

        <div className="debrief-filter-bar__items" data-testid="filter-bar-items">
          <QuickSearch
            onSearchChange={setQuickSearchText}
            onCommit={handleQuickSearchCommit}
          />

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
                  onPlatformAttributesChange={handlePlatformAttributesChange}
                  onEditClose={() => setEditingId(null)}
                  onToggleNegate={toggleNegate}
                  availableValues={renderSimpleFlatValues}
                  platformAvailableValues={platformDistinct}
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
                  onPlatformAttributesChange={handlePlatformAttributesChange}
                  onEditClose={() => setEditingId(null)}
                  onToggleNegate={toggleNegate}
                  availableValues={renderSimpleFlatValues}
                  platformAvailableValues={platformDistinct}
                  taxonomy={taxonomy}
                  labelMap={labelMap}
                  taxonomyCounts={taxonomyCounts}
                />
              );
            }
            return null;
          })}

          {isEmpty && !quickSearchText && (
            <span className="debrief-filter-bar__hint" data-testid="filter-bar-hint">
              {EMPTY_STATE_HINT}
            </span>
          )}

          <FilterTypeMenu
            onSelectType={handleSelectType}
            onSelectOrGroup={handleSelectOrGroup}
          />
        </div>

        {/* Simple value editor for adding new filter */}
        {addingType && addingType !== 'platform' && !addingForContainer && (
          <div className="debrief-filter-bar__adding" data-testid="filter-bar-adding">
            <ValueEditor
              filterType={addingType}
              value=""
              onSelect={handleValueSelect}
              onClose={handleValueClose}
              availableValues={renderSimpleFlatValues[addingType as Exclude<FilterType, 'platform'>] ?? []}
              taxonomy={taxonomy}
              taxonomyCounts={taxonomyCounts}
            />
          </div>
        )}

        {/* Simple value editor for adding inside an OR container */}
        {addingType && addingType !== 'platform' && addingForContainer && (
          <div className="debrief-filter-bar__adding" data-testid="filter-bar-container-adding">
            <ValueEditor
              filterType={addingType}
              value=""
              onSelect={handleValueSelect}
              onClose={handleValueClose}
              availableValues={renderSimpleFlatValues[addingType as Exclude<FilterType, 'platform'>] ?? []}
              taxonomy={taxonomy}
              taxonomyCounts={taxonomyCounts}
            />
          </div>
        )}

        {/* Platform compound editor */}
        {addingType === 'platform' && (
          <div
            className="debrief-filter-bar__adding"
            data-testid={
              addingForContainer ? 'filter-bar-platform-container-adding' : 'filter-bar-platform-adding'
            }
          >
            <PlatformValueEditor
              initialAttributes={{}}
              availableValues={platformDistinct}
              taxonomy={taxonomy}
              taxonomyCounts={taxonomyCounts}
              onConfirm={handlePlatformConfirm}
              onCancel={handleValueClose}
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
                {activeDragItem.shape === 'platform'
                  ? formatPlatformLabel(activeDragItem.attributes, labelMap)
                  : activeDragItem.filterType === 'vessel-class'
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

/**
 * Default banner copy per non-success LiveOutcome kind (#191 T044). Phase 5
 * (T082) will replace this with per-class copy + recovery affordances. For
 * now each banner shows a minimal user-legible sentence so the literal path
 * keeps working while the Phase-5 UX lands.
 */
function nlBannerMessage(outcome: LiveOutcome): string {
  switch (outcome.kind) {
    case 'success':
      return '';
    case 'auth-failure':
      return 'The provider rejected the API key. Check your configuration.';
    case 'rate-limit':
      return 'The provider rate limit was hit. Try again in a moment.';
    case 'provider-error':
      return 'The language-model provider returned an error.';
    case 'timeout':
      return 'The provider did not respond in time.';
    case 'malformed-response':
      return "The provider's response could not be processed.";
    case 'transport-error':
      return 'Could not reach the language-model provider.';
    case 'not-configured':
      return outcome.reason === 'disabled'
        ? 'NL search is disabled — enable it in settings to use natural-language queries.'
        : 'NL search needs an API key — run the “Debrief: Set Anthropic API Key” command.';
    case 'ceiling-reached':
      return `Live-mode call limit reached (${outcome.ceiling}). Reload the editor to reset.`;
  }
}
