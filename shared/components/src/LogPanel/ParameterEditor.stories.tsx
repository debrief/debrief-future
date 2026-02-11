/**
 * Storybook stories for the ParameterEditor component.
 *
 * One story per parameter type, plus non-tunable and validation error stories.
 *
 * Feature: 076-replay-tune (Phase 3)
 */

import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ParameterEditor } from './ParameterEditor';
import type { ParameterEditorProps } from './ParameterEditor';

// --- Stateful wrapper ---

function ParameterEditorWrapper(props: ParameterEditorProps) {
  const [value, setValue] = useState<unknown>(props.value);

  const handleCommit = useCallback(
    (name: string, newValue: unknown) => {
      setValue(newValue);
      props.onCommit(name, newValue);
    },
    [props.onCommit]
  );

  return (
    <div style={{ width: 280, padding: 12, border: '1px solid #333', background: '#1e1e1e', color: '#ccc' }}>
      <ParameterEditor
        {...props}
        value={value}
        onCommit={handleCommit}
      />
      <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
        Current value: <code>{JSON.stringify(value)}</code>
      </div>
    </div>
  );
}

// --- Storybook config ---

const meta: Meta<typeof ParameterEditor> = {
  title: 'LogPanel/ParameterEditor',
  component: ParameterEditor,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ParameterEditor>;

// --- Stories ---

export const FloatInput: Story = {
  name: 'Float Input',
  render: () => (
    <ParameterEditorWrapper
      name="maxRange"
      value={5000}
      typeInfo={{
        type: 'float',
        min: 0,
        max: 50000,
        label: 'Max Range',
      }}
      tunable={true}
      onCommit={(name, val) => console.log('Committed:', name, val)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
};

export const IntegerInput: Story = {
  name: 'Integer Input',
  render: () => (
    <ParameterEditorWrapper
      name="sampleCount"
      value={100}
      typeInfo={{
        type: 'integer',
        min: 1,
        max: 1000,
        label: 'Sample Count',
      }}
      tunable={true}
      onCommit={(name, val) => console.log('Committed:', name, val)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
};

export const DurationInput: Story = {
  name: 'Duration Input',
  render: () => (
    <ParameterEditorWrapper
      name="interval"
      value="PT60S"
      typeInfo={{
        type: 'duration',
        label: 'Interval',
      }}
      tunable={true}
      onCommit={(name, val) => console.log('Committed:', name, val)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
};

export const EnumInput: Story = {
  name: 'Enum Input',
  render: () => (
    <ParameterEditorWrapper
      name="method"
      value="linear"
      typeInfo={{
        type: 'enum',
        allowedValues: ['linear', 'cubic', 'nearest'],
        label: 'Interpolation Method',
      }}
      tunable={true}
      onCommit={(name, val) => console.log('Committed:', name, val)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
};

export const BooleanInput: Story = {
  name: 'Boolean Input',
  render: () => (
    <ParameterEditorWrapper
      name="includeOutliers"
      value={true}
      typeInfo={{
        type: 'boolean',
        label: 'Include Outliers',
      }}
      tunable={true}
      onCommit={(name, val) => console.log('Committed:', name, val)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
};

export const StringInput: Story = {
  name: 'String Input',
  render: () => (
    <ParameterEditorWrapper
      name="label"
      value="Track Alpha"
      typeInfo={{
        type: 'string',
        label: 'Label',
      }}
      tunable={true}
      onCommit={(name, val) => console.log('Committed:', name, val)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
};

export const NonTunable: Story = {
  name: 'Non-Tunable (Read Only)',
  render: () => (
    <div style={{ width: 280, padding: 12, border: '1px solid #333', background: '#1e1e1e', color: '#ccc' }}>
      <ParameterEditor
        name="units"
        value="metres"
        typeInfo={{
          type: 'string',
          label: 'Units',
        }}
        tunable={false}
        onCommit={() => {}}
        onCancel={() => {}}
      />
    </div>
  ),
};

export const ValidationError: Story = {
  name: 'Validation Error',
  render: () => {
    /**
     * This story demonstrates a float input with tight constraints.
     * Click the value to edit, then enter an out-of-range number to trigger validation.
     */
    const Wrapper = () => {
      const [value, setValue] = useState<unknown>(50);

      return (
        <div style={{ width: 280, padding: 12, border: '1px solid #333', background: '#1e1e1e', color: '#ccc' }}>
          <ParameterEditor
            name="threshold"
            value={value}
            typeInfo={{
              type: 'float',
              min: 0,
              max: 100,
              label: 'Threshold (0-100)',
            }}
            tunable={true}
            onCommit={(name, newValue) => {
              setValue(newValue);
              console.log('Committed:', name, newValue);
            }}
            onCancel={() => console.log('Cancelled')}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
            Try entering a value above 100 or below 0 to see the validation error.
          </div>
        </div>
      );
    };

    return <Wrapper />;
  },
};
