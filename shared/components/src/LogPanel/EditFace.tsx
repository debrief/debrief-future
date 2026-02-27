/**
 * EditFace — the editable back face of a flip-card.
 *
 * Integrates schema-driven parameter controls, metadata display,
 * rationale field, disable toggle, delete button, and Done button.
 *
 * Feature: 113-prov-card-flip
 */

import React, { useState, useCallback } from 'react';
import type { TimelineEntry, ParameterSchemaEntry, CardReplayStatus } from './types';
import { SkeletonLoader } from './SkeletonLoader';
import { SliderControl } from './SliderControl';
import { ColorPickerControl } from './ColorPickerControl';
import { JsonEditorControl } from './JsonEditorControl';
import { DisableToggle } from './DisableToggle';
import { DeleteConfirmation } from './DeleteConfirmation';
import { RationaleField } from './RationaleField';
import { LOG_PANEL_STRINGS } from './strings';

import './EditFace.css';

export interface EditFaceProps {
  readonly entry: TimelineEntry;
  readonly schema: ReadonlyArray<ParameterSchemaEntry> | null;
  readonly schemaLoading: boolean;
  readonly schemaError: string | null;
  readonly replayStatus: CardReplayStatus;
  readonly onParameterChange: (parameterName: string, newValue: unknown) => void;
  readonly onDisableToggle: (disabled: boolean) => void;
  readonly onDeleteClick: () => void;
  readonly onRationaleChange: (text: string) => void;
  readonly onDone: () => void;
  readonly onRetrySchema: () => void;
  readonly rationaleRef?: React.Ref<HTMLTextAreaElement>;
}

/**
 * Render the appropriate control for a parameter based on its schema entry.
 */
function renderParameterControl(
  param: ParameterSchemaEntry,
  currentValue: unknown,
  onChange: (name: string, value: unknown) => void,
): React.ReactElement {
  // Bounded numeric → slider
  if (param.type === 'number' && param.minimum !== null && param.maximum !== null) {
    return (
      <SliderControl
        key={param.name}
        name={param.name}
        value={typeof currentValue === 'number' ? currentValue : Number(currentValue)}
        minimum={param.minimum}
        maximum={param.maximum}
        step={param.step}
        tunable={param.tunable}
        onChange={(val) => onChange(param.name, val)}
      />
    );
  }

  // NamedColor → colour picker
  if (param.type === 'string' && param.paramType === 'NamedColor' && param.choices) {
    return (
      <ColorPickerControl
        key={param.name}
        name={param.name}
        value={String(currentValue)}
        choices={param.choices as ReadonlyArray<string>}
        tunable={param.tunable}
        onChange={(val) => onChange(param.name, val)}
      />
    );
  }

  // Complex types → JSON editor
  if (param.type === 'object' || param.type === 'array') {
    return (
      <JsonEditorControl
        key={param.name}
        name={param.name}
        value={currentValue}
        tunable={param.tunable}
        onChange={(val) => onChange(param.name, val)}
      />
    );
  }

  // Enum → dropdown
  if (param.type === 'enum' || (param.choices && param.choices.length > 0)) {
    return (
      <select
        key={param.name}
        value={String(currentValue)}
        onChange={(e) => onChange(param.name, e.target.value)}
        disabled={!param.tunable}
        className="log-panel__edit-face-select"
        data-testid={`param-select-${param.name}`}
        aria-label={param.name}
      >
        {(param.choices ?? []).map((choice) => (
          <option key={String(choice)} value={String(choice)}>
            {String(choice)}
          </option>
        ))}
      </select>
    );
  }

  // Boolean → toggle
  if (param.type === 'boolean') {
    return (
      <label key={param.name} className="log-panel__edit-face-toggle">
        <input
          type="checkbox"
          checked={Boolean(currentValue)}
          onChange={(e) => onChange(param.name, e.target.checked)}
          disabled={!param.tunable}
          data-testid={`param-toggle-${param.name}`}
          aria-label={param.name}
        />
        <span>{param.name}</span>
      </label>
    );
  }

  // Unbounded number → numeric input
  if (param.type === 'number') {
    return (
      <input
        key={param.name}
        type="number"
        step={param.step ?? 'any'}
        value={typeof currentValue === 'number' ? currentValue : ''}
        onChange={(e) => onChange(param.name, Number(e.target.value))}
        disabled={!param.tunable}
        className="log-panel__edit-face-input"
        data-testid={`param-number-${param.name}`}
        aria-label={param.name}
      />
    );
  }

  // Default string → text input
  return (
    <input
      key={param.name}
      type="text"
      value={String(currentValue ?? '')}
      onChange={(e) => onChange(param.name, e.target.value)}
      disabled={!param.tunable}
      className="log-panel__edit-face-input"
      data-testid={`param-text-${param.name}`}
      aria-label={param.name}
    />
  );
}

