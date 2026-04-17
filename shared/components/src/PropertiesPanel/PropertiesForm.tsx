/**
 * PropertiesForm — schema-driven metadata editor for STAC item.properties.
 *
 * For each FieldSpec.kind the form dispatches to either the existing
 * `ParameterEditor` (scalars) or one of the four sibling widgets
 * (`DateTimeWidget`, `BboxWidget`, `ArrayWidget`, `PlatformArrayWidget`).
 *
 * Adding a new LinkML type only requires:
 *   1. Extending `resolveFieldSpec` in schemaResolver.ts.
 *   2. Adding a new sibling widget file, if needed.
 *   3. Adding a new dispatch branch below.
 *
 * Nothing else in the component tree should need to change (FR-003, SC-003).
 */

import React from 'react';
import { ParameterEditor } from '../LogPanel/ParameterEditor';
import { ArrayWidget } from './ArrayWidget';
import { BboxWidget } from './BboxWidget';
import { DateTimeWidget } from './DateTimeWidget';
import { PlatformArrayWidget } from './PlatformArrayWidget';
import type {
  FieldDerivationState,
  FieldKey,
  FieldValue,
  FieldSpec,
  PropertiesFormField,
  PropertiesFormProps,
} from './types';

function DerivationChip({
  derivation,
}: {
  derivation: FieldDerivationState;
}): React.ReactElement | null {
  if (derivation === 'user') return null;
  const label = derivation === 'auto-derived' ? 'auto-derived' : 'override';
  const testid =
    derivation === 'auto-derived'
      ? 'properties-chip-auto-derived'
      : 'properties-chip-override';
  const bg =
    derivation === 'auto-derived'
      ? 'var(--vscode-badge-background, #444)'
      : 'var(--vscode-editorWarning-foreground, #cca700)';
  return (
    <span
      data-testid={testid}
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        background: bg,
        color: 'var(--vscode-badge-foreground, #fff)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
}

function SkeletonRow({ index }: { index: number }): React.ReactElement {
  return (
    <div
      data-testid={`properties-skeleton-row-${index}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 0',
      }}
    >
      <div
        style={{
          width: '30%',
          height: 10,
          background: 'var(--vscode-panel-border, #444)',
          opacity: 0.5,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          width: '80%',
          height: 16,
          background: 'var(--vscode-panel-border, #444)',
          opacity: 0.3,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

function renderWidget(
  field: PropertiesFormField,
  onCommit: (key: FieldKey, value: FieldValue) => void,
  readOnly: boolean,
): React.ReactNode {
  const { key, label, value, spec, error } = field;
  const disabled = readOnly || field.readOnly === true;
  const noop = (): void => {};

  switch (spec.kind) {
    case 'string':
      return (
        <ParameterEditor
          name={key}
          value={typeof value === 'string' ? value : value ?? ''}
          typeInfo={{
            type: 'string',
            label,
            ...(spec.pattern ? { pattern: spec.pattern } : {}),
          }}
          tunable={!disabled}
          onCommit={(_name, v) => onCommit(key, v)}
          onCancel={noop}
        />
      );
    case 'number':
      return (
        <ParameterEditor
          name={key}
          value={typeof value === 'number' ? value : value ?? 0}
          typeInfo={{
            type: spec.integer ? 'integer' : 'float',
            label,
            ...(spec.min !== undefined ? { min: spec.min } : {}),
            ...(spec.max !== undefined ? { max: spec.max } : {}),
          }}
          tunable={!disabled}
          onCommit={(_name, v) => onCommit(key, v)}
          onCancel={noop}
        />
      );
    case 'boolean':
      return (
        <ParameterEditor
          name={key}
          value={Boolean(value)}
          typeInfo={{ type: 'boolean', label }}
          tunable={!disabled}
          onCommit={(_name, v) => onCommit(key, v)}
          onCancel={noop}
        />
      );
    case 'enum':
      return (
        <ParameterEditor
          name={key}
          value={typeof value === 'string' ? value : value ?? ''}
          typeInfo={{ type: 'enum', label, allowedValues: spec.allowedValues }}
          tunable={!disabled}
          onCommit={(_name, v) => onCommit(key, v)}
          onCancel={noop}
        />
      );
    case 'duration':
      return (
        <ParameterEditor
          name={key}
          value={typeof value === 'string' ? value : value ?? ''}
          typeInfo={{ type: 'duration', label }}
          tunable={!disabled}
          onCommit={(_name, v) => onCommit(key, v)}
          onCancel={noop}
        />
      );
    case 'datetime':
      return (
        <DateTimeWidget
          name={key}
          value={value}
          spec={spec}
          onCommit={(_name, v) => onCommit(key, v)}
          disabled={disabled}
          error={error}
        />
      );
    case 'bbox':
      return (
        <BboxWidget
          name={key}
          value={value}
          spec={spec}
          onCommit={(_name, v) => onCommit(key, v)}
          disabled={disabled}
          error={error}
        />
      );
    case 'string-array':
      return (
        <ArrayWidget
          name={key}
          value={value}
          spec={spec}
          onCommit={(_name, v) => onCommit(key, v)}
          disabled={disabled}
          error={error}
        />
      );
    case 'platform-array':
      return (
        <PlatformArrayWidget
          name={key}
          value={value}
          spec={spec}
          onCommit={(_name, v) => onCommit(key, v)}
          disabled={disabled}
          error={error}
        />
      );
    case 'unsupported':
      return (
        <input
          type="text"
          readOnly
          disabled
          value={typeof value === 'string' ? value : JSON.stringify(value ?? '')}
          title={spec.reason}
          data-testid={`properties-unsupported-${key}`}
          className="log-panel__param-editor-input-field"
        />
      );
    default: {
      // Exhaustiveness guard — all FieldSpec kinds must be handled above.
      const _never: never = spec;
      return _never;
    }
  }
}

export function PropertiesForm({
  fields,
  onCommitField,
  loading,
  readOnly,
  writeError,
}: PropertiesFormProps): React.ReactElement {
  if (loading) {
    return (
      <div data-testid="properties-form" data-loading="true">
        {[0, 1, 2].map((i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="properties-form">
      {readOnly && (
        <div
          data-testid="properties-readonly-banner"
          role="status"
          style={{
            marginBottom: 8,
            padding: '4px 8px',
            background: 'var(--vscode-editorInfo-background, #333)',
            color: 'var(--vscode-editorInfo-foreground, #ccc)',
            border: '1px solid var(--vscode-panel-border, #555)',
            borderRadius: 2,
            fontSize: 12,
          }}
        >
          This item is read-only
        </div>
      )}

      {writeError && (
        <div
          data-testid="properties-write-error"
          role="alert"
          style={{
            marginBottom: 8,
            padding: '4px 8px',
            background: 'var(--vscode-inputValidation-errorBackground, #5a1d1d)',
            color: 'var(--vscode-errorForeground, #f44747)',
            border:
              '1px solid var(--vscode-inputValidation-errorBorder, #be1100)',
            borderRadius: 2,
            fontSize: 12,
          }}
        >
          {writeError}
        </div>
      )}

      {fields.map((field) => (
        <div
          key={field.key}
          data-testid={`properties-field-${field.key}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '6px 0',
            borderBottom: '1px solid var(--vscode-panel-border, transparent)',
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--vscode-descriptionForeground, #bbb)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span>
              {field.label}
              {field.required && <span aria-label="required"> *</span>}
            </span>
            <DerivationChip derivation={field.derivation} />
          </label>

          {renderWidget(field, onCommitField, readOnly)}

          {field.error && (
            <div
              className="log-panel__param-editor-error"
              role="alert"
              data-testid={`properties-field-error-${field.key}`}
              style={{ fontSize: 11 }}
            >
              {field.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PropertiesForm;

// Re-export the spec type for callers that import from this file.
export type { FieldSpec };