export function EditFace({
  entry,
  schema,
  schemaLoading,
  schemaError,
  replayStatus,
  onParameterChange,
  onDisableToggle,
  onDeleteClick,
  onRationaleChange,
  onDone,
  onRetrySchema,
  rationaleRef,
}: EditFaceProps): React.ReactElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleParameterChange = useCallback(
    (name: string, value: unknown) => {
      onParameterChange(name, value);
    },
    [onParameterChange]
  );

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
    onDeleteClick();
  }, [onDeleteClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent card click propagation from edit face
      e.stopPropagation();
    },
    []
  );

  return (
    <div
      className="log-panel__edit-face"
      data-testid="edit-face"
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Replay progress indicator */}
      {replayStatus === 'in-progress' && (
        <div className="log-panel__edit-face-replay-indicator" data-testid="edit-face-replay">
          <div className="log-panel__edit-face-replay-bar" />
        </div>
      )}

      {/* Parameters section */}
      <div className="log-panel__edit-face-section">
        <div className="log-panel__edit-face-section-title">
          {LOG_PANEL_STRINGS.editFaceParametersTitle}
        </div>

        {schemaLoading && <SkeletonLoader rows={3} />}

        {schemaError && (
          <div className="log-panel__edit-face-schema-error" data-testid="schema-error">
            <span>{LOG_PANEL_STRINGS.editFaceSchemaError}</span>
            <button
              className="log-panel__edit-face-retry-btn"
              onClick={onRetrySchema}
              data-testid="schema-retry"
            >
              {LOG_PANEL_STRINGS.editFaceSchemaRetry}
            </button>
          </div>
        )}

        {schema && schema.length === 0 && (
          <div className="log-panel__edit-face-no-params" data-testid="no-params">
            {LOG_PANEL_STRINGS.editFaceNoParameters}
          </div>
        )}

        {schema && schema.length > 0 && (
          <div className="log-panel__edit-face-params" data-testid="edit-face-params">
            {schema.filter((p) => p.tunable).map((param) => {
              const currentVal = entry.parameters[param.name]?.value ?? param.defaultValue;
              return (
                <div key={param.name} className="log-panel__edit-face-param">
                  <label className="log-panel__edit-face-param-label">
                    {param.name}
                    {param.description && (
                      <span
                        className="log-panel__edit-face-param-desc"
                        title={param.description}
                      >
                        {' '}?
                      </span>
                    )}
                  </label>
                  {renderParameterControl(param, currentVal, handleParameterChange)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rationale field */}
      <RationaleField
        value={entry.rationale ?? ''}
        onChange={onRationaleChange}
        inputRef={rationaleRef}
      />

      {/* Disable toggle */}
      <DisableToggle
        disabled={entry.disabled ?? false}
        autoDependency={false}
        causeActivityId={null}
        onChange={onDisableToggle}
      />

      {/* Delete section */}
      <div className="log-panel__edit-face-delete-section">
        {!showDeleteConfirm ? (
          <button
            className="log-panel__edit-face-delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="delete-button"
          >
            {LOG_PANEL_STRINGS.editFaceDeleteButton}
          </button>
        ) : (
          <DeleteConfirmation
            visible={showDeleteConfirm}
            toolName={entry.toolName}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>

      {/* Done button */}
      <button
        className="log-panel__edit-face-done-btn"
        onClick={onDone}
        data-testid="edit-face-done"
      >
        {LOG_PANEL_STRINGS.editFaceDone}
      </button>
    </div>
  );
}
